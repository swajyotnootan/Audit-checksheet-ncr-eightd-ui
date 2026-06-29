// src/Components/forum/ChatDrawer.jsx
import React, { useState, useEffect } from "react";
import { X, Search, ChevronUp, ChevronDown, Hash,ChevronLeft,ArrowLeft } from "lucide-react";
import ForumThreadView from "./ForumThreadView";
import { fetchUserGroups, getUsers, fetchGroupThreads } from "../../api/api"; // Use fetchGroupThreads instead

export default function ChatDrawer({ isOpen, onClose, user, username }) {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const selectedGroup = groups.find((g) => g.groupId === selectedGroupId);

  // Global search state
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [globalSearchResultsCount, setGlobalSearchResultsCount] = useState(0);
  const [currentGlobalResultIndex, setCurrentGlobalResultIndex] = useState(-1);
  const [globalHighlightedMatches, setGlobalHighlightedMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch groups, all users, AND current user
  useEffect(() => {
    // Get email from user object or use username as fallback (for backward compatibility)
    const userEmail = user?.email || username;
    
    if (isOpen && userEmail) {
      setLoading(true);
      console.log("🔍 Fetching groups for email:", userEmail);

      Promise.all([
        fetchUserGroups(userEmail),
        getUsers(),
      ])
        .then(([groups, users]) => {
          setGroups(Array.isArray(groups) ? groups : []);
          setAllUsers(Array.isArray(users) ? users : []);

          // Find current user from allUsers by email
          const foundUser = users.find(u => u.email === userEmail);
          setCurrentUser(foundUser || { email: userEmail });

          setError(null);
        })
        .catch((err) => {
          console.error("Failed to load data:", err);
          setError("Failed to load groups or users.");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      setError(null);
    }
  }, [isOpen, username]);

  // 🔍 FIXED: Global search function using fetchGroupThreads
  const handleGlobalSearch = async (query) => {
    if (!query.trim()) {
      setGlobalSearchResults([]);
      setGlobalSearchResultsCount(0);
      setCurrentGlobalResultIndex(-1);
      setGlobalHighlightedMatches([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const allPosts = [];
      const matches = [];

      // Fetch posts from ALL groups sequentially using fetchGroupThreads
      for (const group of groups) {
        try {
          console.log(`🔍 Searching in group: ${group.groupName}`);
          
          // Fetch actual posts for this group using fetchGroupThreads
          const posts = await fetchGroupThreads(group.groupId);
          
          if (Array.isArray(posts)) {
            // Filter and process posts that match the search query
            const matchingPosts = posts.map(post => {
              // Adjust field names based on your actual API response structure
              const content = post.content || post.message || post.text || '';
              const authorName = post.createdByName || post.authorName || post.userName || post.createdBy || 'Unknown';
              const postId = post.id || post.postId;
              const createdAt = post.createdAt || post.timestamp || post.createdDate;
              
              // Check if content or author matches the query
              const contentMatches = content.toLowerCase().includes(query.toLowerCase());
              const authorMatches = authorName.toLowerCase().includes(query.toLowerCase());
              
              if (contentMatches || authorMatches) {
                // Highlight matches in content
                let highlightedContent = content;
                const contentRegex = new RegExp(`(${escapeRegex(query)})`, 'gi');
                highlightedContent = content.replace(contentRegex, '<mark class="bg-yellow-200">$1</mark>');

                // Highlight matches in author
                let highlightedAuthor = authorName;
                const authorRegex = new RegExp(`(${escapeRegex(query)})`, 'gi');
                highlightedAuthor = authorName.replace(authorRegex, '<mark class="bg-yellow-200">$1</mark>');

                // Count matches
                const contentMatchCount = (content.match(new RegExp(escapeRegex(query), 'gi')) || []).length;
                const authorMatchCount = (authorName.match(new RegExp(escapeRegex(query), 'gi')) || []).length;
                const totalMatches = contentMatchCount + authorMatchCount;

                // Add to matches array for navigation
                for (let i = 0; i < totalMatches; i++) {
                  matches.push({
                    postId: postId,
                    groupId: group.groupId,
                    index: matches.length,
                    type: i < contentMatchCount ? 'content' : 'author',
                    text: query,
                    position: i
                  });
                }

                return {
                  ...post,
                  id: postId,
                  groupId: group.groupId,
                  groupName: group.groupName,
                  content: content,
                  createdByName: authorName,
                  createdAt: createdAt,
                  highlightedContent,
                  highlightedAuthor,
                  matchCount: totalMatches
                };
              }
              return null;
            }).filter(post => post !== null);

            allPosts.push(...matchingPosts);
          }
        } catch (err) {
          console.error(`Failed to fetch posts for group ${group.groupId}:`, err);
          // Continue with other groups even if one fails
        }
      }

      setGlobalSearchResults(allPosts);
      setGlobalSearchResultsCount(matches.length);
      setCurrentGlobalResultIndex(matches.length > 0 ? 0 : -1);
      setGlobalHighlightedMatches(matches);

      console.log(`🔍 Search complete: Found ${allPosts.length} posts with ${matches.length} matches`);

    } catch (err) {
      console.error("Global search failed:", err);
      setError("Global search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Helper function to escape regex special characters
  const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 🔍 Handle global search input change with debounce
  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setGlobalSearchResults([]);
      setGlobalSearchResultsCount(0);
      setCurrentGlobalResultIndex(-1);
      setGlobalHighlightedMatches([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleGlobalSearch(globalSearchQuery);
    }, 500); // Increased debounce time

    return () => clearTimeout(timeoutId);
  }, [globalSearchQuery, groups]);

  // 🔍 Handle global search input change
  const handleGlobalSearchChange = (e) => {
    const query = e.target.value;
    setGlobalSearchQuery(query);
  };

  // 🔍 Clear global search
  const clearGlobalSearch = () => {
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
    setGlobalSearchResultsCount(0);
    setCurrentGlobalResultIndex(-1);
    setGlobalHighlightedMatches([]);
    setIsGlobalSearching(false);
    setIsSearching(false);
  };

  // 🔍 Toggle global search mode
  const toggleGlobalSearch = () => {
    if (isGlobalSearching) {
      clearGlobalSearch();
    }
    setIsGlobalSearching(!isGlobalSearching);
  };

  // 🔍 FIXED: Navigate global search results
  const navigateGlobalSearchResults = (direction) => {
    if (globalHighlightedMatches.length === 0) return;
    
    let newIndex = currentGlobalResultIndex;
    
    if (direction === 'next') {
      newIndex = (currentGlobalResultIndex + 1) % globalHighlightedMatches.length;
    } else if (direction === 'prev') {
      newIndex = currentGlobalResultIndex === 0 
        ? globalHighlightedMatches.length - 1 
        : currentGlobalResultIndex - 1;
    }
    
    setCurrentGlobalResultIndex(newIndex);
    
    // Scroll to the result
    const match = globalHighlightedMatches[newIndex];
    const resultElement = document.getElementById(`global-result-${match.postId}`);
    if (resultElement) {
      resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      resultElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        resultElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
      }, 2000);
    }
  };

  // Handle keyboard navigation for global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isGlobalSearching || !globalSearchQuery) return;
      
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        navigateGlobalSearchResults('next');
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        navigateGlobalSearchResults('prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearching, globalSearchQuery, currentGlobalResultIndex, globalHighlightedMatches]);

  // Close drawer when clicking outside or pressing Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - covers entire screen but sits below navbar */}
      <div 
        className="fixed inset-0 z-[98] bg-black/50" 
        onClick={onClose}
      />
      
      {/* Chat Drawer - positioned below navbar */}
      <div 
className="fixed top-0 right-0 h-full z-[99] bg-gray-50 shadow-lg w-[90vw] md:w-[40vw] lg:w-[30vw]"
        style={{ marginTop: '-0px', height: 'calc(100vh - 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          {!selectedGroupId && (
            <div className="bg-[#00529B] text-white p-4 flex justify-between items-center">
               <button onClick={onClose} className="text-white hover:text-gray-200">
                  <ArrowLeft  title="Back" size={24} />
                  <span className="sr-only">Back</span>
                </button>
              <h2 className="text-lg font-semibold">Discussion forum</h2>
              <div className="flex items-center gap-2">
                {/* Global Search Button */}
                <button
                  onClick={toggleGlobalSearch}
                  className={`p-2 text-white rounded-full hover:bg-white/20 transition-colors ${
                    isGlobalSearching ? 'bg-blue-600' : ''
                  }`}
                  title="Global Search"
                >
                  <Search size={20} />
                </button>
                {/* <button onClick={onClose} className="text-white hover:text-gray-200">
                  <X size={24} />
                </button> */}
              </div>
            </div>
          )}

          {/* Global Search Bar - Only show when searching and not in a group */}
          {isGlobalSearching && !selectedGroupId && (
            <div className="px-4 py-2 border-b bg-white flex items-center gap-2">
              <Search size={16} className="text-gray-500" />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={handleGlobalSearchChange}
                placeholder="Search across all groups..."
                className="flex-1 outline-none text-sm"
                autoFocus
              />
              {globalSearchQuery && (
                <div className="flex items-center gap-2">
                  {isSearching ? (
                    <div className="text-xs text-gray-500">Searching...</div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      {currentGlobalResultIndex + 1} / {globalSearchResultsCount}
                    </div>
                  )}
                  <button 
                    onClick={() => navigateGlobalSearchResults('prev')}
                    disabled={globalSearchResultsCount === 0 || isSearching}
                    className={`p-1 rounded-full ${globalSearchResultsCount === 0 || isSearching ? 'text-gray-300' : 'hover:bg-gray-100'}`}
                    title="Previous result (Shift+Enter)"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button 
                    onClick={() => navigateGlobalSearchResults('next')}
                    disabled={globalSearchResultsCount === 0 || isSearching}
                    className={`p-1 rounded-full ${globalSearchResultsCount === 0 || isSearching ? 'text-gray-300' : 'hover:bg-gray-100'}`}
                    title="Next result (Ctrl+Enter)"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
              <button 
                onClick={clearGlobalSearch}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && <div className="p-3 bg-red-100 text-red-700 text-sm">{error}</div>}

          {/* Group List or Chat View */}
          {isGlobalSearching ? (
            // Global search results view
            <div className="flex-1 overflow-y-auto p-4">
              {isSearching ? (
                <div className="text-center py-10 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  Searching across all groups...
                </div>
              ) : globalSearchQuery ? (
                globalSearchResults.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-2">
                      Found {globalSearchResults.length} posts with {globalSearchResultsCount} matches
                    </div>
                    {globalSearchResults.map((post, index) => (
                      <div
                        key={`${post.groupId}-${post.id}-${index}`}
                        id={`global-result-${post.id}`}
                        onClick={() => {
                          setSelectedGroupId(post.groupId);
                          clearGlobalSearch(); // Clear search when selecting a group
                        }}
                        className="p-3 rounded-lg bg-white border hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            {/* <Hash size={14} className="text-blue-600" /> */}
                            <span className="text-blue-600 font-bold text-sm">{post.groupName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 flex items-center gap-2">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {post.groupName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {post.matchCount} match{post.matchCount !== 1 ? 'es' : ''}
                              </span>
                            </div>
                            <div 
                              className="mt-1 text-gray-700"
                              dangerouslySetInnerHTML={{ __html: post.highlightedContent }}
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              By <span dangerouslySetInnerHTML={{ __html: post.highlightedAuthor }} /> • {new Date(post.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    No results found for "{globalSearchQuery}"
                  </div>
                )
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Enter a search term to find messages across all groups
                </div>
              )}
            </div>
          ) : selectedGroupId ? (
            <ForumThreadView
              groupId={selectedGroupId}
              groupName={selectedGroup?.groupName}
              isInDrawer={true}
              setForumDrawerOpen={onClose}
              username={user?.email || username}
              groupDescription={selectedGroup?.description}
              currentUser={currentUser}
              allUsers={allUsers}
              onBack={() => setSelectedGroupId(null)}
              memberEmails={selectedGroup?.members}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-10 text-gray-500">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No groups available</div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div
                      key={group.groupId}
                      onClick={() => setSelectedGroupId(group.groupId)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white border hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">{group.groupName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{group.groupName}</div>
                        <div className="text-xs text-gray-500"> {group.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
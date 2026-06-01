// src/hooks/useUserGroups.jsx
import { useState, useEffect, useCallback } from "react";
import { fetchUserGroups, getGroupMembers } from "../components/forum/Api/forumapi";

export const useUserGroups = (userEmail) => {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGroups = useCallback(async () => {
    if (!userEmail) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log("📦 Fetching groups for user:", userEmail);
      const userGroups = await fetchUserGroups(userEmail);
      
      // Fetch members for each group
      const groupsWithMembers = await Promise.all(
        (userGroups || []).map(async (group) => {
          try {
            const members = await getGroupMembers(group.groupId);
            console.log(`👥 Group ${group.groupName} has ${members?.length || 0} members`);
            return {
              ...group,
              members: members || group.members || []
            };
          } catch (err) {
            console.error(`Failed to fetch members for group ${group.groupId}:`, err);
            return {
              ...group,
              members: group.members || []
            };
          }
        })
      );
      
      setGroups(groupsWithMembers);
      console.log("✅ Loaded groups with members:", groupsWithMembers.length);
      
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setError(err.message);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  return { groups, isLoading, error, refetch: loadGroups };
};
// Updated calendarApi.js with user-specific features



const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://qsutrarmsclm.hub.swajyot.co.in:8476/api';

// Helper function to get user info from localStorage
const getUserFromStorage = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
};

// Helper function for API calls with user context
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const user = getUserFromStorage();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      // Add user context headers
      ...(user?.id && { 'User-ID': user.id.toString() }),
      ...(user?.email && { 'User-Email': user.email }),
      // Add authorization token if available
      ...(localStorage.getItem('authToken') && {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }),
      ...options.headers
    }
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    console.log(`Making API call to: ${url}`, { 
      method: config.method || 'GET', 
      userEmail: user?.email,
      userId: user?.id 
    });
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
      return { success: true };
    }
    
    const data = await response.json();
    console.log(`API call successful for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Format event data for API
// Format event data for API
const formatEventForAPI = (eventData) => {
  const formatDateTime = (date) => {
    if (!date) return null;
    return new Date(date).toISOString().slice(0, 19);
  };

  return {
    title: eventData.title || '',
    description: eventData.description || '',
    start: formatDateTime(eventData.start),
    end: formatDateTime(eventData.end),
    location: eventData.location || '',
    category: (eventData.category || 'work').toUpperCase(),
    priority: (eventData.priority || 'medium').toUpperCase(),
    isAllDay: Boolean(eventData.isAllDay),
    isRecurring: Boolean(eventData.isRecurring),
    attendees: Array.isArray(eventData.attendees) ? eventData.attendees.filter(email => email && email.trim()) : [],
    reminders: Array.isArray(eventData.reminders) ? eventData.reminders.map(reminder => ({
      type: (reminder.type || 'popup').toUpperCase(),
      minutes: parseInt(reminder.minutes) || 15
    })) : [{ type: 'POPUP', minutes: 15 }],
    // NEW: Production-specific fields
    assignedLine: eventData.assignedLine || null,
    productionOrderId: eventData.productionOrderId || null,
    status: eventData.status || 'UPCOMING'
  };
};
// Format event data from API with user-specific styling
// Format event data from API with user-specific styling
// In calendarApi.js - Update formatEventFromAPI

const formatEventFromAPI = (event) => {
  const parseDateTime = (dateString) => {
    if (!dateString) return new Date();
    return new Date(dateString);
  };

  // ✅ Ensure start and end are valid dates
  let startDate = parseDateTime(event.start);
  let endDate = parseDateTime(event.end);
  
  // If start and end are the same, add 1 hour duration
  if (startDate.getTime() === endDate.getTime()) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  const userRelationship = event.userRelationship || 'none';
  const status = event.status || 'UPCOMING';

  return {
    id: event.id,
    title: event.title || 'Untitled Event',
    description: event.description || '',
    start: startDate,
    end: endDate,
    location: event.location || '',
    category: (event.category || 'WORK').toLowerCase(),
    priority: (event.priority || 'MEDIUM').toLowerCase(),
    isAllDay: Boolean(event.isAllDay),
    isRecurring: Boolean(event.isRecurring),
    attendees: Array.isArray(event.attendees) ? event.attendees.map(a => a.email || a) : [],
    reminders: Array.isArray(event.reminders) ? event.reminders.map(r => ({
      id: r.id,
      type: (r.type || 'POPUP').toLowerCase(),
      minutes: r.minutes || 15,
      isSent: r.isSent || false
    })) : [],
    // Production-specific fields
    assignedLine: event.assignedLine,
    productionOrderId: event.productionOrderId,
    status: status,
    completedAt: event.completedAt ? parseDateTime(event.completedAt) : null,
    // Audit-specific fields
    auditType: event.auditType,
    timeSlot: event.timeSlot,
    fromDate: event.fromDate,
    toDate: event.toDate,
    isSpecialEvent: event.isSpecialEvent,
    specialEventType: event.specialEventType,
    // User relationship
    isOwner: Boolean(event.isOwner),
    isAttendee: Boolean(event.isAttendee),
    userRelationship: userRelationship,
    resource: {
      userRelationship: userRelationship,
      isOwner: Boolean(event.isOwner),
      isAttendee: Boolean(event.isAttendee),
      status: status,
      assignedLine: event.assignedLine
    }
  };
};

export const calendarAPI = {
  // Get current user info
  getCurrentUser() {
    return getUserFromStorage();
  },

  // NEW: Get events by production line (for operators)
// async getEventsByLine(line) {
//   try {
//     console.log('API: Getting events by line...', line);
//     const events = await apiCall(`/events/line/${line}`);
//     // Filter out completed events with delay (hide after 1 hour of completion)
//     const activeEvents = events.filter(event => {
//       if (event.status === 'COMPLETED' || event.status === 'FINISHED') {
//         const completedAt = new Date(event.completedAt || event.updatedAt);
//         const now = new Date();
//         const hoursSinceCompletion = (now - completedAt) / (1000 * 60 * 60);
//         return hoursSinceCompletion < 1; // Show for 1 hour after completion
//       }
//       return true;
//     });
//     return Array.isArray(activeEvents) ? activeEvents.map(formatEventFromAPI) : [];
//   } catch (error) {
//     console.error('API: Error getting events by line:', error);
//     throw new Error('Failed to fetch line events.');
//   }
// },

// Add this method to calendarAPI object (after getUserEventStats)

  // NEW: Get combined events (production + audit schedules)
 // In calendarApi.js - Add this method if not present

async getUserCombinedEvents() {
  try {
    console.log('API: Getting combined events (production + audit schedules)...');
    const user = getUserFromStorage();
    
    // Call the combined endpoint
    const events = await apiCall(`/events/user/combined?userRole=${user?.role || ''}&userLine=${user?.field || ''}`);
    
    console.log('✅ Combined events received:', events.length);
    return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
  } catch (error) {
    console.error('API: Error getting combined events:', error);
    // Fallback to regular user events
    return this.getUserEvents();
  }
},

  // NEW: Get audit schedule events (will be connected to backend later)
 // In calendarApi.js - Update this method
async getAuditScheduleEvents() {
  try {
    const user = getUserFromStorage();
    console.log('🔍 Getting audit events for user:', user);
    
    const response = await apiCall(
      `/audit-schedule/calendar-events?userId=${user?.id}&userRole=${user?.role}&department=${user?.department || ''}`
    );
    
    console.log('📋 Audit events received:', response);
    
    // Format audit events for calendar
    return response.map(audit => ({
      id: audit.id,
      title: audit.title,
      description: audit.description,
      start: new Date(audit.start),
      end: new Date(audit.end),
      location: audit.location,
      category: audit.category || 'WORK',
      priority: audit.priority || 'MEDIUM',
      status: audit.status || 'SCHEDULED',
      assignedLine: audit.assignedLine,
      auditType: audit.auditType,
      timeSlot: audit.timeSlot,
      fromDate: audit.fromDate,
      toDate: audit.toDate,
      isSpecialEvent: audit.isSpecialEvent,
      specialEventType: audit.specialEventType,
      isOwner: audit.isOwner,
      isAttendee: audit.isAttendee,
      userRelationship: audit.userRelationship,
      resource: {
        userRelationship: audit.userRelationship,
        isOwner: audit.isOwner,
        isAttendee: audit.isAttendee,
        status: audit.status,
        assignedLine: audit.assignedLine
      }
    }));
  } catch (error) {
    console.error('API: Error getting audit events:', error);
    return [];
  }
},

  // NEW: Save audit event to calendar (when schedule is approved)
  async addAuditToCalendar(auditSchedule) {
    try {
      const eventData = {
        title: `📋 Audit: ${auditSchedule.department} - ${auditSchedule.auditType || 'General'}`,
        description: `Audit Details:\n• Type: ${auditSchedule.auditType || 'General'}\n• Status: ${auditSchedule.status}\n• Time: ${auditSchedule.timeSlot}`,
        start: auditSchedule.scheduledDate,
        end: auditSchedule.scheduledDate,
        location: auditSchedule.department,
        category: 'WORK',
        priority: 'MEDIUM',
        assignedLine: auditSchedule.department,
        productionOrderId: null,
        status: auditSchedule.status || 'UPCOMING',
        attendees: [],
        reminders: [{ type: 'POPUP', minutes: 15 }],
        isAllDay: false,
        isRecurring: false
      };
      
      // Store in localStorage for now (temporary)
      const existingAudits = localStorage.getItem('audit_calendar_events');
      const audits = existingAudits ? JSON.parse(existingAudits) : [];
      audits.push({
        ...eventData,
        id: auditSchedule.id,
        start: auditSchedule.scheduledDate,
        end: auditSchedule.scheduledDate,
        userRelationship: auditSchedule.auditorId === user?.id ? 'owner' : 'attendee',
        auditScheduleId: auditSchedule.id
      });
      localStorage.setItem('audit_calendar_events', JSON.stringify(audits));
      
      return { success: true };
    } catch (error) {
      console.error('API: Error adding audit to calendar:', error);
      return { success: false };
    }
  },

// NEW: Get all active events (for supervisors)
// CORRECTED: Remove the client-side filtering
async getAllActiveEvents() {
  try {
    console.log('API: Getting all active events...');
    const events = await apiCall('/events/active');
    return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
  } catch (error) {
    console.error('API: Error getting all active events:', error);
    throw new Error('Failed to fetch active events.');
  }
},

async getEventsByLine(line) {
  try {
    console.log('API: Getting events by line...', line);
    const events = await apiCall(`/events/line/${line}`);
    return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
  } catch (error) {
    console.error('API: Error getting events by line:', error);
    throw new Error('Failed to fetch line events.');
  }
},

// NEW: Update event status
async updateEventStatus(eventId, status) {
  try {
    console.log('API: Updating event status...', eventId, status);
    const event = await apiCall(`/events/${eventId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, completedAt: new Date().toISOString() })
    });
    return formatEventFromAPI(event);
  } catch (error) {
    console.error('API: Error updating event status:', error);
    throw new Error('Failed to update event status.');
  }
},

// NEW: Get events by production order ID
async getEventsByProductionOrder(orderId) {
  try {
    console.log('API: Getting events by production order...', orderId);
    const events = await apiCall(`/events/production-order/${orderId}`);
    return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
  } catch (error) {
    console.error('API: Error getting events by production order:', error);
    throw new Error('Failed to fetch production order events.');
  }
},

  // Get all events (admin view)
  async getAllEvents() {
    try {
      console.log('API: Getting all events...');
      const events = await apiCall('/events');
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error getting events:', error);
      throw new Error('Failed to fetch events. Please check your connection and try again.');
    }
  },

  // Get user-specific events (owned + attending)
  // In calendarApi.js - Update getUserEvents method
async getUserEvents() {
  try {
    console.log('API: Getting user combined events (production + audits)...');
    const user = getUserFromStorage();
    // Call the combined endpoint that includes audit schedules
    const events = await apiCall(`/events/user/combined?userRole=${user?.role || ''}&userLine=${user?.field || ''}`);
    return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
  } catch (error) {
    console.error('API: Error getting user combined events:', error);
    // Fallback to production only
    const events = await apiCall('/events/user');
    return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
  }
},

  // Get events created by user
  async getEventsCreatedByUser() {
    try {
      console.log('API: Getting events created by user...');
      const events = await apiCall('/events/user/created');
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error getting events created by user:', error);
      throw new Error('Failed to fetch events you created.');
    }
  },

  // Get events user is attending
  async getEventsUserAttending() {
    try {
      console.log('API: Getting events user is attending...');
      const events = await apiCall('/events/user/attending');
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error getting events user is attending:', error);
      throw new Error('Failed to fetch events you are attending.');
    }
  },

  // Get events by date range for user
  async getUserEventsByDateRange(startDate, endDate) {
    try {
      console.log('API: Getting user events by date range...', startDate, endDate);
      const start = startDate.toISOString();
      const end = endDate.toISOString();
      const events = await apiCall(`/events/user/range?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error getting user events by date range:', error);
      throw new Error('Failed to fetch events by date range.');
    }
  },

  // Get single event by ID with user context
  async getEventById(eventId) {
    try {
      console.log('API: Getting event by ID with user context:', eventId);
      const event = await apiCall(`/events/${eventId}/user`);
      return formatEventFromAPI(event);
    } catch (error) {
      console.error('API: Error getting event by ID:', error);
      if (error.message.includes('404')) {
        throw new Error('Event not found.');
      }
      throw new Error('Failed to fetch event details.');
    }
  },

  // Create new event
  async createEvent(eventData) {
    try {
      console.log('API: Creating event...', eventData);
      
      if (!eventData.title || !eventData.title.trim()) {
        throw new Error('Event title is required.');
      }
      if (!eventData.start || !eventData.end) {
        throw new Error('Event start and end times are required.');
      }
      if (new Date(eventData.start) >= new Date(eventData.end)) {
        throw new Error('Event end time must be after start time.');
      }

      const formattedData = formatEventForAPI(eventData);
      const event = await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(formattedData)
      });
      return formatEventFromAPI(event);
    } catch (error) {
      console.error('API: Error creating event:', error);
      throw new Error(error.message || 'Failed to create event.');
    }
  },

  // Update existing event
  async updateEvent(eventId, eventData) {
    try {
      console.log('API: Updating event...', eventId, eventData);
      
      if (!eventData.title || !eventData.title.trim()) {
        throw new Error('Event title is required.');
      }
      if (!eventData.start || !eventData.end) {
        throw new Error('Event start and end times are required.');
      }
      if (new Date(eventData.start) >= new Date(eventData.end)) {
        throw new Error('Event end time must be after start time.');
      }

      const formattedData = formatEventForAPI(eventData);
      const event = await apiCall(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(formattedData)
      });
      return formatEventFromAPI(event);
    } catch (error) {
      console.error('API: Error updating event:', error);
      if (error.message.includes('404')) {
        throw new Error('Event not found.');
      } else if (error.message.includes('403') || error.message.includes('permission')) {
        throw new Error('You do not have permission to update this event.');
      }
      throw new Error(error.message || 'Failed to update event.');
    }
  },

  // Delete event
  async deleteEvent(eventId) {
    try {
      console.log('API: Deleting event...', eventId);
      await apiCall(`/events/${eventId}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error('API: Error deleting event:', error);
      if (error.message.includes('404')) {
        throw new Error('Event not found.');
      } else if (error.message.includes('403') || error.message.includes('permission')) {
        throw new Error('Only the event creator can delete this event.');
      }
      throw new Error('Failed to delete event.');
    }
  },

  // Search user events
  async searchUserEvents(query) {
    try {
      console.log('API: Searching user events...', query);
      if (!query || !query.trim()) {
        return [];
      }
      const events = await apiCall(`/events/user/search?q=${encodeURIComponent(query.trim())}`);
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error searching user events:', error);
      throw new Error('Failed to search events.');
    }
  },

  // Get events by category for user
  async getUserEventsByCategory(category) {
    try {
      console.log('API: Getting user events by category...', category);
      const apiCategory = category.toUpperCase();
      const events = await apiCall(`/events/user/category/${apiCategory}`);
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error getting user events by category:', error);
      throw new Error('Failed to fetch events by category.');
    }
  },

  // Get upcoming events for user
  async getUserUpcomingEvents() {
    try {
      console.log('API: Getting user upcoming events...');
      const events = await apiCall('/events/user/upcoming');
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error getting user upcoming events:', error);
      throw new Error('Failed to fetch upcoming events.');
    }
  },

  // Get today's events for user
  async getUserTodayEvents() {
    try {
      console.log('API: Getting user today\'s events...');
      const events = await apiCall('/events/user/today');
      return Array.isArray(events) ? events.map(formatEventFromAPI) : [];
    } catch (error) {
      console.error('API: Error getting user today\'s events:', error);
      throw new Error('Failed to fetch today\'s events.');
    }
  },

  // Get user-specific event statistics
  async getUserEventStats() {
    try {
      console.log('API: Getting user event statistics...');
      const stats = await apiCall('/events/user/stats');
      return {
        total: stats.total || 0,
        byCategory: {
          work: stats.workEvents || 0,
          personal: stats.personalEvents || 0,
          health: stats.healthEvents || 0,
          education: stats.educationEvents || 0
        },
        byOwnership: {
          owned: stats.createdEvents || 0,
          attending: stats.attendingEvents || 0
        },
        upcoming: stats.upcomingEvents || 0,
        today: stats.todayEvents || 0
      };
    } catch (error) {
      console.error('API: Error getting user event stats:', error);
      return {
        total: 0,
        byCategory: { work: 0, personal: 0, health: 0, education: 0 },
        byOwnership: { owned: 0, attending: 0 },
        upcoming: 0,
        today: 0
      };
    }
  },

  // Legacy methods for backward compatibility
  async getEvents() {
    return this.getUserEvents();
  },

  async searchEvents(query) {
    return this.searchUserEvents(query);
  },

  async getEventsByCategory(category) {
    return this.getUserEventsByCategory(category);
  },

  async getUpcomingEvents() {
    return this.getUserUpcomingEvents();
  },

  async getTodayEvents() {
    return this.getUserTodayEvents();
  },

  async getEventStats() {
    return this.getUserEventStats();
  },

  // Utility method to test API connection
  async testConnection() {
    try {
      console.log('API: Testing connection...');
      await apiCall('/events/user/stats');
      return { success: true, message: 'API connection successful' };
    } catch (error) {
      console.error('API: Connection test failed:', error);
      return { success: false, message: error.message };
    }
  }
};

// Export helper functions
// Export helper functions
export const apiHelpers = {
  makeApiCall: apiCall,
  formatEventForAPI,
  formatEventFromAPI,
  getApiBaseUrl: () => API_BASE_URL,
  getCurrentUser: getUserFromStorage,
  
  // Event styling helpers
  getEventStyleClass: (userRelationship) => {
    switch (userRelationship) {
      case 'owner': return 'event-owned';
      case 'attendee': return 'event-attending';
      default: return 'event-other';
    }
  },
  
  getEventColors: (userRelationship) => {
    switch (userRelationship) {
      case 'owner':
        return { backgroundColor: '#3b82f6', borderColor: '#1d4ed8' };
      case 'attendee':
        return { backgroundColor: '#10b981', borderColor: '#059669' };
      default:
        return { backgroundColor: '#9ca3af', borderColor: '#6b7280' };
    }
  },
  
  // NEW: Status icons for calendar events
  getStatusIcon: (status) => {
    const statusIcons = {
      UPCOMING: '⏰',      // Clock
      RUNNING: '🔄',       // Refresh
      COMPLETED: '✅',     // Check
      FINISHED: '🏁'       // Flag
    };
    return statusIcons[status] || '📅';
  },
  
  // NEW: Enhanced event styling with status
  getEventStyleWithStatus: (userRelationship, status) => {
    const statusColors = {
      UPCOMING: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      RUNNING: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
      COMPLETED: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
      FINISHED: { bg: '#f3e8ff', border: '#8b5cf6', text: '#5b21b6' }
    };
    
    const colors = statusColors[status] || statusColors.UPCOMING;
    
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        borderRadius: '6px',
        border: `2px solid ${colors.border}`,
        fontSize: '12px',
        padding: '2px 6px',
        fontWeight: '500'
      }
    };
  }
};

export default calendarAPI;
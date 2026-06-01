// services/webSocketService.js

// Mock WebSocket for development
function createMockWebSocket(url) {
  return {
    readyState: 1, // OPEN
    send: (data) => {
      console.log('Mock WebSocket send:', data);
    },
    close: () => {
      console.log('Mock WebSocket closed');
    },
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };
}

class SimpleWebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;

    // Handlers for specific topics
    this.handlers = new Map();
  }

  connect(url = 'ws://localhost:8080/ws') {
    return new Promise((resolve, reject) => {
      try {
        // In production, replace with: new WebSocket(url)
        this.socket = createMockWebSocket(url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          // You might want to implement reconnect logic here
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        // For mock, immediately trigger onopen
        if (this.socket.onopen) {
          setTimeout(() => this.socket.onopen(), 100);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Route incoming messages to the correct handler based on topic
  handleMessage(message) {
    console.log('Received message:', message);
    if (message.topic && this.handlers.has(message.topic)) {
      const handler = this.handlers.get(message.topic);
      try {
        handler(message);
      } catch (error) {
        console.error(`Error in handler for topic "${message.topic}":`, error);
      }
    } else {
      console.warn('Received message with no handler or topic:', message);
    }
  }

  // Generic send method
  send(message) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Cannot send message:', message);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.handlers.clear();
    }
  }

  // --- Subscription Methods ---
  subscribeToCalendarEvents(handler) {
    this.handlers.set('calendar', handler);
  }

  subscribeToEventNotifications(handler) {
    this.handlers.set('events', handler);
  }

  subscribeToPersonalNotifications(handler) {
    this.handlers.set('notifications', handler);
  }

  // --- Specific Send Methods ---
  sendCalendarSync(data) {
    this.send({ topic: 'calendar', type: 'calendar_sync', data });
  }

  sendEventCreated(data) {
    this.send({ topic: 'events', type: 'event_created', data });
  }

  sendEventUpdated(data) {
    this.send({ topic: 'events', type: 'event_updated', data });
  }

  sendEventDeleted(data) {
    this.send({ topic: 'events', type: 'event_deleted', data });
  }

  sendNotification(data) {
    this.send({ topic: 'notifications', type: 'notification', data });
  }

  // Method to get connection status (to maintain compatibility with existing code)
  getConnectionStatus() {
    if (!this.socket) return 'disconnected';
    if (this.isConnected) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'connecting';
  }
}

// Create singleton instance
const webSocketService = new SimpleWebSocketService();

export default webSocketService;
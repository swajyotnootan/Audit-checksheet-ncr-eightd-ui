// src/hooks/useWebSocket.js
import { useEffect, useCallback, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

let stompClient = null;

export const useWebSocket = (groupId, onMessageReceived) => {
  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;

  const connect = useCallback(() => {
    if (stompClient?.connected) return;
    try {
      const socket = new SockJS('https://qsutrarmsclm.hub.swajyot.co.in:8476/ws');
      stompClient = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('✅ WebSocket connected successfully!');
          if (groupIdRef.current) {
            stompClient.subscribe(`/topic/group/${groupIdRef.current}`, (message) => {
              try {
                const chatMessage = JSON.parse(message.body);
                onMessageReceived(chatMessage);
              } catch (error) {
                console.error('Error parsing WebSocket message:', error);
              }
            });
          }
        },
        onStompError: (frame) => {
          console.error('❌ WebSocket STOMP error:', frame);
        },
        onDisconnect: () => {
          console.log('🔌 WebSocket disconnected');
        },
        onWebSocketError: (error) => {
          console.error('❌ WebSocket connection error:', error);
        }
      });
      stompClient.activate();
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
    }
  }, [onMessageReceived]);

  const disconnect = useCallback(() => {
    if (stompClient) {
      stompClient.deactivate();
      stompClient = null;
    }
  }, []);

  const sendMessage = useCallback((messageData) => {
    if (stompClient?.connected && groupIdRef.current) {
      stompClient.publish({
        destination: `/app/sendMessage/${groupIdRef.current}`,
        body: JSON.stringify(messageData),
        headers: {
          'content-type': 'application/json'
        }
      });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { 
    sendMessage, 
    connected: stompClient?.connected,
    disconnect
  };
};
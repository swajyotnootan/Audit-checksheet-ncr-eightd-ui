import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import MessageInput from "./MessageInput";
import { Trash2 } from "lucide-react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

const SOCKET_URL = "http://10.2.0.95:8080/ws"; // replace with your backend websocket endpoint

const ChatWindow = ({ group }) => {
  const [messages, setMessages] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Fetch messages initially
  const fetchMessages = async () => {
    try {
      const res = await api.get(`/forum/groups/${group.id}/messages`);
      setMessages(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setLoading(false);
    }
  };

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();
  }, [group]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const socket = new SockJS(SOCKET_URL);
    const client = Stomp.over(socket);
    client.connect({}, () => {
      client.subscribe(`/topic/group.${group.id}`, (msg) => {
        if (msg.body) {
          const newMessage = JSON.parse(msg.body);
          setMessages((prev) => [...prev, newMessage]);
        }
      });
    });
    setStompClient(client);

    return () => {
      if (client) client.disconnect();
    };
  }, [group]);

  const handleSendMessage = (msg) => {
    if (stompClient && stompClient.connected) {
      stompClient.send(
        `/app/group.${group.id}`,
        {},
        JSON.stringify(msg)
      );
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await api.delete(`/forum/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) return <div className="p-4">Loading messages...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender?.username === localStorage.getItem("username")
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div className="max-w-[70%] bg-blue-100 p-2 rounded-lg relative">
              <p className="text-sm text-gray-800">{msg.content}</p>
              {msg.sender?.username === localStorage.getItem("username") && (
                <button
                  className="absolute top-0 right-0 p-1 text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteMessage(msg.id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
              {msg.attachmentUrl && (
                <div className="mt-1">
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    className="text-blue-700 underline text-sm"
                  >
                    View Attachment
                  </a>
                </div>
              )}
              <span className="text-xs text-gray-500 mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Message Input */}
      <MessageInput onSend={handleSendMessage} groupId={group.id} />
    </div>
  );
};

export default ChatWindow;

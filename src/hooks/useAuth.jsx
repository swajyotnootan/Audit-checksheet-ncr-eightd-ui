// src/hooks/useAuth.jsx
import { useState, useEffect } from "react";

const USER_STORAGE_KEY = "authenticated_user";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure user has email property
        if (parsedUser.email) {
          setUser(parsedUser);
        } else {
          // Handle your user structure (from your example)
          // {id: 8, email: "NakirekantiBalamuralikrishna@agi-glaspac.com", ...}
          setUser(parsedUser);
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  return { 
    user, 
    isLoading, 
    login, 
    logout 
  };
};
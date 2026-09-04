import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Global axios instance configured to use Vite dev proxy
export const api = axios.create({
  baseURL: '',
  timeout: 10000,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  // Sync token with axios header and localStorage
  const setSession = (userData) => {
    if (userData && userData.token) {
      localStorage.setItem('auth_user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      setUser(userData);
    } else {
      localStorage.removeItem('auth_user');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const updateUserProfileState = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  // Perform initial session restore and connection check
  useEffect(() => {
    const restoreSession = async () => {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
          setUser(parsed);
        } catch (e) {
          console.error("Failed to parse stored session", e);
          localStorage.removeItem('auth_user');
        }
      }

      // Check backend connectivity by fetching public categories
      try {
        await axios.get('/api/knowledge', { timeout: 4000 });
        setIsBackendConnected(true);
      } catch (err) {
        if (!err.response) {
          setIsBackendConnected(false);
        } else {
          setIsBackendConnected(true);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Axios Interceptors for authorization headers and error monitoring
  useEffect(() => {
    const reqInterceptor = api.interceptors.request.use(
      (config) => {
        const stored = localStorage.getItem('auth_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            config.headers['Authorization'] = `Bearer ${parsed.token}`;
          } catch (e) {}
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        setIsBackendConnected(true);
        return response;
      },
      (error) => {
        // Network / Connection error detection
        if (!error.response || error.code === 'ERR_NETWORK') {
          setIsBackendConnected(false);
        } else {
          setIsBackendConnected(true);
          
          // Auto-logout on token expiration (401 Unauthorized)
          if (error.response.status === 401) {
            setSession(null);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const data = response.data; // token, role, name, userId
      localStorage.removeItem('helpdesk_selected_agent_ticket_id');
      localStorage.removeItem('helpdesk_selected_customer_ticket_id');
      localStorage.removeItem('helpdesk_active_console');
      localStorage.removeItem('helpdesk_active_tab');
      setSession(data);
      setIsBackendConnected(true);
      return data;
    } catch (err) {
      if (!err.response) {
        setIsBackendConnected(false);
      }
      throw err;
    }
  };

  // Registration handler
  const register = async (name, email, password) => {
    try {
      const response = await api.post('/api/auth/register', { name, email, password });
      const data = response.data; // token, role, name, userId
      localStorage.removeItem('helpdesk_selected_agent_ticket_id');
      localStorage.removeItem('helpdesk_selected_customer_ticket_id');
      localStorage.removeItem('helpdesk_active_console');
      localStorage.removeItem('helpdesk_active_tab');
      setSession(data);
      setIsBackendConnected(true);
      return data;
    } catch (err) {
      if (!err.response) {
        setIsBackendConnected(false);
      }
      throw err;
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('helpdesk_selected_agent_ticket_id');
    localStorage.removeItem('helpdesk_selected_customer_ticket_id');
    localStorage.removeItem('helpdesk_active_console');
    localStorage.removeItem('helpdesk_active_tab');
    setSession(null);
  };

  // Re-check server connection manually
  const checkConnection = async () => {
    try {
      await axios.get('/api/knowledge', { timeout: 3000 });
      setIsBackendConnected(true);
      return true;
    } catch (err) {
      if (!err.response) {
        setIsBackendConnected(false);
        return false;
      }
      setIsBackendConnected(true);
      return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isBackendConnected,
        login,
        register,
        logout,
        checkConnection,
        updateUserProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

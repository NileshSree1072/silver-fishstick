import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import CustomerPortal from './pages/customer/CustomerPortal';
import AgentWorkspace from './pages/agent/AgentWorkspace';
import AdminConsole from './pages/admin/AdminConsole';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

function MainApp() {
  const { user, loading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Console state
  const [activeConsole, setActiveConsole] = useState(() => {
    return localStorage.getItem('helpdesk_active_console') || 'customer';
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('helpdesk_active_tab') || 'kb';
  });

  // Persist console selection
  useEffect(() => {
    localStorage.setItem('helpdesk_active_console', activeConsole);
  }, [activeConsole]);

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem('helpdesk_active_tab', activeTab);
  }, [activeTab]);

  // Sync default console on login with localStorage fallback validation
  useEffect(() => {
    if (user) {
      const role = user.role;

      const isConsoleValid = (con, rol) => {
        if (rol === 'USER') return con === 'customer';
        if (rol === 'AGENT') return con === 'agent';
        if (rol === 'ADMIN') return con === 'customer' || con === 'agent' || con === 'admin';
        return false;
      };

      const isTabValid = (con, tab) => {
        if (con === 'customer') return ['kb', 'create-ticket', 'history'].includes(tab);
        if (con === 'agent') return ['queue', 'kb-drafts'].includes(tab);
        if (con === 'admin') return ['dashboard', 'agents', 'users', 'articles', 'settings', 'sla', 'agent-performance', 'user-performance', 'audit-log', 'breach-log', 'transfer-log'].includes(tab);
        return false;
      };

      let finalConsole = activeConsole;
      let finalTab = activeTab;

      if (!isConsoleValid(activeConsole, role)) {
        if (role === 'AGENT') {
          finalConsole = 'agent';
          finalTab = 'queue';
        } else if (role === 'ADMIN') {
          finalConsole = 'admin';
          finalTab = 'dashboard';
        } else {
          finalConsole = 'customer';
          finalTab = 'kb';
        }
      } else if (!isTabValid(activeConsole, activeTab)) {
        finalTab = activeConsole === 'customer' ? 'kb' : activeConsole === 'agent' ? 'queue' : 'dashboard';
      }

      if (finalConsole !== activeConsole) {
        setActiveConsole(finalConsole);
      }
      if (finalTab !== activeTab) {
        setActiveTab(finalTab);
      }
    }
  }, [user, activeConsole, activeTab]);

  // Loading spinner on session restore
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-6 h-6 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (isRegisterMode) {
      return <Register onLoginRedirect={() => setIsRegisterMode(false)} />;
    }
    return <Login onRegisterRedirect={() => setIsRegisterMode(true)} />;
  }

  // Authenticated layout shell
  return (
    <Layout
      activeConsole={activeConsole}
      setActiveConsole={setActiveConsole}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {activeConsole === 'customer' && (
        <CustomerPortal activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
      {activeConsole === 'agent' && (
        <AgentWorkspace activeTab={activeTab} />
      )}
      {activeConsole === 'admin' && (
        <AdminConsole activeTab={activeTab} />
      )}
    </Layout>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AuthProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;

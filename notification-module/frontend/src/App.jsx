import React, { useState, useEffect } from 'react';
import { api, getUser, removeToken, removeUser } from './services/api';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplyLeave from './pages/ApplyLeave';
import LeaveHistory from './pages/LeaveHistory';
import Notifications from './pages/Notifications';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Restore session on mount
    const savedUser = getUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setCurrentView("dashboard");
    showToast("Signed out successfully. Security session terminated.", "info");
  };

  const renderActiveView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <Dashboard 
            user={user} 
            onViewChange={setCurrentView} 
            showToast={showToast} 
          />
        );
      case "apply":
        return (
          <ApplyLeave 
            user={user} 
            onViewChange={setCurrentView} 
            showToast={showToast} 
          />
        );
      case "history":
        return (
          <LeaveHistory 
            user={user} 
            showToast={showToast} 
          />
        );
      case "notifications":
        return (
          <Notifications 
            showToast={showToast} 
          />
        );
      case "admin":
        return (
          <AdminPanel 
            showToast={showToast} 
          />
        );
      default:
        return (
          <Dashboard 
            user={user} 
            onViewChange={setCurrentView} 
            showToast={showToast} 
          />
        );
    }
  };

  // If user is not authenticated, render Login Page
  if (!user) {
    return (
      <div className="app-shell" data-theme={theme}>
        <Login onLoginSuccess={setUser} showToast={showToast} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="app-container">
        {/* Ambient background glow orbs */}
        <div className="app-bg-glow" aria-hidden="true"></div>

        {/* Dynamic Sidebar */}
        <Sidebar 
          user={user} 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          onLogout={handleLogout} 
        />

        {/* Main Content Workspace viewport */}
        <main className="main-content">
          {renderActiveView()}
        </main>
      </div>

      {/* Global alert manager */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

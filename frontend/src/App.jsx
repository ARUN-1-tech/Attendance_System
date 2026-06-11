import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import StaffDashboard from './components/StaffDashboard';
import HODDashboard from './components/HODDashboard';
import './App.css';

const MainPortal = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Reset tab to default when user changes/logs out
  useEffect(() => {
    setActiveTab('dashboard');
  }, [user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '14px', fontWeight: '500' }}>Loading Portal...</span>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'student':
        return <StudentDashboard activeTab={activeTab} />;
      case 'staff':
        return <StaffDashboard activeTab={activeTab} />;
      case 'hod':
        return <HODDashboard activeTab={activeTab} />;
      case 'admin':
        return (
          <div className="card" style={{ maxWidth: '600px', marginTop: '40px' }}>
            <h1 style={{ marginBottom: '16px' }}>Django Admin Console</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Welcome back, Administrator. The core configuration database panels are managed directly within the Django Admin administration console.
            </p>
            <a 
              href="http://localhost:8000/admin/" 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary"
            >
              Go to Django Admin
            </a>
          </div>
        );
      default:
        return <div>Unauthorized role: {user.role}</div>;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderDashboard()}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainPortal />
    </AuthProvider>
  );
}

export default App;

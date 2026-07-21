import React, { useState, useEffect, Component } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import StaffDashboard from './components/StaffDashboard';
import HODDashboard from './components/HODDashboard';
import { Menu, ShieldAlert, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from './api';
import './App.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Portal Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          padding: '24px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '36px', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              backgroundColor: 'var(--danger-light)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <ShieldAlert size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Portal Refresh Notice
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
              The portal session experienced a temporary network state reset. Please click below to refresh and reload your session.
            </p>
            <button 
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', fontWeight: '700' }}
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={18} />
              <span>Reload ERP Portal</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainPortal = () => {
  const { user, loading, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reset tab to default when user changes/logs out
  useEffect(() => {
    setActiveTab('dashboard');
  }, [user?.username]);

  // Poll auth details every 5 seconds for students to update logout availability dynamically
  useEffect(() => {
    if (user && user.role === 'student') {
      const interval = setInterval(() => {
        checkAuth();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, checkAuth]);

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
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--ngp-blue)',
          borderRight: '4px solid var(--ngp-gold)',
          animation: 'spin 0.9s linear infinite'
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ngp-navy-header)' }}>Dr. NGP Institute of Technology</div>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Loading ERP Portal...</span>
        </div>
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
        return <HODDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'admin':
        return (
          <div className="card" style={{ maxWidth: '640px', marginTop: '20px', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: 'rgba(11, 37, 69, 0.1)', color: 'var(--ngp-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--ngp-navy-header)' }}>Django Admin Console</h1>
                <span className="ngp-header-badge">Dr. NGP IT ERP Administration</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
              Welcome back, Administrator. System configuration, user permissions, and master database entities are managed directly within the Django Admin administration console.
            </p>
            <a 
              href={`${api.baseUrl}/admin/`} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
            >
              <span>Launch Django Admin Console</span>
              <ExternalLink size={18} />
            </a>
          </div>
        );
      default:
        return <div style={{ padding: '24px', fontWeight: '600' }}>Unauthorized role: {user.role}</div>;
    }
  };

  return (
    <div className="app-container">
      {user && (
        <button 
          className="mobile-sidebar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position: 'fixed',
            top: '14px',
            left: '14px',
            zIndex: 1000,
            display: 'none',
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: 'var(--ngp-blue)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={20} />
        </button>
      )}
      {user && mobileOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />
      <main className="main-content">
        {renderDashboard()}
      </main>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainPortal />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

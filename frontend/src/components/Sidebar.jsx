import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, User, Calendar, FileText, 
  LogOut, Sun, Moon, CheckSquare, Users, Download, Clock,
  BookOpen
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout, theme, toggleTheme } = useAuth();

  if (!user) return null;

  const renderNavLinks = () => {
    if (user.role === 'student') {
      return (
        <>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Mark Attendance</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'leave' ? 'active' : ''}`}
            onClick={() => setActiveTab('leave')}
          >
            <FileText size={20} />
            <span>Leave & OD</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>My Profile</span>
          </div>
        </>
      );
    } else if (user.role === 'staff') {
      return (
        <>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Generate OTP</span>
          </div>
          {user.staff_details?.staff_type !== 'Normal' && (
            <div 
              className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              <CheckSquare size={20} />
              <span>Leave Approvals</span>
            </div>
          )}
          {user.staff_details?.staff_type !== 'Normal' && (
            <div 
              className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <Users size={20} />
              <span>My Students</span>
            </div>
          )}
          <div 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <Download size={20} />
            <span>Reports</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>Profile</span>
          </div>
        </>
      );
    } else if (user.role === 'hod') {
      return (
        <>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>HOD Dashboard</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <Users size={20} />
            <span>Manage Students</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Users size={20} />
            <span>Manage Staff</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            <Calendar size={20} />
            <span>Manage Classes</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            <CheckSquare size={20} />
            <span>Leave Approvals</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'morning' ? 'active' : ''}`}
            onClick={() => setActiveTab('morning')}
          >
            <Clock size={20} />
            <span>Morning Attendance</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>Profile</span>
          </div>
        </>
      );
    } else if (user.role === 'admin' || user.is_superuser) {
      return (
        <>
          <div 
            className={`nav-item active`}
          >
            <LayoutDashboard size={20} />
            <span>Admin Console</span>
          </div>
        </>
      );
    }
  };

  return (
    <nav className="sidebar">
      <div>
        <div style={{ padding: '0 16px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-primary)' }}>Attendance</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {user.role} Portal
          </span>
        </div>
        
        <div className="nav-menu">
          {renderNavLinks()}
        </div>
      </div>

      <div>
        {/* User Card info */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>
            {user.first_name || user.username} {user.last_name || ''}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {user.email}
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, padding: '8px' }} 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button 
            className="btn btn-danger" 
            style={{ flex: 1, padding: '8px' }} 
            onClick={logout}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;

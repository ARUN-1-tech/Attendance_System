import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, User, Calendar, FileText, 
  LogOut, Sun, Moon, CheckSquare, Users, Download, Clock,
  BookOpen, Award, ShieldCheck
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const renderNavLinks = () => {
    if (user.role === 'student') {
      return (
        <>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabClick('dashboard')}
          >
            <LayoutDashboard size={19} />
            <span>Mark Attendance</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'leave' ? 'active' : ''}`}
            onClick={() => handleTabClick('leave')}
          >
            <FileText size={19} />
            <span>Leave & OD Hub</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => handleTabClick('analysis')}
          >
            <BookOpen size={19} />
            <span>Attendance Analysis</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabClick('profile')}
          >
            <User size={19} />
            <span>My Profile</span>
          </div>
        </>
      );
    } else if (user.role === 'staff') {
      return (
        <>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabClick('dashboard')}
          >
            <LayoutDashboard size={19} />
            <span>Generate OTP</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'manual_attendance' ? 'active' : ''}`}
            onClick={() => handleTabClick('manual_attendance')}
          >
            <CheckSquare size={19} />
            <span>Manual Attendance</span>
          </div>
          {user.staff_details?.staff_type !== 'Normal' && (
            <div 
              className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => handleTabClick('approvals')}
            >
              <CheckSquare size={19} />
              <span>Leave Approvals</span>
            </div>
          )}
          {user.staff_details?.staff_type !== 'Normal' && (
            <div 
              className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => handleTabClick('students')}
            >
              <Users size={19} />
              <span>My Students</span>
            </div>
          )}
          {user.staff_details?.staff_type === 'Advisor' && (
            <div 
              className={`nav-item ${activeTab === 'advisor_live' ? 'active' : ''}`}
              onClick={() => handleTabClick('advisor_live')}
            >
              <Calendar size={19} />
              <span>Live Class Grid</span>
            </div>
          )}
          {user.staff_details?.staff_type === 'Advisor' && (
            <div 
              className={`nav-item ${activeTab === 'manage_subjects' ? 'active' : ''}`}
              onClick={() => handleTabClick('manage_subjects')}
            >
              <BookOpen size={19} />
              <span>Manage Subjects</span>
            </div>
          )}
          <div 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleTabClick('reports')}
          >
            <Download size={19} />
            <span>Reports</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabClick('profile')}
          >
            <User size={19} />
            <span>Profile</span>
          </div>
        </>
      );
    } else if (user.role === 'hod') {
      return (
        <>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabClick('dashboard')}
          >
            <LayoutDashboard size={19} />
            <span>HOD Dashboard</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => handleTabClick('staff')}
          >
            <Users size={19} />
            <span>Manage Staff</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => handleTabClick('classes')}
          >
            <Calendar size={19} />
            <span>Manage Classes</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => handleTabClick('approvals')}
          >
            <CheckSquare size={19} />
            <span>Leave Approvals</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleTabClick('reports')}
          >
            <Download size={19} />
            <span>Reports</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabClick('profile')}
          >
            <User size={19} />
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
            <LayoutDashboard size={19} />
            <span>Admin Console</span>
          </div>
        </>
      );
    }
  };

  return (
    <nav className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div>
        {/* NGP IT Branding Header */}
        <div style={{ padding: '0 8px', marginBottom: '24px' }}>
          <div className="ngp-brand-header">
            <div className="ngp-crest-icon">NGP</div>
            <div>
              <div className="ngp-brand-title">Dr. NGP IT</div>
              <div className="ngp-brand-subtitle">Autonomous Institution</div>
            </div>
          </div>
          <div style={{
            marginTop: '12px',
            padding: '4px 10px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--ngp-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>
              {user.role} Portal
            </span>
            <ShieldCheck size={13} style={{ color: 'var(--ngp-gold)' }} />
          </div>
        </div>
        
        <div className="nav-menu">
          {renderNavLinks()}
        </div>
      </div>

      <div>
        {/* User Profile Info Card */}
        <div style={{
          padding: '12px 14px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.first_name || user.username} {user.last_name || ''}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email || user.username}
          </div>
        </div>

        {/* Log Out Control */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {!(user && user.hide_logout) && (
            <button 
              className="btn btn-danger" 
              style={{
                flex: 1,
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '700'
              }} 
              onClick={logout}
              title="Log Out"
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;

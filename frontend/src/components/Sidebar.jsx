import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, User, Calendar, FileText, 
  LogOut, CheckSquare, Users, Download, 
  BookOpen, ShieldCheck, Sparkles
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

  const getRoleColor = (role) => {
    switch(role) {
      case 'student': return { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' };
      case 'staff': return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'hod': return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      default: return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
    }
  };

  const roleStyle = getRoleColor(user.role);

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
        <div className="nav-item active">
          <LayoutDashboard size={19} />
          <span>Admin Console</span>
        </div>
      );
    }
  };

  const initial = (user.first_name || user.username || 'U').charAt(0).toUpperCase();

  return (
    <nav className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div>
        {/* Institutional Branding Header */}
        <div style={{ padding: '0 4px', marginBottom: '24px' }}>
          <div className="ngp-brand-header">
            <div className="ngp-crest-icon">NGP</div>
            <div>
              <div className="ngp-brand-title">Dr. NGP IT</div>
              <div className="ngp-brand-subtitle">Autonomous ERP</div>
            </div>
          </div>
          <div style={{
            marginTop: '16px',
            padding: '8px 14px',
            backgroundColor: roleStyle.bg,
            borderRadius: 'var(--radius-pill)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: `1px solid ${roleStyle.border}`,
            boxShadow: 'var(--shadow-xs)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} style={{ color: roleStyle.text }} />
              <span style={{ fontSize: '11px', color: roleStyle.text, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '800' }}>
                {user.role} Portal
              </span>
            </div>
            <ShieldCheck size={14} style={{ color: roleStyle.text }} />
          </div>
        </div>
        
        <div className="nav-menu">
          {renderNavLinks()}
        </div>
      </div>

      <div>
        {/* User Profile Info Card */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {user.profile_photo ? (
            <img 
              src={user.profile_photo} 
              alt="Avatar" 
              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
            />
          ) : (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)',
              color: '#FFFFFF', fontWeight: '800', fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
              flexShrink: 0
            }}>
              {initial}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.first_name || user.username} {user.last_name || ''}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
              {user.email || user.username}
            </div>
          </div>
        </div>

        {/* Log Out Control */}
        {!(user && user.hide_logout) && (
          <button 
            className="btn btn-danger" 
            style={{
              width: '100%',
              padding: '12px',
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
    </nav>
  );
};

export default Sidebar;

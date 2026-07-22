import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, Lock, User, ShieldCheck, Award, GraduationCap, CheckCircle2, Sparkles, Eye, EyeOff } from 'lucide-react';

const slides = [
  {
    image: '/ngp_campus1.png',
    badge: 'State-of-the-Art Infrastructure',
    title: 'Dr. NGP Institute of Technology',
    subtitle: 'Autonomous Institution | Approved by AICTE, Affiliated to Anna University',
    highlight: 'Empowering Future Engineers & Innovators in Coimbatore'
  },
  {
    image: '/ngp_campus2.png',
    badge: 'Advanced Academic Excellence',
    title: 'Smart ERP & Learning Hub',
    subtitle: 'Real-time Attendance, Analytics & Campus Administration',
    highlight: 'Fostering Academic Discipline with Seamless Digital Tracking'
  }
];

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
      setImgError(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentSlide = slides[activeSlideIndex] || slides[0];

  return (
    <div className="login-split-wrapper">
      {/* LEFT COLUMN: Premium Institutional Ambient Panel */}
      <div className="login-showcase-panel">
        {!imgError && currentSlide.image ? (
          <img 
            key={activeSlideIndex}
            src={currentSlide.image} 
            alt="Dr. NGP IT Campus" 
            className="login-slide-media"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 20% 20%, #312E81 0%, #1E1B4B 40%, #0F172A 100%)'
          }} />
        )}

        {/* Ambient Dark Mesh Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.75) 40%, rgba(15, 23, 42, 0.96) 100%)',
          zIndex: 1
        }} />

        {/* Header Branding */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#0F172A',
              fontWeight: '900',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)'
            }}>
              NGP
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: '1.2' }}>Dr. NGP IT</div>
              <div style={{ fontSize: '10px', color: '#FCD34D', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Autonomous ERP</div>
            </div>
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            fontSize: '11px',
            fontWeight: '700',
            color: '#FDE68A'
          }}>
            <Award size={13} style={{ color: '#F59E0B' }} />
            {currentSlide.badge}
          </span>
        </div>

        {/* Center Showcase Details */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '480px', margin: 'auto 0', padding: '16px 0' }}>
          <div key={`content-${activeSlideIndex}`} className="animated-tab-content">
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#FFFFFF', lineHeight: '1.25', marginBottom: '12px', letterSpacing: '-0.03em' }}>
              {currentSlide.title}
            </h1>
            <p style={{ fontSize: '15px', color: '#CBD5E1', fontWeight: '400', marginBottom: '20px', lineHeight: '1.55' }}>
              {currentSlide.subtitle}
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'rgba(79, 70, 229, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: 'var(--radius-md)',
              backdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              <Sparkles size={16} style={{ color: '#F59E0B' }} />
              <span>{currentSlide.highlight}</span>
            </div>
          </div>
        </div>

        {/* Bottom Carousel Controls & Accreditation */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveSlideIndex(index);
                  setImgError(false);
                }}
                style={{
                  width: activeSlideIndex === index ? '30px' : '8px',
                  height: '8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: activeSlideIndex === index ? '#F59E0B' : 'rgba(255, 255, 255, 0.25)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                title={`Slide ${index + 1}`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} style={{ color: '#10B981' }} /> AICTE Approved
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GraduationCap size={13} style={{ color: '#F59E0B' }} /> Anna Univ Affiliated
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Ultra-Clean Form */}
      <div className="login-form-panel">
        <div className="card animated-card" style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 32px',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          borderRadius: '20px',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span className="ngp-header-badge" style={{ marginBottom: '10px', display: 'inline-flex' }}>
              <ShieldCheck size={13} style={{ color: '#D97706' }} />
              Official ERP Portal
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--navy-header)', marginTop: '4px', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              Portal Sign In
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', fontWeight: '500' }}>
              Access Student, Faculty & Management Dashboards
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '20px',
              borderLeft: '4px solid #DC2626',
              boxShadow: 'var(--shadow-xs)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" htmlFor="username" style={{ fontSize: '13px', fontWeight: '700' }}>Username / Register No</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8'
                }} />
                <input
                  id="username"
                  type="text"
                  className="input"
                  style={{ paddingLeft: '44px', height: '46px', fontSize: '14px' }}
                  placeholder="Staff ID / Student Reg No"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '26px' }}>
              <label className="form-label" htmlFor="password" style={{ fontSize: '13px', fontWeight: '700' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8'
                }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '44px', paddingRight: '44px', height: '46px', fontSize: '14px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '48px',
                fontSize: '14.5px',
                fontWeight: '700',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
              disabled={submitting}
            >
              {submitting ? 'Authenticating...' : (
                <>
                  <span>Sign In to Dashboard</span>
                  <LogIn size={17} />
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            fontWeight: '600'
          }}>
            Dr. NGP Institute of Technology - Autonomous Campus ERP
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

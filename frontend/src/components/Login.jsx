import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, Lock, User, ShieldCheck, Award, GraduationCap, CheckCircle2, Sparkles } from 'lucide-react';

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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  // Auto advance slideshow every 5 seconds
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
      {/* LEFT COLUMN: College Animated Image Slideshow Showcase */}
      <div className="login-showcase-panel">
        {/* Dynamic Background Image with Smooth Fade */}
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
            background: 'linear-gradient(135deg, #0B2545 0%, #13315C 50%, #1D4ED8 100%)',
            opacity: 0.95
          }} />
        )}

        {/* Dark Gradient Backdrop Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(6, 23, 46, 0.75) 0%, rgba(11, 37, 69, 0.65) 50%, rgba(6, 23, 46, 0.92) 100%)',
          zIndex: 1
        }} />

        {/* Top Header Badge */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#0F172A',
              fontWeight: '900',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)'
            }}>
              NGP
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em' }}>Dr. NGP IT</div>
              <div style={{ fontSize: '11px', color: '#FCD34D', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coimbatore</div>
            </div>
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '12px',
            fontWeight: '700',
            color: '#FEE685'
          }}>
            <Award size={14} style={{ color: '#F59E0B' }} />
            {currentSlide.badge}
          </span>
        </div>

        {/* Center Animated Slide Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '560px', marginTop: 'auto', marginBottom: 'auto', padding: '24px 0' }}>
          <div key={`content-${activeSlideIndex}`} className="animated-tab-content">
            <h1 style={{ fontSize: '34px', fontWeight: '800', color: '#FFFFFF', lineHeight: '1.2', marginBottom: '12px', letterSpacing: '-0.03em' }}>
              {currentSlide.title}
            </h1>
            <p style={{ fontSize: '15px', color: '#CBD5E1', fontWeight: '500', marginBottom: '20px', lineHeight: '1.6' }}>
              {currentSlide.subtitle}
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              backgroundColor: 'rgba(29, 78, 216, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
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

        {/* Bottom Carousel Navigation Dots & Features */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveSlideIndex(index);
                  setImgError(false);
                }}
                style={{
                  width: activeSlideIndex === index ? '32px' : '10px',
                  height: '10px',
                  borderRadius: '9999px',
                  backgroundColor: activeSlideIndex === index ? '#F59E0B' : 'rgba(255, 255, 255, 0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                title={`Slide ${index + 1}`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} style={{ color: '#10B981' }} /> AICTE Approved
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GraduationCap size={14} style={{ color: '#F59E0B' }} /> Anna University Affiliated
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sign In Form Container */}
      <div className="login-form-panel">
        <div className="card animated-card" style={{
          width: '100%',
          maxWidth: '430px',
          padding: '38px 34px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span className="ngp-header-badge" style={{ marginBottom: '10px' }}>
              <ShieldCheck size={13} style={{ color: '#D97706' }} />
              Official ERP Portal
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ngp-navy-header)', marginTop: '4px', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              Portal Sign In
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>
              Enter your credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '22px',
              borderLeft: '4px solid var(--danger)',
              boxShadow: 'var(--shadow-xs)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username / Register No</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="username"
                  type="text"
                  className="input"
                  style={{ paddingLeft: '42px', height: '46px' }}
                  placeholder="Staff ID / Student Register No"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="password"
                  type="password"
                  className="input"
                  style={{ paddingLeft: '42px', height: '46px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '48px',
                fontSize: '15px',
                fontWeight: '700',
                borderRadius: 'var(--radius-sm)'
              }}
              disabled={submitting}
            >
              {submitting ? 'Authenticating...' : (
                <>
                  <span>Sign In to Dashboard</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '28px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontWeight: '600'
          }}>
            Dr. NGP Institute of Technology - ERP System
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

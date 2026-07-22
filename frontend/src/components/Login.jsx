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
            background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)',
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
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(30, 27, 75, 0.72) 50%, rgba(15, 23, 42, 0.94) 100%)',
          zIndex: 1
        }} />

        {/* Top Header Badge */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#0F172A',
              fontWeight: '900',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)'
            }}>
              NGP
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em' }}>Dr. NGP IT</div>
              <div style={{ fontSize: '11px', color: '#FCD34D', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coimbatore</div>
            </div>
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '12px',
            fontWeight: '700',
            color: '#FDE68A'
          }}>
            <Award size={14} style={{ color: '#F59E0B' }} />
            {currentSlide.badge}
          </span>
        </div>

        {/* Center Animated Slide Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '560px', marginTop: 'auto', marginBottom: 'auto', padding: '24px 0' }}>
          <div key={`content-${activeSlideIndex}`} className="animated-tab-content">
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', lineHeight: '1.2', marginBottom: '14px', letterSpacing: '-0.03em' }}>
              {currentSlide.title}
            </h1>
            <p style={{ fontSize: '16px', color: '#E2E8F0', fontWeight: '500', marginBottom: '22px', lineHeight: '1.6' }}>
              {currentSlide.subtitle}
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 20px',
              backgroundColor: 'rgba(79, 70, 229, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-md)',
              backdropFilter: 'blur(12px)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              <Sparkles size={18} style={{ color: '#F59E0B' }} />
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
                  width: activeSlideIndex === index ? '36px' : '10px',
                  height: '10px',
                  borderRadius: 'var(--radius-pill)',
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
          maxWidth: '440px',
          padding: '40px 36px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span className="ngp-header-badge" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={14} style={{ color: '#D97706' }} />
              Official ERP Portal
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--navy-header)', marginTop: '6px', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              Portal Sign In
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
              Enter your credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '24px',
              borderLeft: '4px solid var(--danger)',
              boxShadow: 'var(--shadow-xs)',
              animation: 'shakeError 0.4s ease-in-out'
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
                  style={{ paddingLeft: '44px', height: '48px' }}
                  placeholder="Staff ID / Student Register No"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '30px' }}>
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
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '44px', paddingRight: '44px', height: '48px' }}
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
                    color: 'var(--text-muted)',
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
                height: '50px',
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
            marginTop: '30px',
            paddingTop: '18px',
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

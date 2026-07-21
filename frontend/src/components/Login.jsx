import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, Lock, User, ShieldCheck, Award } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(11, 37, 69, 0.08) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.06) 0%, transparent 50%)',
      padding: '24px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* NGP IT Institutional Crest & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0B2545 0%, #06172E 100%)',
            border: '2px solid #D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 6px 16px rgba(11, 37, 69, 0.25)'
          }}>
            <span style={{ color: '#D4AF37', fontWeight: '900', fontSize: '24px', letterSpacing: '-1px' }}>NGP</span>
          </div>

          <span className="ngp-header-badge" style={{ marginBottom: '10px' }}>
            <Award size={13} style={{ color: '#D4AF37' }} />
            Autonomous Institution
          </span>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--ngp-navy)', marginTop: '4px', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            Dr. NGP Institute of Technology
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>
            Smart Attendance ERP & Academic Portal
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
                style={{ paddingLeft: '42px', height: '44px' }}
                placeholder="Staff ID / Register Number"
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
                style={{ paddingLeft: '42px', height: '44px' }}
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
              height: '46px',
              fontSize: '15px',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)'
            }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : (
              <>
                <span>Sign In to Portal</span>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={14} style={{ color: 'var(--ngp-gold)' }} />
          <span>Coimbatore - Approved by AICTE, Affiliated to Anna University</span>
        </div>
      </div>
    </div>
  );
};

export default Login;

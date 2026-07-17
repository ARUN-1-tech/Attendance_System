import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { 
  CheckCircle, XCircle, Award, Percent, 
  MapPin, Send, Plus, Upload, Calendar, User, LogOut, Download
} from 'lucide-react';

const StudentDashboard = ({ activeTab }) => {
  const { user, checkAuth, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // Subject detail states
  const [subjectDetailModalOpen, setSubjectDetailModalOpen] = useState(false);
  const [subjectDetailData, setSubjectDetailData] = useState(null);
  const [subjectDetailLoading, setSubjectDetailLoading] = useState(false);

  // Profile states
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone_number || '');
  const [dob, setDob] = useState(user.dob || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileEditMode, setProfileEditMode] = useState(false);

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // OTP marking states
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  // Leave states
  const [leaves, setLeaves] = useState([]);
  const [leaveType, setLeaveType] = useState('Leave');
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState('');
  const [leaveError, setLeaveError] = useState('');



  const handleSubjectClick = async (studentUsername, subjectId) => {
    setSubjectDetailLoading(true);
    setSubjectDetailModalOpen(true);
    setSubjectDetailData(null);
    try {
      const data = await api.get(`/api/attendances/subject-detail/?student_username=${studentUsername}&subject_id=${subjectId}`);
      setSubjectDetailData(data);
    } catch (err) {
      console.error('Failed to fetch subject details:', err);
      alert('Failed to load subject details.');
      setSubjectDetailModalOpen(false);
    } finally {
      setSubjectDetailLoading(false);
    }
  };

  const handleDownloadSubjectDetailCSV = async (studentUsername, subjectId, subjectCode) => {
    try {
      const csvText = await api.get(`/api/attendances/subject-detail/?student_username=${studentUsername}&subject_id=${subjectId}&download=true`);
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_${studentUsername}_${subjectCode}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download subject CSV:', err);
      alert('Failed to download CSV report.');
    }
  };

  // Load stats and leaves on tab mount
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats(true);
    } else if (activeTab === 'analysis') {
      fetchStats(false);
    } else if (activeTab === 'leave') {
      fetchLeaves();
    }
  }, [activeTab]);

  const fetchStats = async (isToday = false) => {
    if (isToday) {
      setStatsLoading(true);
      try {
        const data = await api.get(`/api/attendance/student-stats/${user.username}/?today=true`);
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    } else {
      setAnalysisLoading(true);
      try {
        const data = await api.get(`/api/attendance/student-stats/${user.username}/`);
        setAnalysisStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setAnalysisLoading(false);
      }
    }
  };

  const fetchLeaves = async () => {
    try {
      const data = await api.get('/api/leaves/');
      setLeaves(data);
    } catch (err) {
      console.error(err);
    }
  };



  // OTP Verification
  const handleMarkAttendance = (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP.');
      return;
    }

    setOtpSubmitting(true);

    if (!navigator.geolocation) {
      setOtpError('Geolocation is not supported by your browser.');
      setOtpSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await api.post('/api/attendance/verify-otp/', {
            otp_code: otpCode,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setOtpSuccess(res.detail || 'Attendance marked successfully!');
          setOtpCode('');
          fetchStats(true); // Refresh stats
        } catch (err) {
          setOtpError(err.message || 'Verification failed.');
        } finally {
          setOtpSubmitting(false);
        }
      },
      (error) => {
        setOtpError('Failed to get location. Please enable location permissions.');
        setOtpSubmitting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit Leave / OD
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveError('');
    setLeaveSuccess('');

    if (!leaveDate || !leaveReason) {
      setLeaveError('Please select a date and enter a reason.');
      return;
    }

    setLeaveSubmitting(true);
    try {
      await api.post('/api/leaves/', {
        leave_type: leaveType,
        date: leaveDate,
        reason: leaveReason
      });
      setLeaveSuccess(`${leaveType} request submitted successfully.`);
      setLeaveDate('');
      setLeaveReason('');
      fetchLeaves();
    } catch (err) {
      setLeaveError(err.message || 'Failed to submit leave.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Upload proof file
  const handleUploadProof = async (leaveId, file) => {
    const formData = new FormData();
    formData.append('proof', file);

    try {
      await api.post(`/api/leaves/${leaveId}/upload_proof/`, formData, {
        headers: {} // Let browser set boundary
      });
      alert('Proof uploaded successfully!');
      fetchLeaves();
    } catch (err) {
      alert(err.message || 'Failed to upload proof.');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setPasswordError("New passwords do not match.");
        return;
      }
      if (!currentPassword) {
        setPasswordError("Current password is required to change password.");
        return;
      }
      setPasswordSubmitting(true);
      try {
        await api.post(`/api/users/${user.id}/change_password/`, {
          current_password: currentPassword,
          new_password: newPassword
        });
        setPasswordMessage("Password updated successfully.");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        setPasswordError(err.message || 'Failed to change password.');
        setPasswordSubmitting(false);
        return;
      } finally {
        setPasswordSubmitting(false);
      }
    }

    try {
      await api.patch(`/api/users/${user.id}/`, {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone,
        dob: dob || null,
        role: user.role,
        username: user.username
      });
      setProfileMessage('Profile updated successfully!');
      if (checkAuth) {
        await checkAuth();
      }
      setProfileEditMode(false);
    } catch (err) {
      setProfileMessage(`Error: ${err.message}`);
    }
  };

  // Render Tabs
  if (activeTab === 'dashboard') {
    return (
      <div>
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Mark Daily Attendance</h1>
          {user && !user.hide_logout && (
            <button 
              className="btn btn-danger" 
              onClick={logout} 
              style={{ 
                padding: '8px 16px', 
                fontSize: '13px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                height: '38px',
                fontWeight: '600'
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          )}
        </div>

        {/* Stats Grid */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-4" style={{ marginBottom: '32px' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.present}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Present Periods</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                <XCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.absent}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Absent Periods</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                <Award size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.verified_od} / {stats.od}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Verified ODs</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)' }}>
                <Percent size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.percentage}%</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Attendance Rate</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2">
          {/* OTP Submitter */}
          <div className="card">
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} />
              Submit Attendance Code
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Enter the 6-digit session OTP code shown by the tutor. Make sure to allow location permissions in your browser.
            </p>

            {otpError && (
              <div style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-light)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
                {otpError}
              </div>
            )}
            {otpSuccess && (
              <div style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
                {otpSuccess}
              </div>
            )}

            <form onSubmit={handleMarkAttendance}>
              <div className="form-group">
                <input
                  type="text"
                  maxLength={6}
                  className="input"
                  style={{
                    textAlign: 'center',
                    fontSize: '28px',
                    letterSpacing: '0.4em',
                    fontWeight: '700',
                    height: '60px'
                  }}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={otpSubmitting}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', height: '46px' }}
                disabled={otpSubmitting}
              >
                {otpSubmitting ? 'Verifying Coordinates...' : (
                  <>
                    <span>Submit Verification</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick instructions / Info card */}
          <div className="card">
            <h2 style={{ marginBottom: '16px' }}>Instructions</h2>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><strong>Active OTPs expire in 3 minutes</strong>: Be ready to submit the code as soon as it is generated by your teacher.</li>
              <li><strong>100m Geofencing Limit</strong>: You must be present inside the classroom. Submitting the code from home or outside the building will be blocked.</li>
              <li><strong>Attendance Percentage</strong>: Ensure your attendance rate stays above 75%. Verified ODs count towards your attendance.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'leave') {
    return (
      <div>
        <div className="header">
          <h1>Leave & On-Duty Requests</h1>
        </div>

        <div className="grid grid-cols-3">
          {/* Apply Form */}
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <h2 style={{ marginBottom: '20px' }}>Apply Request</h2>

            {leaveError && (
              <div style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-light)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
                {leaveError}
              </div>
            )}
            {leaveSuccess && (
              <div style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
                {leaveSuccess}
              </div>
            )}

            <form onSubmit={handleApplyLeave}>
              <div className="form-group">
                <label className="form-label">Request Type</label>
                <select 
                  className="input" 
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="Leave">Leave (Personal/Medical)</option>
                  <option value="OD">On Duty (OD - College Event)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea 
                  rows={4}
                  className="input" 
                  placeholder="Enter detailed explanation..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', height: '44px' }}
                disabled={leaveSubmitting}
              >
                <span>Submit Request</span>
                <Plus size={16} />
              </button>
            </form>
          </div>

          {/* Requested Leaves List */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h2 style={{ marginBottom: '20px' }}>Requested Approvals</h2>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>S.No</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Hierarchy Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No leave/OD requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l, idx) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{l.date}</td>
                        <td>
                          <span className={`badge ${l.leave_type === 'OD' ? 'badge-od' : 'badge-leave'}`}>
                            {l.leave_type}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason}>
                          {l.reason}
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div>Tutor: <strong>{l.tutor_approved}</strong></div>
                            <div>Advisor: <strong>{l.advisor_approved}</strong></div>
                            <div>HOD: <strong>{l.hod_approved}</strong></div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span className={`badge ${l.final_status === 'Approved' ? 'badge-present' : (l.final_status === 'Rejected' ? 'badge-absent' : 'badge-leave')}`}>
                              {l.final_status}
                            </span>
                            {l.leave_type === 'OD' && l.final_status === 'Approved' && !l.certificate_verified && (
                              <div>
                                {l.certificate_deadline && new Date() > new Date(l.certificate_deadline) ? (
                                  <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: '600' }}>Overdue (10 days passed)</span>
                                ) : (
                                  <div style={{ position: 'relative' }}>
                                    <label className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '11px', cursor: 'pointer' }}>
                                      <Upload size={12} />
                                      <span>Proof</span>
                                      <input 
                                        type="file" 
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                          if (e.target.files[0]) {
                                            handleUploadProof(l.id, e.target.files[0]);
                                          }
                                        }}
                                      />
                                    </label>
                                    {l.certificate_deadline && (
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Due: {new Date(l.certificate_deadline).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {l.certificate_verified && (
                              <span className="badge badge-present" style={{ fontSize: '10px' }}>Cert Verified</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }



  if (activeTab === 'analysis') {
    if (analysisLoading) {
      return <div className="card">Loading attendance analysis...</div>;
    }
    if (!analysisStats) {
      return <div className="card">No attendance data found.</div>;
    }

    const isSafe = analysisStats.percentage >= 75;
    const progressColor = isSafe ? 'var(--success)' : 'var(--danger)';
    
    return (
      <div>
        <div className="header">
          <h1>Attendance Insights & Analytics</h1>
        </div>

        {/* AI Suggestion Box */}
        <div className="card" style={{
          background: isSafe 
            ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(39, 174, 96, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(192, 57, 43, 0.15) 100%)',
          borderLeft: `5px solid ${progressColor}`,
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: progressColor, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span>🤖 AI Assistant Suggestion</span>
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>
            {analysisStats.ai_suggestion}
          </p>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-4" style={{ marginBottom: '24px' }}>
          {/* Overall Ring Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', align_items: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="transparent" stroke={progressColor} strokeWidth="10" 
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - analysisStats.percentage / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {analysisStats.percentage}%
              </div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '16px' }}>Overall Attendance</div>
          </div>

          {/* Periods Stats */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Periods Breakdown</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>Total Periods:</span>
              <strong>{analysisStats.total_periods}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)' }}>
              <span>Present Periods:</span>
              <strong>{analysisStats.present_periods}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--info)' }}>
              <span>Verified OD (Present):</span>
              <strong>{analysisStats.verified_od_periods}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--danger)' }}>
              <span>Absent Periods:</span>
              <strong>{analysisStats.absent_periods}</strong>
            </div>
          </div>

          {/* Days Stats */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Days Breakdown</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>Total Working Days:</span>
              <strong>{analysisStats.total_days}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)' }}>
              <span>Present Days:</span>
              <strong>{analysisStats.present_days}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--info)' }}>
              <span>On-Duty (OD) Days:</span>
              <strong>{analysisStats.od_days}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--danger)' }}>
              <span>Absent Days:</span>
              <strong>{analysisStats.absent_days}</strong>
            </div>
          </div>

          {/* Leave and OD breakdown */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Leaves & ODs</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>Total OD Periods:</span>
              <strong>{analysisStats.od_periods}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>Total Leave Periods:</span>
              <strong>{analysisStats.leave_periods}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--info)' }}>
              <span>OD Days Count:</span>
              <strong>{analysisStats.od_days}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--warning)' }}>
              <span>Leave Days Count:</span>
              <strong>{analysisStats.leave_days}</strong>
            </div>
          </div>
        </div>

        {/* Subject wise analysis */}
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Subject-wise Attendance Details</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>S.No</th>
                  <th>Subject</th>
                  <th>Attendance Status</th>
                  <th>Periods (Attended/Total)</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!analysisStats.subjects_breakdown || analysisStats.subjects_breakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No subject-wise details available.</td>
                  </tr>
                ) : (
                  analysisStats.subjects_breakdown.map((sub, idx) => {
                    const subSafe = sub.percentage >= 75.0;
                    const subColor = subSafe ? 'var(--success)' : 'var(--danger)';
                    return (
                      <tr 
                        key={idx} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSubjectClick(user.username, sub.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{sub.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub.code}</div>
                        </td>
                        <td style={{ width: '240px' }}>
                          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${sub.percentage}%`, height: '100%', backgroundColor: subColor, borderRadius: '4px' }} />
                          </div>
                        </td>
                        <td>
                          <strong>{sub.effective_present}</strong> / {sub.total_periods} 
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            (Raw Pres: {sub.present_periods}, OD: {sub.verified_od_periods})
                          </span>
                        </td>
                        <td style={{ fontWeight: '700', color: subColor }}>{sub.percentage}%</td>
                        <td>
                          <span className={`badge ${subSafe ? 'badge-present' : 'badge-absent'}`}>
                            {subSafe ? 'Safe' : 'Critical'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {subjectDetailModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            backdropFilter: 'blur(4px)'
          }}>
            <div className="card" style={{ width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Subject Attendance Log</h2>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setSubjectDetailModalOpen(false)}>Close</button>
              </div>
              
              {subjectDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading details...</div>
              ) : !subjectDetailData ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No details found.</div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '13px' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>Student</div>
                      <strong>{subjectDetailData.student_details.name}</strong> ({subjectDetailData.student_details.reg_no})
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>Subject</div>
                      <strong>{subjectDetailData.subject_details.name}</strong> ({subjectDetailData.subject_details.code})
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Hours</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{subjectDetailData.stats.total_hours}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--success)' }}>Present</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>{subjectDetailData.stats.effective_present}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--danger)' }}>Absent</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--danger)', marginTop: '2px' }}>{subjectDetailData.stats.absent_count}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--info)' }}>Percentage</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--info)', marginTop: '2px' }}>{subjectDetailData.stats.percentage}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Attendance Log</h3>
                    <button 
                      className="btn btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleDownloadSubjectDetailCSV(subjectDetailData.student_details.username, subjectDetailData.subject_details.id, subjectDetailData.subject_details.code)}
                    >
                      <Download size={14} />
                      Download CSV
                    </button>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', width: '60px' }}>S.No</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>Period</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectDetailData.records.map((rec, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '600' }}>{rIdx + 1}</td>
                            <td style={{ padding: '10px 12px' }}>{rec.date}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>Period {rec.period}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span 
                                className={`badge ${rec.status === 'Present' ? 'badge-present' : (rec.status === 'Absent' ? 'badge-absent' : 'badge-od')}`}
                                style={{ opacity: rec.ignored ? 0.5 : 1 }}
                              >
                                {rec.status} {rec.ignored && '(Ignored)'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {subjectDetailData.records.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No records logged.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'profile') {
    const student = user.student_details;
    return (
      <div>
        <div className="header">
          <h1>My Student Profile</h1>
        </div>

        <div className="card" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            {user.profile_photo ? (
              <img src={user.profile_photo} alt="Profile" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={32} />
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '20px' }}>{user.first_name || user.username} {user.last_name || ''}</h2>
              <span className="badge badge-present" style={{ marginTop: '4px' }}>Class Roll: {user.username}</span>
            </div>
          </div>

          {!profileEditMode ? (
            /* View Details mode */
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Email</div>
                  <div>{user.email}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Roll Number</div>
                  <div>{student?.roll_no || '-'}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Registration Number</div>
                  <div>{student?.reg_no || '-'}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Phone Number</div>
                  <div>{user.phone_number || '-'}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Date of Birth</div>
                  <div>{user.dob || '-'}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Class / Year</div>
                  <div>{student ? `${student.class_name} (Year ${student.class_year}, Sec ${student.class_section})` : '-'}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Assigned Tutor</div>
                  <div>{student?.tutor_name || '-'}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Assigned Advisor</div>
                  <div>{student?.advisor_name || '-'}</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setProfileEditMode(true)}>
                Edit Details
              </button>
            </div>
          ) : (
            /* Edit Form mode */
            <form onSubmit={handleUpdateProfile}>
              {profileMessage && (
                <div style={{
                  padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px',
                  color: profileMessage.includes('Error') ? 'var(--danger)' : 'var(--success)',
                  backgroundColor: profileMessage.includes('Error') ? 'var(--danger-light)' : 'var(--success-light)'
                }}>
                  {profileMessage}
                </div>
              )}

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="input" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>

              {/* Password Change inside Edit Profile */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Change Password (Optional)</h3>
                
                {passwordMessage && (
                  <div style={{
                    padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px',
                    color: 'var(--success)', backgroundColor: 'var(--success-light)'
                  }}>
                    {passwordMessage}
                  </div>
                )}
                {passwordError && (
                  <div style={{
                    padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px',
                    color: 'var(--danger)', backgroundColor: 'var(--danger-light)'
                  }}>
                    {passwordError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password to make changes"
                    required={newPassword.length > 0}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={passwordSubmitting}>
                  {passwordSubmitting ? 'Updating...' : 'Update Profile Settings'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setProfileEditMode(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordMessage('');
                  setPasswordError('');
                }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default StudentDashboard;

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { 
  Play, Check, X, ShieldAlert, Award, FileSpreadsheet, 
  Trash2, Plus, Calendar, User, Eye
} from 'lucide-react';

const StaffDashboard = ({ activeTab }) => {
  const { user, checkAuth } = useAuth();
  
  // Data lists
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // OTP generator states
  const [selectedDepartment, setSelectedDepartment] = useState(user.department || '');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [otpClasses, setOtpClasses] = useState([]);
  
  // Approvals states
  const [leaves, setLeaves] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalSubTab, setApprovalSubTab] = useState('leave');

  // Students list states
  const [students, setStudents] = useState([]);
  const [selectedStudentStats, setSelectedStudentStats] = useState(null);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Report states
  const [reportType, setReportType] = useState(
    user.staff_details?.staff_type === 'Tutor' ? 'tutored' : 'class'
  );
  const [reportClassId, setReportClassId] = useState('');
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState([]);

  // Profile states
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone_number || '');
  const [age, setAge] = useState(user.age || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileEditMode, setProfileEditMode] = useState(false);

  const statsInterval = useRef(null);

  // Initial loads
  useEffect(() => {
    fetchClassesAndSubjects();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchLeavesAndODs();
    } else if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (statsInterval.current) clearInterval(statsInterval.current);
    };
  }, []);

  const fetchClassesAndSubjects = async () => {
    try {
      const cls = await api.get('/api/classes/');
      const sub = await api.get('/api/subjects/');
      setClasses(cls);
      setSubjects(sub);
      if (cls.length > 0) {
        setReportClassId(cls[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const depts = await api.get('/api/departments/');
      setDepartments(depts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedDepartment) {
      fetchOtpClasses(selectedDepartment);
    } else {
      setOtpClasses([]);
    }
  }, [selectedDepartment]);

  const fetchOtpClasses = async (deptId) => {
    try {
      const cls = await api.get(`/api/classes/?department=${deptId}`);
      setOtpClasses(cls);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeavesAndODs = async () => {
    setApprovalsLoading(true);
    try {
      const data = await api.get('/api/leaves/');
      setLeaves(data);
    } catch (err) {
      console.error(err);
    } finally {
      setApprovalsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await api.get('/api/students/');
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Generate OTP (dashboard tab)
  const handleGenerateOTP = (e) => {
    e.preventDefault();
    setIsGenerating(true);

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setIsGenerating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await api.post('/api/attendance/generate-otp/', {
            department_name: selectedDepartment,
            class_name: selectedClassName,
            subject_name: selectedSubjectName,
            period: selectedPeriod,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });

          setActiveSession(res);
          startStatsPolling(res.otp_id);
        } catch (err) {
          alert(err.message || 'Failed to generate OTP.');
        } finally {
          setIsGenerating(false);
        }
      },
      (error) => {
        alert('Failed to get location. Please enable location permissions to generate geofenced OTP.');
        setIsGenerating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const startStatsPolling = (otpId) => {
    if (statsInterval.current) clearInterval(statsInterval.current);
    
    // Immediate initial poll
    pollStats(otpId);
    
    // Interval poll every 2 seconds
    statsInterval.current = setInterval(() => {
      pollStats(otpId);
    }, 2000);
  };

  const pollStats = async (otpId) => {
    try {
      const statsData = await api.get(`/api/attendance/session-stats/${otpId}/`);
      setSessionStats(statsData);
      
      // Auto-clear if expired or inactive
      if (!statsData.is_active || statsData.time_left <= 0) {
        if (statsInterval.current) clearInterval(statsInterval.current);
      }
    } catch (err) {
      console.error('Stats polling error', err);
      if (statsInterval.current) clearInterval(statsInterval.current);
    }
  };

  const handleStopSession = () => {
    if (statsInterval.current) clearInterval(statsInterval.current);
    setActiveSession(null);
    setSessionStats(null);
  };

  // 2. Approvals
  const handleApproveAction = async (leaveId, statusAction) => {
    try {
      await api.post(`/api/leaves/${leaveId}/approve/`, { action: statusAction });
      fetchLeavesAndODs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVerifyCertAction = async (leaveId, certAction) => {
    try {
      await api.post(`/api/leaves/${leaveId}/verify_certificate/`, { action: certAction });
      fetchLeavesAndODs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCleanupApprovals = async () => {
    if (!window.confirm("Archive all processed approvals? This cleans up your list view.")) return;
    try {
      await api.post('/api/leaves/cleanup/');
      fetchLeavesAndODs();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. Student details lookup
  const handleViewStudentStats = async (username) => {
    try {
      const data = await api.get(`/api/attendance/student-stats/${username}/`);
      setSelectedStudentStats(data);
      setStatsModalOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // 5. Reports compilation & browser CSV generation
  const handleRunReport = async (e) => {
    e.preventDefault();

    // Front-end validations
    if (reportType === 'class') {
      const selectedClassObj = classes.find(c => c.id.toString() === reportClassId);
      const isRelated = selectedClassObj && selectedClassObj.advisor === user.id;
      if (!isRelated && !reportSubjectId) {
        alert('Subject selection is required for this report as you are not the advisor for this class.');
        return;
      }
    } else if (reportType === 'student') {
      const isNormalStaff = user.staff_details?.staff_type === 'Normal';
      if (isNormalStaff && !reportSubjectId) {
        alert('Subject selection is required for this report as you are not the tutor or advisor.');
        return;
      }
    }

    try {
      let query = `?report_type=${reportType}`;
      if (fromDate) query += `&from_date=${fromDate}`;
      if (toDate) query += `&to_date=${toDate}`;
      if (reportType === 'class') query += `&class_id=${reportClassId}`;
      if (reportType === 'student') query += `&student_id=${reportStudentId}`;
      if (reportSubjectId) query += `&subject_id=${reportSubjectId}`;

      const data = await api.get(`/api/attendance/reports/${query}`);
      setReportData(data);
    } catch (err) {
      alert(err.message || 'Failed to fetch report data.');
    }
  };

  const handleDownloadCSV = () => {
    if (reportData.length === 0) return;

    const headers = ['Register Number', 'Name', 'Class', 'Date', 'Status', 'Subject', 'Period'];
    const csvRows = [headers.join(',')];

    reportData.forEach(r => {
      const row = [
        r.student_username || '',
        `"${(r.student_name || '').replace(/"/g, '""')}"`,
        `"${(r.class_name || '').replace(/"/g, '""')}"`,
        r.date || '',
        r.status || '',
        `"${(r.subject_name || '').replace(/"/g, '""')}"`,
        r.period || ''
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Attendance_Report_${reportType}_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 6. Profile edits
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    try {
      await api.put(`/api/users/${user.id}/`, {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone,
        age: age ? parseInt(age) : null,
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

  // Render sub-interfaces
  if (activeTab === 'dashboard') {
    return (
      <div>
        <div className="header">
          <h1>Generate Attendance OTP</h1>
        </div>

        {activeSession ? (
          /* Active session screen */
          <div className="grid grid-cols-2">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
                Active Verification Code
              </div>
              <div style={{ fontSize: '64px', fontWeight: '800', letterSpacing: '0.1em', color: 'var(--accent-primary)', textIndent: '0.1em', margin: '20px 0' }}>
                {activeSession.code}
              </div>

              {sessionStats && (
                <div style={{ width: '100%', maxWidth: '280px', display: 'flex', justifyContent: 'space-between', margin: '16px 0', fontSize: '15px' }}>
                  <div>Present: <strong style={{ color: 'var(--success)' }}>{sessionStats.present_count}</strong></div>
                  <div>Time Left: <strong>{sessionStats.time_left}s</strong></div>
                </div>
              )}

              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', margin: '24px 0' }}>
                <div style={{
                  height: '100%',
                  backgroundColor: 'var(--accent-primary)',
                  width: `${sessionStats ? (sessionStats.time_left / 60) * 100 : 100}%`,
                  transition: 'width 1s linear'
                }} />
              </div>

              <button className="btn btn-danger" style={{ width: '100%', height: '44px' }} onClick={handleStopSession}>
                Stop Attendance Session
              </button>
            </div>

            {/* Session Stats list */}
            <div className="card">
              <h2 style={{ marginBottom: '16px' }}>Absent / Remaining Students</h2>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {sessionStats && sessionStats.remaining_students.length === 0 ? (
                  <div style={{ color: 'var(--success)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', padding: '20px 0' }}>
                    <Check size={18} />
                    <span>All students have marked attendance!</span>
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionStats?.remaining_students.map((stud, idx) => (
                      <li key={idx} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
                        {stud.name ? `${stud.name} (${stud.username})` : stud.username}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Generate Form */
          <div className="grid grid-cols-2">
            <div className="card">
              <h2 style={{ marginBottom: '24px' }}>Configure Period Session</h2>
              <form onSubmit={handleGenerateOTP}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select 
                    className="input" 
                    value={selectedDepartment} 
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedClassName('');
                    }}
                    required
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Class Name</label>
                  <select 
                    className="input" 
                    value={selectedClassName} 
                    onChange={(e) => setSelectedClassName(e.target.value)} 
                    required
                  >
                    <option value="">-- Choose Class --</option>
                    {otpClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - Year {c.year} (Sec {c.section})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input type="text" className="input" placeholder="e.g. Database Systems" value={selectedSubjectName} onChange={(e) => setSelectedSubjectName(e.target.value)} required />
                </div>

                <div className="form-group" style={{ marginBottom: '32px' }}>
                  <label className="form-label">Select Period</label>
                  <select className="input" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                    {[1, 2, 3, 4, 5, 6, 7].map(p => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '46px' }} disabled={isGenerating}>
                  {isGenerating ? 'Accessing GPS location...' : (
                    <>
                      <span>Start Session & Generate OTP</span>
                      <Play size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '16px' }}>Dashboard Guide</h2>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li>Generates a geofenced verification circle centered around your current coordinates.</li>
                <li><strong>Timer</strong>: OTP code will be valid for 1 minute. Students must enter the code immediately.</li>
                <li>Students attempting to mark attendance from outside the 20-meter perimeter will be blocked.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'approvals') {
    const pendingTutor = leaves.filter(l => l.student_details?.tutor === user.id && l.tutor_approved === 'Pending' && l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD'));
    const pendingAdvisor = leaves.filter(l => l.student_details?.advisor === user.id && l.tutor_approved === 'Approved' && l.advisor_approved === 'Pending' && l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD'));
    const verifiedODs = leaves.filter(l => l.student_details?.tutor === user.id && l.leave_type === 'OD' && l.final_status === 'Approved' && !l.certificate_verified);
    const processedToday = leaves.filter(l => !l.is_archived && l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD') && (
      (l.student_details?.tutor === user.id && l.tutor_approved !== 'Pending') ||
      (l.student_details?.advisor === user.id && l.advisor_approved !== 'Pending')
    ));

    return (
      <div>
        <div className="header">
          <h1>Leave & OD Approvals</h1>
          <button className="btn btn-secondary" onClick={handleCleanupApprovals}>Cleanup List</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button 
            className={`btn ${approvalSubTab === 'leave' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setApprovalSubTab('leave')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Leave Approvals
          </button>
          <button 
            className={`btn ${approvalSubTab === 'od' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setApprovalSubTab('od')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            OD Approvals
          </button>
        </div>

        {approvalsLoading ? (
          <div>Loading requests...</div>
        ) : (
          <div className="grid">
            {/* Tutor list */}
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--accent-primary)' }}>As Tutor: Pending Approval</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTutor.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pending tutor approvals.</td>
                      </tr>
                    ) : (
                      pendingTutor.map(l => (
                        <tr key={l.id}>
                          <td>{l.student_details?.user.first_name} ({l.student_details?.user.username})</td>
                          <td>{l.student_details?.class_name}</td>
                          <td>{l.date}</td>
                          <td><span className={`badge ${l.leave_type === 'OD' ? 'badge-od' : 'badge-leave'}`}>{l.leave_type}</span></td>
                          <td>{l.reason}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--success)' }} onClick={() => handleApproveAction(l.id, 'Approve')}><Check size={16} /></button>
                              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleApproveAction(l.id, 'Reject')}><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Advisor list */}
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--accent-primary)' }}>As Advisor: Pending Approval</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAdvisor.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pending advisor approvals.</td>
                      </tr>
                    ) : (
                      pendingAdvisor.map(l => (
                        <tr key={l.id}>
                          <td>{l.student_details?.user.first_name} ({l.student_details?.user.username})</td>
                          <td>{l.student_details?.class_name}</td>
                          <td>{l.date}</td>
                          <td><span className={`badge ${l.leave_type === 'OD' ? 'badge-od' : 'badge-leave'}`}>{l.leave_type}</span></td>
                          <td>{l.reason}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--success)' }} onClick={() => handleApproveAction(l.id, 'Approve')}><Check size={16} /></button>
                              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleApproveAction(l.id, 'Reject')}><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* OD Certificate Verification */}
            {approvalSubTab === 'od' && (
              <div className="card">
                <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} />
                  Pending OD Certificate Verification
                </h2>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Date</th>
                        <th>Document</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedODs.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pending OD documents to verify.</td>
                        </tr>
                      ) : (
                        verifiedODs.map(l => (
                          <tr key={l.id}>
                            <td>{l.student_details?.user.first_name} ({l.student_details?.user.username})</td>
                            <td>{l.date}</td>
                            <td>
                              {l.proof ? (
                                <a href={`${api.baseUrl}${l.proof}`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                  View Proof Document
                                </a>
                              ) : (
                                <span style={{ color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <ShieldAlert size={14} />
                                  No proof uploaded yet
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--success)' }} disabled={!l.proof} onClick={() => handleVerifyCertAction(l.id, 'Approve')}><Check size={16} /></button>
                                <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} disabled={!l.proof} onClick={() => handleVerifyCertAction(l.id, 'Reject')}><X size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Processed today */}
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-secondary)' }}>Processed Today</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Status Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedToday.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No processed records today.</td>
                      </tr>
                    ) : (
                      processedToday.map(l => (
                        <tr key={l.id}>
                          <td>{l.student_details?.user.first_name} ({l.student_details?.user.username})</td>
                          <td>{l.date}</td>
                          <td><span className={`badge ${l.leave_type === 'OD' ? 'badge-od' : 'badge-leave'}`}>{l.leave_type}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                              <span>Tutor: {l.tutor_approved}</span> | 
                              <span>Advisor: {l.advisor_approved}</span> | 
                              <span>Final: {l.final_status}</span>
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
        )}
      </div>
    );
  }

  if (activeTab === 'students') {
    if (user.staff_details?.staff_type === 'Normal') {
      return <div className="card">Unauthorized tab access.</div>;
    }
    return (
      <div>
        <div className="header">
          <h1>My Assigned Students</h1>
        </div>

        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll / Reg No</th>
                  <th>Name</th>
                  <th>Class Details</th>
                  <th>Assigned Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.user.id}>
                    <td style={{ fontWeight: '600' }}>{s.user.username}</td>
                    <td>{s.user.first_name} {s.user.last_name}</td>
                    <td>{s.class_name} - Year {s.class_year} (Sec {s.class_section})</td>
                    <td>
                      <span className="badge badge-present" style={{ fontSize: '11px' }}>
                        {s.tutor === user.id ? 'Tutor' : ''}
                        {(s.tutor === user.id && (s.advisor === user.id || s.class_advisor_id === user.id)) ? ' & ' : ''}
                        {(s.advisor === user.id || s.class_advisor_id === user.id) ? 'Advisor' : ''}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleViewStudentStats(s.user.username)}>
                        <Eye size={14} />
                        <span>View Attendance %</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance stats modal */}
        {statsModalOpen && selectedStudentStats && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div className="card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                <h2>Attendance Statistics</h2>
                <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => setStatsModalOpen(false)}>Close</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div>Student Name: <strong>{selectedStudentStats.name}</strong></div>
                <div>Reg No: <strong>{selectedStudentStats.username}</strong></div>
                <div>Class: <strong>{selectedStudentStats.class_name}</strong></div>
                <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Periods:</span>
                  <strong>{selectedStudentStats.total}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Present Periods:</span>
                  <strong>{selectedStudentStats.present}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                  <span>Absent Periods:</span>
                  <strong>{selectedStudentStats.absent}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--info)' }}>
                  <span>On Duty (OD):</span>
                  <strong>{selectedStudentStats.od}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Verified ODs (Counted):</span>
                  <strong>{selectedStudentStats.verified_od}</strong>
                </div>
                <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700' }}>
                  <span>Effective Rate:</span>
                  <span style={{ color: selectedStudentStats.percentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                    {selectedStudentStats.percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'reports') {
    return (
      <div>
        <div className="header">
          <h1>Attendance Reports</h1>
        </div>

        <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
          {/* Query Filter card */}
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <h2 style={{ marginBottom: '20px' }}>Filter Criteria</h2>
            <form onSubmit={handleRunReport}>
              <div className="form-group">
                <label className="form-label">Report Scope</label>
                <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  {(user.staff_details?.staff_type === 'Advisor' || user.staff_details?.staff_type === 'Normal') && (
                    <option value="class">By Class</option>
                  )}
                  {user.staff_details?.staff_type !== 'Normal' && (
                    <option value="tutored">My Tutored Students</option>
                  )}
                  <option value="student">Individual Student</option>
                </select>
              </div>

              {reportType === 'class' && (
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select className="input" value={reportClassId} onChange={(e) => setReportClassId(e.target.value)}>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} (Sec {c.section})</option>)}
                  </select>
                </div>
              )}

              {reportType === 'student' && (
                <div className="form-group">
                  <label className="form-label">Student Reg/User ID</label>
                  <input type="text" className="input" placeholder="e.g. student" value={reportStudentId} onChange={(e) => setReportStudentId(e.target.value)} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="input" value={reportSubjectId} onChange={(e) => setReportSubjectId(e.target.value)}>
                  <option value="">-- All Subjects --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">From Date</label>
                <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">To Date</label>
                <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                Fetch Report Data
              </button>
            </form>
          </div>

          {/* Results table card */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Query Output ({reportData.length} records)</h2>
              {reportData.length > 0 && (
                <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleDownloadCSV}>
                  <FileSpreadsheet size={16} />
                  <span>Download CSV</span>
                </button>
              )}
            </div>

            <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Period</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No report data loaded. Adjust filters and click Fetch.</td>
                    </tr>
                  ) : (
                    reportData.map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.student_name} ({r.student_username})</td>
                        <td>{r.date}</td>
                        <td>Period {r.period}</td>
                        <td>{r.subject_name}</td>
                        <td>
                          <span className={`badge ${r.status === 'Present' ? 'badge-present' : (r.status === 'Absent' ? 'badge-absent' : (r.status === 'OD' ? 'badge-od' : 'badge-leave'))}`}>
                            {r.status}
                          </span>
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



  if (activeTab === 'profile') {
    return (
      <div>
        <div className="header">
          <h1>My Staff Profile</h1>
        </div>

        <div className="card" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px' }}>{user.first_name || user.username} {user.last_name || ''}</h2>
              <span className="badge badge-present" style={{ marginTop: '4px' }}>Staff ID: {user.username}</span>
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
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Phone Number</div>
                  <div>{user.phone_number || '-'}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Age</div>
                  <div>{user.age || '-'}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Assigned Department</div>
                  <div>Computer Science</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Staff Category</div>
                  <div>{user.staff_details?.staff_type || 'Normal'}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>System Administrator</div>
                  <div>{user.is_superuser ? 'Yes' : 'No'}</div>
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

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Age</label>
                <input type="number" className="input" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary">Update Profile Settings</button>
                <button type="button" className="btn btn-secondary" onClick={() => setProfileEditMode(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default StaffDashboard;

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { 
  Calendar, Clock, User, Check, X, FileText, 
  Download, ArrowLeft, Edit, CheckCircle2, 
  ChevronRight, ChevronDown, Sparkles, Save, Users, RefreshCw, Filter
} from 'lucide-react';

const StaffAttendanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Month filter state & month collapse state
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [expandedMonths, setExpandedMonths] = useState({});

  // Accordion state for expanded dates (date string -> boolean)
  const [expandedDates, setExpandedDates] = useState({});

  // Active Session Detail State (for Level 3 edit/download view)
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editedStatuses, setEditedStatuses] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch staff marked attendance history
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/attendances/staff-marked-history/');
      const list = data.history || [];
      setHistory(list);
      
      // Expand the first date and all months by default if available
      if (list.length > 0) {
        setExpandedDates({ [list[0].date]: true });
        const expM = {};
        list.forEach(d => {
          const mKey = d.date.substring(0, 7);
          expM[mKey] = true;
        });
        setExpandedMonths(expM);
      }
    } catch (err) {
      console.error("Failed to fetch staff marked history:", err);
      setError(err.message || "Failed to load marked attendance history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Group history items by month (YYYY-MM)
  const monthGroups = useMemo(() => {
    const map = {};
    history.forEach(dayGroup => {
      const parts = dayGroup.date.split('-');
      const year = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10);
      const monthKey = `${parts[0]}-${parts[1]}`;
      
      const monthDate = new Date(year, monthNum - 1, 1);
      const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!map[monthKey]) {
        map[monthKey] = {
          key: monthKey,
          label: monthLabel,
          year,
          monthNum,
          days: [],
          totalSessions: 0
        };
      }
      map[monthKey].days.push(dayGroup);
      map[monthKey].totalSessions += (dayGroup.total_sessions || dayGroup.sessions?.length || 0);
    });

    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  }, [history]);

  // Toggle month accordion expand/collapse
  const toggleMonthExpand = (mKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [mKey]: prev[mKey] === false ? true : false
    }));
  };

  // Toggle accordion expand/collapse for a date
  const toggleDateExpand = (dStr) => {
    setExpandedDates(prev => ({
      ...prev,
      [dStr]: !prev[dStr]
    }));
  };

  // Open session detail view (Level 3)
  const handleOpenSession = async (session, dateStr) => {
    setSelectedSession({ ...session, dateStr });
    setLoadingDetail(true);
    setSaveSuccessMsg('');
    setSearchQuery('');
    try {
      const res = await api.get(`/api/attendances/staff-history-session-detail/?date=${dateStr}&class_id=${session.class_id}&period=${session.period}`);
      setSessionDetail(res);
      
      // Initialize edit statuses state with existing statuses
      const statusMap = {};
      (res.students || []).forEach(st => {
        statusMap[st.student_id] = st.status;
      });
      setEditedStatuses(statusMap);
    } catch (err) {
      console.error("Failed to load session details:", err);
      alert("Failed to load session student details: " + (err.message || "Unknown error"));
      setSelectedSession(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Close session detail view
  const handleBackToList = () => {
    setSelectedSession(null);
    setSessionDetail(null);
    setEditedStatuses({});
    setSaveSuccessMsg('');
  };

  // Status toggle handler for student in Level 3
  const handleStatusChange = (studentId, newStatus) => {
    setEditedStatuses(prev => ({
      ...prev,
      [studentId]: newStatus
    }));
  };

  // Bulk mark all students in session
  const handleBulkMark = (statusToSet) => {
    if (!sessionDetail || !sessionDetail.students) return;
    const updated = { ...editedStatuses };
    sessionDetail.students.forEach(st => {
      updated[st.student_id] = statusToSet;
    });
    setEditedStatuses(updated);
  };

  // Save updated session statuses to backend
  const handleSaveChanges = async () => {
    if (!selectedSession || !sessionDetail) return;
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const payload = {
        date: selectedSession.dateStr,
        class_id: selectedSession.class_id,
        period: selectedSession.period,
        statuses: editedStatuses
      };
      const res = await api.post('/api/attendances/update-staff-history-session/', payload);
      setSaveSuccessMsg(res.detail || "Attendance updated successfully!");
      
      // Refresh background history and update session detail counts
      await fetchHistory();

      // Refresh local detail list status
      const updatedStudents = sessionDetail.students.map(st => ({
        ...st,
        status: editedStatuses[st.student_id] || st.status
      }));
      setSessionDetail(prev => ({ ...prev, students: updatedStudents }));

      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Failed to update session attendance:", err);
      alert("Failed to save changes: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Download session report as Excel file
  const handleDownloadCSV = async () => {
    if (!selectedSession) return;
    try {
      const response = await fetch(`${api.baseUrl}/api/attendances/session-download/?class_id=${selectedSession.class_id}&period=${selectedSession.period}&date=${selectedSession.dateStr}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': localStorage.getItem('auth_token') ? `Bearer ${localStorage.getItem('auth_token')}` : ''
        }
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      let filename = `Attendance_${sessionDetail.class_name.replace(/\s+/g, '_')}_P${sessionDetail.period}_${sessionDetail.date}.xlsx`;
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download session Excel:', err);
      alert('Failed to download Excel report.');
    }
  };

  // Filter students in detail view search
  const filteredStudents = (sessionDetail?.students || []).filter(st => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      (st.reg_no && st.reg_no.toLowerCase().includes(q)) ||
      (st.roll_no && st.roll_no.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
          Loading Marked Attendance History...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--danger-light)' }}>
        <div style={{ color: 'var(--danger)', fontWeight: '700', marginBottom: '12px' }}>{error}</div>
        <button className="btn btn-primary" onClick={fetchHistory}>Retry</button>
      </div>
    );
  }

  // LEVEL 3: Detailed Student Attendance View & Editable Grid
  if (selectedSession) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Navigation & Session Banner */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleBackToList}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Days List</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-outline"
                onClick={handleDownloadCSV}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#059669', borderColor: '#10B981' }}
              >
                <Download size={16} />
                <span>Download Excel Report</span>
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveChanges}
                disabled={isSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving...' : 'Save Attendance Changes'}</span>
              </button>
            </div>
          </div>

          {sessionDetail && (
            <div style={{
              background: 'linear-gradient(135deg, #0B2545 0%, #134074 100%)',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#93C5FD', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {sessionDetail.formatted_date} • Period {sessionDetail.period}
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '4px 0', color: '#FFFFFF' }}>
                    {sessionDetail.class_name} — {sessionDetail.subject_code} ({sessionDetail.subject_name})
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#E0F2FE', textTransform: 'uppercase', fontWeight: '700' }}>Present</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#4ADE80' }}>
                      {Object.values(editedStatuses).filter(s => s === 'Present').length}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#E0F2FE', textTransform: 'uppercase', fontWeight: '700' }}>Absent</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#F87171' }}>
                      {Object.values(editedStatuses).filter(s => s === 'Absent').length}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#E0F2FE', textTransform: 'uppercase', fontWeight: '700' }}>OD</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#FBBF24' }}>
                      {Object.values(editedStatuses).filter(s => s === 'OD').length}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#E0F2FE', textTransform: 'uppercase', fontWeight: '700' }}>Total</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>
                      {sessionDetail.students?.length || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="alerts success" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Search & Bulk Action Controls */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <input 
              type="text"
              placeholder="Search student by name, roll no, or register no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '14px'
              }}
            />

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quick Set:</span>
              <button 
                className="btn"
                onClick={() => handleBulkMark('Present')}
                style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: '700', fontSize: '12px', padding: '6px 12px' }}
              >
                Mark All Present
              </button>
              <button 
                className="btn"
                onClick={() => handleBulkMark('Absent')}
                style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: '700', fontSize: '12px', padding: '6px 12px' }}
              >
                Mark All Absent
              </button>
            </div>
          </div>
        </div>

        {/* Student Table */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {loadingDetail ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)', marginBottom: '8px' }} />
              <div>Loading student roster...</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 16px', width: '60px' }}>S.No</th>
                    <th style={{ padding: '12px 16px' }}>Reg No</th>
                    <th style={{ padding: '12px 16px' }}>Roll No</th>
                    <th style={{ padding: '12px 16px' }}>Student Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '220px' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const currentStatus = editedStatuses[st.student_id] || st.status;
                      return (
                        <tr key={st.student_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-muted)' }}>{st.s_no}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{st.reg_no}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{st.roll_no || '-'}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>{st.name}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '4px', backgroundColor: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.student_id, 'Present')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: currentStatus === 'Present' ? '#16A34A' : 'transparent',
                                  color: currentStatus === 'Present' ? '#FFFFFF' : 'var(--text-secondary)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.student_id, 'Absent')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: currentStatus === 'Absent' ? '#DC2626' : 'transparent',
                                  color: currentStatus === 'Absent' ? '#FFFFFF' : 'var(--text-secondary)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.student_id, 'OD')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: currentStatus === 'OD' ? '#D97706' : 'transparent',
                                  color: currentStatus === 'OD' ? '#FFFFFF' : 'var(--text-secondary)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                OD
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // LEVEL 1 & 2: Day-Wise List & Period Sessions Table View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={18} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Staff Portal Attendance Logs
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
              Marked Attendance History
            </h1>
            <p style={{ color: '#CBD5E1', fontSize: '14px', marginTop: '4px', margin: 0 }}>
              View and edit your marked attendance records separated day-wise (up to 8 periods per day). Click any session row to inspect or update student statuses.
            </p>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={fetchHistory}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
          >
            <RefreshCw size={16} />
            <span>Refresh History</span>
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Marked Attendance History Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
            You have not marked any period attendance sessions yet. Once you mark attendance via OTP or Manual Attendance, your history will appear here grouped by month and day-wise.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Month Selector Pills */}
          {monthGroups.length > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              backgroundColor: 'var(--bg-card)',
              padding: '12px 16px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', marginRight: '4px' }}>
                <Filter size={15} />
                <span>Month:</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonth('ALL')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  border: selectedMonth === 'ALL' ? '1px solid #6366F1' : '1px solid var(--border-color)',
                  backgroundColor: selectedMonth === 'ALL' ? '#EEF2FF' : 'var(--bg-secondary)',
                  color: selectedMonth === 'ALL' ? '#4F46E5' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
              >
                All Months ({history.length} Days)
              </button>
              {monthGroups.map(mg => {
                const isSelected = selectedMonth === mg.key;
                return (
                  <button
                    key={mg.key}
                    type="button"
                    onClick={() => setSelectedMonth(mg.key)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: isSelected ? '1px solid #6366F1' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? '#EEF2FF' : 'var(--bg-secondary)',
                      color: isSelected ? '#4F46E5' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    {mg.label} ({mg.days.length} Days)
                  </button>
                );
              })}
            </div>
          )}

          {/* Render Month Groups */}
          {monthGroups
            .filter(mg => selectedMonth === 'ALL' || mg.key === selectedMonth)
            .map((mg) => {
              const isMonthExpanded = expandedMonths[mg.key] !== false;
              return (
                <div key={mg.key} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Month Header Banner */}
                  <div 
                    onClick={() => toggleMonthExpand(mg.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      userSelect: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#6366F1',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800'
                      }}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                          {mg.label}
                        </h2>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                          {mg.days.length} Day{mg.days.length !== 1 ? 's' : ''} Recorded &bull; {mg.totalSessions} Total Session{mg.totalSessions !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: '#E0E7FF',
                        color: '#4338CA',
                        fontSize: '12px',
                        fontWeight: '800'
                      }}>
                        {mg.days.length} Days
                      </span>
                      {isMonthExpanded ? <ChevronDown size={20} style={{ color: '#64748B' }} /> : <ChevronRight size={20} style={{ color: '#64748B' }} />}
                    </div>
                  </div>

                  {/* Day Cards for this Month */}
                  {isMonthExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '8px' }}>
                      {mg.days.map((dayGroup) => {
                        const isExpanded = !!expandedDates[dayGroup.date];
                        return (
                          <div 
                            key={dayGroup.date} 
                            className="card" 
                            style={{ 
                              padding: '0', 
                              overflow: 'hidden', 
                              border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                              transition: 'border-color 0.2s ease'
                            }}
                          >
                            {/* Day Accordion Header */}
                            <div 
                              onClick={() => toggleDateExpand(dayGroup.date)}
                              style={{
                                padding: '18px 24px',
                                backgroundColor: isExpanded ? 'rgba(79, 70, 229, 0.04)' : 'var(--bg-card)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '10px',
                                  backgroundColor: 'var(--primary-light)',
                                  color: 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '800'
                                }}>
                                  <Calendar size={20} />
                                </div>

                                <div>
                                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    {dayGroup.formatted_date}
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    Date: {dayGroup.date}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{
                                  padding: '6px 12px',
                                  borderRadius: 'var(--radius-pill)',
                                  backgroundColor: '#EEF2FF',
                                  color: '#4F46E5',
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  border: '1px solid #C7D2FE'
                                }}>
                                  {dayGroup.total_sessions} Session{dayGroup.total_sessions !== 1 ? 's' : ''} Marked
                                </span>

                                {isExpanded ? <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />}
                              </div>
                            </div>

                            {/* Inside Content: Sessions Table (Level 2) */}
                            {isExpanded && (
                              <div style={{ padding: '0 24px 20px 24px', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ margin: '16px 0 12px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Marked Attendance Sessions (Click any row to view & edit students)
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                                        <th style={{ padding: '12px 14px', width: '60px' }}>S.No</th>
                                        <th style={{ padding: '12px 14px' }}>Class Name</th>
                                        <th style={{ padding: '12px 14px' }}>Period</th>
                                        <th style={{ padding: '12px 14px' }}>Subject</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Attendance Summary</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'right', width: '120px' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dayGroup.sessions.map((sess) => (
                                        <tr 
                                          key={`${sess.class_id}_${sess.period}`}
                                          onClick={() => handleOpenSession(sess, dayGroup.date)}
                                          className="history-row-hover"
                                          style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <td style={{ padding: '14px', fontWeight: '800', color: 'var(--text-muted)' }}>
                                            {sess.s_no}
                                          </td>
                                          <td style={{ padding: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {sess.class_name}
                                          </td>
                                          <td style={{ padding: '14px', fontWeight: '700', color: 'var(--primary)' }}>
                                            Period {sess.period}
                                          </td>
                                          <td style={{ padding: '14px' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{sess.subject_code}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sess.subject_name}</div>
                                          </td>
                                          <td style={{ padding: '14px', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                              <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                                                P: {sess.present_count}
                                              </span>
                                              <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                                                A: {sess.absent_count}
                                              </span>
                                              <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                                                OD: {sess.od_count}
                                              </span>
                                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                                ({sess.total_students} Total)
                                              </span>
                                            </div>
                                          </td>
                                          <td style={{ padding: '14px', textAlign: 'right' }}>
                                            <span className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700' }}>
                                              View / Edit
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .history-row-hover:hover {
          background-color: rgba(79, 70, 229, 0.04) !important;
        }
      `}} />
    </div>
  );
};

export default StaffAttendanceHistory;

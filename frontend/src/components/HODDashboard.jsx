import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { 
  Users, UserCheck, ShieldAlert, Award, 
  Trash2, Edit, Plus, Check, X, FileSpreadsheet, Eye,
  Calendar, BookOpen, User
} from 'lucide-react';

const HODDashboard = ({ activeTab }) => {
  const { user, checkAuth } = useAuth();
  
  // Dashboard stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Student CRUD states
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentUsername, setStudentUsername] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentDob, setStudentDob] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [studentRegNo, setStudentRegNo] = useState('');

  // Staff CRUD states
  const [staff, setStaff] = useState([]);
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffType, setStaffType] = useState('Normal');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffDob, setStaffDob] = useState('');
  const [staffIdInput, setStaffIdInput] = useState('');
  const [staffDesignation, setStaffDesignation] = useState('');

  // HOD Class CRUD states
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [className, setClassName] = useState('');
  const [classYear, setClassYear] = useState('');
  const [classSection, setClassSection] = useState('');
  const [classTutor1Id, setClassTutor1Id] = useState('');
  const [classTutor2Id, setClassTutor2Id] = useState('');
  const [classTutor3Id, setClassTutor3Id] = useState('');

  // HOD Subject CRUD states
  const [subjects, setSubjects] = useState([]);
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');

  // Approvals states
  const [leaves, setLeaves] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalSubTab, setApprovalSubTab] = useState('leave');

  // Morning Attendance states
  const [morningData, setMorningData] = useState([]);
  const [morningLoading, setMorningLoading] = useState(true);

  // Profile states
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone_number || '');
  const [age, setAge] = useState(user.age || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileEditMode, setProfileEditMode] = useState(false);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'students') {
      fetchStudentsList();
      fetchClassesAndStaff();
    } else if (activeTab === 'staff') {
      fetchStaffList();
    } else if (activeTab === 'classes') {
      fetchClassesList();
      fetchStaffListOnly();
    } else if (activeTab === 'subjects') {
      fetchSubjectsList();
    } else if (activeTab === 'approvals') {
      fetchPendingApprovals();
    } else if (activeTab === 'morning') {
      fetchMorningAttendance();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.get('/api/hod/dashboard-stats/');
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const data = await api.get('/api/students/');
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClassesAndStaff = async () => {
    try {
      const cls = await api.get('/api/classes/');
      const stf = await api.get('/api/users/?role=staff');
      setClasses(cls);
      setStaffList(stf);
      if (cls.length > 0) setStudentClassId(cls[0].id.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaffList = async () => {
    try {
      const data = await api.get('/api/staff/');
      setStaff(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaffListOnly = async () => {
    try {
      const stf = await api.get('/api/users/?role=staff');
      setStaffList(stf);
      if (stf.length > 0) {
        setClassTutor1Id(stf[0].id.toString());
        setClassTutor2Id(stf[0].id.toString());
        setClassTutor3Id(stf[0].id.toString());
        setClassAdvisorId(stf[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClassesList = async () => {
    try {
      const data = await api.get('/api/classes/');
      setClasses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjectsList = async () => {
    try {
      const data = await api.get('/api/subjects/');
      setSubjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingApprovals = async () => {
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

  const fetchMorningAttendance = async () => {
    setMorningLoading(true);
    try {
      const data = await api.get('/api/hod/morning-attendance/');
      setMorningData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMorningLoading(false);
    }
  };

  // Student CRUD functions
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const payload = {
      user: {
        username: studentUsername,
        email: studentEmail,
        first_name: studentFirstName,
        last_name: studentLastName,
        phone_number: studentPhone || null,
        dob: studentDob || null,
        role: 'student'
      },
      student_class: parseInt(studentClassId),
      roll_no: studentRollNo || '',
      reg_no: studentRegNo || ''
    };

    if (studentPassword) {
      payload.user.password = studentPassword;
    }

    try {
      if (editingStudent) {
        await api.put(`/api/students/${editingStudent.user.id}/`, payload);
        alert('Student details updated.');
      } else {
        await api.post('/api/students/', payload);
        alert('New student added successfully.');
      }
      setStudentFormOpen(false);
      setEditingStudent(null);
      clearStudentForm();
      fetchStudentsList();
    } catch (err) {
      alert(err.message || 'Error occurred while saving student.');
    }
  };

  const handleEditStudentClick = (s) => {
    setEditingStudent(s);
    setStudentUsername(s.user.username);
    setStudentEmail(s.user.email);
    setStudentFirstName(s.user.first_name);
    setStudentLastName(s.user.last_name);
    setStudentClassId(s.student_class?.toString() || '');
    setStudentPassword('');
    setStudentPhone(s.user.phone_number || '');
    setStudentDob(s.user.dob || '');
    setStudentRollNo(s.roll_no || '');
    setStudentRegNo(s.reg_no || '');
    setStudentFormOpen(true);
  };

  const handleDeleteStudent = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await api.delete(`/api/students/${userId}/`);
      fetchStudentsList();
      alert('Student deleted.');
    } catch (err) {
      alert(err.message);
    }
  };

  const clearStudentForm = () => {
    setStudentUsername('');
    setStudentEmail('');
    setStudentFirstName('');
    setStudentLastName('');
    setStudentPassword('');
    setStudentPhone('');
    setStudentDob('');
    setStudentRollNo('');
    setStudentRegNo('');
  };

  // Staff CRUD functions
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const payload = {
      user: {
        username: staffUsername,
        email: staffEmail,
        first_name: staffFirstName,
        last_name: staffLastName,
        phone_number: staffPhone || null,
        dob: staffDob || null,
        role: 'staff'
      },
      staff_type: staffType,
      staff_id: staffIdInput || '',
      designation: staffDesignation || ''
    };

    if (staffPassword) {
      payload.user.password = staffPassword;
    }

    try {
      if (editingStaff) {
        await api.put(`/api/staff/${editingStaff.user.id}/`, payload);
        alert('Staff details updated.');
      } else {
        await api.post('/api/staff/', payload);
        alert('New staff added successfully.');
      }
      setStaffFormOpen(false);
      setEditingStaff(null);
      clearStaffForm();
      fetchStaffList();
    } catch (err) {
      alert(err.message || 'Error occurred while saving staff.');
    }
  };

  const handleEditStaffClick = (s) => {
    setEditingStaff(s);
    setStaffUsername(s.user.username);
    setStaffEmail(s.user.email);
    setStaffFirstName(s.user.first_name);
    setStaffLastName(s.user.last_name);
    setStaffType(s.staff_type);
    setStaffPassword('');
    setStaffPhone(s.user.phone_number || '');
    setStaffDob(s.user.dob || '');
    setStaffIdInput(s.staff_id || '');
    setStaffDesignation(s.designation || '');
    setStaffFormOpen(true);
  };

  const handleDeleteStaff = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      await api.delete(`/api/staff/${userId}/`);
      fetchStaffList();
      alert('Staff member deleted.');
    } catch (err) {
      alert(err.message);
    }
  };

  const clearStaffForm = () => {
    setStaffUsername('');
    setStaffEmail('');
    setStaffFirstName('');
    setStaffLastName('');
    setStaffPassword('');
    setStaffType('Normal');
    setStaffPhone('');
    setStaffDob('');
    setStaffIdInput('');
    setStaffDesignation('');
  };

  // Class CRUD functions
  const handleSaveClass = async (e) => {
    e.preventDefault();
    const payload = {
      name: className,
      year: parseInt(classYear),
      section: classSection,
      tutor1: classTutor1Id ? parseInt(classTutor1Id) : null,
      tutor2: classTutor2Id ? parseInt(classTutor2Id) : null,
      tutor3: classTutor3Id ? parseInt(classTutor3Id) : null,
      advisor: classTutor3Id ? parseInt(classTutor3Id) : null,
    };

    try {
      if (editingClass) {
        await api.put(`/api/classes/${editingClass.id}/`, payload);
        alert('Class updated successfully.');
      } else {
        await api.post('/api/classes/', payload);
        alert('Class created successfully.');
      }
      setClassFormOpen(false);
      setEditingClass(null);
      clearClassForm();
      fetchClassesList();
    } catch (err) {
      alert(err.message || 'Error occurred while saving class.');
    }
  };

  const handleEditClassClick = (c) => {
    setEditingClass(c);
    setClassName(c.name);
    setClassYear(c.year.toString());
    setClassSection(c.section);
    setClassTutor1Id(c.tutor1?.toString() || '');
    setClassTutor2Id(c.tutor2?.toString() || '');
    setClassTutor3Id(c.tutor3?.toString() || '');
    setClassFormOpen(true);
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await api.delete(`/api/classes/${classId}/`);
      fetchClassesList();
      alert('Class deleted.');
    } catch (err) {
      alert(err.message);
    }
  };

  const clearClassForm = () => {
    setClassName('');
    setClassYear('');
    setClassSection('');
    setClassTutor1Id('');
    setClassTutor2Id('');
    setClassTutor3Id('');
  };

  // Subject CRUD functions
  const handleSaveSubject = async (e) => {
    e.preventDefault();
    const payload = {
      name: subjectName,
      code: subjectCode,
    };

    try {
      if (editingSubject) {
        await api.put(`/api/subjects/${editingSubject.id}/`, payload);
        alert('Subject updated successfully.');
      } else {
        await api.post('/api/subjects/', payload);
        alert('Subject created successfully.');
      }
      setSubjectFormOpen(false);
      setEditingSubject(null);
      clearSubjectForm();
      fetchSubjectsList();
    } catch (err) {
      alert(err.message || 'Error occurred while saving subject.');
    }
  };

  const handleEditSubjectClick = (s) => {
    setEditingSubject(s);
    setSubjectName(s.name);
    setSubjectCode(s.code);
    setSubjectFormOpen(true);
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      await api.delete(`/api/subjects/${subjectId}/`);
      fetchSubjectsList();
      alert('Subject deleted.');
    } catch (err) {
      alert(err.message);
    }
  };

  const clearSubjectForm = () => {
    setSubjectName('');
    setSubjectCode('');
  };

  // HOD Approvals
  const handleApproveAction = async (leaveId, statusAction) => {
    try {
      await api.post(`/api/leaves/${leaveId}/approve/`, { action: statusAction });
      fetchPendingApprovals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCleanupApprovals = async () => {
    if (!window.confirm("Archive all processed HOD approvals? This cleans up your list view.")) return;
    try {
      await api.post('/api/leaves/cleanup/');
      fetchPendingApprovals();
    } catch (err) {
      alert(err.message);
    }
  };

  // Profile Update
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

  // Download morning attendance CSV in browser
  const handleDownloadMorningCSV = () => {
    if (morningData.length === 0) return;

    const headers = ['Date', 'Class', 'Total Students', 'Present', 'Absent', 'On Duty'];
    const csvRows = [headers.join(',')];

    morningData.forEach(r => {
      const row = [
        r.date,
        `"${r.student__student_class__name} (Sec ${r.student__student_class__section})"`,
        r.total_students,
        r.present_count,
        r.absent_count,
        r.od_count
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Morning_Attendance_Report_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Tab views
  if (activeTab === 'dashboard') {
    return (
      <div>
        <div className="header">
          <h1>HOD Analytics Dashboard</h1>
        </div>

        {statsLoading ? (
          <div>Loading stats...</div>
        ) : stats && (
          <div className="grid">
            {/* Metric counters */}
            <div className="grid grid-cols-3">
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.total_students}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Department Students</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                  <UserCheck size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.total_staff}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Department Staff</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>
                    {stats.pending_leave_approvals + stats.pending_od_approvals}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pending HOD Approvals</div>
                </div>
              </div>
            </div>

            {/* Daily stats breakdown */}
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Today's Student Overview</h2>
              <div className="grid grid-cols-3">
                <div style={{ padding: '16px', borderLeft: '4px solid var(--success)', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{stats.present_students}</div>
                </div>
                <div style={{ padding: '16px', borderLeft: '4px solid var(--danger)', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Absent</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)' }}>{stats.absent_students}</div>
                </div>
                <div style={{ padding: '16px', borderLeft: '4px solid var(--info)', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>On Duty (OD)</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--info)' }}>{stats.od_students_today}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'students') {
    return (
      <div>
        <div className="header">
          <h1>Manage Students</h1>
          <button className="btn btn-primary" onClick={() => { setEditingStudent(null); clearStudentForm(); setStudentFormOpen(!studentFormOpen); }}>
            <Plus size={16} />
            <span>Add Student</span>
          </button>
        </div>

        {studentFormOpen && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>{editingStudent ? 'Edit Student Details' : 'Register New Student'}</h2>
            <form onSubmit={handleSaveStudent} style={{ marginTop: '16px' }}>
              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input type="text" className="input" required value={studentUsername} onChange={(e) => setStudentUsername(e.target.value)} disabled={editingStudent !== null} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="input" required value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="input" value={studentFirstName} onChange={(e) => setStudentFirstName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="input" value={studentLastName} onChange={(e) => setStudentLastName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Date of Birth (DOB)</label>
                  <input type="date" className="input" value={studentDob} onChange={(e) => setStudentDob(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="input" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input type="text" className="input" value={studentRollNo} onChange={(e) => setStudentRollNo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Number</label>
                  <input type="text" className="input" value={studentRegNo} onChange={(e) => setStudentRegNo(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Class</label>
                <select className="input" value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)} required>
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} - Yr {c.year} (Sec {c.section})</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Password {editingStudent && '(leave blank to keep unchanged)'}</label>
                <input type="password" className="input" placeholder="••••••••" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} required={!editingStudent} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary">Save Student</button>
                <button type="button" className="btn btn-secondary" onClick={() => setStudentFormOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Tutor</th>
                  <th>Advisor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.user.id}>
                    <td>{s.roll_no || '-'}</td>
                    <td style={{ fontWeight: '600' }}>{s.reg_no || '-'}</td>
                    <td>{s.user.first_name} {s.user.last_name}</td>
                    <td>{s.user.email}</td>
                    <td>{s.class_name} (Sec {s.class_section})</td>
                    <td>{s.tutor_name || '-'}</td>
                    <td>{s.advisor_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--accent-primary)' }} onClick={() => handleEditStudentClick(s)}><Edit size={14} /></button>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteStudent(s.user.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'staff') {
    return (
      <div>
        <div className="header">
          <h1>Manage Staff</h1>
          <button className="btn btn-primary" onClick={() => { setEditingStaff(null); clearStaffForm(); setStaffFormOpen(!staffFormOpen); }}>
            <Plus size={16} />
            <span>Add Staff</span>
          </button>
        </div>

        {staffFormOpen && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>{editingStaff ? 'Edit Staff Details' : 'Register New Staff'}</h2>
            <form onSubmit={handleSaveStaff} style={{ marginTop: '16px' }}>
              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input type="text" className="input" required value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} disabled={editingStaff !== null} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="input" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="input" value={staffFirstName} onChange={(e) => setStaffFirstName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="input" value={staffLastName} onChange={(e) => setStaffLastName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Date of Birth (DOB)</label>
                  <input type="date" className="input" value={staffDob} onChange={(e) => setStaffDob(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="input" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Staff ID</label>
                  <input type="text" className="input" value={staffIdInput} onChange={(e) => setStaffIdInput(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input type="text" className="input" value={staffDesignation} onChange={(e) => setStaffDesignation(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Staff Category</label>
                <select className="input" value={staffType} onChange={(e) => setStaffType(e.target.value)}>
                  <option value="Normal">Normal (Subject Teacher)</option>
                  <option value="Tutor">Tutor (Assigned to Class Roll)</option>
                  <option value="Advisor">Advisor (Class Controller)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Password {editingStaff && '(leave blank to keep unchanged)'}</label>
                <input type="password" className="input" placeholder="••••••••" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required={!editingStaff} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary">Save Staff</button>
                <button type="button" className="btn btn-secondary" onClick={() => setStaffFormOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.user.id}>
                    <td>{s.staff_id || '-'}</td>
                    <td style={{ fontWeight: '600' }}>{s.user.username}</td>
                    <td>{s.user.first_name} {s.user.last_name}</td>
                    <td>{s.user.email}</td>
                    <td>{s.designation || '-'}</td>
                    <td><span className="badge badge-present">{s.staff_type}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--accent-primary)' }} onClick={() => handleEditStaffClick(s)}><Edit size={14} /></button>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteStaff(s.user.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'classes') {
    return (
      <div>
        <div className="header">
          <h1>Manage Classes</h1>
          <button className="btn btn-primary" onClick={() => { setEditingClass(null); clearClassForm(); setClassFormOpen(!classFormOpen); }}>
            <Plus size={16} />
            <span>Add Class</span>
          </button>
        </div>

        {classFormOpen && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>{editingClass ? 'Edit Class Parameters' : 'Create New Class'}</h2>
            <form onSubmit={handleSaveClass} style={{ marginTop: '16px' }}>
              <div className="grid grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Class Name</label>
                  <input type="text" className="input" placeholder="e.g. B.Tech CS" required value={className} onChange={(e) => setClassName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Year</label>
                  <input type="number" className="input" placeholder="e.g. 3" required value={classYear} onChange={(e) => setClassYear(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <input type="text" className="input" placeholder="e.g. A" required value={classSection} onChange={(e) => setClassSection(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Tutor 1</label>
                  <select className="input" value={classTutor1Id} onChange={(e) => setClassTutor1Id(e.target.value)}>
                    <option value="">-- No Tutor 1 --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.username} ({s.first_name})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tutor 2</label>
                  <select className="input" value={classTutor2Id} onChange={(e) => setClassTutor2Id(e.target.value)}>
                    <option value="">-- No Tutor 2 --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.username} ({s.first_name})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tutor 3 (Advisor)</label>
                  <select className="input" value={classTutor3Id} onChange={(e) => setClassTutor3Id(e.target.value)}>
                    <option value="">-- No Tutor 3 / Advisor --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.username} ({s.first_name})</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">Save Class</button>
                <button type="button" className="btn btn-secondary" onClick={() => setClassFormOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Year</th>
                  <th>Section</th>
                  <th>Tutor 1</th>
                  <th>Tutor 2</th>
                  <th>Tutor 3 (Advisor)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '600' }}>{c.name}</td>
                    <td>Year {c.year}</td>
                    <td>Section {c.section}</td>
                    <td>{c.tutor1_name || '-'}</td>
                    <td>{c.tutor2_name || '-'}</td>
                    <td>{c.tutor3_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--accent-primary)' }} onClick={() => handleEditClassClick(c)}><Edit size={14} /></button>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteClass(c.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'subjects') {
    return (
      <div>
        <div className="header">
          <h1>Manage Subjects</h1>
          <button className="btn btn-primary" onClick={() => { setEditingSubject(null); clearSubjectForm(); setSubjectFormOpen(!subjectFormOpen); }}>
            <Plus size={16} />
            <span>Add Subject</span>
          </button>
        </div>

        {subjectFormOpen && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>{editingSubject ? 'Edit Subject Parameters' : 'Create New Subject'}</h2>
            <form onSubmit={handleSaveSubject} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input type="text" className="input" placeholder="e.g. CS301" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Subject Name</label>
                <input type="text" className="input" placeholder="e.g. Data Structures" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary">Save Subject</button>
                <button type="button" className="btn btn-secondary" onClick={() => setSubjectFormOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{s.code}</td>
                    <td>{s.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--accent-primary)' }} onClick={() => handleEditSubjectClick(s)}><Edit size={14} /></button>
                        <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteSubject(s.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'approvals') {
    const pendingHOD = leaves.filter(l => l.advisor_approved === 'Approved' && l.hod_approved === 'Pending' && l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD'));
    const processedHOD = leaves.filter(l => !l.is_archived && l.hod_approved !== 'Pending' && l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD'));

    return (
      <div>
        <div className="header">
          <h1>Department Leave/OD Approvals</h1>
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
          <div>Loading approvals...</div>
        ) : (
          <div className="grid">
            <div className="card">
              <h2 style={{ marginBottom: '16px', color: 'var(--accent-primary)' }}>Pending HOD Action (Approved by Advisor)</h2>
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
                    {pendingHOD.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No requests pending HOD approval.</td>
                      </tr>
                    ) : (
                      pendingHOD.map(l => (
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

            <div className="card">
              <h2 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Processed Approvals (Recent)</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Tutor Status</th>
                      <th>Advisor Status</th>
                      <th>HOD Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedHOD.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No processed records.</td>
                      </tr>
                    ) : (
                      processedHOD.map(l => (
                        <tr key={l.id}>
                          <td>{l.student_details?.user.first_name} ({l.student_details?.user.username})</td>
                          <td>{l.date}</td>
                          <td><span className={`badge ${l.leave_type === 'OD' ? 'badge-od' : 'badge-leave'}`}>{l.leave_type}</span></td>
                          <td>{l.tutor_approved}</td>
                          <td>{l.advisor_approved}</td>
                          <td><span className={`badge ${l.hod_approved === 'Approved' ? 'badge-present' : 'badge-absent'}`}>{l.hod_approved}</span></td>
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

  if (activeTab === 'morning') {
    return (
      <div>
        <div className="header">
          <h1>Morning Attendance Analysis</h1>
          {morningData.length > 0 && (
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleDownloadMorningCSV}>
              <FileSpreadsheet size={16} />
              <span>Download CSV</span>
            </button>
          )}
        </div>

        {morningLoading ? (
          <div>Loading morning reports...</div>
        ) : (
          <div className="card">
            <h2>Period 1 Statistics (By Class)</h2>
            <div className="table-container" style={{ marginTop: '16px' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class Name</th>
                    <th>Total Students</th>
                    <th>Present Count</th>
                    <th>Absent Count</th>
                    <th>OD Count</th>
                    <th>Advisor</th>
                  </tr>
                </thead>
                <tbody>
                  {morningData.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No morning period data found.</td>
                    </tr>
                  ) : (
                    morningData.map((m, idx) => (
                      <tr key={idx}>
                        <td>{m.date}</td>
                        <td style={{ fontWeight: '600' }}>{m.student__student_class__name} (Yr {m.student__student_class__year}, Sec {m.student__student_class__section})</td>
                        <td>{m.total_students}</td>
                        <td style={{ color: 'var(--success)', fontWeight: '500' }}>{m.present_count}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: '500' }}>{m.absent_count}</td>
                        <td style={{ color: 'var(--info)', fontWeight: '500' }}>{m.od_count}</td>
                        <td>{m.student__student_class__advisor__first_name ? `${m.student__student_class__advisor__first_name} ${m.student__student_class__advisor__last_name}` : m.student__student_class__advisor__username}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'profile') {
    return (
      <div>
        <div className="header">
          <h1>HOD Profile Settings</h1>
        </div>

        <div className="card" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px' }}>{user.first_name || user.username} {user.last_name || ''}</h2>
              <span className="badge badge-present" style={{ marginTop: '4px' }}>HOD ID: {user.username}</span>
            </div>
          </div>

          {!profileEditMode ? (
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
              </div>
              <button className="btn btn-primary" onClick={() => setProfileEditMode(true)}>
                Edit Details
              </button>
            </div>
          ) : (
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

export default HODDashboard;

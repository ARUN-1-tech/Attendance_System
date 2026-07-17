import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { 
  Users, UserCheck, ShieldAlert, Award, 
  Trash2, Edit, Plus, Check, X, FileSpreadsheet, Eye,
  Calendar, BookOpen, User, Download, Printer,
  ArrowLeft, ChevronDown, ChevronUp, Clock, Search
} from 'lucide-react';

const HODDashboard = ({ activeTab, setActiveTab }) => {
  const { user, checkAuth } = useAuth();
  
  // Dashboard stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Selected class for live grid monitor
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classGridData, setClassGridData] = useState(null);
  const [classGridLoading, setClassGridLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState(null);
  const [gridSearchQuery, setGridSearchQuery] = useState('');


  // Student CRUD states
  const [students, setStudents] = useState([]);
  const [selectedStudentStats, setSelectedStudentStats] = useState(null);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
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
  const [studentTutorId, setStudentTutorId] = useState('');
  const [studentAdvisorId, setStudentAdvisorId] = useState('');
  const [studentProfilePhoto, setStudentProfilePhoto] = useState('');
  const [studentYear, setStudentYear] = useState('');
  
  // Subject detail states
  const [subjectDetailModalOpen, setSubjectDetailModalOpen] = useState(false);
  const [subjectDetailData, setSubjectDetailData] = useState(null);
  const [subjectDetailLoading, setSubjectDetailLoading] = useState(false);

  // Bulk upload student states
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
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
  const [showHistory, setShowHistory] = useState(false);

  // Morning Attendance states
  const [morningData, setMorningData] = useState([]);
  const [morningLoading, setMorningLoading] = useState(true);

  // Report states
  const [reportMode, setReportMode] = useState('day');
  const [reportDate, setReportDate] = useState(new Date().toISOString().substring(0, 10));
  const [reportType, setReportType] = useState('department');
  const [reportClassId, setReportClassId] = useState('');
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Profile states
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone_number || '');
  const [dob, setDob] = useState(user.dob || '');
  const [profilePhoto, setProfilePhoto] = useState(user.profile_photo || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileEditMode, setProfileEditMode] = useState(false);

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'classes') {
      fetchClassesList();
      fetchStaffListOnly();
      fetchStudentsList();
      setSelectedClassForStudents(null);
      setSelectedClassId(null);
    } else if (activeTab === 'subjects') {
      fetchSubjectsList();
    } else if (activeTab === 'staff') {
      fetchStaffList();
    } else if (activeTab === 'approvals') {
      fetchPendingApprovals();
    } else if (activeTab === 'reports') {
      fetchClassesAndStaff();
      fetchSubjectsList();
      if (classes.length > 0 && !reportClassId) {
        setReportClassId(classes[0].id.toString());
      }
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

  const handleViewStudentStats = async (username) => {
    try {
      const data = await api.get(`/api/attendance/student-stats/${username}/`);
      setSelectedStudentStats(data);
      setStatsModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to fetch student analysis.');
    }
  };

  const fetchClassesAndStaff = async () => {
    try {
      const cls = await api.get('/api/classes/');
      const stf = await api.get('/api/users/?role=staff');
      setClasses(cls);
      setStaffList(stf);
      if (cls.length > 0) {
        setStudentClassId(cls[0].id.toString());
        setReportClassId(cls[0].id.toString());
      }
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
    if (morningData.length === 0) {
      setMorningLoading(true);
    }
    try {
      const data = await api.get('/api/hod/morning-attendance/');
      setMorningData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMorningLoading(false);
    }
  };

  const fetchClassGrid = async (classId) => {
    try {
      const data = await api.get(`/api/hod/morning-attendance/?class_id=${classId}`);
      setClassGridData(data);
    } catch (err) {
      console.error(err);
      setClassGridData(null);
    } finally {
      setClassGridLoading(false);
    }
  };

  useEffect(() => {
    let interval = null;
    if (activeTab === 'classes' && selectedClassId) {
      setClassGridLoading(true);
      fetchClassGrid(selectedClassId);
      interval = setInterval(() => {
        fetchClassGrid(selectedClassId);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, selectedClassId]);


  const handleRunReport = async (e) => {
    if (e) e.preventDefault();
    setReportsLoading(true);
    setReportData([]);
    try {
      let query = `?report_type=${reportType}&report_mode=${reportMode}`;
      if (reportType === 'class') query += `&class_id=${reportClassId}`;
      if (reportType === 'student') query += `&student_id=${reportStudentId}`;
      
      if (reportFromDate) query += `&from_date=${reportFromDate}`;
      if (reportToDate) query += `&to_date=${reportToDate}`;
      if (reportMode === 'subject_percentage' && reportSubjectId) {
        query += `&subject_id=${reportSubjectId}`;
      }
      
      const data = await api.get(`/api/attendance/reports/${query}`);
      setReportData(data);
    } catch (err) {
      alert(err.message || 'Failed to fetch report data.');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDownloadReportCSV = () => {
    if (reportData.length === 0) return;
    
    let headers;
    if (reportMode === 'day') {
      headers = ['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Status'];
    } else {
      headers = ['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Subject', 'Attendance Percentage'];
    }
    
    const csvRows = [headers.join(',')];
    let total = 0, present = 0, absent = 0, od = 0;

    reportData.forEach(r => {
      let row;
      const regNo = r.student_reg_no || r.student_username;
      const dept = r.department_name || '';
      const yr = r.year || '';
      const cls = r.class_only_name || '';
      const sec = r.section || '';

      if (reportMode === 'day') {
        row = [
          regNo,
          `"${r.student_name}"`,
          `"${dept}"`,
          yr,
          `"${cls}"`,
          `"${sec}"`,
          r.date,
          r.status
        ];
        total++;
        if (r.status === 'Present') present++;
        else if (r.status === 'Absent') absent++;
        else if (r.status === 'OD') od++;
        else if (r.status === 'Half Day') { present += 0.5; absent += 0.5; }
      } else {
        row = [
          regNo,
          `"${r.student_name}"`,
          `"${dept}"`,
          yr,
          `"${cls}"`,
          `"${sec}"`,
          `"${r.subject_name}"`,
          `"${r.percentage}%"`
        ];
      }
      csvRows.push(row.join(','));
    });
    
    if (reportMode === 'day') {
      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(`Total Students,${total}`);
      csvRows.push(`Present,${present}`);
      csvRows.push(`Absent,${absent}`);
      csvRows.push(`OD,${od}`);
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Attendance_Report_${reportType}_${reportMode}_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Student CRUD functions
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const payload = {
      user: {
        username: studentUsername,
        email: studentEmail,
        first_name: studentUsername,
        role: 'student',
        phone_number: studentPhone || null,
        dob: studentDob || null,
        profile_photo: studentProfilePhoto || null
      },
      student_class: parseInt(studentClassId),
      roll_no: studentRollNo || '',
      reg_no: studentRegNo || '',
      tutor: studentTutorId ? parseInt(studentTutorId) : null,
      advisor: studentAdvisorId ? parseInt(studentAdvisorId) : null
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

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    const selectedFile = csvFile;
    if (!selectedFile) {
      alert('Please select a file.');
      return;
    }
    const ext = selectedFile.name.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setBulkErrors(['Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.']);
      return;
    }
    setBulkSubmitting(true);
    setBulkErrors([]);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const csrfToken = getCookie('csrftoken');
      const response = await fetch(`${api.baseUrl}/api/students/bulk_create/`, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
        body: formData,
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        setBulkErrors([data.detail || 'Bulk import failed.']);
      } else {
        if (data.errors && data.errors.length > 0) {
          setBulkErrors(data.errors);
          alert(`Import completed with some errors. Created: ${data.created}, Failed: ${data.failed}`);
        } else {
          alert(data.detail || `Successfully imported all ${data.created} students!`);
          setBulkUploadOpen(false);
          setCsvFile(null);
        }
        fetchStudentsList();
      }
    } catch (err) {
      setBulkErrors([err.message || 'Connection error.']);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleEditStudentClick = (s) => {
    setEditingStudent(s);
    setStudentUsername(s.user.username);
    setStudentEmail(s.user.email);
    setStudentClassId(s.student_class?.toString() || '');
    setStudentPassword('');
    setStudentPhone(s.user.phone_number || '');
    setStudentRollNo(s.roll_no || '');
    setStudentRegNo(s.reg_no || '');
    setStudentTutorId(s.tutor?.toString() || '');
    setStudentAdvisorId(s.advisor?.toString() || '');
    setStudentDob(s.user.dob || '');
    setStudentProfilePhoto(s.user.profile_photo || '');
    setStudentYear(s.class_year?.toString() || '');
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
    setStudentTutorId('');
    setStudentAdvisorId('');
    setStudentDob('');
    setStudentProfilePhoto('');
    setStudentYear('');
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
        profile_photo: profilePhoto || null,
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

    const headers = ['Class', 'Year', 'Section', 'Total Students', 'Present', 'Absent', 'On Duty'];
    const csvRows = [headers.join(',')];

    morningData.forEach(r => {
      const row = [
        `"${r.class_name}"`,
        r.year,
        `"${r.section}"`,
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
    a.setAttribute('download', `Class_Attendance_Report_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadYearCSV = async (year) => {
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      const data = await api.get(`/api/attendance/reports/?from_date=${todayStr}&to_date=${todayStr}&year=${year}`);
      if (data.length === 0) {
        alert(`No attendance records found for today in Year ${year}`);
        return;
      }
      const headers = ['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Period', 'Subject', 'Status'];
      const csvRows = [headers.join(',')];
      let total = 0, present = 0, absent = 0, od = 0;
      data.forEach(r => {
        const row = [
          r.student_reg_no || r.student_username,
          `"${r.student_name}"`,
          `"${r.department_name || ''}"`,
          r.year || '',
          `"${r.class_only_name || ''}"`,
          `"${r.section || ''}"`,
          r.date,
          r.period || '-',
          `"${r.subject_name || '-'}"`,
          r.status
        ];
        csvRows.push(row.join(','));
        total++;
        if (r.status === 'Present') present++;
        else if (r.status === 'Absent') absent++;
        else if (r.status === 'OD') od++;
      });

      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(`Total Students,${total}`);
      csvRows.push(`Present,${present}`);
      csvRows.push(`Absent,${absent}`);
      csvRows.push(`OD,${od}`);

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Year_${year}_Attendance_Report_${todayStr}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message || 'Failed to download year-wise CSV.');
    }
  };

  const handleDownloadLiveGridCSV = () => {
    if (!classGridData || !classGridData.student_rows) return;
    
    const search = gridSearchQuery.toLowerCase();
    const filteredRows = classGridData.student_rows.filter(row => 
      row.reg_no.toLowerCase().includes(search) || row.name.toLowerCase().includes(search)
    );
    
    const dept = classGridData.class_dept || '';
    const yr = classGridData.class_year || '';
    const cls = classGridData.class_only_name || '';
    const sec = classGridData.class_section || '';

    const headers = ['Reg No', 'Student Name', 'Department', 'Year', 'Class', 'Section'];
    classGridData.schedules.forEach(s => {
      headers.push(`Period ${s.period} (${s.subject_name})`);
    });
    
    const csvRows = [headers.join(',')];
    filteredRows.forEach(row => {
      const rowData = [row.reg_no, `"${row.name}"`, `"${dept}"`, yr, `"${cls}"`, `"${sec}"`];
      classGridData.schedules.forEach(s => {
        const statusObj = row.statuses.find(st => st.schedule_id === s.id);
        const statusText = statusObj ? statusObj.status : '-';
        rowData.push(statusText);
      });
      csvRows.push(rowData.join(','));
    });

    // Add summary section
    csvRows.push('');
    csvRows.push('Summary');
    csvRows.push(`Total Students,${filteredRows.length}`);
    
    const presentRow = ['Present', '', '', '', '', ''];
    const absentRow = ['Absent', '', '', '', '', ''];
    const odRow = ['OD', '', '', '', '', ''];
    
    classGridData.schedules.forEach(s => {
      const colSum = classGridData.columns_summary.find(cs => cs.schedule_id === s.id);
      if (colSum) {
        presentRow.push(colSum.present);
        absentRow.push(colSum.absent);
        odRow.push(colSum.od);
      } else {
        presentRow.push(0);
        absentRow.push(0);
        odRow.push(0);
      }
    });
    
    csvRows.push(presentRow.join(','));
    csvRows.push(absentRow.join(','));
    csvRows.push(odRow.join(','));
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${classGridData.class_name.replace(/\s+/g, '_')}_Live_Grid_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadFirstPeriodCSV = () => {
    if (!classGridData || !classGridData.student_rows) return;
    
    const dept = classGridData.class_dept || '';
    const yr = classGridData.class_year || '';
    const cls = classGridData.class_only_name || '';
    const sec = classGridData.class_section || '';

    const headers = ['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Status'];
    const csvRows = [headers.join(',')];
    const dateVal = classGridData.date;
    
    const period1Sched = classGridData.schedules.find(s => s.period === 1);
    
    let total = 0, present = 0, absent = 0, od = 0;
    classGridData.student_rows.forEach(row => {
      let statusText = '-';
      if (period1Sched) {
        const statusObj = row.statuses.find(st => st.schedule_id === period1Sched.id);
        statusText = statusObj ? statusObj.status : 'Absent';
      }
      const rowData = [
        row.reg_no,
        `"${row.name}"`,
        `"${dept}"`,
        yr,
        `"${cls}"`,
        `"${sec}"`,
        dateVal,
        statusText
      ];
      csvRows.push(rowData.join(','));
      total++;
      if (statusText === 'Present') present++;
      else if (statusText === 'Absent') absent++;
      else if (statusText === 'OD') od++;
    });

    csvRows.push('');
    csvRows.push('Summary');
    csvRows.push(`Total Students,${total}`);
    csvRows.push(`Present,${present}`);
    csvRows.push(`Absent,${absent}`);
    csvRows.push(`OD,${od}`);
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${classGridData.class_name.replace(/\s+/g, '_')}_1st_Period_Attendance_${dateVal}.csv`);
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
              <h2 style={{ marginBottom: '20px' }}>Today's Student Overview (Period 1)</h2>
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

            {/* Year-wise Period 1 Overview */}
            <div className="card" style={{ marginTop: '24px' }}>
              <h2 style={{ marginBottom: '20px' }}>Year-wise Period 1 Overview</h2>
              <div className="grid grid-cols-2" style={{ gap: '20px' }}>
                {stats.year_stats && stats.year_stats.map((yearStat) => {
                  const isExpanded = expandedYear === yearStat.year;
                  const romanYears = ['I', 'II', 'III', 'IV'];
                  return (
                    <div 
                      key={yearStat.year} 
                      className="card" 
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          cursor: 'pointer' 
                        }}
                        onClick={() => setExpandedYear(isExpanded ? null : yearStat.year)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Award size={20} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontWeight: '700', fontSize: '15px' }}>Year {yearStat.year} ({romanYears[yearStat.year - 1]} Year)</span>
                          <button 
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '2px 6px', 
                              fontSize: '11px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              marginLeft: '8px',
                              height: '24px'
                            }} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadYearCSV(yearStat.year);
                            }}
                            title="Download Year CSV"
                          >
                            <Download size={12} />
                            <span>CSV</span>
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to see classes</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', marginTop: '4px' }}>
                        <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '4px', padding: '6px 4px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{yearStat.present}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8 }}>Present</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '4px', padding: '6px 4px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{yearStat.absent}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8 }}>Absent</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)', borderRadius: '4px', padding: '6px 4px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{yearStat.od}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8 }}>OD</div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Classes Breakdown:</div>
                          {yearStat.classes.length === 0 ? (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No classes configured for this year.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {yearStat.classes.map((cls) => (
                                <div 
                                  key={cls.class_id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: '1px solid transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                    e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                  }}
                                  onClick={() => {
                                    setSelectedClassId(cls.class_id);
                                    setActiveTab('morning');
                                  }}
                                >
                                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{cls.class_name}</span>
                                  <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--success)' }}>{cls.present} P</span>
                                    <span style={{ color: 'var(--danger)' }}>{cls.absent} A</span>
                                    <span style={{ color: 'var(--info)' }}>{cls.od} OD</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
    if (selectedClassId) {
      return (
        <div>
          <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}
              onClick={() => { setSelectedClassId(null); setGridSearchQuery(''); }}
            >
              <ArrowLeft size={16} />
              <span>Back to Class List</span>
            </button>
            <h1 style={{ margin: 0 }}>Live Class Matrix</h1>
          </div>

          {classGridLoading && !classGridData ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading live attendance matrix...</p>
            </div>
          ) : !classGridData ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Could not load live attendance matrix for this class.</p>
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Class Monitor</span>
                  <h2 style={{ fontSize: '20px', margin: '4px 0 0 0' }}>{classGridData.class_name}</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Date</span>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{classGridData.date}</div>
                </div>
              </div>

              {/* Search and Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '300px' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Search by Reg No or Name..."
                    value={gridSearchQuery}
                    onChange={(e) => setGridSearchQuery(e.target.value)}
                    style={{ paddingLeft: '36px', height: '38px', margin: 0 }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
                    onClick={handleDownloadFirstPeriodCSV}
                  >
                    <Download size={16} />
                    <span>Download 1st Period CSV</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
                    onClick={handleDownloadLiveGridCSV}
                  >
                    <Download size={16} />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {/* Status Legend */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', padding: '10px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Legend:</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span> Present (P)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span> Absent (A)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--info)' }}></span> On Duty (OD)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)' }}></span> Leave (L)</span>
                </div>
              </div>

              {classGridData.schedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No periods scheduled for today.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 8px', width: '60px' }}>S.No</th>
                      <th style={{ padding: '12px 8px' }}>Reg No</th>
                      <th style={{ padding: '12px 8px' }}>Student Name</th>
                      {classGridData.schedules.map(s => (
                        <th key={s.id} style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>Period {s.period}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '12px' }}>{s.subject_name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Subject summary row at top */}
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>
                      <td colSpan={3} style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Subject Summary (P / A / OD)</td>
                      {classGridData.columns_summary.map((col, idx) => (
                        <td key={idx} style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', lineHeight: '1.4' }}>
                          <div><span style={{ color: 'var(--success)' }}>{col.present}P</span> &bull; <span style={{ color: 'var(--danger)' }}>{col.absent}A</span></div>
                          <div style={{ color: 'var(--info)', marginTop: '2px' }}>{col.od}OD</div>
                        </td>
                      ))}
                    </tr>

                    {classGridData.student_rows.filter(row => {
                      const search = gridSearchQuery.toLowerCase();
                      return row.reg_no.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
                    }).map((row, rIdx) => (
                      <tr 
                        key={rIdx} 
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '10px 8px', fontWeight: '600' }}>{rIdx + 1}</td>
                        <td style={{ padding: '10px 8px', fontWeight: '600' }}>{row.reg_no}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-primary)' }}>{row.name}</td>
                        
                        {row.statuses.map((s, sIdx) => {
                          let cellText = '-';
                          let cellBg = 'transparent';
                          let cellColor = 'var(--text-muted)';
                          
                          if (s.status === 'Present') { cellText = 'P'; cellBg = 'var(--success-light)'; cellColor = 'var(--success)'; }
                          else if (s.status === 'Absent') { cellText = 'A'; cellBg = 'var(--danger-light)'; cellColor = 'var(--danger)'; }
                          else if (s.status === 'OD') { cellText = 'OD'; cellBg = 'var(--info-light)'; cellColor = 'var(--info)'; }
                          else if (s.status === 'Leave') { cellText = 'L'; cellBg = 'var(--warning-light)'; cellColor = 'var(--warning)'; }

                          return (
                            <td key={sIdx} style={{ padding: '10px 8px', textAlign: 'center' }}>
                              {cellText !== '-' ? (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  backgroundColor: cellBg,
                                  color: cellColor,
                                  display: 'inline-block',
                                  minWidth: '24px'
                                }}>
                                  {cellText}
                                </span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.12)', fontWeight: '600' }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      );
    }

    if (selectedClassForStudents) {
      const classStudents = students.filter(s => s.student_class === selectedClassForStudents.id);
      return (
        <>
          <div>
            <div style={{ marginBottom: '24px' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => { setSelectedClassForStudents(null); setStudentFormOpen(false); setBulkUploadOpen(false); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back to Classes</span>
              </button>
            </div>

            <div className="header">
              <h1>Students in Class: {selectedClassForStudents.name} (Sec {selectedClassForStudents.section})</h1>
            </div>

            {studentFormOpen && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <h2>Edit Student Details</h2>
                <form onSubmit={handleSaveStudent} style={{ marginTop: '16px' }}>
                  <div className="grid grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input type="text" className="input" required value={studentUsername} onChange={(e) => setStudentUsername(e.target.value)} disabled={editingStudent !== null} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">College Mail (Email)</label>
                      <input type="email" className="input" required value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Registration Number</label>
                      <input type="text" className="input" required value={studentRegNo} onChange={(e) => setStudentRegNo(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Roll Number</label>
                      <input type="text" className="input" required value={studentRollNo} onChange={(e) => setStudentRollNo(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Date of Birth</label>
                      <input type="date" className="input" required value={studentDob} onChange={(e) => setStudentDob(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number (Phone)</label>
                      <input type="text" className="input" required value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Profile Photo</label>
                    <input type="file" className="input" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setStudentProfilePhoto(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                    {studentProfilePhoto && (
                      <div style={{ marginTop: '10px' }}>
                        <img src={studentProfilePhoto} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Year</label>
                      <select className="input" value={studentYear} disabled required style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <option value={selectedClassForStudents.year.toString()}>Year {selectedClassForStudents.year}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Class</label>
                      <select className="input" value={studentClassId} disabled required style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <option value={selectedClassForStudents.id.toString()}>{selectedClassForStudents.name} (Sec {selectedClassForStudents.section})</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Tutor</label>
                      <select className="input" value={studentTutorId} onChange={(e) => setStudentTutorId(e.target.value)}>
                        <option value="">-- Select Tutor --</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.username})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Advisor</label>
                      <select className="input" value={studentAdvisorId} onChange={(e) => setStudentAdvisorId(e.target.value)}>
                        <option value="">-- Select Advisor --</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.username})</option>)}
                      </select>
                    </div>
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
                      <th style={{ width: '60px' }}>S.No</th>
                      <th>Roll / Reg No</th>
                      <th>Name</th>
                      <th>Roll No</th>
                      <th>Reg No</th>
                      <th>Attendance %</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          No students in this class yet.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((s, idx) => (
                        <tr key={s.user.id}>
                          <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                          <td style={{ fontWeight: '600' }}>{s.roll_no && s.reg_no ? `${s.roll_no} / ${s.reg_no}` : (s.roll_no || s.reg_no || '-')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {s.user.profile_photo ? (
                                <img src={s.user.profile_photo} alt="Student" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                              ) : (
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  {s.user.username.slice(-2).toUpperCase()}
                                </div>
                              )}
                              <span>{s.user.first_name || s.user.last_name ? `${s.user.first_name} ${s.user.last_name || ''}` : s.user.username}</span>
                            </div>
                          </td>
                          <td>{s.roll_no}</td>
                          <td>{s.reg_no}</td>
                          <td style={{ fontWeight: '600', color: (s.attendance_percentage || 0) >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                            {s.attendance_percentage !== undefined ? `${s.attendance_percentage}%` : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--accent-primary)' }} onClick={() => handleViewStudentStats(s.user.username)} title="View Analytics"><Eye size={14} /></button>
                              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--accent-primary)' }} onClick={() => handleEditStudentClick(s)} title="Edit"><Edit size={14} /></button>
                              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteStudent(s.user.id)} title="Delete"><Trash2 size={14} /></button>
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
          {statsModalOpen && selectedStudentStats && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}>
              <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {selectedStudentStats.profile_photo ? (
                      <img src={selectedStudentStats.profile_photo} alt="Student" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
                    ) : (
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {selectedStudentStats.username.slice(-2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Attendance Analysis & Insights</h2>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Student: <strong>{selectedStudentStats.name}</strong> ({selectedStudentStats.username}) | Class: <strong>{selectedStudentStats.class_name}</strong>
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setStatsModalOpen(false)}>Close</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="120" height="120" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="transparent" />
                        <circle 
                          cx="50" cy="50" r="40" 
                          stroke={selectedStudentStats.percentage >= 75.0 ? 'var(--success)' : 'var(--danger)'} 
                          strokeWidth="8" fill="transparent" 
                          strokeDasharray={`${2 * Math.PI * 40}`} 
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - selectedStudentStats.percentage / 100)}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {selectedStudentStats.percentage}%
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600', marginTop: '14px' }}>Overall Attendance</div>
                    <span className={`badge ${selectedStudentStats.percentage >= 75.0 ? 'badge-present' : 'badge-absent'}`} style={{ marginTop: '8px' }}>
                      {selectedStudentStats.percentage >= 75.0 ? 'Eligible' : 'Low Attendance'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Total Period Hours</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>{selectedStudentStats.total}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Present Hours</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>{selectedStudentStats.present}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Absent Hours</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)', marginTop: '4px' }}>{selectedStudentStats.absent}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Approved OD Hours</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--info)', marginTop: '4px' }}>{selectedStudentStats.verified_od}</div>
                    </div>
                  </div>
                </div>

                {selectedStudentStats.ai_suggestion && (
                  <div style={{
                    backgroundColor: selectedStudentStats.percentage >= 75.0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${selectedStudentStats.percentage >= 75.0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    marginBottom: '24px',
                    fontSize: '13.5px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.5'
                  }}>
                    <strong style={{ color: selectedStudentStats.percentage >= 75.0 ? 'var(--success)' : 'var(--danger)', display: 'block', marginBottom: '4px' }}>Status Summary:</strong>
                    {selectedStudentStats.ai_suggestion}
                  </div>
                )}

                {selectedStudentStats.subjects && selectedStudentStats.subjects.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>Subject-wise Breakdown</h3>
                    <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <table className="table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Total Hours</th>
                            <th>Present Hours</th>
                            <th>Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudentStats.subjects.map(sub => (
                            <tr 
                              key={sub.id} 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleSubjectClick(selectedStudentStats.username, sub.id)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td>
                                <strong style={{ color: 'var(--accent-primary)' }}>{sub.code}</strong> - {sub.name}
                              </td>
                              <td>{sub.total_periods}</td>
                              <td>{sub.effective_present}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: '600', minWidth: '45px', color: sub.percentage >= 75.0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {sub.percentage}%
                                  </span>
                                  <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', maxWidth: '80px' }}>
                                    <div style={{
                                      width: `${sub.percentage}%`,
                                      height: '100%',
                                      backgroundColor: sub.percentage >= 75.0 ? 'var(--success)' : 'var(--danger)'
                                    }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
        </>
      );
    }

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
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setSelectedClassForStudents(c); setStudentFormOpen(false); setBulkUploadOpen(false); }}>
                          <span>View Students</span>
                        </button>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--accent-primary)' }} onClick={() => { setSelectedClassId(c.id); setGridSearchQuery(''); }}>
                          <span>View Live Grid</span>
                        </button>
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
    const processedHOD = leaves.filter(l => l.hod_approved !== 'Pending' && l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD'));

    return (
      <div>
        <div className="header">
          <h1>Department Leave/OD Approvals</h1>
          <button 
            className="btn btn-outline" 
            onClick={() => setShowHistory(!showHistory)}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
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
            <div style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }}></span>
                Pending HOD Action (Approved by Advisor)
              </h2>
              {pendingHOD.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No requests pending HOD approval.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {pendingHOD.map(l => (
                    <div className="card" key={l.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', minHeight: '220px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px' }}>
                            {(l.student_details?.user.first_name || 'S').substring(0, 1)}{(l.student_details?.user.last_name || 'S').substring(0, 1)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.student_details?.user.first_name} {l.student_details?.user.last_name} ({l.student_details?.reg_no})</h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Class: {l.student_details?.class_name} | Reg: {l.student_details?.reg_no}</span>
                          </div>
                          <span className={`badge ${l.leave_type === 'OD' ? 'badge-od' : 'badge-leave'}`}>{l.leave_type}</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Date:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{l.date}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '2px' }}>Reason:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{l.reason}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ flex: 1, height: '34px', fontSize: '13px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleApproveAction(l.id, 'Approve')}>Approve</button>
                        <button className="btn btn-outline" style={{ flex: 1, height: '34px', fontSize: '13px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }} onClick={() => handleApproveAction(l.id, 'Reject')}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Processed History */}
            {showHistory && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-secondary)' }}>Processed History</h2>
                {processedHOD.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px', margin: '20px 0' }}>No processed records.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
                    {processedHOD.map(l => (
                      <div key={l.id} style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '16px', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{l.student_details?.user.first_name} {l.student_details?.user.last_name} ({l.student_details?.reg_no})</strong>
                            <span className={`badge ${l.leave_type === 'OD' ? 'badge-od' : 'badge-leave'}`}>{l.leave_type}</span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date: {l.date}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginBottom: '10px' }}>Reason: {l.reason}</span>
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', fontSize: '11px', display: 'flex', gap: '8px', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Tutor: <strong style={{ color: l.tutor_approved === 'Approved' ? 'var(--success)' : (l.tutor_approved === 'Rejected' ? 'var(--danger)' : 'var(--warning)') }}>{l.tutor_approved}</strong></span>
                          <span>Advisor: <strong style={{ color: l.advisor_approved === 'Approved' ? 'var(--success)' : (l.advisor_approved === 'Rejected' ? 'var(--danger)' : 'var(--warning)') }}>{l.advisor_approved}</strong></span>
                          <span>HOD: <strong style={{ color: l.hod_approved === 'Approved' ? 'var(--success)' : (l.hod_approved === 'Rejected' ? 'var(--danger)' : 'var(--warning)') }}>{l.hod_approved}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          {reportData.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handlePrintReport}>
                <Printer size={16} />
                <span>Print Report</span>
              </button>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleDownloadReportCSV}>
                <FileSpreadsheet size={16} />
                <span>Download CSV</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3">
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <h2 style={{ marginBottom: '16px' }}>Report Filters</h2>
            <form onSubmit={handleRunReport}>
              <div className="form-group">
                <label className="form-label">Report Mode</label>
                <select className="input" value={reportMode} onChange={(e) => setReportMode(e.target.value)}>
                  <option value="day">Day Attendance</option>
                  <option value="subject_percentage">Subject Percentage</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Report Scope</label>
                <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="department">Entire Department</option>
                  <option value="class">Class-wise</option>
                  <option value="student">Student-wise</option>
                </select>
              </div>

              {reportType === 'class' && (
                <div className="form-group">
                  <label className="form-label">Select Class</label>
                  <select className="input" value={reportClassId} onChange={(e) => setReportClassId(e.target.value)} required>
                    <option value="">-- Choose Class --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - Year {c.year} (Sec {c.section})</option>
                    ))}
                  </select>
                </div>
              )}

              {reportType === 'student' && (
                <div className="form-group">
                  <label className="form-label">Student Reg. No.</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. 1001" 
                    value={reportStudentId} 
                    onChange={(e) => setReportStudentId(e.target.value)} 
                    required 
                  />
                </div>
              )}

              {reportMode !== 'day' && (
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="input" value={reportSubjectId} onChange={(e) => setReportSubjectId(e.target.value)}>
                    <option value="">-- All Subjects --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">From Date</label>
                <input type="date" className="input" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} required />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">{reportMode === 'day' ? 'To Date (Optional)' : 'To Date'}</label>
                <input type="date" className="input" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} required={reportMode !== 'day'} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={reportsLoading}>
                {reportsLoading ? 'Fetching Data...' : 'Fetch Report Data'}
              </button>
            </form>
          </div>

          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h2 style={{ marginBottom: '16px' }}>Query Output ({reportData.length} records)</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  {reportMode === 'day' ? (
                    <tr>
                      <th style={{ width: '60px' }}>S.No</th>
                      <th>Reg No</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: '60px' }}>S.No</th>
                      <th>Reg No</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Attendance Percentage</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No report data loaded. Adjust filters and click Fetch.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((r, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '600' }}>{r.student_reg_no || r.student_username}</td>
                        <td>{r.student_name}</td>
                        <td>{r.class_name}</td>
                        {reportMode === 'day' ? (
                          <>
                            <td>{r.date}</td>
                            <td>
                              <span className={`badge ${
                                r.status === 'Present' ? 'badge-present' : 
                                r.status === 'Absent' ? 'badge-absent' : 
                                r.status === 'OD' ? 'badge-od' : 
                                r.status === 'Half Day' ? 'badge-halfday' : 'badge-leave'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{r.subject_name}</td>
                            <td style={{ fontWeight: '600' }}>{r.percentage}%</td>
                          </>
                        )}
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
          <h1>HOD Profile Settings</h1>
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
                  <div style={{ width: '150px', color: 'var(--text-muted)' }}>Date of Birth</div>
                  <div>{user.dob || '-'}</div>
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

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="input" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Profile Photo</label>
                <input type="file" className="input" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setProfilePhoto(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
                {profilePhoto && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={profilePhoto} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                  </div>
                )}
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

export default HODDashboard;

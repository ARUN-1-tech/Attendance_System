import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { 
  Play, Check, X, ShieldAlert, Award, FileSpreadsheet, 
  Trash2, Plus, Calendar, User, Eye, Edit,
  Search, Download, ArrowLeft
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
  const [selectedPeriods, setSelectedPeriods] = useState(['1']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [otpClasses, setOtpClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  
  // Approvals states
  const [leaves, setLeaves] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalSubTab, setApprovalSubTab] = useState('leave');
  const [showHistory, setShowHistory] = useState(false);

  // Students list states
  const [students, setStudents] = useState([]);
  const [selectedStudentStats, setSelectedStudentStats] = useState(null);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Report states
  const [reportMode, setReportMode] = useState('day');
  const [reportFromDate, setReportFromDate] = useState(new Date().toISOString().substring(0, 10));
  const [reportToDate, setReportToDate] = useState('');
  const [reportType, setReportType] = useState(
    user.staff_details?.staff_type === 'Tutor' ? 'tutored' : 'class'
  );
  const [reportClassId, setReportClassId] = useState('');
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [reportData, setReportData] = useState([]);

  // Profile states
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone_number || '');
  const [age, setAge] = useState(user.age || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileEditMode, setProfileEditMode] = useState(false);

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Advisor Live states
  const [advisorLiveData, setAdvisorLiveData] = useState(null);
  const [advisorLiveLoading, setAdvisorLiveLoading] = useState(true);
  const [gridSearchQuery, setGridSearchQuery] = useState('');

  // Manage subjects state variables
  const [advisedClass, setAdvisedClass] = useState(null);
  const [advisedSubjects, setAdvisedSubjects] = useState([]);
  const [advisedSubjectsLoading, setAdvisedSubjectsLoading] = useState(true);
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');

  // Manual Attendance states
  const [manualDeptId, setManualDeptId] = useState(user.department?.toString() || '');
  const [manualClassId, setManualClassId] = useState('');
  const [manualSubjectId, setManualSubjectId] = useState('');
  const [manualAttStudents, setManualAttStudents] = useState([]);
  const [selectedManualStudentId, setSelectedManualStudentId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualSchedules, setManualSchedules] = useState([]);
  const [manualStatuses, setManualStatuses] = useState({});
  const [manualAttLoading, setManualAttLoading] = useState(false);
  const [manualAttMessage, setManualAttMessage] = useState(null);
  const [manualAttError, setManualAttError] = useState(null);
  const [recentlyMarked, setRecentlyMarked] = useState([]);

  // Advisor Manual Attendance states
  const [advisorDate, setAdvisorDate] = useState(new Date().toISOString().split('T')[0]);
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [advisorPeriods, setAdvisorPeriods] = useState([]);
  const [advisorClassName, setAdvisorClassName] = useState('');
  const [advisorClassId, setAdvisorClassId] = useState(null);
  const [advisorStatuses, setAdvisorStatuses] = useState({});
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState(null);
  const [advisorSuccess, setAdvisorSuccess] = useState(null);
  const [manualAttView, setManualAttView] = useState('whole_day');

  const fetchAdvisedSubjects = async (classId) => {
    if (!classId) return;
    setAdvisedSubjectsLoading(true);
    try {
      const data = await api.get(`/api/subjects/?class_id=${classId}`);
      setAdvisedSubjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAdvisedSubjectsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'manage_subjects') {
      const myAdvisedClass = classes.find(c => c.advisor === user.id);
      if (myAdvisedClass) {
        setAdvisedClass(myAdvisedClass);
        fetchAdvisedSubjects(myAdvisedClass.id);
      } else {
        setAdvisedClass(null);
        setAdvisedSubjectsLoading(false);
      }
    }
  }, [activeTab, classes]);

  const handleSaveSubject = async (e) => {
    if (e) e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim()) {
      alert("Name and Code are required.");
      return;
    }
    const payload = {
      name: subjectName,
      code: subjectCode,
      student_class: advisedClass?.id
    };
    try {
      if (editingSubject) {
        await api.put(`/api/subjects/${editingSubject.id}/`, payload);
        alert("Subject updated successfully!");
      } else {
        await api.post('/api/subjects/', payload);
        alert("Subject added successfully!");
      }
      setSubjectFormOpen(false);
      setEditingSubject(null);
      setSubjectName('');
      setSubjectCode('');
      fetchAdvisedSubjects(advisedClass.id);
    } catch (err) {
      console.error(err);
      alert("Error saving subject. Make sure code is unique if applicable.");
    }
  };

  const handleEditSubjectClick = (sub) => {
    setEditingSubject(sub);
    setSubjectName(sub.name);
    setSubjectCode(sub.code);
    setSubjectFormOpen(true);
  };

  const handleDeleteSubject = async (subId) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      await api.delete(`/api/subjects/${subId}/`);
      alert("Subject deleted successfully!");
      fetchAdvisedSubjects(advisedClass.id);
    } catch (err) {
      console.error(err);
      alert("Error deleting subject.");
    }
  };

  const fetchAdvisorLive = async () => {
    try {
      const data = await api.get('/api/staff/advisor-live/');
      setAdvisorLiveData(data);
    } catch (err) {
      console.error(err);
      setAdvisorLiveData(null);
    } finally {
      setAdvisorLiveLoading(false);
    }
  };

  const handleDownloadLiveGridCSV = () => {
    if (!advisorLiveData || !advisorLiveData.student_rows) return;
    
    const search = gridSearchQuery.toLowerCase();
    const filteredRows = advisorLiveData.student_rows.filter(row => 
      row.reg_no.toLowerCase().includes(search) || row.name.toLowerCase().includes(search)
    );
    
    const dept = advisorLiveData.class_dept || '';
    const yr = advisorLiveData.class_year || '';
    const cls = advisorLiveData.class_only_name || '';
    const sec = advisorLiveData.class_section || '';

    const headers = ['Reg No', 'Student Name', 'Department', 'Year', 'Class', 'Section'];
    advisorLiveData.schedules.forEach(s => {
      headers.push(`Period ${s.period} (${s.subject_name})`);
    });
    
    const csvRows = [headers.join(',')];
    filteredRows.forEach(row => {
      const rowData = [row.reg_no, `"${row.name}"`, `"${dept}"`, yr, `"${cls}"`, `"${sec}"`];
      advisorLiveData.schedules.forEach(s => {
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
    
    advisorLiveData.schedules.forEach(s => {
      const colSum = advisorLiveData.columns_summary.find(cs => cs.schedule_id === s.id);
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
    a.setAttribute('download', `${advisorLiveData.class_name.replace(/\s+/g, '_')}_Live_Grid_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadFirstPeriodCSV = () => {
    if (!advisorLiveData || !advisorLiveData.student_rows) return;
    
    const dept = advisorLiveData.class_dept || '';
    const yr = advisorLiveData.class_year || '';
    const cls = advisorLiveData.class_only_name || '';
    const sec = advisorLiveData.class_section || '';

    const headers = ['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Status'];
    const csvRows = [headers.join(',')];
    const dateVal = advisorLiveData.date;
    
    const period1Sched = advisorLiveData.schedules.find(s => s.period === 1);
    
    let total = 0, present = 0, absent = 0, od = 0;
    advisorLiveData.student_rows.forEach(row => {
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
    a.setAttribute('download', `${advisorLiveData.class_name.replace(/\s+/g, '_')}_1st_Period_Attendance_${dateVal}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    let interval = null;
    setGridSearchQuery('');
    if (activeTab === 'advisor_live') {
      setAdvisorLiveLoading(true);
      fetchAdvisorLive();
      interval = setInterval(() => {
        fetchAdvisorLive();
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const statsInterval = useRef(null);

  // Initial loads
  useEffect(() => {
    fetchClassesAndSubjects();
    fetchDepartments();
  }, []);

  // Restore active session if present on user details
  useEffect(() => {
    if (user && user.active_otp_session && !activeSession) {
      setActiveSession(user.active_otp_session);
      startStatsPolling(user.active_otp_session.otp_id);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchLeavesAndODs();
    } else if (activeTab === 'students') {
      fetchStudents();
    } else if (activeTab === 'manual_attendance') {
      setManualAttView('whole_day');
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'manual_attendance' && manualClassId && manualSubjectId && manualDate) {
      fetchManualClassStudents(manualClassId, manualSubjectId, manualDate);
    } else {
      setManualAttStudents([]);
    }
  }, [activeTab, manualClassId, manualSubjectId, manualDate]);

  useEffect(() => {
    if (activeTab === 'manual_attendance' && user.staff_details?.staff_type === 'Advisor') {
      fetchAdvisorClassStudents(advisorDate);
    }
  }, [activeTab, advisorDate, user]);

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
      const stf = await api.get('/api/users/?role=staff');
      setStaffList(stf);
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

  useEffect(() => {
    const fetchClassSubjects = async () => {
      if (!selectedClassName) {
        setClassSubjects([]);
        setSelectedSubjectName('');
        return;
      }
      try {
        const data = await api.get(`/api/subjects/?class_id=${selectedClassName}`);
        setClassSubjects(data);
        if (data.length > 0) {
          setSelectedSubjectName(data[0].name);
        } else {
          setSelectedSubjectName('');
        }
      } catch (err) {
        console.error('Error fetching class subjects:', err);
      }
    };
    fetchClassSubjects();
  }, [selectedClassName]);

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

  // Student CRUD states for Advisor
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [studentUsername, setStudentUsername] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentRegNo, setStudentRegNo] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const [studentYear, setStudentYear] = useState('');
  const [studentTutorId, setStudentTutorId] = useState('');
  const [studentAdvisorId, setStudentAdvisorId] = useState('');

  const clearStudentForm = () => {
    setStudentUsername('');
    setStudentEmail('');
    setStudentPassword('');
    setStudentRegNo('');
    setStudentRollNo('');
    setStudentAge('');
    setStudentPhone('');
    
    const isAdvisor = user?.staff_details?.staff_type === 'Advisor';
    const advisedClass = isAdvisor ? classes.find(c => c.advisor === user.id) : null;
    
    if (advisedClass) {
      setStudentClassId(advisedClass.id.toString());
      setStudentYear(advisedClass.year.toString());
      setStudentAdvisorId(user.id.toString());
    } else {
      setStudentClassId('');
      setStudentYear('');
      setStudentAdvisorId('');
    }
    setStudentTutorId('');
  };

  const handleEditStudentClick = (s) => {
    setEditingStudent(s);
    setStudentUsername(s.user.username);
    setStudentEmail(s.user.email);
    setStudentClassId(s.student_class?.toString() || '');
    setStudentYear(s.class_year?.toString() || (s.student_class_details?.year?.toString()) || '');
    setStudentPassword('');
    setStudentPhone(s.user.phone_number || '');
    setStudentRollNo(s.roll_no || '');
    setStudentRegNo(s.reg_no || '');
    setStudentAge(s.user.age?.toString() || '');
    setStudentTutorId(s.tutor?.toString() || '');
    setStudentAdvisorId(s.advisor?.toString() || '');
    setStudentFormOpen(true);
    setBulkUploadOpen(false);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const payload = {
      user: {
        username: studentUsername,
        email: studentEmail,
        first_name: studentUsername,
        role: 'student',
        phone_number: studentPhone || null,
        age: studentAge ? parseInt(studentAge) : null
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
      fetchStudents();
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
        fetchStudents();
      }
    } catch (err) {
      setBulkErrors([err.message || 'Connection error.']);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/api/students/${studentId}/`);
      alert('Student deleted successfully.');
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Failed to delete student.');
    }
  };



  const fetchManualClassStudents = async (classId, subjectId, dateVal) => {
    if (!classId || !subjectId || !dateVal) return;
    setManualAttLoading(true);
    setManualAttMessage(null);
    setManualAttError(null);
    try {
      const data = await api.get(`/api/attendances/manual-class-students/?class_id=${classId}&subject_id=${subjectId}&date=${dateVal}`);
      setManualAttStudents(data.students || []);
      
      const initialStatuses = {};
      (data.students || []).forEach(s => {
        initialStatuses[s.id] = s.current_status || 'Absent';
      });
      setManualStatuses(initialStatuses);
    } catch (err) {
      console.error(err);
      setManualAttError(err.detail || 'Failed to fetch class student list.');
      setManualAttStudents([]);
    } finally {
      setManualAttLoading(false);
    }
  };

  const handleSaveClassManualAttendance = async (e) => {
    if (e) e.preventDefault();
    if (!manualClassId || !manualSubjectId || !manualDate || !selectedManualStudentId) return;
    
    setManualAttLoading(true);
    setManualAttMessage(null);
    setManualAttError(null);
    try {
      const statusVal = manualStatuses[selectedManualStudentId];
      const res = await api.post('/api/attendances/save-class-manual-attendance/', {
        class_id: manualClassId,
        subject_id: manualSubjectId,
        date: manualDate,
        statuses: {
          [selectedManualStudentId]: statusVal
        }
      });

      setManualAttMessage(res.detail || 'Attendance updated successfully.');
      
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newEntries = [];
      
      const subjObj = subjects.find(sub => sub.id.toString() === manualSubjectId.toString());
      const subjectName = subjObj ? subjObj.name : 'Selected Subject';

      const s = manualAttStudents.find(stud => stud.id.toString() === selectedManualStudentId.toString());
      if (s) {
        newEntries.push({
          studentName: s.name,
          regNo: s.reg_no,
          date: manualDate,
          period: 1,
          subjectName: subjectName,
          status: statusVal,
          timeMarked: nowStr
        });
      }

      setRecentlyMarked(prev => [...newEntries, ...prev]);

      setTimeout(() => {
        setManualAttMessage(null);
      }, 4000);
      
    } catch (err) {
      console.error(err);
      setManualAttError(err.detail || 'Error saving class attendance.');
    } finally {
      setManualAttLoading(false);
    }
  };

  const fetchAdvisorClassStudents = async (dateVal) => {
    setAdvisorLoading(true);
    setAdvisorError(null);
    setAdvisorSuccess(null);
    try {
      const data = await api.get(`/api/attendances/advisor-class-students/?date=${dateVal}`);
      setAdvisorClassName(data.class_name);
      setAdvisorClassId(data.class_id);
      setAdvisorPeriods(data.periods);
      setAdvisorStudents(data.students || []);
      
      const initialStatuses = {};
      (data.students || []).forEach(s => {
        let presentCount = 0;
        let absentCount = 0;
        let odCount = 0;
        let leaveCount = 0;
        for (let p = 1; p <= 7; p++) {
          const st = s.statuses[p.toString()] || 'Present';
          if (st === 'Present') presentCount++;
          else if (st === 'Absent') absentCount++;
          else if (st === 'OD') odCount++;
          else if (st === 'Leave') leaveCount++;
        }
        
        let overall = 'Present';
        if (presentCount === 7) overall = 'Present';
        else if (absentCount === 7) overall = 'Absent';
        else if (odCount === 7) overall = 'OD';
        else if (s.statuses['1'] === 'Present' && s.statuses['2'] === 'Present' && s.statuses['3'] === 'Present' && s.statuses['4'] === 'Present' &&
                 s.statuses['5'] === 'Absent' && s.statuses['6'] === 'Absent' && s.statuses['7'] === 'Absent') {
          overall = 'Half Day (FN Present / AN Absent)';
        } else if (s.statuses['1'] === 'Absent' && s.statuses['2'] === 'Absent' && s.statuses['3'] === 'Absent' && s.statuses['4'] === 'Absent' &&
                   s.statuses['5'] === 'Present' && s.statuses['6'] === 'Present' && s.statuses['7'] === 'Present') {
          overall = 'Half Day (FN Absent / AN Present)';
        } else {
          overall = 'Custom';
        }

        initialStatuses[s.id] = {
          overall_status: overall,
          periods: { ...s.statuses }
        };
      });
      setAdvisorStatuses(initialStatuses);
    } catch (err) {
      console.error(err);
      setAdvisorError(err.detail || 'Failed to fetch advisor class student list.');
      setAdvisorStudents([]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleSaveAdvisorManualAttendance = async (e) => {
    if (e) e.preventDefault();
    setAdvisorLoading(true);
    setAdvisorError(null);
    setAdvisorSuccess(null);
    try {
      const payload = {
        date: advisorDate,
        attendance_data: advisorStatuses
      };
      const res = await api.post('/api/attendances/save-advisor-manual-attendance/', payload);
      setAdvisorSuccess(res.detail || 'Daily attendance saved successfully.');
      fetchAdvisorClassStudents(advisorDate);
    } catch (err) {
      console.error(err);
      setAdvisorError(err.detail || 'Failed to save advisor manual attendance.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const cyclePeriodStatus = (studentId, periodNum) => {
    const studentStatus = advisorStatuses[studentId] || { overall_status: 'Present', periods: {} };
    const currentPStatus = studentStatus.periods[periodNum] || 'Present';
    const nextStatuses = {
      'Present': 'Absent',
      'Absent': 'OD',
      'OD': 'Leave',
      'Leave': 'Present'
    };
    const nextPStatus = nextStatuses[currentPStatus] || 'Present';
    
    setAdvisorStatuses({
      ...advisorStatuses,
      [studentId]: {
        overall_status: 'Custom',
        periods: {
          ...studentStatus.periods,
          [periodNum]: nextPStatus
        }
      }
    });
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
            period: selectedPeriods,
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

  const handleStopSession = async () => {
    if (statsInterval.current) clearInterval(statsInterval.current);
    try {
      await api.post('/api/attendance/stop-session/', {
        otp_id: activeSession?.otp_id,
        otp_ids: activeSession?.otp_ids
      });
    } catch (err) {
      console.error('Failed to stop session in backend', err);
    }
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
      if (!isRelated && reportMode === 'subject_percentage' && !reportSubjectId) {
        alert('Subject selection is required for this report as you are not the advisor for this class.');
        return;
      }
    } else if (reportType === 'student') {
      const isNormalStaff = user.staff_details?.staff_type === 'Normal';
      if (isNormalStaff && reportMode === 'subject_percentage' && !reportSubjectId) {
        alert('Subject selection is required for this report as you are not the tutor or advisor.');
        return;
      }
    }

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
    }
  };

  const handleDownloadCSV = () => {
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

  // 6. Profile edits
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
            {/* Left side: Code and Timer */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '12px', fontWeight: '600' }}>
                Active Verification Code
              </div>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: '800', 
                letterSpacing: '0.1em', 
                color: 'var(--accent-primary)', 
                backgroundColor: 'var(--bg-tertiary)', 
                padding: '12px 24px', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                margin: '10px 0 24px 0',
                display: 'inline-block'
              }}>
                {activeSession.code}
              </div>

              {sessionStats && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6', width: '100%', borderBottom: '1px solid var(--border-color)', pb: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>Class: <strong style={{ color: 'var(--text-primary)' }}>{sessionStats.class_name}</strong></div>
                  <div style={{ marginBottom: '4px' }}>Subject: <strong style={{ color: 'var(--text-primary)' }}>{sessionStats.subject_name}</strong></div>
                  <div>Period(s): <strong style={{ color: 'var(--text-primary)' }}>{activeSession.periods ? activeSession.periods.join(', ') : sessionStats.period}</strong></div>
                </div>
              )}

              {/* Timer Progress Bar */}
              {sessionStats && (
                <div style={{ width: '100%', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Time Remaining</span>
                    <strong>{sessionStats.time_left}s</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: sessionStats.time_left > 15 ? 'var(--accent-primary)' : 'var(--danger)',
                      width: `${(sessionStats.time_left / 180) * 100}%`,
                      transition: 'width 1s linear, background-color 0.3s'
                    }} />
                  </div>
                </div>
              )}

              <button className="btn btn-danger" style={{ width: '100%', height: '44px', fontWeight: '600' }} onClick={handleStopSession}>
                Stop Attendance Session
              </button>
            </div>

            {/* Right side: Lively counts and dynamic Student Registry Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Counts Grid */}
              {sessionStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {/* Present Count */}
                  <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid var(--success)', backgroundColor: 'var(--bg-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--success)' }}>Present</span>
                    <strong style={{ fontSize: '24px' }}>{sessionStats.present_count}</strong>
                  </div>
                  {/* Absent Count */}
                  <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid var(--danger)', backgroundColor: 'var(--bg-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--danger)' }}>Absent</span>
                    <strong style={{ fontSize: '24px' }}>{sessionStats.absent_count}</strong>
                  </div>
                  {/* OD Count */}
                  <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid var(--info)', backgroundColor: 'var(--bg-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--info)' }}>OD</span>
                    <strong style={{ fontSize: '24px' }}>{sessionStats.od_count}</strong>
                  </div>
                  {/* Leave Count */}
                  <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid var(--warning)', backgroundColor: 'var(--bg-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--warning)' }}>Leave</span>
                    <strong style={{ fontSize: '24px' }}>{sessionStats.leave_count}</strong>
                  </div>
                </div>
              )}

              {/* Student Registry Table */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '16px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  Live Class Student Registry
                </h3>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 12px' }}>Reg No</th>
                        <th style={{ padding: '8px 12px' }}>Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionStats && sessionStats.all_students && sessionStats.all_students.length > 0 ? (
                        sessionStats.all_students.map((student, idx) => {
                          let statusColor = 'var(--text-muted)';
                          let statusBg = 'var(--bg-tertiary)';
                          if (student.status === 'Present') {
                            statusColor = 'var(--success)';
                            statusBg = 'var(--success-light)';
                          } else if (student.status === 'Absent') {
                            statusColor = 'var(--danger)';
                            statusBg = 'var(--danger-light)';
                          } else if (student.status === 'OD') {
                            statusColor = 'var(--info)';
                            statusBg = 'var(--info-light)';
                          } else if (student.status === 'Leave') {
                            statusColor = 'var(--warning)';
                            statusBg = 'var(--warning-light)';
                          }

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: '600' }}>{student.reg_no}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{student.name}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: statusBg,
                                  color: statusColor,
                                  display: 'inline-block',
                                  textTransform: 'uppercase'
                                }}>
                                  {student.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Loading registry details...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                  <select 
                    className="input" 
                    value={selectedSubjectName} 
                    onChange={(e) => setSelectedSubjectName(e.target.value)} 
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {classSubjects.map((sub, idx) => (
                      <option key={idx} value={sub.name}>{sub.name} ({sub.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '32px' }}>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Select Period(s) (Check all that apply for continuous classes)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map(p => {
                      const isChecked = selectedPeriods.includes(p.toString());
                      return (
                        <label 
                          key={p} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            backgroundColor: isChecked ? 'var(--accent-light)' : 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            userSelect: 'none',
                            transition: 'all 0.2s ease',
                            color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            style={{ cursor: 'pointer' }}
                            onChange={(e) => {
                              const pStr = p.toString();
                              if (e.target.checked) {
                                setSelectedPeriods([...selectedPeriods, pStr]);
                              } else {
                                if (selectedPeriods.length > 1) {
                                  setSelectedPeriods(selectedPeriods.filter(x => x !== pStr));
                                } else {
                                  alert('At least one period must be selected.');
                                }
                              }
                            }}
                          />
                          Period {p}
                        </label>
                      );
                    })}
                  </div>
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
                <li><strong>Timer</strong>: OTP code will be valid for 3 minutes. Students must enter the code immediately.</li>
                <li>Students attempting to mark attendance from outside the 100-meter perimeter will be blocked.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'approvals') {
    const isAdvisor = user.staff_details?.staff_type === 'Advisor';
    const pendingTutor = leaves.filter(l => l.student_details?.tutor === user.id && l.tutor_approved === 'Pending' && l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD'));
    const pendingAdvisor = leaves.filter(l => 
      l.student_details?.advisor === user.id && 
      l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD') && 
      l.tutor_approved === 'Approved' && 
      l.advisor_approved === 'Pending'
    );
    const verifiedODs = leaves.filter(l => l.student_details?.tutor === user.id && l.leave_type === 'OD' && l.hod_approved === 'Approved' && !l.certificate_verified && l.proof);
    const processedHistory = leaves.filter(l => l.leave_type === (approvalSubTab === 'leave' ? 'Leave' : 'OD') && (
      (l.student_details?.tutor === user.id && l.tutor_approved !== 'Pending') ||
      (l.student_details?.advisor === user.id && l.advisor_approved !== 'Pending')
    ));

    return (
      <div>
        <div className="header">
          <h1>Leave & OD Approvals</h1>
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
          <div>Loading requests...</div>
        ) : (
          <div className="grid">
            {/* Tutor list */}
            <div style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)' }}></span>
                As Tutor: Pending Approval
              </h2>
              {pendingTutor.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No pending tutor approvals.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {pendingTutor.map(l => (
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

            {/* Advisor list */}
            {isAdvisor && (
              <div style={{ gridColumn: '1 / -1' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }}></span>
                  As Advisor: Pending Approval
                </h2>
                {pendingAdvisor.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No pending advisor approvals.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {pendingAdvisor.map(l => (
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
            )}

            {/* OD Certificate Verification */}
            {approvalSubTab === 'od' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} />
                  Pending OD Certificate Verification
                </h2>
                {verifiedODs.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No pending OD documents to verify.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {verifiedODs.map(l => (
                      <div className="card" key={l.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', minHeight: '180px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px' }}>
                              {(l.student_details?.user.first_name || 'S').substring(0, 1)}{(l.student_details?.user.last_name || 'S').substring(0, 1)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.student_details?.user.first_name} {l.student_details?.user.last_name} ({l.student_details?.reg_no})</h4>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Reg: {l.student_details?.reg_no}</span>
                            </div>
                          </div>
                          <div style={{ marginBottom: '14px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Request Date: <strong>{l.date}</strong></span>
                            {l.proof ? (
                              <a href={`${api.baseUrl}${l.proof}`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ width: '100%', height: '32px', padding: 0, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                View Proof Document
                              </a>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ShieldAlert size={14} />
                                No proof uploaded yet
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ flex: 1, height: '34px', fontSize: '13px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }} disabled={!l.proof} onClick={() => handleVerifyCertAction(l.id, 'Approve')}>Verify</button>
                          <button className="btn btn-outline" style={{ flex: 1, height: '34px', fontSize: '13px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }} disabled={!l.proof} onClick={() => handleVerifyCertAction(l.id, 'Reject')}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Processed History */}
            {showHistory && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-secondary)' }}>Processed History</h2>
                {processedHistory.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px', margin: '20px 0' }}>No processed records.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
                    {processedHistory.map(l => (
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
                          <span>Final: <strong style={{ color: l.final_status === 'Approved' ? 'var(--success)' : (l.final_status === 'Rejected' ? 'var(--danger)' : 'var(--warning)') }}>{l.final_status}</strong></span>
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
  if (activeTab === 'students') {
    if (user.staff_details?.staff_type === 'Normal') {
      return <div className="card">Unauthorized tab access.</div>;
    }
    const isAdvisor = user.staff_details?.staff_type === 'Advisor';
    const assignedStudents = students.filter(s => s.tutor === user.id || s.advisor === user.id || s.class_advisor_id === user.id);
    return (
      <div>
        <div className="header">
          <h1>My Assigned Students</h1>
          {isAdvisor && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => { setBulkUploadOpen(!bulkUploadOpen); setStudentFormOpen(false); setBulkErrors([]); setCsvFile(null); }}>
                <FileSpreadsheet size={16} />
                <span>Bulk Import</span>
              </button>
              <button className="btn btn-primary" onClick={() => { setEditingStudent(null); clearStudentForm(); setStudentFormOpen(!studentFormOpen); setBulkUploadOpen(false); }}>
                <Plus size={16} />
                <span>Add Student</span>
              </button>
            </div>
          )}
        </div>

        {isAdvisor && bulkUploadOpen && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>Bulk Import Students</h2>
            <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.05)', border: '1px solid var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '16px', margin: '16px 0 24px 0' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)', fontSize: '14px' }}>CSV Requirements:</h4>
              <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>Required:</li>
                <ul style={{ paddingLeft: '15px', listStyleType: 'circle' }}>
                  <li>username</li>
                  <li>password</li>
                  <li>class</li>
                  <li>year</li>
                </ul>
                <li>Optional:</li>
                <ul style={{ paddingLeft: '15px', listStyleType: 'circle' }}>
                  <li>email</li>
                  <li>register_no</li>
                  <li>roll_no</li>
                  <li>age</li>
                  <li>mobile_no</li>
                </ul>
                <li>Tutor and Advisor are assigned automatically based on the selected class.</li>
                <li>The student's department will match your department automatically.</li>
                <li><code>class</code> matches class name; <code>year</code> matches year number (e.g. 1, 2, 3).</li>
              </ul>
              <div style={{ marginTop: '12px' }}>
                <a href="data:text/csv;charset=utf-8,username,email,register_no,roll_no,age,mobile_no,class,year,password%0Astudent1,student1@college.edu,REG1001,ROLL01,20,9876543210,B.Tech CS,3,password123" 
                   download="student_bulk_sample.csv" 
                   style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Download Sample CSV
                </a>
              </div>
            </div>

            <form onSubmit={handleBulkUpload}>
              <div className="form-group">
                <label className="form-label">Select CSV or Excel File</label>
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  className="input" 
                  required 
                  onChange={(e) => setCsvFile(e.target.files[0])} 
                />
              </div>

              {bulkErrors.length > 0 && (
                <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
                  <strong style={{ display: 'block', marginBottom: '6px' }}>Import failed with the following errors:</strong>
                  <ul style={{ paddingLeft: '16px' }}>
                    {bulkErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={bulkSubmitting} style={{ flex: 1 }}>
                  {bulkSubmitting ? 'Importing...' : 'Upload and Import'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setBulkUploadOpen(false)} disabled={bulkSubmitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {((isAdvisor || user.staff_details?.staff_type === 'Tutor') && studentFormOpen) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>{editingStudent ? 'Edit Student Details' : 'Register New Student'}</h2>
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
                  <label className="form-label">Age</label>
                  <input type="number" className="input" required value={studentAge} onChange={(e) => setStudentAge(e.target.value)} min="1" max="120" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number (Phone)</label>
                  <input type="text" className="input" required value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Department (Auto-filled)</label>
                <input type="text" className="input" value={user.department_name || 'My Department'} disabled style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select 
                    className="input" 
                    value={studentYear} 
                    onChange={(e) => { setStudentYear(e.target.value); setStudentClassId(''); }} 
                    disabled={user?.staff_details?.staff_type === 'Advisor'}
                    required
                  >
                    <option value="">-- Select Year --</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select 
                    className="input" 
                    value={studentClassId} 
                    onChange={(e) => setStudentClassId(e.target.value)} 
                    disabled={user?.staff_details?.staff_type === 'Advisor'}
                    required
                  >
                    <option value="">-- Select Class --</option>
                    {classes.filter(c => !studentYear || c.year.toString() === studentYear).map(c => (
                      <option key={c.id} value={c.id}>{c.name} - Yr {c.year} (Sec {c.section})</option>
                    ))}
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
                  <select 
                    className="input" 
                    value={studentAdvisorId} 
                    onChange={(e) => setStudentAdvisorId(e.target.value)}
                    disabled={user?.staff_details?.staff_type === 'Advisor'}
                  >
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
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Class Details</th>
                  <th>Assigned Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedStudents.map(s => (
                  <tr key={s.user.id}>
                    <td style={{ fontWeight: '600' }}>{s.reg_no || '-'}</td>
                    <td>{s.user.first_name || s.user.last_name ? `${s.user.first_name} ${s.user.last_name}` : s.user.username}</td>
                    <td>{s.class_name} - Year {s.class_year} (Sec {s.class_section})</td>
                    <td>
                      <span className="badge badge-present" style={{ fontSize: '11px' }}>
                        {s.tutor === user.id ? 'Tutor' : ''}
                        {(s.tutor === user.id && (s.advisor === user.id || s.class_advisor_id === user.id)) ? ' & ' : ''}
                        {(s.advisor === user.id || s.class_advisor_id === user.id) ? 'Advisor' : ''}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleViewStudentStats(s.user.username)}>
                          <Eye size={14} />
                          <span>View Attendance %</span>
                        </button>
                        {(isAdvisor || s.tutor === user.id) && (
                          <>
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleEditStudentClick(s)}>
                              <Edit size={14} />
                              <span>Edit</span>
                            </button>
                            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDeleteStudent(s.user.id)}>
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
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
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Attendance Analysis & Insights</h2>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Student: <strong>{selectedStudentStats.name}</strong> ({selectedStudentStats.username}) | Class: <strong>{selectedStudentStats.class_name}</strong>
                  </span>
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
                          <tr key={sub.id}>
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
      </div>
    );
  }

  if (activeTab === 'manual_attendance') {
    return (
      <div>
        <div className="header">
          <h1>Manual Attendance</h1>
        </div>

        {user.staff_details?.staff_type === 'Advisor' && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button 
              type="button"
              className={`btn ${manualAttView === 'whole_day' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setManualAttView('whole_day')}
            >
              Whole Day Attendance (Advisor Class)
            </button>
            <button 
              type="button"
              className={`btn ${manualAttView === 'subject_wise' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setManualAttView('subject_wise')}
            >
              Subject-wise Attendance
            </button>
          </div>
        )}

        {user.staff_details?.staff_type === 'Advisor' && manualAttView === 'whole_day' && (
          <div className="card" style={{ marginBottom: '32px', border: '1px solid rgba(79, 70, 229, 0.25)', boxShadow: '0 4px 20px -2px rgba(79, 70, 229, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-primary)', margin: 0 }}>Advisor: Whole Day Manual Attendance</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Manage daily attendance for your advised class: <strong style={{ color: 'var(--text-primary)' }}>{advisorClassName || 'Retrieving class...'}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Target Date:</span>
                <input 
                  type="date" 
                  className="input" 
                  style={{ width: '150px', padding: '6px 12px', height: '36px' }}
                  value={advisorDate} 
                  onChange={(e) => setAdvisorDate(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {advisorLoading && <div style={{ padding: '16px 0', fontWeight: '500', color: 'var(--accent-primary)' }}>Loading student and schedule list...</div>}

            {advisorError && (
              <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', borderLeft: '4px solid var(--danger)' }}>
                {advisorError}
              </div>
            )}

            {advisorSuccess && (
              <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', borderLeft: '4px solid var(--success)' }}>
                {advisorSuccess}
              </div>
            )}

            {!advisorLoading && advisorStudents.length > 0 && (
              <form onSubmit={handleSaveAdvisorManualAttendance}>
                <div className="table-container" style={{ overflowX: 'auto', marginBottom: '20px' }}>
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th style={{ width: '220px' }}>Overall Status</th>
                        <th style={{ textAlign: 'center' }}>Daily Periods (1-7) <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Hover for subject, click custom to edit)</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {advisorStudents.map(s => {
                        const sStatus = advisorStatuses[s.id] || { overall_status: 'Present', periods: {} };
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 8px' }}>
                              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '14px' }}>{s.name}</strong>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Reg No: {s.reg_no}</span>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <select 
                                className="input" 
                                style={{ padding: '6px 10px', fontSize: '13px', height: '36px' }}
                                value={sStatus.overall_status} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updatedPeriods = { ...sStatus.periods };
                                  if (val === 'Present' || val === 'Absent' || val === 'OD') {
                                    for (let p = 1; p <= 7; p++) updatedPeriods[p.toString()] = val;
                                  } else if (val === 'Half Day (FN Present / AN Absent)') {
                                    for (let p = 1; p <= 4; p++) updatedPeriods[p.toString()] = 'Present';
                                    for (let p = 5; p <= 7; p++) updatedPeriods[p.toString()] = 'Absent';
                                  } else if (val === 'Half Day (FN Absent / AN Present)') {
                                    for (let p = 1; p <= 4; p++) updatedPeriods[p.toString()] = 'Absent';
                                    for (let p = 5; p <= 7; p++) updatedPeriods[p.toString()] = 'Present';
                                  }
                                  setAdvisorStatuses({
                                    ...advisorStatuses,
                                    [s.id]: {
                                      overall_status: val,
                                      periods: updatedPeriods
                                    }
                                  });
                                }}
                              >
                                <option value="Present">Present (Full Day)</option>
                                <option value="Absent">Absent (Full Day)</option>
                                <option value="OD">OD (Full Day)</option>
                                <option value="Half Day (FN Present / AN Absent)">Half Day (FN Present / AN Absent)</option>
                                <option value="Half Day (FN Absent / AN Present)">Half Day (FN Absent / AN Present)</option>
                                <option value="Custom">Custom (Period-wise)</option>
                              </select>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5, 6, 7].map(num => {
                                  const pStatus = sStatus.periods[num.toString()] || 'Present';
                                  const pInfo = advisorPeriods.find(p => p.period === num);
                                  const tooltipText = pInfo ? `Period ${num}: ${pInfo.subject_name} (${pInfo.subject_code || 'N/A'})` : `Period ${num}`;
                                  const isCustom = sStatus.overall_status === 'Custom';
                                  
                                  let bg = 'var(--success)';
                                  if (pStatus === 'Absent') bg = 'var(--danger)';
                                  else if (pStatus === 'OD') bg = 'var(--info)';
                                  else if (pStatus === 'Leave') bg = 'var(--warning)';
                                  
                                  return (
                                    <div 
                                      key={num}
                                      title={tooltipText}
                                      onClick={() => isCustom && cyclePeriodStatus(s.id, num.toString())}
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: bg,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: isCustom ? 'pointer' : 'default',
                                        opacity: isCustom ? 1.0 : 0.75,
                                        border: isCustom ? '2px solid white' : 'none',
                                        boxShadow: isCustom ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
                                        transition: 'all 0.2s ease',
                                        userSelect: 'none'
                                      }}
                                    >
                                      {pStatus === 'Present' ? 'P' : pStatus === 'Absent' ? 'A' : pStatus === 'OD' ? 'O' : 'L'}{num}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ minWidth: '220px', height: '44px', fontWeight: '600' }}>
                    Save Advisor Whole Day Attendance
                  </button>
                </div>
              </form>
            )}

            {!advisorLoading && advisorStudents.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                No advisor class assigned or class contains no students.
              </div>
            )}
          </div>
        )}

        {(user.staff_details?.staff_type !== 'Advisor' || manualAttView === 'subject_wise') && (
          <>
            <div className="card" style={{ marginBottom: '24px' }}>
              <form onSubmit={handleSaveClassManualAttendance}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">1. Department</label>
                    <select 
                      className="input" 
                      value={manualDeptId} 
                      onChange={(e) => {
                        setManualDeptId(e.target.value);
                        setManualClassId('');
                        setManualSubjectId('');
                        setManualAttStudents([]);
                        setSelectedManualStudentId('');
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
                    <label className="form-label">2. Class</label>
                    <select 
                      className="input" 
                      value={manualClassId} 
                      onChange={(e) => {
                        setManualClassId(e.target.value);
                        setManualSubjectId('');
                        setManualAttStudents([]);
                        setSelectedManualStudentId('');
                      }}
                      disabled={!manualDeptId}
                      required
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.filter(c => c.department?.toString() === manualDeptId).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} - Yr {c.year} ({c.section})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">3. Subject</label>
                    <select 
                      className="input" 
                      value={manualSubjectId} 
                      onChange={(e) => {
                        setManualSubjectId(e.target.value);
                        setManualAttStudents([]);
                        setSelectedManualStudentId('');
                      }}
                      disabled={!manualClassId}
                      required
                    >
                      <option value="">-- Choose Subject --</option>
                      {subjects.filter(sub => sub.student_class?.toString() === manualClassId || (!sub.student_class && sub.department?.toString() === manualDeptId)).map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">4. Date</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={manualDate} 
                      onChange={(e) => {
                        setManualDate(e.target.value);
                        setManualAttStudents([]);
                        setSelectedManualStudentId('');
                      }}
                      disabled={!manualSubjectId}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">5. Student</label>
                    <select 
                      className="input" 
                      value={selectedManualStudentId} 
                      onChange={(e) => setSelectedManualStudentId(e.target.value)}
                      disabled={!manualDate || manualAttStudents.length === 0}
                      required
                    >
                      <option value="">-- Choose Student --</option>
                      {manualAttStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.reg_no})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {manualAttLoading && <div style={{ margin: '16px 0', fontWeight: '500' }}>Loading student data...</div>}

                {manualAttError && (
                  <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', margin: '16px 0', fontSize: '13px' }}>
                    {manualAttError}
                  </div>
                )}

                {manualAttMessage && (
                  <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', margin: '16px 0', fontSize: '13px' }}>
                    {manualAttMessage}
                  </div>
                )}

                {!manualAttLoading && manualClassId && manualSubjectId && manualDate && selectedManualStudentId && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>Mark Attendance for Student</h3>
                    {(() => {
                      const student = manualAttStudents.find(s => s.id.toString() === selectedManualStudentId.toString());
                      if (!student) return null;
                      return (
                        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '15px', display: 'block' }}>{student.name}</strong>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              Reg No: {student.reg_no} | Roll No: {student.roll_no}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '20px' }}>
                            {['Present', 'Absent', 'OD'].map(st => (
                              <label key={st} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                <input 
                                  type="radio" 
                                  name={`status_${student.id}`} 
                                  value={st}
                                  checked={manualStatuses[student.id] === st}
                                  onChange={(e) => {
                                    setManualStatuses({
                                      ...manualStatuses,
                                      [student.id]: e.target.value
                                    });
                                  }}
                                />
                                <span style={{
                                  color: st === 'Present' ? 'var(--success)' :
                                         st === 'Absent' ? 'var(--danger)' : 'var(--info)',
                                  fontWeight: '600'
                                }}>
                                  {st}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ marginTop: '24px' }}>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Save Attendance
                      </button>
                    </div>
                  </div>
                )}

                {!manualAttLoading && manualClassId && manualSubjectId && manualDate && manualAttStudents.length === 0 && !manualAttError && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', marginTop: '16px' }}>
                    No students found for the selected class.
                  </div>
                )}
              </form>
            </div>

            {recentlyMarked && recentlyMarked.length > 0 && (
              <div className="card" style={{ marginTop: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Recently Marked Attendance
                </h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Date</th>
                        <th>Period / Subject</th>
                        <th>Status</th>
                        <th>Time Marked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentlyMarked.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{item.studentName}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.regNo}</div>
                          </td>
                          <td>{item.date}</td>
                          <td>
                            <strong>Period {item.period}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.subjectName}</div>
                          </td>
                          <td>
                            <span className="badge" style={{
                              backgroundColor: item.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' :
                                               item.status === 'Absent' ? 'rgba(239, 68, 68, 0.15)' :
                                               item.status === 'OD' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: item.status === 'Present' ? 'var(--success)' :
                                     item.status === 'Absent' ? 'var(--danger)' :
                                     item.status === 'OD' ? 'var(--info)' : 'var(--warning)',
                              border: `1px solid ${
                                item.status === 'Present' ? 'rgba(16, 185, 129, 0.3)' :
                                item.status === 'Absent' ? 'rgba(239, 68, 68, 0.3)' :
                                item.status === 'OD' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(234, 179, 8, 0.3)'
                              }`
                            }}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.timeMarked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (activeTab === 'advisor_live') {
    return (
      <div>
        <div className="header">
          <h1>Live Advisor Class Monitor</h1>
        </div>

        {advisorLiveLoading && !advisorLiveData ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading live attendance matrix...</p>
          </div>
        ) : !advisorLiveData ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)' }}>You do not advise any class, or live data could not be retrieved.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Advisor Matrix</span>
                <h2 style={{ fontSize: '20px', margin: '4px 0 0 0' }}>{advisorLiveData.class_name}</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Date</span>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{advisorLiveData.date}</div>
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

            {advisorLiveData.schedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No periods scheduled for today.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 8px' }}>Reg No</th>
                    <th style={{ padding: '12px 8px' }}>Student Name</th>
                    {advisorLiveData.schedules.map(s => (
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
                    <td colSpan={2} style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Subject Summary (P / A / OD)</td>
                    {advisorLiveData.columns_summary.map((col, idx) => (
                      <td key={idx} style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', lineHeight: '1.4' }}>
                        <div><span style={{ color: 'var(--success)' }}>{col.present}P</span> &bull; <span style={{ color: 'var(--danger)' }}>{col.absent}A</span></div>
                        <div style={{ color: 'var(--info)', marginTop: '2px' }}>{col.od}OD</div>
                      </td>
                    ))}
                  </tr>

                  {advisorLiveData.student_rows.filter(row => {
                    const search = gridSearchQuery.toLowerCase();
                    return row.reg_no.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
                  }).map((row, rIdx) => (
                    <tr 
                      key={rIdx} 
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
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

  if (activeTab === 'manage_subjects') {
    return (
      <div>
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Manage Class Subjects</h1>
            {advisedClass && (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                Class: <strong style={{ color: 'var(--accent-primary)' }}>{advisedClass.name} - Year {advisedClass.year} (Sec {advisedClass.section})</strong>
              </p>
            )}
          </div>
          {advisedClass && (
            <button 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setEditingSubject(null);
                setSubjectName('');
                setSubjectCode('');
                setSubjectFormOpen(!subjectFormOpen);
              }}
            >
              <Plus size={16} />
              <span>{subjectFormOpen ? 'Close Form' : 'Add Subject'}</span>
            </button>
          )}
        </div>

        {!advisedClass ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)' }}>You do not advise any class, so you cannot manage subjects.</p>
          </div>
        ) : (
          <div>
            {subjectFormOpen && (
              <div className="card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
                <h2>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
                <form onSubmit={handleSaveSubject} style={{ marginTop: '16px' }}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Subject Name</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Mathematics" 
                      value={subjectName} 
                      onChange={(e) => setSubjectName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">Subject Code</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. MAT101" 
                      value={subjectCode} 
                      onChange={(e) => setSubjectCode(e.target.value)} 
                      required 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary">
                      {editingSubject ? 'Update Subject' : 'Create Subject'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setSubjectFormOpen(false);
                        setEditingSubject(null);
                        setSubjectName('');
                        setSubjectCode('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {advisedSubjectsLoading && advisedSubjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner" style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading subjects...</p>
              </div>
            ) : (
              <div className="card">
                <h2>Configured Subjects</h2>
                <div className="table-container" style={{ marginTop: '16px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th>Subject Code</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advisedSubjects.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            No subjects added yet. Add subjects to enable attendance marking for this class.
                          </td>
                        </tr>
                      ) : (
                        advisedSubjects.map((sub) => (
                          <tr key={sub.id}>
                            <td style={{ fontWeight: '600' }}>{sub.name}</td>
                            <td><span className="badge badge-secondary">{sub.code}</span></td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleEditSubjectClick(sub)}
                                >
                                  <Edit size={14} />
                                  <span>Edit</span>
                                </button>
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}
                                  onClick={() => handleDeleteSubject(sub.id)}
                                >
                                  <Trash2 size={14} />
                                  <span>Delete</span>
                                </button>
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
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'reports') {
    return (
      <div>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            .printable-section, .printable-section * {
              visibility: visible !important;
            }
            .printable-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .printable-section table {
              border-collapse: collapse;
              width: 100%;
            }
            .printable-section th, .printable-section td {
              border: 1px solid #ddd !important;
              padding: 8px !important;
              color: black !important;
            }
            .printable-section tr {
              background: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />
        <div className="header">
          <h1>Attendance Reports</h1>
        </div>

        <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
          {/* Query Filter card */}
          <div className="card no-print" style={{ gridColumn: 'span 1' }}>
            <h2 style={{ marginBottom: '20px' }}>Filter Criteria</h2>
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
                  <option value="class">By Class</option>
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
                  <input type="text" className="input" placeholder="e.g. student" value={reportStudentId} onChange={(e) => setReportStudentId(e.target.value)} required />
                </div>
              )}

              {reportMode !== 'day' && (
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="input" value={reportSubjectId} onChange={(e) => setReportSubjectId(e.target.value)}>
                    <option value="">-- All Subjects --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                Fetch Report Data
              </button>
            </form>
          </div>

          {/* Results table card */}
          <div className="card printable-section" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Query Output ({reportData.length} records)</h2>
              {reportData.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }} className="no-print">
                  <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)' }} onClick={() => window.print()}>
                    <span>Print Report</span>
                  </button>
                  <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleDownloadCSV}>
                    <FileSpreadsheet size={16} />
                    <span>Download CSV</span>
                  </button>
                </div>
              )}
            </div>

            <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  {reportMode === 'day' ? (
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Attendance Percentage</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No report data loaded. Adjust filters and click Fetch.</td>
                    </tr>
                  ) : (
                    reportData.map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.student_name} ({r.student_reg_no || r.student_username})</td>
                        <td>{r.class_name}</td>
                        {reportMode === 'day' ? (
                          <>
                            <td>{r.date}</td>
                            <td>
                              <span className={`badge ${r.status === 'Present' ? 'badge-present' : (r.status === 'Absent' ? 'badge-absent' : (r.status === 'OD' ? 'badge-od' : (r.status === 'Half Day' ? 'badge-halfday' : 'badge-leave')))}`}>
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

              <div className="form-group">
                <label className="form-label">Age</label>
                <input type="number" className="input" value={age} onChange={(e) => setAge(e.target.value)} />
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

export default StaffDashboard;

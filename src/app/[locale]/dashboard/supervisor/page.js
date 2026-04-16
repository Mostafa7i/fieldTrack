'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { reportAPI, notificationAPI, attendanceAPI, taskAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  FileText, GraduationCap, CheckCircle, Clock, MessageSquare, Send,
  ClipboardList, Plus, Trash2, X, AlertTriangle, BarChart2, TrendingUp,
  Calendar, Star, ChevronDown, ChevronUp, Download, Eye, User,
  Timer, BookOpen, Target, Award, Activity, Printer
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, LineChart, Line, Legend
} from 'recharts';

/* ── Badge helpers ───────────────────────────────────── */
const reportStatusBadge = { draft: 'badge-gray', submitted: 'badge-info', reviewed: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
const priorityColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', urgent: '#a855f7' };
const priorityBadge = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', urgent: 'badge-gray' };
const taskStatusBadge = { pending: 'badge-warning', in_progress: 'badge-info', submitted: 'badge-primary', completed: 'badge-success', overdue: 'badge-danger' };

/* ── Performance ring component ─────────────────────── */
const ScoreRing = ({ score, size = 80, label }) => {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const fillPct = Math.min(Math.max(score || 0, 0), 100);
  const offset = circ - (fillPct / 100) * circ;
  const color = fillPct >= 75 ? '#10b981' : fillPct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="50%" y="50%" fill={color} textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.22} fontWeight="800" style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}>
          {fillPct}%
        </text>
      </svg>
      {label && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{label}</span>}
    </div>
  );
};

export default function SupervisorDashboard() {
  const t = useTranslations('SupervisorDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('overview');

  /* ── Data state ─────────────────────────────────────── */
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Admin report state ─────────────────────────────── */
  const [adminReport, setAdminReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportNotes, setReportNotes] = useState({});
  const [expandedStudent, setExpandedStudent] = useState(null);

  /* ── Review form ────────────────────────────────────── */
  const [reviewForm, setReviewForm] = useState({ id: null, status: 'approved', grade: 100, feedback: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  /* ── Message form ───────────────────────────────────── */
  const [messageForm, setMessageForm] = useState({ studentId: null, message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);

  /* ── Task form ──────────────────────────────────────── */
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', studentId: '', deadline: '', priority: 'medium' });
  const [creatingTask, setCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  /* ── Student detail modal ───────────────────────────── */
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);

  /* ─── Hash-based tab routing ────────────────────────── */
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setTab(hash);
      else setTab('overview');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  /* ─── Initial data fetch ────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [repRes, notifRes, attRes, taskRes] = await Promise.all([
          reportAPI.getAll(),
          notificationAPI.getAll(),
          attendanceAPI.getAll(),
          taskAPI.getSupervisorTasks(),
        ]);
        setReports(repRes.data.data || []);
        setNotifications(notifRes.data.data || []);
        setAttendance(attRes.data.data || []);
        setTasks(taskRes.data.data || []);
      } catch { toast.error(t('failed_to_load')); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  /* ─── Derived helpers ───────────────────────────────── */
  // Unique students from reports (populated by supervisor's students)
  const students = Array.from(
    new Map(reports.filter(r => r.student).map(r => [r.student?._id, r.student])).values()
  ).filter(Boolean);

  const pendingReports = reports.filter(r => r.status === 'submitted');
  const overdueTasks = tasks.filter(t => {
    const d = new Date(t.deadline) - new Date();
    return d < 0 && t.status !== 'completed';
  });
  const getDaysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

  /* ─── Per-student computed stats ────────────────────── */
  const getStudentStats = useCallback((studentId) => {
    const sReports = reports.filter(r => r.student?._id === studentId);
    const sAttendance = attendance.filter(a => a.student?._id === studentId);
    const sTasks = tasks.filter(t => t.student?._id === studentId);
    const approved = sReports.filter(r => r.status === 'approved');
    const avgGrade = approved.length ? Math.round(approved.reduce((s, r) => s + (r.grade || 0), 0) / approved.length) : null;
    const totalHours = sAttendance.reduce((s, a) => s + (a.hoursWorked || 0), 0);
    const presentDays = sAttendance.filter(a => a.status === 'present' || a.status === 'remote').length;
    const attendanceRate = sAttendance.length ? Math.round((presentDays / sAttendance.length) * 100) : 0;
    const completedTasks = sTasks.filter(t => t.status === 'completed').length;
    const taskRate = sTasks.length ? Math.round((completedTasks / sTasks.length) * 100) : 0;
    const performanceScore = Math.round((attendanceRate * 0.3) + ((avgGrade || 0) * 0.4) + (taskRate * 0.3));
    return { sReports, sAttendance, sTasks, avgGrade, totalHours, attendanceRate, taskRate, performanceScore, presentDays, absentDays: sAttendance.filter(a => a.status === 'absent').length };
  }, [reports, attendance, tasks]);

  /* ─── Actions ───────────────────────────────────────── */
  const submitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await reportAPI.review(reviewForm.id, { status: reviewForm.status, grade: parseInt(reviewForm.grade), feedback: reviewForm.feedback });
      toast.success(t('report_reviewed'));
      setReviewForm({ id: null, status: 'approved', grade: 100, feedback: '' });
      const res = await reportAPI.getAll();
      setReports(res.data.data || []);
    } catch (err) { toast.error(err.response?.data?.message || t('failed_review')); }
    finally { setSubmittingReview(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    setSendingMessage(true);
    try {
      toast.success(tCommon('message_sent'));
      setMessageForm({ studentId: null, message: '' });
    } catch { toast.error(tCommon('failed_send')); }
    finally { setSendingMessage(false); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      await taskAPI.create(taskForm);
      toast.success(isAr ? 'تم إسناد المهمة بنجاح!' : 'Task assigned successfully!');
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', studentId: '', deadline: '', priority: 'medium' });
      const res = await taskAPI.getSupervisorTasks();
      setTasks(res.data.data || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create task'); }
    finally { setCreatingTask(false); }
  };

  const handleCloseTask = async (id) => {
    try {
      await taskAPI.closeTask(id);
      toast.success(isAr ? 'تم إغلاق المهمة' : 'Task completed!');
      setTasks(prev => prev.map(t => t._id === id ? { ...t, status: 'completed' } : t));
      setSelectedTask(null);
    } catch { toast.error('Failed'); }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm(isAr ? 'حذف المهمة؟' : 'Delete this task?')) return;
    try {
      await taskAPI.deleteTask(id);
      toast.success(isAr ? 'تم حذف المهمة' : 'Task deleted');
      setTasks(prev => prev.filter(t => t._id !== id));
      setSelectedTask(null);
    } catch { toast.error('Failed'); }
  };

  /* ─── Admin Report Generation ───────────────────────── */
  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await reportAPI.getSupervisorReport();
      setAdminReport(res.data);
      toast.success(isAr ? 'تم توليد التقرير بنجاح' : 'Report generated successfully');
    } catch { toast.error(isAr ? 'فشل توليد التقرير' : 'Failed to generate report'); }
    finally { setReportLoading(false); }
  };

  /* ─── Print report ──────────────────────────────────── */
  const printReport = () => {
    const printContent = document.getElementById('supervisor-print-report');
    if (!printContent) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Supervisor Report</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; padding: 2rem; direction: ${isAr ? 'rtl' : 'ltr'}; }
        h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 0.5rem; }
        h2 { color: #334155; margin-top: 2rem; }
        h3 { color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th { background: #4f46e5; color: white; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.85rem; }
        td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; }
        tr:nth-child(even) { background: #f8fafc; }
        .score { font-weight: bold; color: #4f46e5; }
        .good { color: #10b981; font-weight: bold; }
        .warn { color: #f59e0b; font-weight: bold; }
        .bad  { color: #ef4444; font-weight: bold; }
        .note-box { background: #f1f5f9; padding: 0.5rem; border-radius: 0.3rem; margin-top: 0.3rem; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${printContent.innerHTML}
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  /* ─── Student progress modal ────────────────────────── */
  const openStudentProgress = async (student) => {
    setSelectedStudent(student);
    setProgressLoading(true);
    try {
      const res = await reportAPI.getStudentProgress(student._id);
      setStudentProgress(res.data.data);
    } catch { toast.error(isAr ? 'فشل تحميل البيانات' : 'Failed to load progress'); }
    finally { setProgressLoading(false); }
  };

  /* ─── Overview chart data ───────────────────────────── */
  const overviewChartData = students.map(s => {
    const stat = getStudentStats(s._id);
    return { name: s.name?.split(' ')[0], performance: stat.performanceScore, attendance: stat.attendanceRate, grade: stat.avgGrade || 0 };
  });

  const attendanceChartData = [
    { name: isAr ? 'حاضر' : 'Present', value: attendance.filter(a => a.status === 'present' || a.status === 'remote').length, fill: '#10b981' },
    { name: isAr ? 'متأخر' : 'Late', value: attendance.filter(a => a.status === 'late').length, fill: '#f59e0b' },
    { name: isAr ? 'غائب' : 'Absent', value: attendance.filter(a => a.status === 'absent').length, fill: '#ef4444' },
  ];

  /* ─── Tabs ─────────────────────────────────────────── */
  const tabs = [
    { key: 'overview', label: isAr ? '📊 نظرة عامة' : '📊 Overview', badge: null },
    { key: 'students', label: isAr ? '👩‍🎓 طلابي' : '👩‍🎓 My Students', badge: students.length > 0 ? students.length : null },
    { key: 'reports', label: isAr ? '📄 التقارير' : '📄 Reports', badge: pendingReports.length > 0 ? pendingReports.length : null },
    { key: 'tasks', label: isAr ? '✅ المهام' : '✅ Tasks', badge: overdueTasks.length > 0 ? `${overdueTasks.length}!` : null },
    { key: 'attendance', label: isAr ? '🕐 الحضور' : '🕐 Attendance', badge: null },
    { key: 'admin-report', label: isAr ? '📋 التقرير الإداري' : '📋 Admin Report', badge: null },
    { key: 'notifications', label: isAr ? '🔔 الإشعارات' : '🔔 Notifications', badge: notifications.filter(n => !n.isRead).length > 0 ? notifications.filter(n => !n.isRead).length : null },
  ];

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <div>
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">

            {/* ── Page Header ──────────────────────────── */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('title')}</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('subtitle')}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => { setTab('admin-report'); window.location.hash = 'admin-report'; generateReport(); }}
                  style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                >
                  <Printer size={16} /> {isAr ? 'توليد التقرير الإداري' : 'Generate Admin Report'}
                </button>
              </div>
            </div>

            {/* ── StatCards ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard title={isAr ? 'الطلاب المُعيَّنون' : 'Assigned Students'} value={students.length} icon={GraduationCap} color="indigo" />
              <StatCard title={isAr ? 'التقارير الكلية' : 'Total Reports'} value={reports.length} subtitle={`${pendingReports.length} ${isAr ? 'بانتظار المراجعة' : 'pending'}`} icon={FileText} color="sky" />
              <StatCard title={isAr ? 'تقارير معتمدة' : 'Approved Reports'} value={reports.filter(r => r.status === 'approved').length} icon={CheckCircle} color="emerald" />
              <StatCard title={isAr ? 'المهام النشطة' : 'Active Tasks'} value={tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length} subtitle={overdueTasks.length > 0 ? `⚠ ${overdueTasks.length} ${isAr ? 'متأخرة' : 'overdue'}` : undefined} icon={ClipboardList} color="violet" />
              <StatCard title={isAr ? 'إجمالي ساعات الحضور' : 'Total Attendance Hrs'} value={`${attendance.reduce((s, a) => s + (a.hoursWorked || 0), 0).toFixed(0)}h`} icon={Timer} color="amber" />
            </div>

            {/* ── Tabs ──────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
              {tabs.map(tabItem => (
                <button key={tabItem.key}
                  onClick={() => { setTab(tabItem.key); window.location.hash = tabItem.key; }}
                  style={{ padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent', color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === tabItem.key ? 700 : 500, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {tabItem.label}
                  {tabItem.badge && (
                    <span style={{ background: String(tabItem.badge).includes('!') ? '#ef4444' : 'var(--primary)', color: 'white', borderRadius: '1rem', padding: '0 6px', height: 18, fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', fontWeight: 800 }}>
                      {tabItem.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={40} /></div>
            ) : (
              <>

                {/* ══════════════════════════════
                    TAB: OVERVIEW
                ══════════════════════════════ */}
                {tab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Quick actions banner */}
                    {pendingReports.length > 0 && (
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <AlertTriangle size={22} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <div>
                            <p style={{ fontWeight: 700 }}>{isAr ? `${pendingReports.length} تقارير تنتظر مراجعتك` : `${pendingReports.length} reports awaiting your review`}</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{isAr ? 'راجع تقارير طلابك في أقرب وقت' : 'Review your students\' reports as soon as possible'}</p>
                          </div>
                        </div>
                        <button onClick={() => { setTab('reports'); window.location.hash = 'reports'; }} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                          {isAr ? 'مراجعة الآن' : 'Review Now'}
                        </button>
                      </div>
                    )}

                    {/* Charts grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>

                      {/* Student performance chart */}
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <BarChart2 size={18} style={{ color: 'var(--primary-light)' }} />
                          {isAr ? 'أداء الطلاب' : 'Student Performance'}
                        </h3>
                        {overviewChartData.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={overviewChartData} barGap={4}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                              <Bar dataKey="attendance" name={isAr ? 'الحضور%' : 'Attendance%'} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={18} />
                              <Bar dataKey="grade" name={isAr ? 'المعدل' : 'Avg Grade'} fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                              <Bar dataKey="performance" name={isAr ? 'الأداء' : 'Performance'} fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {/* Attendance distribution */}
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Activity size={18} style={{ color: 'var(--primary-light)' }} />
                          {isAr ? 'توزيع الحضور' : 'Attendance Distribution'}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                          {attendanceChartData.map(item => (
                            <div key={item.name} style={{ textAlign: 'center', background: `${item.fill}15`, border: `1px solid ${item.fill}40`, borderRadius: '0.75rem', padding: '0.75rem 0.5rem' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.fill }}>{item.value}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.name}</div>
                            </div>
                          ))}
                        </div>
                        {/* Recent attendance mini-feed */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 130, overflowY: 'auto' }}>
                          {attendance.slice(0, 7).map(a => (
                            <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                              <span style={{ fontWeight: 600 }}>{a.student?.name?.split(' ')[0]}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{new Date(a.date).toLocaleDateString()}</span>
                              <span className={`badge badge-${a.status === 'present' || a.status === 'remote' ? 'success' : a.status === 'absent' ? 'danger' : 'warning'}`} style={{ fontSize: '0.65rem' }}>{tCommon(a.status) || a.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Student Cards Grid */}
                    {students.length > 0 && (
                      <div>
                        <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <GraduationCap size={18} style={{ color: 'var(--primary-light)' }} />
                          {isAr ? 'ملخص الطلاب' : 'Students Summary'}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                          {students.map(s => {
                            const stat = getStudentStats(s._id);
                            return (
                              <div key={s._id} className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${stat.performanceScore >= 75 ? '#10b981' : stat.performanceScore >= 50 ? '#f59e0b' : '#ef4444'}` }}
                                onClick={() => openStudentProgress(s)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                                    {s.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.925rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</p>
                                  </div>
                                  <ScoreRing score={stat.performanceScore} size={52} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
                                  <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '0.4rem', padding: '0.4rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{stat.sReports.length}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>{isAr ? 'تقارير' : 'Reports'}</div>
                                  </div>
                                  <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '0.4rem', padding: '0.4rem' }}>
                                    <div style={{ fontWeight: 700, color: '#10b981' }}>{stat.attendanceRate}%</div>
                                    <div style={{ color: 'var(--text-muted)' }}>{isAr ? 'حضور' : 'Attend.'}</div>
                                  </div>
                                  <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: '0.4rem', padding: '0.4rem' }}>
                                    <div style={{ fontWeight: 700, color: '#f59e0b' }}>{stat.sTasks.length}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>{isAr ? 'مهام' : 'Tasks'}</div>
                                  </div>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
                                  {isAr ? '⬡ انقر لعرض التفاصيل الكاملة' : '⬡ Click for full details'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════
                    TAB: STUDENTS
                ══════════════════════════════ */}
                {tab === 'students' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ overflowX: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <GraduationCap size={18} style={{ color: 'var(--primary-light)' }} /> {t('my_students')}
                        </h3>
                        <button onClick={() => { setTaskForm(f => ({ ...f, studentId: '' })); setShowTaskForm(true); setTab('tasks'); window.location.hash = 'tasks'; }}
                          className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Plus size={14} /> {isAr ? 'إسناد مهمة جديدة' : 'Assign New Task'}
                        </button>
                      </div>
                      {students.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          <GraduationCap size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                          <p>{t('no_students')}</p>
                        </div>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('name')}</th>
                              <th>{isAr ? 'الحضور' : 'Attend.'}</th>
                              <th>{isAr ? 'التقارير' : 'Reports'}</th>
                              <th>{isAr ? 'متوسط درجة' : 'Avg Grade'}</th>
                              <th>{isAr ? 'المهام' : 'Tasks'}</th>
                              <th>{isAr ? 'الأداء' : 'Performance'}</th>
                              <th>{tCommon('actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(s => {
                              const stat = getStudentStats(s._id);
                              const perfColor = stat.performanceScore >= 75 ? '#10b981' : stat.performanceScore >= 50 ? '#f59e0b' : '#ef4444';
                              return (
                                <tr key={s._id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                                        {s.name?.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.name}</p>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, minWidth: 60 }}>
                                        <div style={{ height: '100%', width: `${stat.attendanceRate}%`, background: stat.attendanceRate >= 80 ? '#10b981' : stat.attendanceRate >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                                      </div>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{stat.attendanceRate}%</span>
                                    </div>
                                  </td>
                                  <td><span style={{ fontWeight: 700 }}>{stat.sReports.length}</span> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {stat.sReports.filter(r => r.status === 'approved').length} ✓</span></td>
                                  <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{stat.avgGrade != null ? `${stat.avgGrade}/100` : '—'}</td>
                                  <td><span style={{ fontWeight: 700 }}>{stat.sTasks.filter(t => t.status === 'completed').length}</span><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>/{stat.sTasks.length}</span></td>
                                  <td>
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: perfColor }}>{stat.performanceScore}%</span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                      <button onClick={() => openStudentProgress(s)} style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)', border: 'none', borderRadius: '0.35rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Eye size={12} /> {isAr ? 'تفاصيل' : 'Details'}
                                      </button>
                                      <button onClick={() => setMessageForm({ studentId: s._id, message: '' })} className="btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <MessageSquare size={12} /> {t('send_message')}
                                      </button>
                                      <button onClick={() => { setTaskForm(f => ({ ...f, studentId: s._id })); setShowTaskForm(true); setTab('tasks'); window.location.hash = 'tasks'; }} className="btn-primary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Plus size={12} /> {isAr ? 'مهمة' : 'Task'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Message form */}
                    {messageForm.studentId && (
                      <div className="card fade-in" style={{ border: '1px solid var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquare size={16} style={{ color: 'var(--primary-light)' }} />
                            {t('send_message')} → {students.find(s => s._id === messageForm.studentId)?.name}
                          </h3>
                          <button onClick={() => setMessageForm({ studentId: null, message: '' })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={sendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <textarea className="form-input" rows={3} value={messageForm.message} onChange={e => setMessageForm({ ...messageForm, message: e.target.value })} required placeholder={t('message_placeholder')} />
                          <div style={{ alignSelf: 'flex-start' }}>
                            <button type="submit" className="btn-primary" disabled={sendingMessage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Send size={16} /> {sendingMessage ? tCommon('sending') : tCommon('send')}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════
                    TAB: REPORTS
                ══════════════════════════════ */}
                {tab === 'reports' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {pendingReports.length > 0 && (
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))', border: '1px solid rgba(14,165,233,0.3)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Clock size={18} style={{ color: '#0ea5e9', flexShrink: 0 }} />
                        <p style={{ fontSize: '0.875rem' }}><strong>{pendingReports.length}</strong> {isAr ? 'تقارير تنتظر مراجعتك' : 'reports are waiting for your review'}</p>
                      </div>
                    )}
                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('student_reports')}</h3>
                      {reports.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_reports')}</p> : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('student')}</th>
                              <th>{isAr ? 'التدريب' : 'Internship'}</th>
                              <th>{t('week')}</th>
                              <th>{isAr ? 'العنوان' : 'Title'}</th>
                              <th>{t('status')}</th>
                              <th>{t('grade')}</th>
                              <th>{tCommon('actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reports.map(r => (
                              <tr key={r._id} style={{ background: r.status === 'submitted' ? 'rgba(14,165,233,0.04)' : 'transparent' }}>
                                <td style={{ fontWeight: 600 }}>{r.student?.name}</td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.internship?.title || '—'}</td>
                                <td>{isAr ? 'أسبوع' : 'Week'} {r.weekNumber}</td>
                                <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</td>
                                <td><span className={`badge ${reportStatusBadge[r.status]}`}>{tStatus(r.status)}</span></td>
                                <td style={{ fontWeight: 700, color: r.grade >= 80 ? '#10b981' : r.grade >= 60 ? '#f59e0b' : r.grade ? '#ef4444' : 'var(--text-muted)' }}>{r.grade ? `${r.grade}/100` : '—'}</td>
                                <td>
                                  <button onClick={() => setReviewForm({ id: r._id, status: r.status === 'submitted' ? 'approved' : r.status, grade: r.grade || 100, feedback: r.feedback || '' })}
                                    className={r.status === 'submitted' ? 'btn-primary' : 'btn-secondary'}
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                    {r.status === 'submitted' ? (isAr ? '✱ مراجعة' : '✱ Review') : (isAr ? 'عرض' : 'View')}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {reviewForm.id && (
                      <div className="card fade-in" style={{ border: '1px solid var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <h3 style={{ fontWeight: 700 }}>{t('review_report')}</h3>
                          <button onClick={() => setReviewForm({ id: null, status: '', grade: 0, feedback: '' })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        {reports.find(r => r._id === reviewForm.id) && (() => {
                          const rep = reports.find(r => r._id === reviewForm.id);
                          return (
                            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h4 style={{ fontWeight: 700 }}>{rep.title}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isAr ? 'أسبوع' : 'Week'} {rep.weekNumber} — {rep.student?.name}</span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{rep.content}</p>
                            </div>
                          );
                        })()}
                        <form onSubmit={submitReview} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('status')}</label>
                            <select className="form-input" value={reviewForm.status} onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}>
                              {['approved', 'rejected', 'reviewed'].map(s => <option key={s} value={s}>{tStatus(s)}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('grade_label')} (0-100)</label>
                            <input type="number" min="0" max="100" className="form-input" value={reviewForm.grade} onChange={e => setReviewForm({ ...reviewForm, grade: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('feedback_label')}</label>
                            <textarea className="form-input" rows={3} value={reportNotes[reviewForm.id] !== undefined ? reportNotes[reviewForm.id] : reviewForm.feedback} onChange={e => { setReportNotes(n => ({ ...n, [reviewForm.id]: e.target.value })); setReviewForm(f => ({ ...f, feedback: e.target.value })); }} placeholder={t('feedback_placeholder')} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <button type="submit" className="btn-primary" disabled={submittingReview}>{submittingReview ? t('saving') : t('save_review')}</button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════
                    TAB: TASKS
                ══════════════════════════════ */}
                {tab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))', border: '1px solid var(--primary-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ClipboardList style={{ color: 'var(--primary-light)' }} /> {isAr ? 'إدارة المهام' : 'Task Management'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{isAr ? 'عيّن ومتابع مهام طلابك مع المواعيد والأولويات' : 'Assign and track tasks with deadlines and priorities'}</p>
                      </div>
                      <button onClick={() => { setTaskForm({ title: '', description: '', studentId: '', deadline: '', priority: 'medium' }); setShowTaskForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} /> {isAr ? 'إسناد مهمة جديدة' : 'Assign New Task'}
                      </button>
                    </div>

                    {showTaskForm && (
                      <div className="card fade-in" style={{ border: '1px solid var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                          <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={18} style={{ color: 'var(--primary-light)' }} /> {isAr ? 'مهمة جديدة' : 'New Task'}</h3>
                          <button onClick={() => setShowTaskForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'عنوان المهمة *' : 'Task Title *'}</label>
                            <input className="form-input" placeholder={isAr ? 'مثل: وضع خطة للمشروع' : 'e.g. Build Login Page'} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'الوصف *' : 'Description *'}</label>
                            <textarea className="form-input" rows={3} placeholder={isAr ? 'صف ما يجب علي الطالب القيام به...' : 'Describe what the student should do...'} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'تعيين للطالب *' : 'Assign to Student *'}</label>
                            <select className="form-input" value={taskForm.studentId} onChange={e => setTaskForm({ ...taskForm, studentId: e.target.value })} required>
                              <option value="">{isAr ? '— اختر الطالب —' : '— Select Student —'}</option>
                              {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'الموعد النهائي *' : 'Deadline *'}</label>
                            <input type="datetime-local" className="form-input" value={taskForm.deadline} onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })} required min={new Date().toISOString().slice(0, 16)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'الأولوية' : 'Priority'}</label>
                            <select className="form-input" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                              {[{ val: 'low', ar: 'منخفضة', en: 'Low' }, { val: 'medium', ar: 'متوسطة', en: 'Medium' }, { val: 'high', ar: 'عالية', en: 'High' }, { val: 'urgent', ar: 'عاجلة', en: 'Urgent' }].map(p => (
                                <option key={p.val} value={p.val}>{isAr ? p.ar : p.en}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.75rem' }}>
                            <button type="submit" className="btn-primary" disabled={creatingTask} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {creatingTask ? <LoadingSpinner size={18} /> : <Send size={18} />}
                              {creatingTask ? (isAr ? 'جاري الإسناد...' : 'Assigning...') : (isAr ? 'إسناد المهمة' : 'Assign Task')}
                            </button>
                            <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary">{isAr ? 'إلغاء' : 'Cancel'}</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Tasks Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
                      {tasks.length === 0 ? (
                        <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          <ClipboardList size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                          <p>{isAr ? 'لم يتم تعيين أي مهام بعد.' : 'No tasks assigned yet.'}</p>
                        </div>
                      ) : tasks.map(task => {
                        const daysLeft = getDaysLeft(task.deadline);
                        const isOverdue = daysLeft < 0;
                        return (
                          <div key={task._id} onClick={() => setSelectedTask(selectedTask?._id === task._id ? null : task)}
                            className="card" style={{ cursor: 'pointer', border: `1px solid ${isOverdue && task.status !== 'completed' ? '#ef444440' : 'var(--border)'}`, borderLeft: `4px solid ${priorityColor[task.priority]}`, transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{task.title}</h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>→ {task.student?.name}</p>
                              </div>
                              <span className={`badge ${taskStatusBadge[task.status] || 'badge-gray'}`} style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{task.status.replace('_', ' ')}</span>
                            </div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className={`badge ${priorityBadge[task.priority]}`} style={{ fontSize: '0.65rem' }}>{isAr ? ({ low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' }[task.priority] || task.priority) : task.priority}</span>
                              <span style={{ fontSize: '0.75rem', color: isOverdue ? '#ef4444' : daysLeft <= 2 ? '#f59e0b' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                                {isOverdue && task.status !== 'completed' ? `⚠ ${Math.abs(daysLeft)}d ${isAr ? 'متأخر' : 'overdue'}` : daysLeft === 0 ? (isAr ? '⏰ اليوم!' : 'Due today!') : `📅 ${daysLeft}d ${isAr ? 'متبقي' : 'left'}`}
                              </span>
                            </div>
                            {selectedTask?._id === task._id && (
                              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><strong>{isAr ? 'الوصف:' : 'Description:'}</strong> {task.description}</p>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><strong>{isAr ? 'الموعد النهائي:' : 'Deadline:'}</strong> {new Date(task.deadline).toLocaleString()}</p>
                                {task.studentNote && <p style={{ fontSize: '0.82rem', background: 'var(--bg)', padding: '0.5rem', borderRadius: '0.4rem', marginBottom: '0.75rem' }}><strong>{isAr ? 'ملاحظة الطالب:' : 'Student note:'}</strong> {task.studentNote}</p>}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                  {task.status !== 'completed' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleCloseTask(task._id); }} className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <CheckCircle size={14} /> {isAr ? 'تعيين كمكتمل' : 'Mark Completed'}
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#ef4444', borderColor: '#ef4444' }}>
                                    <Trash2 size={14} /> {isAr ? 'حذف' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════
                    TAB: ATTENDANCE
                ══════════════════════════════ */}
                {tab === 'attendance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                      {[
                        { label: isAr ? 'إجمالي السجلات' : 'Total Records', val: attendance.length, color: '#6366f1' },
                        { label: isAr ? 'حاضر/عن بعد' : 'Present/Remote', val: attendance.filter(a => a.status === 'present' || a.status === 'remote').length, color: '#10b981' },
                        { label: isAr ? 'المتأخرون' : 'Late', val: attendance.filter(a => a.status === 'late').length, color: '#f59e0b' },
                        { label: isAr ? 'الغائبون' : 'Absent', val: attendance.filter(a => a.status === 'absent').length, color: '#ef4444' },
                        { label: isAr ? 'إجمالي الساعات' : 'Total Hours', val: `${attendance.reduce((s, a) => s + (a.hoursWorked || 0), 0).toFixed(1)}h`, color: '#8b5cf6' },
                      ].map(item => (
                        <div key={item.label} className="card" style={{ textAlign: 'center', padding: '1rem', border: `1px solid ${item.color}30` }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color }}>{item.val}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} style={{ color: 'var(--primary-light)' }} /> {t('student_attendance')}
                      </h3>
                      {attendance.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_attendance')}</p> : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('student')}</th>
                              <th>{t('date')}</th>
                              <th>{tCommon('status')}</th>
                              <th>{isAr ? 'دخول' : 'Check In'}</th>
                              <th>{isAr ? 'خروج' : 'Check Out'}</th>
                              <th>{t('hours')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.map(a => (
                              <tr key={a._id}>
                                <td style={{ fontWeight: 600 }}>{a.student?.name}</td>
                                <td>{new Date(a.date).toLocaleDateString()}</td>
                                <td><span className={`badge badge-${a.status === 'present' || a.status === 'remote' ? 'success' : a.status === 'absent' ? 'danger' : 'warning'}`}>{tCommon(a.status) || a.status}</span></td>
                                <td style={{ color: '#10b981', fontWeight: 600 }}>{a.checkIn || '—'}</td>
                                <td style={{ color: '#ef4444', fontWeight: 600 }}>{a.checkOut || '—'}</td>
                                <td style={{ fontWeight: 700 }}>{a.hoursWorked ? `${a.hoursWorked}h` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════
                    TAB: ADMIN REPORT
                ══════════════════════════════ */}
                {tab === 'admin-report' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Header */}
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                            <BookOpen size={22} style={{ color: 'var(--primary-light)' }} />
                            {isAr ? 'التقرير الإداري الشامل' : 'Comprehensive Admin Report'}
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {isAr
                              ? 'تقرير مفصّل عن أداء جميع طلابك يشمل الحضور والتقارير والمهام — يمكن طباعته وإرساله للإدارة.'
                              : 'Detailed performance report for all your students including attendance, reports & tasks — ready to print and submit to admin.'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <button onClick={generateReport} disabled={reportLoading}
                            style={{ padding: '0.6rem 1.2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', opacity: reportLoading ? 0.7 : 1 }}>
                            {reportLoading ? <LoadingSpinner size={16} /> : <Activity size={16} />}
                            {reportLoading ? (isAr ? 'جاري التوليد...' : 'Generating...') : (isAr ? 'توليد / تحديث' : 'Generate / Refresh')}
                          </button>
                          {adminReport && (
                            <button onClick={printReport}
                              style={{ padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                              <Printer size={16} /> {isAr ? 'طباعة / تصدير PDF' : 'Print / Export PDF'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {reportLoading && (
                      <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <LoadingSpinner size={40} />
                        <p style={{ color: 'var(--text-muted)' }}>{isAr ? 'جاري تجميع بيانات الطلاب...' : 'Compiling student data...'}</p>
                      </div>
                    )}

                    {!reportLoading && !adminReport && (
                      <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <BookOpen size={52} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem' }}>{isAr ? 'لم يتم توليد التقرير بعد' : 'No report generated yet'}</p>
                        <p style={{ fontSize: '0.875rem' }}>{isAr ? 'اضغط على "توليد / تحديث" لإنشاء التقرير الشامل' : 'Click "Generate / Refresh" to build the comprehensive report'}</p>
                      </div>
                    )}

                    {!reportLoading && adminReport && (
                      <div id="supervisor-print-report">
                        {/* Report Header for print */}
                        <div className="card" style={{ marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.25rem' }}>
                                {isAr ? 'تقرير الإشراف على التدريب الميداني' : 'Field Training Supervision Report'}
                              </h2>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{isAr ? 'المشرف:' : 'Supervisor:'} <strong>{adminReport.supervisor?.name}</strong> · {adminReport.supervisor?.email}</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                {isAr ? 'ساعات الحضور:' : 'Shift Hours:'} {adminReport.supervisor?.shiftStart} → {adminReport.supervisor?.shiftEnd}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isAr ? 'تاريخ التوليد:' : 'Generated:'}</p>
                              <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{new Date(adminReport.generatedAt).toLocaleString()}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{isAr ? 'إجمالي الطلاب:' : 'Total Students:'} <strong>{adminReport.totalStudents}</strong></p>
                            </div>
                          </div>
                        </div>

                        {/* Overview score cards */}
                        {adminReport.data.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {[
                              { label: isAr ? 'متوسط الأداء' : 'Avg Performance', val: `${Math.round(adminReport.data.reduce((s, d) => s + d.performanceScore, 0) / adminReport.data.length)}%`, color: '#6366f1' },
                              { label: isAr ? 'متوسط الحضور' : 'Avg Attendance', val: `${Math.round(adminReport.data.reduce((s, d) => s + d.attendance.attendanceRate, 0) / adminReport.data.length)}%`, color: '#10b981' },
                              { label: isAr ? 'إجمالي ساعات العمل' : 'Total Work Hours', val: `${adminReport.data.reduce((s, d) => s + parseFloat(d.attendance.totalHours), 0).toFixed(0)}h`, color: '#8b5cf6' },
                              { label: isAr ? 'إجمالي التقارير' : 'Total Reports', val: adminReport.data.reduce((s, d) => s + d.reports.total, 0), color: '#0ea5e9' },
                              { label: isAr ? 'المهام المكتملة' : 'Tasks Completed', val: adminReport.data.reduce((s, d) => s + d.tasks.completed, 0), color: '#f59e0b' },
                            ].map(item => (
                              <div key={item.label} className="card" style={{ textAlign: 'center', padding: '0.85rem', border: `1px solid ${item.color}30` }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.val}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{item.label}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Per-student accordion */}
                        {adminReport.data.map((entry, idx) => {
                          const isOpen = expandedStudent === entry.student._id;
                          const perfColor = entry.performanceScore >= 75 ? '#10b981' : entry.performanceScore >= 50 ? '#f59e0b' : '#ef4444';
                          return (
                            <div key={entry.student._id} className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${perfColor}` }}>
                              {/* Student header row */}
                              <div
                                onClick={() => setExpandedStudent(isOpen ? null : entry.student._id)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', flexWrap: 'wrap', gap: '0.75rem' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg, ${perfColor}40, ${perfColor}20)`, border: `2px solid ${perfColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: perfColor, flexShrink: 0 }}>
                                    {entry.student.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{entry.student.name}</h4>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{entry.student.email} {entry.student.university ? `· ${entry.student.university}` : ''} {entry.student.major ? `· ${entry.student.major}` : ''}</p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                  <ScoreRing score={entry.performanceScore} size={60} label={isAr ? 'الأداء' : 'Score'} />
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '0.75rem', fontSize: '0.78rem' }}>
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontWeight: 800, color: '#10b981' }}>{entry.attendance.attendanceRate}%</div>
                                      <div style={{ color: 'var(--text-muted)' }}>{isAr ? 'حضور' : 'Attend.'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontWeight: 800, color: 'var(--primary-light)' }}>{entry.reports.avgGrade != null ? `${entry.reports.avgGrade}` : '—'}</div>
                                      <div style={{ color: 'var(--text-muted)' }}>{isAr ? 'معدل' : 'Grade'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontWeight: 800, color: '#f59e0b' }}>{entry.tasks.taskCompletionRate}%</div>
                                      <div style={{ color: 'var(--text-muted)' }}>{isAr ? 'مهام' : 'Tasks'}</div>
                                    </div>
                                  </div>
                                  {isOpen ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
                                </div>
                              </div>

                              {/* Expanded detail */}
                              {isOpen && (
                                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>

                                    {/* Attendance block */}
                                    <div style={{ background: 'var(--bg)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border)' }}>
                                      <h5 style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                                        <Clock size={14} style={{ color: '#10b981' }} /> {isAr ? 'الحضور والانصراف' : 'Attendance'}
                                      </h5>
                                      {[
                                        { label: isAr ? 'أيام الحضور' : 'Present Days', val: `${entry.attendance.presentDays}/${entry.attendance.totalDays}` },
                                        { label: isAr ? 'أيام التأخر' : 'Late Days', val: entry.attendance.lateDays },
                                        { label: isAr ? 'أيام الغياب' : 'Absent Days', val: entry.attendance.absentDays },
                                        { label: isAr ? 'ساعات العمل الكلية' : 'Total Work Hours', val: `${entry.attendance.totalHours}h` },
                                        { label: isAr ? 'نسبة الحضور' : 'Attendance Rate', val: `${entry.attendance.attendanceRate}%` },
                                      ].map(row => (
                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid rgba(51,65,85,0.25)', fontSize: '0.8rem' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                                          <span style={{ fontWeight: 700 }}>{row.val}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Reports block */}
                                    <div style={{ background: 'var(--bg)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border)' }}>
                                      <h5 style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                                        <FileText size={14} style={{ color: 'var(--primary-light)' }} /> {isAr ? 'التقارير الأسبوعية' : 'Weekly Reports'}
                                      </h5>
                                      {[
                                        { label: isAr ? 'إجمالي التقارير' : 'Total', val: entry.reports.total },
                                        { label: isAr ? 'معتمدة' : 'Approved', val: entry.reports.approved },
                                        { label: isAr ? 'بانتظار المراجعة' : 'Pending', val: entry.reports.submitted },
                                        { label: isAr ? 'متوسط الدرجة' : 'Avg Grade', val: entry.reports.avgGrade != null ? `${entry.reports.avgGrade}/100` : '—' },
                                      ].map(row => (
                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid rgba(51,65,85,0.25)', fontSize: '0.8rem' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                                          <span style={{ fontWeight: 700 }}>{row.val}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Tasks block */}
                                    <div style={{ background: 'var(--bg)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border)' }}>
                                      <h5 style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                                        <Target size={14} style={{ color: '#f59e0b' }} /> {isAr ? 'المهام' : 'Tasks'}
                                      </h5>
                                      {[
                                        { label: isAr ? 'إجمالي المهام' : 'Total', val: entry.tasks.total },
                                        { label: isAr ? 'مكتملة' : 'Completed', val: entry.tasks.completed },
                                        { label: isAr ? 'نسبة الإنجاز' : 'Completion Rate', val: `${entry.tasks.taskCompletionRate}%` },
                                        { label: isAr ? 'التقييم المتوسط' : 'Avg Eval. Score', val: entry.evaluations.avgScore ? `${entry.evaluations.avgScore}/10` : '—' },
                                      ].map(row => (
                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid rgba(51,65,85,0.25)', fontSize: '0.8rem' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                                          <span style={{ fontWeight: 700 }}>{row.val}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Supervisor notes field */}
                                  <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                                      📝 {isAr ? 'ملاحظات المشرف على هذا الطالب:' : 'Supervisor notes for this student:'}
                                    </label>
                                    <textarea
                                      className="form-input"
                                      rows={3}
                                      placeholder={isAr ? 'أضف ملاحظاتك وتقييمك لأداء الطالب...' : 'Add your notes and overall assessment for this student...'}
                                      value={reportNotes[entry.student._id] || ''}
                                      onChange={e => setReportNotes(n => ({ ...n, [entry.student._id]: e.target.value }))}
                                      style={{ fontSize: '0.875rem' }}
                                    />
                                  </div>

                                  {/* Weekly reports mini timeline */}
                                  {entry.reports.list.length > 0 && (
                                    <div style={{ marginTop: '1rem' }}>
                                      <h5 style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{isAr ? 'تفاصيل التقارير الأسبوعية:' : 'Weekly Report Details:'}</h5>
                                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {entry.reports.list.map(rep => (
                                          <div key={rep.weekNumber} style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.5rem', background: rep.status === 'approved' ? 'rgba(16,185,129,0.12)' : rep.status === 'submitted' ? 'rgba(14,165,233,0.12)' : 'rgba(100,116,139,0.12)', color: rep.status === 'approved' ? '#10b981' : rep.status === 'submitted' ? '#0ea5e9' : 'var(--text-muted)', fontWeight: 600 }}>
                                            {isAr ? `أسبوع ${rep.weekNumber}` : `Wk${rep.weekNumber}`} {rep.grade ? `· ${rep.grade}` : ''} {rep.status === 'approved' ? '✓' : rep.status === 'submitted' ? '↺' : ''}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════
                    TAB: NOTIFICATIONS
                ══════════════════════════════ */}
                {tab === 'notifications' && (
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('notifications')}</h3>
                    {notifications.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_notifications')}</p> : (
                      notifications.map(n => (
                        <div key={n._id} style={{ display: 'flex', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(51,65,85,0.4)', opacity: n.isRead ? 0.55 : 1 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: n.isRead ? 'var(--border)' : 'var(--primary)', flexShrink: 0, marginTop: '0.35rem' }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{n.title}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.message}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </>
            )}
          </main>
        </div>
      </div>

      {/* ─── Student Progress Modal ──────────────────────── */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => { setSelectedStudent(null); setStudentProgress(null); }}>
          <div className="card fade-in" style={{ maxWidth: 700, width: '100%', maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { setSelectedStudent(null); setStudentProgress(null); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22} /></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0 }}>
                {selectedStudent.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>{selectedStudent.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedStudent.email}</p>
              </div>
              {!progressLoading && (() => { const s = getStudentStats(selectedStudent._id); return <ScoreRing score={s.performanceScore} size={70} label={isAr ? 'الأداء الكلي' : 'Overall'} />; })()}
            </div>

            {progressLoading ? (
              <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={36} /></div>
            ) : studentProgress ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Quick stats */}
                {(() => {
                  const stat = getStudentStats(selectedStudent._id);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem' }}>
                      {[
                        { label: isAr ? 'الحضور' : 'Attendance', val: `${stat.attendanceRate}%`, color: '#10b981' },
                        { label: isAr ? 'متوسط الدرجة' : 'Avg Grade', val: stat.avgGrade != null ? `${stat.avgGrade}` : '—', color: 'var(--primary-light)' },
                        { label: isAr ? 'إنجاز المهام' : 'Task Rate', val: `${stat.taskRate}%`, color: '#f59e0b' },
                        { label: isAr ? 'ساعات العمل' : 'Hours', val: `${stat.totalHours.toFixed(0)}h`, color: '#8b5cf6' },
                        { label: isAr ? 'أيام الغياب' : 'Absent', val: stat.absentDays, color: '#ef4444' },
                      ].map(i => (
                        <div key={i.label} style={{ textAlign: 'center', padding: '0.6rem', background: `${i.color}15`, border: `1px solid ${i.color}30`, borderRadius: '0.6rem' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: i.color }}>{i.val}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{i.label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Recent attendance */}
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} style={{ color: 'var(--primary-light)' }} /> {isAr ? 'آخر سجلات الحضور' : 'Recent Attendance'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 150, overflowY: 'auto' }}>
                    {studentProgress.attendance.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{isAr ? 'لا توجد سجلات' : 'No records'}</p> : (
                      studentProgress.attendance.map(a => (
                        <div key={a._id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '0.75rem', alignItems: 'center', padding: '0.35rem 0.5rem', borderRadius: '0.35rem', background: 'var(--bg-lighter)', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(a.date).toLocaleDateString()}</span>
                          <span className={`badge badge-${a.status === 'present' || a.status === 'remote' ? 'success' : a.status === 'absent' ? 'danger' : 'warning'}`} style={{ fontSize: '0.65rem', justifySelf: 'start' }}>{a.status}</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{a.checkIn || '—'}</span>
                          <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{a.hoursWorked ? `${a.hoursWorked}h` : '—'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reports mini list */}
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} style={{ color: 'var(--primary-light)' }} /> {isAr ? 'التقارير الأسبوعية' : 'Weekly Reports'}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {studentProgress.reports.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{isAr ? 'لا توجد تقارير' : 'No reports'}</p> : (
                      studentProgress.reports.map(rep => (
                        <div key={rep._id} style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 600, background: rep.status === 'approved' ? 'rgba(16,185,129,0.12)' : rep.status === 'submitted' ? 'rgba(14,165,233,0.12)' : 'rgba(100,116,139,0.12)', color: rep.status === 'approved' ? '#10b981' : rep.status === 'submitted' ? '#0ea5e9' : 'var(--text-muted)', border: '1px solid currentColor', opacity: 0.9 }}>
                          {isAr ? `أسبوع ${rep.weekNumber}` : `Wk ${rep.weekNumber}`}: {rep.title} {rep.grade ? `· ${rep.grade}/100` : ''}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

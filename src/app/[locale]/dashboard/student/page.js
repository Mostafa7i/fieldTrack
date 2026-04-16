'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import OnboardingModal from '../../../components/OnboardingModal';
import { applicationAPI, reportAPI, evaluationAPI, notificationAPI, attendanceAPI, authAPI, aiAPI, taskAPI, studentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ClipboardList, FileText, Star, Bell, Send, CheckCircle, Clock, Upload, Award, Download, Trophy, Brain, AlertTriangle, PlayCircle, LogIn, LogOut, Timer, Settings, User } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

const appStatusBadge = { pending: 'badge-warning', reviewing: 'badge-info', accepted: 'badge-success', rejected: 'badge-danger', withdrawn: 'badge-gray' };
const reportStatusBadge = { draft: 'badge-gray', submitted: 'badge-info', reviewed: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function StudentDashboard() {
  const t = useTranslations('StudentDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const tRec = useTranslations('Recommendation');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [applications, setApplications] = useState([]);
  const [reports, setReports] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportForm, setReportForm] = useState({ title: '', content: '', weekNumber: 1, internshipId: '' });
  const [submittingReport, setSubmittingReport] = useState(false);
  
  // Attendance and CV state
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceForm, setAttendanceForm] = useState({ internshipId: '', date: new Date().toISOString().split('T')[0], checkIn: '09:00', checkOut: '17:00', status: 'present', notes: '' });
  const [loggingAttendance, setLoggingAttendance] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');
  const [uploadingCV, setUploadingCV] = useState(false);

  // Shift info state
  const [shiftInfo, setShiftInfo] = useState({ shiftStart: '09:00', shiftEnd: '17:00', hasSupervisor: false, supervisorName: null });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Computed: is the current time within the supervisor's allowed window?
  const isWithinShift = (() => {
    const now = currentTime;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = (shiftInfo.shiftStart || '09:00').split(':').map(Number);
    const [eh, em] = (shiftInfo.shiftEnd || '17:00').split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    return nowMins >= startMins && nowMins <= endMins;
  })();

  // Game/Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);

  // AI recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [loadingAiRecs, setLoadingAiRecs] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [taskNoteForm, setTaskNoteForm] = useState({ id: null, note: '' });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['overview', 'applications', 'reports', 'evaluations', 'attendance', 'notifications'].includes(hash)) {
        setTab(hash);
      } else {
        setTab('overview');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [appRes, repRes, evalRes, notifRes, attRes, leaderRes, taskRes, shiftRes, profileRes] = await Promise.all([
          applicationAPI.getAll(),
          reportAPI.getAll(),
          evaluationAPI.getAll(),
          notificationAPI.getAll(),
          attendanceAPI.getAll(),
          evaluationAPI.getLeaderboard(),
          taskAPI.getStudentTasks(),
          attendanceAPI.getShiftInfo(),
          studentAPI.getProfile().catch(() => null),
        ]);
        setApplications(appRes.data.data || []);
        setReports(repRes.data.data || []);
        setEvaluations(evalRes.data.data || []);
        setNotifications(notifRes.data.data || []);
        setAttendanceList(attRes.data.data || []);
        setLeaderboard(leaderRes.data.data || []);
        setTasks(taskRes.data.data || []);
        if (shiftRes.data?.data) setShiftInfo(shiftRes.data.data);

        // Show onboarding if student hasn't completed their profile yet
        if (profileRes && !profileRes.data?.data?.profileCompleted) {
          setShowOnboarding(true);
        }
      } catch (err) {
        toast.error(t('failed_to_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    // Update current time every 30 seconds
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const submitReport = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const payload = { ...reportForm, weekNumber: parseInt(reportForm.weekNumber) };
      await reportAPI.submit(payload);
      toast.success(t('report_submitted'));
      setReportForm({ title: '', content: '', weekNumber: reportForm.weekNumber + 1, internshipId: reportForm.internshipId });
      const res = await reportAPI.getAll();
      setReports(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || t('failed_submit_report'));
    } finally {
      setSubmittingReport(false);
    }
  };

  const withdrawApplication = async (id) => {
    if (!confirm(t('confirm_withdraw'))) return;
    try {
      await applicationAPI.withdraw(id);
      setApplications(applications.filter(a => a._id !== id));
      toast.success(t('withdrawn_success'));
    } catch {
      toast.error(t('failed_withdraw'));
    }
  };

  const submitAttendance = async (e) => {
    e.preventDefault();
    setLoggingAttendance(true);
    try {
      await attendanceAPI.log(attendanceForm);
      toast.success(t('attendance_logged'));
      const attRes = await attendanceAPI.getAll();
      setAttendanceList(attRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || t('failed_attendance'));
    } finally {
      setLoggingAttendance(false);
    }
  };

  const autoSubmitAttendance = async (action) => {
    if (!attendanceForm.internshipId) return toast.error(t('select_internship'));
    setLoggingAttendance(true);
    try {
      await attendanceAPI.autoLog({ internshipId: attendanceForm.internshipId, action });
      toast.success(isAr ? 'تم تسجيل الحضور/الانصراف تلقائياً' : 'Attendance auto-logged');
      const attRes = await attendanceAPI.getAll();
      setAttendanceList(attRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || t('failed_attendance'));
    } finally {
      setLoggingAttendance(false);
    }
  };

  const getAIRecommendations = async () => {
    setShowAiModal(true);
    setLoadingAiRecs(true);
    try {
      const res = await aiAPI.getRecommendations(locale);
      setRecommendations(res.data || []);
    } catch (err) {
      // Should never reach here due to server-side local fallback
      // but handle gracefully just in case
      setRecommendations([]);
    } finally {
      setLoadingAiRecs(false);
    }
  };

  const activeInternships = applications.filter(a => a.status === 'accepted').map(a => a.internship);

  const getRadarData = () => {
    if (!evaluations || evaluations.length === 0) return [];
    const avgScores = { punctuality: 0, teamwork: 0, technicalSkills: 0, communication: 0, initiative: 0, overallPerformance: 0 };
    evaluations.forEach(ev => {
      Object.keys(avgScores).forEach(key => {
        avgScores[key] += ev.scores[key] || 0;
      });
    });
    const len = evaluations.length;
    return Object.keys(avgScores).map(key => ({
      subject: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      A: avgScores[key] / len,
      fullMark: 10,
    }));
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div>
        {showOnboarding && (
          <OnboardingModal
            userName={user?.name}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('title')}</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('welcome', { name: user?.name })}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => router.push(`/${locale}/dashboard/student/profile`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: 'var(--bg-lighter)', border: '1px solid var(--border)', borderRadius: '0.6rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s' }}
                >
                  <Settings size={15} /> {isAr ? 'تفضيلاتي' : 'My Preferences'}
                </button>
                <button
                  onClick={() => setShowOnboarding(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', border: 'none', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                >
                  <User size={15} /> {isAr ? 'تحديث ملفي' : 'Quick Setup'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard title={t('applications')} value={applications.length} icon={ClipboardList} color="indigo" />
              <StatCard title={t('active_internships')} value={activeInternships.length} icon={CheckCircle} color="emerald" />
              <StatCard title={t('reports_submitted')} value={reports.length} icon={FileText} color="sky" />
              <StatCard title={t('evaluations')} value={evaluations.length} icon={Star} color="amber" />
              <StatCard title="Tasks" value={tasks.length} subtitle={`${tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length} pending`} icon={ClipboardList} color="violet" />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'overview', label: t('overview'), icon: <FileText size={16} /> },
                { key: 'applications', label: t('my_applications'), icon: <ClipboardList size={16} /> },
                { key: 'reports', label: t('my_reports'), icon: <FileText size={16} /> },
                { key: 'tasks', label: isAr ? 'المهام' : 'Tasks', icon: <ClipboardList size={16} /> },
                { key: 'attendance', label: t('attendance_tab'), icon: <Clock size={16} /> },
                { key: 'evaluations', label: t('my_evaluations'), icon: <Award size={16} /> },
                { key: 'leaderboard', label: t('leaderboard_tab'), icon: <Trophy size={16} /> },
                { key: 'notifications', label: t('notifications'), icon: <Bell size={16} /> },
              ].map(tabItem => (
                <button key={tabItem.key} onClick={() => { setTab(tabItem.key); window.location.hash = tabItem.key; }} style={{ padding: '0.6rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent', color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === tabItem.key ? 700 : 500, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {tabItem.icon} {tabItem.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner size={40} />
              </div>
            ) : (
              <>
                {/* Overview */}
                {tab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('recent_applications')}</h3>
                      {applications.slice(0, 5).map(app => (
                        <div key={app._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{app.internship?.title || t('unknown_internship')}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.internship?.company?.companyName || tCommon('company')}</p>
                          </div>
                          <span className={`badge ${appStatusBadge[app.status]}`}>{tStatus(app.status)}</span>
                        </div>
                      ))}
                      {applications.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('no_applied_internships')}</p>}
                    </div>

                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('recent_reports')}</h3>
                      {reports.slice(0, 5).map(rep => (
                        <div key={rep._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('week_prefix')}{rep.weekNumber}: {rep.title}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(rep.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`badge ${reportStatusBadge[rep.status]}`}>{tStatus(rep.status)}</span>
                        </div>
                      ))}
                      {reports.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('no_reports')}</p>}
                    </div>
                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={18} style={{ color: 'var(--primary-light)' }} /> {t('upload_cv')}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {t('upload_cv_desc')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input type="file" className="form-input" style={{ flex: 1 }} accept=".pdf,.doc,.docx" onChange={(e) => {
                             // Mock file select (In real app, we would upload to storage and save URL)
                             setResumeUrl(e.target.files[0].name);
                        }} />
                        <button className="btn-primary" disabled={!resumeUrl || uploadingCV} onClick={() => {
                          setUploadingCV(true); setTimeout(() => { toast.success(t('cv_uploaded')); setUploadingCV(false); }, 1500)
                        }}>
                          {uploadingCV ? tCommon('saving') : t('upload_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Applications */}
                {tab === 'applications' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)', border: '1px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Brain className="gradient-text" /> {isAr ? 'التوصية الذكية' : 'AI Matchmaker'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)' }}>{isAr ? 'احصل على توصيات بفرص تدريب مخصصة بناءً على مهاراتك وتخصصك.' : 'Get personalized internship recommendations based on your skills and major.'}</p>
                      </div>
                      <button onClick={getAIRecommendations} className="btn-primary">
                        ✨ {isAr ? 'توليد التوصيات' : 'Generate Recommendations'}
                      </button>
                    </div>

                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('my_applications')}</h3>
                    {applications.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>{t('no_applications')}</p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>{t('internship')}</th>
                            <th>{tCommon('company')}</th>
                            <th>{t('applied_on')}</th>
                            <th>{tCommon('status')}</th>
                            <th>{tCommon('actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map(app => (
                            <tr key={app._id}>
                              <td style={{ fontWeight: 600 }}>{app.internship?.title}</td>
                              <td>{app.internship?.companyProfile?.companyName || app.internship?.company?.name || '—'}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                              <td><span className={`badge ${appStatusBadge[app.status]}`}>{tStatus(app.status)}</span></td>
                              <td>
                                {app.status === 'pending' && (
                                  <button onClick={() => withdrawApplication(app._id)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '0.3rem', cursor: 'pointer', fontWeight: 600 }}>
                                    {t('withdraw')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {tab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(99,102,241,0.1) 100%)', border: '1px solid var(--primary-light)' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClipboardList style={{ color: 'var(--primary-light)' }} />
                        {isAr ? 'المهام المُعيَّنة لك' : 'Your Assigned Tasks'}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{isAr ? 'تتبع المهام المُسندة من مشرفك وحدِّث حالتها.' : 'Track tasks from your supervisor and keep their status up to date.'}</p>
                    </div>

                    {tasks.length === 0 ? (
                      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <ClipboardList size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>{isAr ? 'لا توجد مهام معينة حتى الآن.' : 'No tasks assigned to you yet.'}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {tasks.map(task => {
                          const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                          const isOverdue = daysLeft < 0 && task.status !== 'completed';
                          const priorityColors = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', urgent: '#a855f7' };
                          const statusBadges = { pending: 'badge-warning', in_progress: 'badge-info', submitted: 'badge-primary', completed: 'badge-success', overdue: 'badge-danger' };
                          return (
                            <div key={task._id} className="card" style={{ borderLeft: `4px solid ${priorityColors[task.priority]}`, transition: 'all 0.2s', border: `1px solid ${isOverdue ? 'var(--danger)' : 'var(--border)'}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div>
                                  <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{task.title}</h4>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isAr ? 'من:' : 'From:'} {task.supervisor?.name}</p>
                                </div>
                                <span className={`badge ${statusBadges[task.status] || 'badge-gray'}`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>{task.description}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', background: `${priorityColors[task.priority]}22`, color: priorityColors[task.priority], padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 700 }}>
                                  {task.priority}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isOverdue ? 'var(--danger)' : daysLeft <= 2 ? '#f59e0b' : 'var(--text-muted)' }}>
                                  {isOverdue ? `⚠ ${Math.abs(daysLeft)}d ${isAr ? 'متأخر' : 'overdue'}` : daysLeft === 0 ? (isAr ? '⏰ اليوم!' : '⏰ Due today!') : `📅 ${daysLeft}d ${isAr ? 'متبقي' : 'left'}`}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                🗓 {new Date(task.deadline).toLocaleString()}
                              </p>

                              {/* Actions - only for non-completed tasks */}
                              {task.status !== 'completed' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {task.status === 'pending' && (
                                      <button
                                        disabled={updatingTask === task._id}
                                        onClick={async () => {
                                          setUpdatingTask(task._id);
                                          try {
                                            await taskAPI.updateStatus(task._id, { status: 'in_progress' });
                                            setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: 'in_progress' } : t));
                                            toast.success(isAr ? 'تم تحديث حالة المهمة!' : 'Task started!');
                                          } catch { toast.error('Failed'); } finally { setUpdatingTask(null); }
                                        }}
                                        className="btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                      >
                                        <PlayCircle size={14} /> {isAr ? 'بدء العمل' : 'Start Task'}
                                      </button>
                                    )}
                                    {(task.status === 'in_progress' || task.status === 'pending') && (
                                      <button
                                        disabled={updatingTask === task._id}
                                        onClick={() => setTaskNoteForm({ id: task._id, note: task.studentNote || '' })}
                                        className="btn-primary"
                                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                      >
                                        <Send size={14} /> {isAr ? 'تسليم المهمة' : 'Submit'}
                                      </button>
                                    )}
                                  </div>

                                  {/* Note/Submit Form */}
                                  {taskNoteForm.id === task._id && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                      <textarea
                                        className="form-input"
                                        rows={2}
                                        placeholder={isAr ? 'أضف ملاحظة أو تقرير موجز عن عملك...' : 'Add a note or brief report about your work...'}
                                        value={taskNoteForm.note}
                                        onChange={e => setTaskNoteForm(f => ({ ...f, note: e.target.value }))}
                                        style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}
                                      />
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                          disabled={updatingTask === task._id}
                                          onClick={async () => {
                                            setUpdatingTask(task._id);
                                            try {
                                              await taskAPI.updateStatus(task._id, { status: 'submitted', studentNote: taskNoteForm.note });
                                              setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: 'submitted', studentNote: taskNoteForm.note } : t));
                                              setTaskNoteForm({ id: null, note: '' });
                                              toast.success(isAr ? 'تم تسليم المهمة بنجاح!' : 'Task submitted successfully!');
                                            } catch { toast.error('Failed to submit'); } finally { setUpdatingTask(null); }
                                          }}
                                          className="btn-primary"
                                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                                        >
                                          {updatingTask === task._id ? '...' : (isAr ? 'إرسال' : 'Send')}
                                        </button>
                                        <button onClick={() => setTaskNoteForm({ id: null, note: '' })} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                                          {isAr ? 'إلغاء' : 'Cancel'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {task.status === 'completed' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}>
                                  <CheckCircle size={16} /> {isAr ? 'مكتملة — عمل رائع!' : 'Completed — Great work!'}
                                </div>
                              )}

                              {task.studentNote && task.status === 'submitted' && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', background: 'var(--bg)', padding: '0.5rem', borderRadius: '0.4rem' }}>
                                  💬 {task.studentNote}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Reports */}
                {tab === 'reports' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {activeInternships.length > 0 && (
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Send size={18} style={{ color: 'var(--primary-light)' }} /> {t('submit_weekly_report')}
                        </h3>
                        <form onSubmit={submitReport} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('internship')}</label>
                            <select className="form-input" value={reportForm.internshipId} onChange={e => setReportForm({ ...reportForm, internshipId: e.target.value })} required>
                              <option value="">{t('select_internship')}</option>
                              {activeInternships.map(i => (
                                <option key={i._id} value={i._id}>{i.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('week_number')}</label>
                            <input type="number" min="1" max="52" className="form-input" value={reportForm.weekNumber} onChange={e => setReportForm({ ...reportForm, weekNumber: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{tCommon('title')}</label>
                            <input type="text" className="form-input" placeholder={t('title_placeholder')} value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('content')}</label>
                            <textarea className="form-input" rows={4} placeholder={t('content_placeholder')} value={reportForm.content} onChange={e => setReportForm({ ...reportForm, content: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <button type="submit" className="btn-primary" disabled={submittingReport}>
                              {submittingReport ? t('submitting') : t('submit_report')}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('my_reports')}</h3>
                      {reports.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>{t('no_reports_yet')}</p>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('week')}</th>
                              <th>{tCommon('title')}</th>
                              <th>{tCommon('status')}</th>
                              <th>{t('grade')}</th>
                              <th>{t('feedback')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reports.map(rep => (
                              <tr key={rep._id}>
                                <td style={{ fontWeight: 600 }}>{t('week_prefix')}{rep.weekNumber}</td>
                                <td>{rep.title}</td>
                                <td><span className={`badge ${reportStatusBadge[rep.status]}`}>{tStatus(rep.status)}</span></td>
                                <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{rep.grade ? `${rep.grade}/100` : '—'}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {rep.feedback || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Attendance */}
                {tab === 'attendance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Shift Window Info Banner */}
                    <div className="card" style={{
                      background: isWithinShift
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)'
                        : 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(245,158,11,0.06) 100%)',
                      border: `1px solid ${isWithinShift ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                            <Timer size={18} style={{ color: isWithinShift ? '#10b981' : '#ef4444' }} />
                            <h4 style={{ fontWeight: 800, fontSize: '1rem', color: isWithinShift ? '#10b981' : '#ef4444' }}>
                              {isWithinShift
                                ? (isAr ? '✓ أنت داخل نطاق وقت الحضور' : '✓ You are within the attendance window')
                                : (isAr ? '✗ خارج وقت الحضور المسموح' : '✗ Outside the allowed attendance window')}
                            </h4>
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {shiftInfo.hasSupervisor
                              ? (isAr ? `مشرفك (${shiftInfo.supervisorName}) حدد ساعات الحضور:` : `Your supervisor (${shiftInfo.supervisorName}) set attendance hours:`)
                              : (isAr ? 'ساعات الحضور الافتراضية (لا يوجد مشرف معين):' : 'Default attendance hours (no supervisor assigned):')
                            }
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '0.6rem', padding: '0.4rem 0.8rem' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{isAr ? 'بداية الوردية' : 'Shift Start'}</div>
                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>{shiftInfo.shiftStart || '09:00'}</div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '1.1rem' }}>→</div>
                          <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.6rem', padding: '0.4rem 0.8rem' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{isAr ? 'نهاية الوردية' : 'Shift End'}</div>
                            <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '1.1rem' }}>{shiftInfo.shiftEnd || '17:00'}</div>
                          </div>
                          <div style={{ textAlign: 'center', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.6rem', padding: '0.4rem 0.8rem' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{isAr ? 'الوقت الحالي' : 'Current Time'}</div>
                            <div style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '1.1rem' }}>
                              {currentTime.getHours().toString().padStart(2,'0')}:{currentTime.getMinutes().toString().padStart(2,'0')}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!isWithinShift && (
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                            {isAr
                              ? `أزرار الحضور معطلة خارج الفترة الزمنية المحددة (${shiftInfo.shiftStart} - ${shiftInfo.shiftEnd}).`
                              : `Attendance buttons are disabled outside the allowed window (${shiftInfo.shiftStart} – ${shiftInfo.shiftEnd}).`}
                          </p>
                        </div>
                      )}
                    </div>

                    {activeInternships.length > 0 && (
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.1) 100%)', border: '1px solid var(--primary-light)' }}>
                        <h3 style={{ fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={18} style={{ color: 'var(--primary-light)' }} /> {isAr ? 'تسجيل الحضور التلقائي' : 'Auto Attendance Check-in'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                          {isAr ? 'النظام يحدد الوقت والتاريخ تلقائياً بناءً على إعدادات مشرفك.' : 'System determines exact time based on supervisor settings.'}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('select_internship')}</label>
                            <select className="form-input" value={attendanceForm.internshipId} onChange={e => setAttendanceForm({ ...attendanceForm, internshipId: e.target.value })}>
                              <option value="">{t('select_internship')}</option>
                              {activeInternships.map(i => (
                                <option key={i._id} value={i._id}>{i.title}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => autoSubmitAttendance('checkIn')}
                              className="btn-primary"
                              disabled={loggingAttendance || !attendanceForm.internshipId || !isWithinShift}
                              title={!isWithinShift ? (isAr ? 'خارج وقت الحضور المسموح' : 'Outside allowed attendance window') : ''}
                              style={{
                                flex: 1,
                                background: isWithinShift ? '#10b981' : '#64748b',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem',
                                opacity: !isWithinShift ? 0.6 : 1,
                                cursor: !isWithinShift ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <LogIn size={16} />
                              {loggingAttendance ? '...' : (isAr ? 'تسجيل الدخول' : 'Check In')}
                            </button>
                            <button
                              onClick={() => autoSubmitAttendance('checkOut')}
                              className="btn-secondary"
                              disabled={loggingAttendance || !attendanceForm.internshipId || !isWithinShift}
                              title={!isWithinShift ? (isAr ? 'خارج وقت الحضور المسموح' : 'Outside allowed attendance window') : ''}
                              style={{
                                flex: 1,
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem',
                                border: `1px solid ${isWithinShift ? '#ef4444' : '#475569'}`,
                                color: isWithinShift ? '#ef4444' : '#64748b',
                                opacity: !isWithinShift ? 0.6 : 1,
                                cursor: !isWithinShift ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <LogOut size={16} />
                              {loggingAttendance ? '...' : (isAr ? 'تسجيل الانصراف' : 'Check Out')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attendance Stats */}
                    {attendanceList.length > 0 && (() => {
                      const totalHrs = attendanceList.reduce((s, r) => s + (r.hoursWorked || 0), 0);
                      const presentDays = attendanceList.filter(r => r.status === 'present' || r.status === 'remote').length;
                      const lateDays = attendanceList.filter(r => r.status === 'late').length;
                      const absentDays = attendanceList.filter(r => r.status === 'absent').length;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                          <div className="card" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <Timer size={20} style={{ color: '#10b981', margin: '0 auto 0.4rem' }} />
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{totalHrs.toFixed(1)}h</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isAr ? 'إجمالي الساعات' : 'Total Hours'}</div>
                          </div>
                          <div className="card" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
                            <CheckCircle size={20} style={{ color: 'var(--primary-light)', margin: '0 auto 0.4rem' }} />
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-light)' }}>{presentDays}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isAr ? 'أيام الحضور' : 'Present Days'}</div>
                          </div>
                          <div className="card" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                            <AlertTriangle size={20} style={{ color: '#f59e0b', margin: '0 auto 0.4rem' }} />
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{lateDays}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isAr ? 'أيام التأخر' : 'Late Days'}</div>
                          </div>
                          <div className="card" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <Clock size={20} style={{ color: '#ef4444', margin: '0 auto 0.4rem' }} />
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{absentDays}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isAr ? 'أيام الغياب' : 'Absent Days'}</div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('attendance_history')}</h3>
                      {attendanceList.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>{t('no_attendance')}</p>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('date')}</th>
                              <th>{tCommon('status')}</th>
                              <th>{t('check_in')}</th>
                              <th>{t('check_out')}</th>
                              <th>{isAr ? 'الساعات الفعلية' : 'Hours Worked'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceList.map(item => (
                              <tr key={item._id}>
                                <td style={{ fontWeight: 600 }}>{new Date(item.date).toLocaleDateString()}</td>
                                <td><span className={`badge badge-${item.status === 'present' || item.status === 'remote' ? 'success' : item.status === 'absent' ? 'danger' : 'warning'}`}>{t(item.status) || item.status}</span></td>
                                <td style={{ color: '#10b981', fontWeight: 600 }}>{item.checkIn || '—'}</td>
                                <td style={{ color: '#ef4444', fontWeight: 600 }}>{item.checkOut || '—'}</td>
                                <td>
                                  {item.hoursWorked > 0 ? (
                                    <span style={{ fontWeight: 700, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <Timer size={13} /> {item.hoursWorked.toFixed(1)}h
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Evaluations & Certificate */}
                {tab === 'evaluations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(to right bottom, #111827, #1f2937)' }}>
                      <h3 style={{ fontWeight: 700, alignSelf: 'flex-start', marginBottom: '1rem', color: '#fff' }}>{t('skills_analysis')}</h3>
                      {evaluations.length > 0 ? (
                        <div style={{ width: '100%', height: 350 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                              <PolarGrid stroke="#374151" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#6b7280' }} />
                              <Radar name="Student" dataKey="A" stroke="var(--primary-light)" fill="var(--primary-light)" fillOpacity={0.6} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-muted)' }}>{t('no_evaluations')}</p>
                      )}
                    </div>

                    <div className="card" style={{ overflowX: 'auto', position: 'relative' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('my_evaluations')}</h3>
                      {evaluations.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>{t('no_evaluations')}</p>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{tCommon('company')}</th>
                              <th>{t('score')}</th>
                              <th>{t('recommendation')}</th>
                              <th>{t('date')}</th>
                              <th>{tCommon('actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evaluations.map(ev => (
                              <tr key={ev._id}>
                                <td style={{ fontWeight: 600 }}>{ev.internship?.company?.companyName || '—'}</td>
                                <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{ev.totalScore}/10</td>
                                <td style={{ textTransform: 'capitalize' }}>{ev.recommendation ? tRec(ev.recommendation) : '—'}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{new Date(ev.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <button onClick={() => window.print()} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10b981' }}>
                                    <Download size={14} /> {t('download_certificate')}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Leaderboard */}
                {tab === 'leaderboard' && (
                  <div className="card">
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <Trophy size={48} color="#fbbf24" style={{ marginBottom: '1rem' }} />
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('leaderboard_title')}</h2>
                      <p style={{ color: 'var(--text-muted)' }}>{t('leaderboard_subtitle')}</p>
                    </div>
                    {leaderboard.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('no_leaderboard')}</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {leaderboard.map((student, idx) => (
                          <div key={student._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', backgroundColor: idx < 3 ? 'var(--bg-card-hover)' : 'var(--bg-lighter)', border: idx === 0 ? '1px solid #fbbf24' : idx === 1 ? '1px solid #9ca3af' : idx === 2 ? '1px solid #b45309' : '1px solid var(--border-color)', borderRadius: '0.5rem', transition: 'all 0.3s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#b45309' : 'var(--text-muted)', width: '30px', textAlign: 'center' }}>
                                #{idx + 1}
                              </span>
                              <div>
                                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{student.name} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>({student.evaluationsCount} {t('evals_count')})</span></h4>
                              </div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary-light)' }}>
                              {student.averageScore?.toFixed(2)}/10
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notifications */}
                {tab === 'notifications' && (
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('notifications')}</h3>
                    {notifications.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>{t('no_notifications')}</p>
                    ) : (
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

            {showAiModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                <div className="card fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                  <button onClick={() => setShowAiModal(false)} style={{ position: 'absolute', top: '1rem', right: isAr ? 'auto' : '1rem', left: isAr ? '1rem' : 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✖</button>

                  {/* Header */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <Brain style={{ color: 'var(--primary-light)' }} />
                      {isAr ? 'توصيات الذكاء الاصطناعي' : 'AI Recommendations'}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {isAr ? 'أفضل الفرص المناسبة لملفك الشخصي ومهاراتك وتفضيلاتك' : 'Top internships matched to your profile, skills, and preferences'}
                    </p>
                  </div>

                  {loadingAiRecs ? (
                    <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <LoadingSpinner size={40} />
                      <p style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
                        {isAr ? 'جاري تحليل الفرص لاستنتاج الأنسب...' : 'Analyzing internships for best matches...'}
                      </p>
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Source indicator */}
                      {recommendations[0]?.source && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: '0.6rem', background: recommendations[0].source === 'ai' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${recommendations[0].source === 'ai' ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)'}`, fontSize: '0.78rem', fontWeight: 700, color: recommendations[0].source === 'ai' ? 'var(--primary-light)' : '#10b981' }}>
                          {recommendations[0].source === 'ai' ? '🤖' : '⚡'}
                          {recommendations[0].source === 'ai'
                            ? (isAr ? 'مدعوم بـ Gemini AI' : 'Powered by Gemini AI')
                            : (isAr ? 'توصيات ذكية محلية — تعمل بدون إنترنت' : 'Smart Local Matching — works offline')}
                        </div>
                      )}

                      {recommendations.map((rec, i) => {
                        const score = rec.matchScore;
                        const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : 'var(--primary-light)';
                        return (
                          <div key={i} style={{ padding: '1.1rem 1.25rem', background: 'var(--bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', borderLeft: isAr ? 'none' : `4px solid ${scoreColor}`, borderRight: isAr ? `4px solid ${scoreColor}` : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{rec.internshipDetails?.title}</h4>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                {score && (
                                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: scoreColor, background: `${scoreColor}15`, padding: '0.2rem 0.6rem', borderRadius: '1rem', border: `1px solid ${scoreColor}40` }}>
                                    {score}% {isAr ? 'توافق' : 'match'}
                                  </span>
                                )}
                                <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{rec.internshipDetails?.category || 'IT'}</span>
                                {rec.internshipDetails?.type && (
                                  <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>{rec.internshipDetails.type}</span>
                                )}
                              </div>
                            </div>

                            {/* Match score bar (for local results) */}
                            {score && (
                              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: '0.75rem' }}>
                                <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)`, borderRadius: 2, transition: 'width 0.6s ease' }} />
                              </div>
                            )}

                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                              <strong style={{ color: 'var(--text)' }}>{isAr ? 'سبب الملاءمة: ' : 'Why it matches: '}</strong>{rec.reasoning}
                            </p>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {rec.internshipDetails?.location && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>📍 {rec.internshipDetails.location}</span>
                              )}
                              {rec.internshipDetails?.skills?.slice(0, 4).map(s => (
                                <span key={s} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1rem', color: 'var(--primary-light)' }}>{s}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Brain size={48} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
                      <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{isAr ? 'لم يتم العثور على فرص مفتوحة' : 'No open internships found'}</p>
                      <p style={{ fontSize: '0.82rem' }}>{isAr ? 'أضف بيانات إلى ملفك الشخصي للحصول على توصيات أدق' : 'Complete your profile for more accurate recommendations'}</p>
                    </div>
                  )}

                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowAiModal(false)} className="btn-secondary">{isAr ? 'إغلاق' : 'Close'}</button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

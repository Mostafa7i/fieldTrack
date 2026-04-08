'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { applicationAPI, reportAPI, evaluationAPI, notificationAPI, attendanceAPI, authAPI, aiAPI, taskAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ClipboardList, FileText, Star, Bell, Send, CheckCircle, Clock, Upload, Award, Download, Trophy, Brain, AlertTriangle, PlayCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const appStatusBadge = { pending: 'badge-warning', reviewing: 'badge-info', accepted: 'badge-success', rejected: 'badge-danger', withdrawn: 'badge-gray' };
const reportStatusBadge = { draft: 'badge-gray', submitted: 'badge-info', reviewed: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function StudentDashboard() {
  const t = useTranslations('StudentDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const tRec = useTranslations('Recommendation');
  const locale = useLocale();
  const isAr = locale === 'ar';
  
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('overview');
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
        const [appRes, repRes, evalRes, notifRes, attRes, leaderRes, taskRes] = await Promise.all([
          applicationAPI.getAll(),
          reportAPI.getAll(),
          evaluationAPI.getAll(),
          notificationAPI.getAll(),
          attendanceAPI.getAll(),
          evaluationAPI.getLeaderboard(),
          taskAPI.getStudentTasks()
        ]);
        setApplications(appRes.data.data || []);
        setReports(repRes.data.data || []);
        setEvaluations(evalRes.data.data || []);
        setNotifications(notifRes.data.data || []);
        setAttendanceList(attRes.data.data || []);
        setLeaderboard(leaderRes.data.data || []);
        setTasks(taskRes.data.data || []);
      } catch (err) {
        toast.error(t('failed_to_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
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

  const getAIRecommendations = async () => {
    setShowAiModal(true);
    setLoadingAiRecs(true);
    try {
      const res = await aiAPI.getRecommendations(locale);
      setRecommendations(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to get recommendations. Ensure AI is configured.');
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
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('title')}</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('welcome', { name: user?.name })}</p>
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
                              <td>{app.internship?.company?.companyName || '—'}</td>
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
                    {activeInternships.length > 0 && (
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={18} style={{ color: 'var(--primary-light)' }} /> {t('log_attendance')}
                        </h3>
                        <form onSubmit={submitAttendance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('internship')}</label>
                            <select className="form-input" value={attendanceForm.internshipId} onChange={e => setAttendanceForm({ ...attendanceForm, internshipId: e.target.value })} required>
                              <option value="">{t('select_internship')}</option>
                              {activeInternships.map(i => (
                                <option key={i._id} value={i._id}>{i.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('date')}</label>
                            <input type="date" className="form-input" value={attendanceForm.date} onChange={e => setAttendanceForm({ ...attendanceForm, date: e.target.value })} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('status')}</label>
                            <select className="form-input" value={attendanceForm.status} onChange={e => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
                              <option value="present">{t('present')}</option>
                              <option value="absent">{t('absent')}</option>
                              <option value="late">{t('late')}</option>
                              <option value="half_day">{t('half_day')}</option>
                              <option value="remote">{t('remote')}</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('check_in')}</label>
                            <input type="time" className="form-input" value={attendanceForm.checkIn} onChange={e => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })} required={attendanceForm.status !== 'absent'} disabled={attendanceForm.status === 'absent'} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('check_out')}</label>
                            <input type="time" className="form-input" value={attendanceForm.checkOut} onChange={e => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })} required={attendanceForm.status !== 'absent'} disabled={attendanceForm.status === 'absent'} />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <button type="submit" className="btn-primary" disabled={loggingAttendance}>
                              {loggingAttendance ? tCommon('saving') : t('save_attendance')}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                    
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
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceList.map(item => (
                              <tr key={item._id}>
                                <td style={{ fontWeight: 600 }}>{new Date(item.date).toLocaleDateString()}</td>
                                <td><span className={`badge badge-${item.status === 'present' || item.status === 'remote' ? 'success' : item.status === 'absent' ? 'danger' : 'warning'}`}>{t(item.status) || item.status}</span></td>
                                <td>{item.checkIn || '—'}</td>
                                <td>{item.checkOut || '—'}</td>
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
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                <div className="card fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                  <button onClick={() => setShowAiModal(false)} style={{ position: 'absolute', top: '1rem', right: isAr ? 'auto' : '1rem', left: isAr ? '1rem' : 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✖</button>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain className="gradient-text" /> {isAr ? 'توصيات الذكاء الاصطناعي لك' : 'My AI Recommendations'}
                  </h3>
                  
                  {loadingAiRecs ? (
                    <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <LoadingSpinner size={40} />
                      <p style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{isAr ? 'جاري تحليل الفرص لاستنتاج الأنسب...' : 'Analyzing internships for best matches...'}</p>
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {recommendations.map((rec, i) => (
                        <div key={i} style={{ padding: '1rem', background: 'var(--bg-card2)', borderRadius: '0.5rem', borderLeft: isAr ? 'none' : '4px solid var(--primary)', borderRight: isAr ? '4px solid var(--primary)' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{rec.internshipDetails?.title}</h4>
                            <span className="badge badge-primary">{rec.internshipDetails?.category || 'IT'}</span>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                            <strong>{isAr ? 'سبب الملاءمة: ' : 'Why it matches: '}</strong>{rec.reasoning}
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            {rec.internshipDetails?.skills?.map(s => (
                              <span key={s} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {isAr ? 'لم يتم العثور على فرص ملائمة أو لم يتم تفعل الذكاء الاصطناعي بنجاح.' : 'No relevant internships found or AI feature is not properly configured.'}
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

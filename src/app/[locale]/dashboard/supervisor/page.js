'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { reportAPI, notificationAPI, attendanceAPI, taskAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { FileText, GraduationCap, CheckCircle, Clock, MessageSquare, Send, ClipboardList, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const reportStatusBadge = { draft: 'badge-gray', submitted: 'badge-info', reviewed: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

const priorityColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', urgent: '#a855f7' };
const priorityBadge = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', urgent: 'badge-gray' };
const taskStatusBadge = {
  pending: 'badge-warning',
  in_progress: 'badge-info',
  submitted: 'badge-primary',
  completed: 'badge-success',
  overdue: 'badge-danger'
};

export default function SupervisorDashboard() {
  const t = useTranslations('SupervisorDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ id: null, status: 'approved', grade: 100, feedback: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [messageForm, setMessageForm] = useState({ studentId: null, message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', studentId: '', deadline: '', priority: 'medium' });
  const [creatingTask, setCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setTab(hash);
      else setTab('reports');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [repRes, notifRes, attRes, taskRes] = await Promise.all([
          reportAPI.getAll(),
          notificationAPI.getAll(),
          attendanceAPI.getAll(),
          taskAPI.getSupervisorTasks()
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

  const openReview = (r) => {
    setReviewForm({ id: r._id, status: r.status === 'submitted' ? 'approved' : r.status, grade: r.grade || 100, feedback: r.feedback || '' });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await reportAPI.review(reviewForm.id, {
        status: reviewForm.status,
        grade: parseInt(reviewForm.grade),
        feedback: reviewForm.feedback
      });
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
      toast.success('Task assigned successfully!');
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', studentId: '', deadline: '', priority: 'medium' });
      const res = await taskAPI.getSupervisorTasks();
      setTasks(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally { setCreatingTask(false); }
  };

  const handleCloseTask = async (id) => {
    try {
      await taskAPI.closeTask(id);
      toast.success('Task marked as completed!');
      setTasks(prev => prev.map(t => t._id === id ? { ...t, status: 'completed' } : t));
      setSelectedTask(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskAPI.deleteTask(id);
      toast.success('Task deleted');
      setTasks(prev => prev.filter(t => t._id !== id));
      setSelectedTask(null);
    } catch (err) { toast.error('Failed to delete task'); }
  };

  const students = Array.from(new Map(reports.filter(r => r.student).map(r => [r.student?._id, r.student])).values()).filter(Boolean);
  const pendingReports = reports.filter(r => r.status === 'submitted');

  const getDaysLeft = (deadline) => {
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const tabs = [
    { key: 'reports', label: t('student_reports') },
    { key: 'students', label: t('my_students') },
    { key: 'tasks', label: isAr ? 'المهام' : 'Tasks' },
    { key: 'attendance', label: t('student_attendance') },
    { key: 'notifications', label: t('notifications') },
  ];

  return (
    <ProtectedRoute allowedRoles={['supervisor']}>
      <div>
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('title')}</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('subtitle')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard title={t('assigned_students')} value={students.length} icon={GraduationCap} color="indigo" />
              <StatCard title={t('total_reports')} value={reports.length} subtitle={`${pendingReports.length} ${t('pending_review')}`} icon={FileText} color="sky" />
              <StatCard title={t('approved_reports')} value={reports.filter(r => r.status === 'approved').length} icon={CheckCircle} color="emerald" />
              <StatCard title={isAr ? 'المهام المُسندة' : "Tasks Assigned"} value={tasks.length} subtitle={`${tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length} ${isAr ? 'نشط' : 'active'}`} icon={ClipboardList} color="violet" />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
              {tabs.map(tabItem => (
                <button key={tabItem.key} onClick={() => { setTab(tabItem.key); window.location.hash = tabItem.key; }} style={{ padding: '0.6rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent', color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === tabItem.key ? 700 : 500, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  {tabItem.label}
                </button>
              ))}
            </div>

            {loading ? <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={40} /></div> : (
              <>
                {/* Reports */}
                {tab === 'reports' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('student_reports')}</h3>
                      {reports.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_reports')}</p> : (
                        <table className="data-table">
                          <thead><tr><th>{t('student')}</th><th>{t('internship')}</th><th>{t('week')}</th><th>{t('status')}</th><th>{t('grade')}</th><th>{tCommon('actions')}</th></tr></thead>
                          <tbody>
                            {reports.map(r => (
                              <tr key={r._id}>
                                <td style={{ fontWeight: 600 }}>{r.student?.name}</td>
                                <td>{r.internship?.title}</td>
                                <td>{t('week')} {r.weekNumber}</td>
                                <td><span className={`badge ${reportStatusBadge[r.status]}`}>{tStatus(r.status)}</span></td>
                                <td style={{ fontWeight: 700 }}>{r.grade ? `${r.grade}/100` : '—'}</td>
                                <td>
                                  <button onClick={() => openReview(r)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>{t('review_view')}</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    {reviewForm.id && (
                      <div className="card" style={{ border: '1px solid var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <h3 style={{ fontWeight: 700 }}>{t('review_report')}</h3>
                          <button onClick={() => setReviewForm({ id: null, status: '', grade: 0, feedback: '' })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{tCommon('close')}</button>
                        </div>
                        {reports.find(r => r._id === reviewForm.id) && (
                          <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                            {(()=>{ const rep = reports.find(r => r._id === reviewForm.id); return (
                              <>
                                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{rep.title}</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{rep.content}</p>
                              </>
                            );})()}
                          </div>
                        )}
                        <form onSubmit={submitReview} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('status')}</label>
                            <select className="form-input" value={reviewForm.status} onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}>
                              {['approved', 'rejected', 'reviewed'].map(s => <option key={s} value={s}>{tStatus(s)}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('grade_label')}</label>
                            <input type="number" min="0" max="100" className="form-input" value={reviewForm.grade} onChange={e => setReviewForm({ ...reviewForm, grade: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('feedback_label')}</label>
                            <textarea className="form-input" rows={3} value={reviewForm.feedback} onChange={e => setReviewForm({ ...reviewForm, feedback: e.target.value })} placeholder={t('feedback_placeholder')} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <button type="submit" className="btn-primary" disabled={submittingReview}>{submittingReview ? t('saving') : t('save_review')}</button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* Students */}
                {tab === 'students' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('my_students')}</h3>
                      {students.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_students')}</p> : (
                        <table className="data-table">
                          <thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('reports_submitted')}</th><th>{isAr ? 'المهام الموكلة' : 'Tasks Assigned'}</th><th>{tCommon('actions')}</th></tr></thead>
                          <tbody>
                            {students.map(s => (
                              <tr key={s._id}>
                                <td style={{ fontWeight: 600 }}>{s.name}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                                <td>{reports.filter(r => r.student?._id === s._id).length}</td>
                                <td>{tasks.filter(tk => tk.student?._id === s._id).length}</td>
                                <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <button onClick={() => setMessageForm({ studentId: s._id, message: '' })} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <MessageSquare size={14} /> {t('send_message')}
                                  </button>
                                  <button onClick={() => { setTaskForm(f => ({ ...f, studentId: s._id })); setShowTaskForm(true); setTab('tasks'); window.location.hash = 'tasks'; }} className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <ClipboardList size={14} /> {isAr ? 'إسناد مهمة' : 'Assign Task'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    {messageForm.studentId && (
                      <div className="card" style={{ border: '1px solid var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <h3 style={{ fontWeight: 700 }}>{t('send_message')} → {students.find(s => s._id === messageForm.studentId)?.name}</h3>
                          <button onClick={() => setMessageForm({ studentId: null, message: '' })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{tCommon('close')}</button>
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

                {/* ──────── TASKS TAB ──────── */}
                {tab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Header Card */}
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.12) 100%)', border: '1px solid var(--primary-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ClipboardList style={{ color: 'var(--primary-light)' }} /> {isAr ? 'إدارة المهام' : 'Task Management'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{isAr ? 'قم بتعيين وتتبع مهام طلابك مع المواعيد النهائية والأولويات.' : 'Assign and track tasks for your students with deadlines and priorities.'}</p>
                      </div>
                      <button onClick={() => { setTaskForm({ title: '', description: '', studentId: '', deadline: '', priority: 'medium' }); setShowTaskForm(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} /> {isAr ? 'إسناد مهمة جديدة' : 'Assign New Task'}
                      </button>
                    </div>

                    {/* Create Task Form */}
                    {showTaskForm && (
                      <div className="card fade-in" style={{ border: '1px solid var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={18} style={{ color: 'var(--primary-light)' }} /> {isAr ? 'مهمة جديدة' : 'New Task'}
                          </h3>
                          <button onClick={() => setShowTaskForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'عنوان المهمة *' : 'Task Title *'}</label>
                            <input className="form-input" placeholder={isAr ? 'مثل: وضع خطة للمشروع' : 'e.g. Build Login Page'} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'الوصف *' : 'Description *'}</label>
                            <textarea className="form-input" rows={3} placeholder={isAr ? 'صف ما يجب على الطالب القيام به...' : 'Describe what the student should do...'} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} required />
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
                              {[
                                { val: 'low', label: isAr ? 'منخفضة' : 'Low' },
                                { val: 'medium', label: isAr ? 'متوسطة' : 'Medium' },
                                { val: 'high', label: isAr ? 'عالية' : 'High' },
                                { val: 'urgent', label: isAr ? 'عاجلة' : 'Urgent' }
                              ].map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
                            </select>
                          </div>
                          <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.75rem' }}>
                            <button type="submit" className="btn-primary" disabled={creatingTask} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {creatingTask ? <LoadingSpinner size={18} /> : <Send size={18} />} {creatingTask ? (isAr ? 'جاري الإسناد...' : 'Assigning...') : (isAr ? 'إسناد المهمة' : 'Assign Task')}
                            </button>
                            <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary">{isAr ? 'إلغاء' : 'Cancel'}</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Tasks List */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                      {tasks.length === 0 ? (
                        <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          <ClipboardList size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                          <p>{isAr ? 'لم يتم تعيين أي مهام بعد. انقر على "إسناد مهمة جديدة" للبدء.' : 'No tasks assigned yet. Click "Assign New Task" to get started.'}</p>
                        </div>
                      ) : tasks.map(task => {
                        const daysLeft = getDaysLeft(task.deadline);
                        const isOverdue = daysLeft < 0;
                        return (
                          <div key={task._id} onClick={() => setSelectedTask(selectedTask?._id === task._id ? null : task)} className="card" style={{ cursor: 'pointer', border: `1px solid ${isOverdue ? 'var(--danger)' : 'var(--border)'}`, transition: 'all 0.2s', position: 'relative', borderLeft: isAr ? 'none' : `4px solid ${priorityColor[task.priority]}`, borderRight: isAr ? `4px solid ${priorityColor[task.priority]}` : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{task.title}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>→ {task.student?.name}</p>
                              </div>
                              <span className={`badge ${taskStatusBadge[task.status]}`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{task.status.replace('_', ' ')}</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <span className={`badge ${priorityBadge[task.priority]}`} style={{ fontSize: '0.65rem' }}>
                                  {isAr ? ({low:'منخفضة',medium:'متوسطة',high:'عالية',urgent:'عاجلة'}[task.priority] || task.priority) : task.priority}
                                </span>
                                {isOverdue && task.status !== 'completed' && <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: isOverdue ? 'var(--danger)' : daysLeft <= 2 ? '#f59e0b' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                                {isOverdue ? `${Math.abs(daysLeft)}d ${isAr ? 'متأخر' : 'overdue'}` : daysLeft === 0 ? (isAr ? '⏰ اليوم!' : 'Due today!') : `${daysLeft}d ${isAr ? 'متبقي' : 'left'}`}
                              </span>
                            </div>

                            {/* Expanded View */}
                            {selectedTask?._id === task._id && (
                              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><strong>{isAr ? 'الوصف:' : 'Description:'}</strong> {task.description}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><strong>{isAr ? 'الموعد النهائي:' : 'Deadline:'}</strong> {new Date(task.deadline).toLocaleString()}</p>
                                {task.studentNote && <p style={{ fontSize: '0.85rem', background: 'var(--bg)', padding: '0.5rem', borderRadius: '0.4rem', marginBottom: '0.75rem' }}><strong>{isAr ? 'ملاحظة الطالب:' : 'Student note:'}</strong> {task.studentNote}</p>}
                                {task.submittedAt && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginBottom: '0.5rem' }}>✓ {isAr ? 'تاريخ التسليم:' : 'Submitted:'} {new Date(task.submittedAt).toLocaleString()}</p>}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                  {task.status !== 'completed' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleCloseTask(task._id); }} className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <CheckCircle size={14} /> {isAr ? 'تعيين كمكتمل' : 'Mark Completed'}
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
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

                {/* Attendance */}
                {tab === 'attendance' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={18} style={{ color: 'var(--primary-light)' }} /> {t('student_attendance')}
                    </h3>
                    {attendance.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_attendance')}</p> : (
                      <table className="data-table">
                        <thead><tr><th>{t('student')}</th><th>{t('internship')}</th><th>{t('date')}</th><th>{tCommon('status')}</th><th>{t('hours')}</th></tr></thead>
                        <tbody>
                          {attendance.map(a => (
                            <tr key={a._id}>
                              <td style={{ fontWeight: 600 }}>{a.student?.name}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{a.internship?.title}</td>
                              <td>{new Date(a.date).toLocaleDateString()}</td>
                              <td><span className={`badge badge-${a.status === 'present' || a.status === 'remote' ? 'success' : a.status === 'absent' ? 'danger' : 'warning'}`}>{tCommon(a.status) || a.status}</span></td>
                              <td style={{ fontWeight: 700 }}>{a.hoursWorked ? `${a.hoursWorked}h` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Notifications */}
                {tab === 'notifications' && (
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('notifications')}</h3>
                    {notifications.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_notifications')}</p> :
                      notifications.map(n => (
                        <div key={n._id} style={{ display: 'flex', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(51,65,85,0.4)', opacity: n.isRead ? 0.55 : 1 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: n.isRead ? 'var(--border)' : 'var(--primary)', flexShrink: 0, marginTop: '0.35rem' }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{n.title}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.message}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

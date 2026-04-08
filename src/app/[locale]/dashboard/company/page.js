'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { internshipAPI, applicationAPI, evaluationAPI, notificationAPI, aiAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Briefcase, Users, Star, Bell, Plus, X, Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';

const appStatusBadge = { pending: 'badge-warning', reviewing: 'badge-info', accepted: 'badge-success', rejected: 'badge-danger', withdrawn: 'badge-gray' };

const defaultForm = {
  title: '', description: '', requirements: '', location: 'Cairo, Egypt', type: 'full-time',
  duration: '3 months', slots: 1, deadline: '', salary: 0, isPaid: false, category: 'IT', skills: '',
};

export default function CompanyDashboard() {
  const t = useTranslations('CompanyDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const tRec = useTranslations('Recommendation');
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [internships, setInternships] = useState([]);

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
  const [applications, setApplications] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(defaultForm);
  const [posting, setPosting] = useState(false);
  const [evalForm, setEvalForm] = useState({ applicationId: '', studentId: '', internshipId: '', scores: { punctuality: 8, teamwork: 8, technicalSkills: 8, communication: 8, initiative: 8, overallPerformance: 8 }, comments: '', recommendation: 'recommended' });
  const [submittingEval, setSubmittingEval] = useState(false);
  const [aiEval, setAiEval] = useState(null);
  const [evaluatingAI, setEvaluatingAI] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [intRes, appRes, evalRes, notifRes] = await Promise.all([
          internshipAPI.getMy(),
          applicationAPI.getAll(),
          evaluationAPI.getAll(),
          notificationAPI.getAll(),
        ]);
        setInternships(intRes.data.data || []);
        setApplications(appRes.data.data || []);
        setEvaluations(evalRes.data.data || []);
        setNotifications(notifRes.data.data || []);
      } catch { toast.error(t('failed_to_load')); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const postInternship = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const payload = { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean), slots: parseInt(form.slots), salary: parseFloat(form.salary) };
      await internshipAPI.create(payload);
      toast.success(t('internship_posted'));
      setForm(defaultForm);
      const res = await internshipAPI.getMy();
      setInternships(res.data.data || []);
      setTab('internships');
    } catch (err) { toast.error(err.response?.data?.message || t('failed')); }
    finally { setPosting(false); }
  };

  const updateStatus = async (appId, status) => {
    try {
      await applicationAPI.updateStatus(appId, { status });
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
      toast.success(t('application_status', { status }));
    } catch { toast.error(t('update_failed')); }
  };

  const triggerAIEvaluation = async (appId) => {
    setEvaluatingAI(appId);
    try {
      const res = await aiAPI.evaluate(appId);
      setAiEval({ appId, ...res.data });
      toast.success('AI Evaluation Complete');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI Evaluation failed');
    } finally {
      setEvaluatingAI('');
    }
  };

  const submitEvaluation = async (e) => {
    e.preventDefault();
    setSubmittingEval(true);
    try {
      await evaluationAPI.create(evalForm);
      toast.success(t('evaluation_submitted'));
      const res = await evaluationAPI.getAll();
      setEvaluations(res.data.data || []);
    } catch (err) { toast.error(err.response?.data?.message || t('failed')); }
    finally { setSubmittingEval(false); }
  };

  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const pendingApps = applications.filter(a => a.status === 'pending');

  return (
    <ProtectedRoute allowedRoles={['company']}>
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
              <StatCard title={t('my_internships')} value={internships.length} subtitle={`${internships.filter(i => i.status === 'open').length} ${t('open')}`} icon={Briefcase} color="indigo" />
              <StatCard title={t('total_applications')} value={applications.length} subtitle={`${pendingApps.length} ${t('pending')}`} icon={Users} color="sky" />
              <StatCard title={t('accepted')} value={acceptedApps.length} icon={Plus} color="emerald" />
              <StatCard title={t('evaluations_given')} value={evaluations.length} icon={Star} color="amber" />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'overview', label: t('overview') },
                { key: 'post', label: t('post_internship') },
                { key: 'internships', label: t('my_internships') },
                { key: 'applicants', label: t('applicants_tab') },
                { key: 'evaluations', label: t('evaluations_given') },
                { key: 'notifications', label: t('notifications') },
              ].map(tabItem => (
                <button key={tabItem.key} onClick={() => { setTab(tabItem.key); window.location.hash = tabItem.key; }} style={{ padding: '0.6rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent', color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === tabItem.key ? 700 : 500, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  {tabItem.label}
                </button>
              ))}
            </div>

            {loading ? <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={40} /></div> : (
              <>
                {/* Overview */}
                {tab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('recent_applications')}</h3>
                      {applications.slice(0, 5).map(app => (
                        <div key={app._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{app.student?.name || '—'}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.internship?.title}</p>
                          </div>
                          <span className={`badge ${appStatusBadge[app.status]}`}>{tStatus(app.status)}</span>
                        </div>
                      ))}
                      {applications.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('no_applications')}</p>}
                    </div>
                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('my_internships')}</h3>
                      {internships.slice(0, 5).map(i => (
                        <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{i.title}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i.applicationsCount || 0} {t('applicants')}</p>
                          </div>
                          <span className={`badge ${i.status === 'open' ? 'badge-success' : 'badge-gray'}`}>{tStatus(i.status)}</span>
                        </div>
                      ))}
                      {internships.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('no_internships_posted')} <button onClick={() => setTab('post')} style={{ color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{t('post_one_now')}</button></p>}
                    </div>
                  </div>
                )}

                {/* Post internship */}
                {tab === 'post' && (
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={18} style={{ color: 'var(--primary-light)' }} /> {t('post_new_internship')}</h3>
                    <form onSubmit={postInternship} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      {[
                        { label: t('internship_title'), key: 'title', placeholder: 'Software Engineering Intern', full: true },
                        { label: t('location'), key: 'location', placeholder: 'Cairo, Egypt' },
                        { label: t('duration'), key: 'duration', placeholder: '3 months' },
                        { label: t('slots'), key: 'slots', placeholder: '2', type: 'number' },
                        { label: t('deadline'), key: 'deadline', placeholder: '', type: 'date' },
                        { label: t('salary'), key: 'salary', placeholder: '3000', type: 'number' },
                        { label: t('skills'), key: 'skills', placeholder: 'React, Node.js', full: true },
                      ].map(f => (
                        <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : undefined }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{f.label}</label>
                          <input type={f.type || 'text'} className="form-input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={!['salary', 'skills'].includes(f.key)} />
                        </div>
                      ))}
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('type')}</label>
                        <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                          {['full-time', 'part-time', 'remote', 'hybrid'].map(tp => <option key={tp}>{tp}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('category')}</label>
                        <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                          {['IT', 'Engineering', 'Marketing', 'Finance', 'Design', 'Science', 'Other'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={e => setForm({ ...form, isPaid: e.target.checked })} />
                        <label htmlFor="isPaid" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('paid_internship')}</label>
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('description')}</label>
                        <textarea className="form-input" rows={4} placeholder={t('description_placeholder')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('requirements')}</label>
                        <textarea className="form-input" rows={3} placeholder={t('requirements_placeholder')} value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <button type="submit" className="btn-primary" disabled={posting}>{posting ? t('posting') : t('post_internship')}</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Internships list */}
                {tab === 'internships' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('my_internships')}</h3>
                    {internships.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_internships')}</p> : (
                      <table className="data-table">
                        <thead><tr><th>{tCommon('title')}</th><th>{tCommon('type')}</th><th>{t('slots')}</th><th>{t('applicants_tab')}</th><th>{t('deadline')}</th><th>{tCommon('status')}</th></tr></thead>
                        <tbody>
                          {internships.map(i => (
                            <tr key={i._id}>
                              <td style={{ fontWeight: 600 }}>{i.title}</td>
                              <td>{i.type}</td>
                              <td>{i.slots}</td>
                              <td>{i.applicationsCount || 0}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{new Date(i.deadline).toLocaleDateString()}</td>
                              <td><span className={`badge ${i.status === 'open' ? 'badge-success' : 'badge-gray'}`}>{tStatus(i.status)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Applicants */}
                {tab === 'applicants' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('applicants_tab')}</h3>
                    {applications.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>{t('no_applications')}</p> : (
                      <table className="data-table">
                        <thead><tr><th>{t('student')}</th><th>{t('email')}</th><th>{t('internship')}</th><th>{t('applied')}</th><th>{tCommon('status')}</th><th>{tCommon('actions')}</th></tr></thead>
                        <tbody>
                          {applications.map(app => (
                            <tr key={app._id}>
                              <td style={{ fontWeight: 600 }}>{app.student?.name}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{app.student?.email}</td>
                              <td>{app.internship?.title}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                              <td><span className={`badge ${appStatusBadge[app.status]}`}>{tStatus(app.status)}</span></td>
                              <td>
                                {app.status === 'pending' && (
                                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <button onClick={() => updateStatus(app._id, 'accepted')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '0.3rem', cursor: 'pointer', fontWeight: 600 }}>{t('accept')}</button>
                                    <button onClick={() => updateStatus(app._id, 'rejected')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '0.3rem', cursor: 'pointer', fontWeight: 600 }}>{t('reject')}</button>
                                    <button onClick={() => triggerAIEvaluation(app._id)} disabled={evaluatingAI === app._id} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', color: 'white', border: 'none', borderRadius: '0.3rem', cursor: evaluatingAI === app._id ? 'wait' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                      {evaluatingAI === app._id ? <LoadingSpinner size={12} color="#fff" /> : <Brain size={12} />} AI Eval
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Evaluations */}
                {tab === 'evaluations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>{t('evaluate_student')}</h3>
                      <form onSubmit={submitEvaluation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('select_student')}</label>
                          <select className="form-input" value={evalForm.applicationId} onChange={e => {
                            const app = acceptedApps.find(a => a._id === e.target.value);
                            setEvalForm({ ...evalForm, applicationId: e.target.value, studentId: app ? app.student._id : '', internshipId: app ? app.internship._id : '' });
                          }} required>
                            <option value="">{t('choose_accepted_student')}</option>
                            {acceptedApps.map(app => (
                              <option key={app._id} value={app._id}>{app.student?.name} - {app.internship?.title}</option>
                            ))}
                          </select>
                        </div>
                        {Object.keys(evalForm.scores).map(key => (
                          <div key={key}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', textTransform: 'capitalize' }}>
                              <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                              <span style={{ color: 'var(--primary-light)' }}>{evalForm.scores[key]}/10</span>
                            </label>
                            <input type="range" min="0" max="10" step="1" style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary-light)' }} value={evalForm.scores[key]} onChange={e => setEvalForm({ ...evalForm, scores: { ...evalForm.scores, [key]: parseInt(e.target.value) } })} />
                          </div>
                        ))}
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('comments')}</label>
                          <textarea className="form-input" rows={3} value={evalForm.comments} onChange={e => setEvalForm({ ...evalForm, comments: e.target.value })} placeholder={t('comments_placeholder')} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('recommendation_label')}</label>
                          <select className="form-input" value={evalForm.recommendation} onChange={e => setEvalForm({ ...evalForm, recommendation: e.target.value })}>
                            {['highly_recommended', 'recommended', 'neutral', 'not_recommended'].map(r => <option key={r} value={r}>{tRec(r)}</option>)}
                          </select>
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                          <button type="submit" className="btn-primary" disabled={submittingEval}>{submittingEval ? t('submitting_eval') : t('submit_evaluation')}</button>
                        </div>
                      </form>
                    </div>
                    {evaluations.length > 0 && (
                      <div className="card" style={{ overflowX: 'auto' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('past_evaluations')}</h3>
                        <table className="data-table">
                          <thead><tr><th>{t('student')}</th><th>{t('internship')}</th><th>{t('score')}</th><th>{t('recommendation_label')}</th></tr></thead>
                          <tbody>
                            {evaluations.map(ev => (
                              <tr key={ev._id}>
                                <td style={{ fontWeight: 600 }}>{ev.student?.name}</td>
                                <td>{ev.internship?.title}</td>
                                <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{ev.totalScore}/10</td>
                                <td style={{ textTransform: 'capitalize' }}>{ev.recommendation ? tRec(ev.recommendation) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
            
            {aiEval && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                  <button onClick={() => setAiEval(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain className="gradient-text" /> AI Candidate Evaluation
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-card2)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: aiEval.matchScore > 75 ? 'var(--success)' : aiEval.matchScore > 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {aiEval.matchScore}%
                    </div>
                    <div>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>Match Score</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Based on skills, major, and requirements</p>
                    </div>
                  </div>

                  <h4 style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>Strengths</h4>
                  <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.2rem', color: 'var(--text)' }}>
                    {aiEval.strengths?.map((s, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{s}</li>) || <li>None identified</li>}
                  </ul>

                  <h4 style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem' }}>Weaknesses / Missing Skills</h4>
                  <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.2rem', color: 'var(--text)' }}>
                    {aiEval.weaknesses?.map((w, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{w}</li>) || <li>None identified</li>}
                  </ul>

                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary-light)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <h4 style={{ fontWeight: 700, color: 'var(--primary-light)', marginBottom: '0.25rem' }}>AI Recommendation</h4>
                    <p style={{ fontSize: '0.9rem' }}>{aiEval.recommendation}</p>
                  </div>
                  
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button onClick={() => setAiEval(null)} className="btn-secondary">Close</button>
                    <button onClick={() => { updateStatus(aiEval.appId, 'accepted'); setAiEval(null); }} className="btn-primary" style={{ background: 'var(--success)' }}>Accept Candidate</button>
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

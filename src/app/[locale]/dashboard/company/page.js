'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { internshipAPI, applicationAPI, evaluationAPI, notificationAPI, aiAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  Briefcase, Users, Star, Bell, Plus, X, Brain, CheckCircle, XCircle,
  Eye, Edit3, Trash2, TrendingUp, BarChart2, Clock, MapPin, DollarSign,
  Calendar, Tag, Search, Filter, ChevronDown, ChevronUp, Award,
  Download, FileText, UserCheck, AlertCircle, Zap, Target, Activity,
  ToggleLeft, ToggleRight, GraduationCap, BookOpen, Send
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

/* ── Helpers ───────────────────────────────────────────── */
const appStatusBadge = {
  pending: 'badge-warning', reviewing: 'badge-info',
  accepted: 'badge-success', rejected: 'badge-danger', withdrawn: 'badge-gray'
};
const defaultForm = {
  title: '', description: '', requirements: '', location: 'Cairo, Egypt',
  type: 'full-time', duration: '3 months', slots: 1, deadline: '',
  salary: 0, isPaid: false, category: 'IT', skills: '',
};
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899'];

/* ── Funnel bar ─────────────────────────────────────────── */
const FunnelBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  );
};

/* ── Score badge ────────────────────────────────────────── */
const ScoreBadge = ({ score, max = 10 }) => {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{ fontWeight: 800, fontSize: '1rem', color }}>
      {score}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>/{max}</span>
    </span>
  );
};

export default function CompanyDashboard() {
  const t = useTranslations('CompanyDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const tRec = useTranslations('Recommendation');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('overview');

  /* ── Data state ─────────────────────────────────────── */
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Forms ──────────────────────────────────────────── */
  const [form, setForm] = useState(defaultForm);
  const [editingInternship, setEditingInternship] = useState(null);
  const [posting, setPosting] = useState(false);
  const [evalForm, setEvalForm] = useState({
    applicationId: '', studentId: '', internshipId: '',
    scores: { punctuality: 8, teamwork: 8, technicalSkills: 8, communication: 8, initiative: 8, overallPerformance: 8 },
    comments: '', recommendation: 'recommended'
  });
  const [submittingEval, setSubmittingEval] = useState(false);

  /* ── UI state ───────────────────────────────────────── */
  const [aiEval, setAiEval] = useState(null);
  const [evaluatingAI, setEvaluatingAI] = useState('');
  const [searchApps, setSearchApps] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterInternship, setFilterInternship] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [expandedInternship, setExpandedInternship] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [deletingInternship, setDeletingInternship] = useState(null);

  /* ── Hash routing ───────────────────────────────────── */
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setTab(hash); else setTab('overview');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  /* ── Fetch all ──────────────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [intRes, appRes, evalRes, notifRes] = await Promise.all([
          internshipAPI.getMy(), applicationAPI.getAll(),
          evaluationAPI.getAll(), notificationAPI.getAll(),
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

  /* ── Derived data ───────────────────────────────────── */
  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const pendingApps = applications.filter(a => a.status === 'pending');
  const rejectedApps = applications.filter(a => a.status === 'rejected');
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const filteredApps = applications.filter(app => {
    const matchSearch = !searchApps || app.student?.name?.toLowerCase().includes(searchApps.toLowerCase()) || app.student?.email?.toLowerCase().includes(searchApps.toLowerCase());
    const matchStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchInt = filterInternship === 'all' || app.internship?._id === filterInternship;
    return matchSearch && matchStatus && matchInt;
  });

  /* ── Actions ────────────────────────────────────────── */
  const postInternship = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const payload = { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean), slots: parseInt(form.slots), salary: parseFloat(form.salary) };
      if (editingInternship) {
        await internshipAPI.update(editingInternship._id, payload);
        toast.success(isAr ? 'تم تحديث الفرصة بنجاح' : 'Internship updated successfully');
        setEditingInternship(null);
      } else {
        await internshipAPI.create(payload);
        toast.success(t('internship_posted'));
      }
      setForm(defaultForm);
      setShowPostForm(false);
      const res = await internshipAPI.getMy();
      setInternships(res.data.data || []);
    } catch (err) { toast.error(err.response?.data?.message || t('failed')); }
    finally { setPosting(false); }
  };

  const toggleInternshipStatus = async (id, currentStatus) => {
    try {
      await internshipAPI.toggle(id);
      setInternships(prev => prev.map(i => i._id === id ? { ...i, status: currentStatus === 'open' ? 'closed' : 'open' } : i));
      toast.success(isAr ? 'تم تحديث حالة الفرصة' : 'Status updated');
    } catch { toast.error(isAr ? 'فشل التحديث' : 'Update failed'); }
  };

  const updateStatus = async (appId, status) => {
    try {
      await applicationAPI.updateStatus(appId, { status });
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
      toast.success(t('application_status', { status }));
      if (selectedApp?._id === appId) setSelectedApp(prev => ({ ...prev, status }));
    } catch { toast.error(t('update_failed')); }
  };

  const triggerAIEvaluation = async (appId) => {
    setEvaluatingAI(appId);
    try {
      const res = await aiAPI.evaluate(appId, locale);
      setAiEval({ appId, ...res.data });
      if (res.data.source === 'local') {
        toast.success(isAr ? 'اكتمل التقييم المحلي الذكي (بديل AI)' : 'Smart Local Evaluation Complete');
      } else {
        toast.success(isAr ? 'اكتمل تقييم الذكاء الاصطناعي' : 'AI Evaluation Complete');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'AI Evaluation failed'); }
    finally { setEvaluatingAI(''); }
  };

  const submitEvaluation = async (e) => {
    e.preventDefault();
    setSubmittingEval(true);
    try {
      await evaluationAPI.create(evalForm);
      toast.success(t('evaluation_submitted'));
      const res = await evaluationAPI.getAll();
      setEvaluations(res.data.data || []);
      setEvalForm({ applicationId: '', studentId: '', internshipId: '', scores: { punctuality: 8, teamwork: 8, technicalSkills: 8, communication: 8, initiative: 8, overallPerformance: 8 }, comments: '', recommendation: 'recommended' });
    } catch (err) { toast.error(err.response?.data?.message || t('failed')); }
    finally { setSubmittingEval(false); }
  };

  const startEditInternship = (internship) => {
    setEditingInternship(internship);
    setForm({ ...defaultForm, ...internship, skills: (internship.skills || []).join(', ') });
    setShowPostForm(true);
    setTab('post'); window.location.hash = 'post';
  };

  /* ── Chart data ─────────────────────────────────────── */
  const applicationsByStatus = [
    { name: isAr ? 'قيد الانتظار' : 'Pending', value: pendingApps.length, fill: '#f59e0b' },
    { name: isAr ? 'مقبول' : 'Accepted', value: acceptedApps.length, fill: '#10b981' },
    { name: isAr ? 'مرفوض' : 'Rejected', value: rejectedApps.length, fill: '#ef4444' },
    { name: isAr ? 'تحت المراجعة' : 'Reviewing', value: applications.filter(a => a.status === 'reviewing').length, fill: '#6366f1' },
  ].filter(d => d.value > 0);

  const internshipPerformance = internships.map(i => ({
    name: i.title?.slice(0, 16) + (i.title?.length > 16 ? '…' : ''),
    apps: applications.filter(a => a.internship?._id === i._id).length,
    accepted: applications.filter(a => a.internship?._id === i._id && a.status === 'accepted').length,
  }));

  const scoreKeys = ['punctuality', 'teamwork', 'technicalSkills', 'communication', 'initiative', 'overallPerformance'];
  const avgEvalScores = scoreKeys.map(key => ({
    name: isAr ? ({ punctuality: 'الانضباط', teamwork: 'العمل الجماعي', technicalSkills: 'المهارات', communication: 'التواصل', initiative: 'المبادرة', overallPerformance: 'الأداء العام' }[key] || key) : key.replace(/([A-Z])/g, ' $1'),
    avg: evaluations.length ? +(evaluations.reduce((s, ev) => s + (ev.scores?.[key] || 0), 0) / evaluations.length).toFixed(1) : 0,
  }));

  /* ── Tabs config ────────────────────────────────────── */
  const tabs = [
    { key: 'overview', icon: '📊', label: isAr ? 'الرئيسية' : 'Overview' },
    { key: 'post', icon: '➕', label: isAr ? 'نشر فرصة' : 'Post Job' },
    { key: 'internships', icon: '💼', label: isAr ? 'الفرص' : 'Internships', badge: internships.filter(i => i.status === 'open').length },
    { key: 'applicants', icon: '👥', label: isAr ? 'المتقدمون' : 'Applicants', badge: pendingApps.length > 0 ? pendingApps.length : null },
    { key: 'evaluations', icon: '⭐', label: isAr ? 'التقييمات' : 'Evaluations' },
    { key: 'notifications', icon: '🔔', label: isAr ? 'الإشعارات' : 'Notifications', badge: unreadNotifs > 0 ? unreadNotifs : null },
  ];

  const scoreLabels = {
    punctuality: isAr ? 'الانضباط' : 'Punctuality',
    teamwork: isAr ? 'العمل الجماعي' : 'Teamwork',
    technicalSkills: isAr ? 'المهارات التقنية' : 'Technical Skills',
    communication: isAr ? 'التواصل' : 'Communication',
    initiative: isAr ? 'المبادرة' : 'Initiative',
    overallPerformance: isAr ? 'الأداء العام' : 'Overall Performance',
  };

  return (
    <ProtectedRoute allowedRoles={['company']}>
      <div>
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">

            {/* ── Header ─────────────────────────────────── */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                  {t('title')} 👋
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.925rem' }}>
                  {t('welcome', { name: user?.name })} · {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => { setEditingInternship(null); setForm(defaultForm); setShowPostForm(true); setTab('post'); window.location.hash = 'post'; }}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} /> {isAr ? 'نشر فرصة تدريبية' : 'Post Internship'}
              </button>
            </div>

            {/* ── KPI Cards ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard title={isAr ? 'الفرص المنشورة' : 'Posted Jobs'} value={internships.length} subtitle={`${internships.filter(i => i.status === 'open').length} ${isAr ? 'مفتوح' : 'open'}`} icon={Briefcase} color="indigo" />
              <StatCard title={isAr ? 'إجمالي الطلبات' : 'Total Applications'} value={applications.length} subtitle={`${pendingApps.length} ${isAr ? 'جديد' : 'new'}`} icon={Users} color="sky" />
              <StatCard title={isAr ? 'طلبات مقبولة' : 'Accepted'} value={acceptedApps.length} subtitle={applications.length > 0 ? `${Math.round((acceptedApps.length / applications.length) * 100)}% ${isAr ? 'معدل' : 'rate'}` : undefined} icon={UserCheck} color="emerald" />
              <StatCard title={isAr ? 'التقييمات' : 'Evaluations'} value={evaluations.length} subtitle={evaluations.length > 0 ? `⌀ ${(evaluations.reduce((s, e) => s + e.totalScore, 0) / evaluations.length).toFixed(1)}/10` : undefined} icon={Star} color="amber" />
              <StatCard title={isAr ? 'المتدربون النشطون' : 'Active Interns'} value={acceptedApps.length} icon={GraduationCap} color="violet" />
            </div>

            {/* ── Tabs ───────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0.2rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
              {tabs.map(tabItem => (
                <button key={tabItem.key}
                  onClick={() => { setTab(tabItem.key); window.location.hash = tabItem.key; }}
                  style={{ padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent', color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === tabItem.key ? 700 : 500, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {tabItem.icon} {tabItem.label}
                  {tabItem.badge ? (
                    <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '1rem', padding: '0 6px', height: 18, fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', fontWeight: 800 }}>
                      {tabItem.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={40} /></div>
            ) : (
              <>

                {/* ══════════════ OVERVIEW TAB ══════════════ */}
                {tab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Alert for pending */}
                    {pendingApps.length > 0 && (
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(239,68,68,0.06))', border: '1px solid rgba(245,158,11,0.3)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            <strong>{pendingApps.length}</strong> {isAr ? 'طلب جديد ينتظر مراجعتك' : 'new application(s) awaiting your review'}
                          </p>
                        </div>
                        <button onClick={() => { setTab('applicants'); window.location.hash = 'applicants'; }} style={{ padding: '0.4rem 0.9rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                          {isAr ? 'مراجعة الآن' : 'Review Now'} →
                        </button>
                      </div>
                    )}

                    {/* Charts row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                      {/* Applications funnel */}
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TrendingUp size={18} style={{ color: 'var(--primary-light)' }} />
                          {isAr ? 'مسار الطلبات' : 'Application Funnel'}
                        </h3>
                        <FunnelBar label={isAr ? 'إجمالي الطلبات' : 'Total Applications'} value={applications.length} total={applications.length} color="#6366f1" />
                        <FunnelBar label={isAr ? 'قيد المراجعة' : 'Under Review'} value={applications.filter(a => a.status === 'reviewing').length + pendingApps.length} total={applications.length} color="#0ea5e9" />
                        <FunnelBar label={isAr ? 'مقبول' : 'Accepted'} value={acceptedApps.length} total={applications.length} color="#10b981" />
                        <FunnelBar label={isAr ? 'مرفوض' : 'Rejected'} value={rejectedApps.length} total={applications.length} color="#ef4444" />
                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>{isAr ? 'معدل القبول:' : 'Acceptance rate:'} <strong style={{ color: '#10b981' }}>{applications.length > 0 ? Math.round((acceptedApps.length / applications.length) * 100) : 0}%</strong></span>
                          <span>{isAr ? 'معدل الرفض:' : 'Rejection rate:'} <strong style={{ color: '#ef4444' }}>{applications.length > 0 ? Math.round((rejectedApps.length / applications.length) * 100) : 0}%</strong></span>
                        </div>
                      </div>

                      {/* Pie chart */}
                      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <BarChart2 size={18} style={{ color: 'var(--primary-light)' }} />
                          {isAr ? 'توزيع حالات الطلبات' : 'Applications by Status'}
                        </h3>
                        {applications.length === 0 ? (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {isAr ? 'لا توجد بيانات بعد' : 'No data yet'}
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={applicationsByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                                {applicationsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                          {applicationsByStatus.map(d => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                              <span>{d.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Internship performance + Recent apps */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Activity size={18} style={{ color: 'var(--primary-light)' }} />
                          {isAr ? 'أداء الفرص التدريبية' : 'Internship Performance'}
                        </h3>
                        {internshipPerformance.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <Briefcase size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                            <p style={{ fontSize: '0.875rem' }}>{isAr ? 'لا توجد فرص منشورة بعد' : 'No internships posted yet'}</p>
                            <button onClick={() => { setTab('post'); window.location.hash = 'post'; }} style={{ marginTop: '0.75rem', padding: '0.4rem 0.9rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                              {isAr ? 'انشر أول فرصة' : 'Post First Job'}
                            </button>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={210}>
                            <BarChart data={internshipPerformance} barGap={4}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                              <Bar dataKey="apps" name={isAr ? 'الطلبات' : 'Applications'} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
                              <Bar dataKey="accepted" name={isAr ? 'المقبولون' : 'Accepted'} fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {/* Recent applications feed */}
                      <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} style={{ color: 'var(--primary-light)' }} />
                            {isAr ? 'آخر الطلبات' : 'Recent Applications'}
                          </h3>
                          <button onClick={() => { setTab('applicants'); window.location.hash = 'applicants'; }} style={{ fontSize: '0.75rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            {isAr ? 'عرض الكل' : 'View all'} →
                          </button>
                        </div>
                        {applications.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('no_applications')}</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            {applications.slice(0, 7).map(app => (
                              <div key={app._id}
                                onClick={() => setSelectedApp(app)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.5rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                                    {app.student?.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.student?.name}</p>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.internship?.title}</p>
                                  </div>
                                </div>
                                <span className={`badge ${appStatusBadge[app.status]}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>{tStatus(app.status)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Evaluation heatmap / averages */}
                    {evaluations.length > 0 && (
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Star size={18} style={{ color: '#f59e0b' }} />
                          {isAr ? 'متوسط درجات التقييم' : 'Average Evaluation Scores'}
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={avgEvalScores} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                            <XAxis type="number" domain={[0, 10]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={100} />
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                            <Bar dataKey="avg" name={isAr ? 'المتوسط' : 'Average'} fill="url(#evalGrad)" radius={[0, 4, 4, 0]} barSize={16}>
                              {avgEvalScores.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════ POST TAB ══════════════ */}
                {tab === 'post' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.3)' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        {editingInternship ? <Edit3 size={20} style={{ color: 'var(--primary-light)' }} /> : <Plus size={20} style={{ color: 'var(--primary-light)' }} />}
                        {editingInternship ? (isAr ? 'تعديل الفرصة التدريبية' : 'Edit Internship') : t('post_new_internship')}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isAr ? 'انشر فرصة تدريبية ليتمكن الطلاب من التقديم عليها مباشرة' : 'Post an internship opportunity for students to apply to directly'}
                      </p>
                    </div>

                    <div className="card">
                      <form onSubmit={postInternship} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
                        {/* Title */}
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('internship_title')} *</label>
                          <input className="form-input" placeholder={isAr ? 'مثال: متدرب هندسة برمجيات' : 'e.g. Software Engineering Intern'} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                        </div>

                        {/* Location + Duration */}
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                            <MapPin size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{t('location')}
                          </label>
                          <input className="form-input" placeholder="Cairo, Egypt" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                            <Calendar size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{t('duration')}
                          </label>
                          <input className="form-input" placeholder="3 months" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                        </div>

                        {/* Type + Category */}
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

                        {/* Slots + Deadline + Salary */}
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('slots')}</label>
                          <input type="number" min="1" className="form-input" value={form.slots} onChange={e => setForm({ ...form, slots: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                            <Calendar size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{t('deadline')}
                          </label>
                          <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                            <DollarSign size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{t('salary')} {isAr ? '(شهرياً)' : '(monthly)'}
                          </label>
                          <input type="number" min="0" className="form-input" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
                        </div>

                        {/* Paid toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button type="button" onClick={() => setForm({ ...form, isPaid: !form.isPaid })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.isPaid ? '#10b981' : 'var(--text-muted)', padding: 0 }}>
                            {form.isPaid ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                          </button>
                          <label style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => setForm({ ...form, isPaid: !form.isPaid })}>
                            {t('paid_internship')}
                            {form.isPaid && <span style={{ marginInlineStart: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ {isAr ? 'مدفوع' : 'Paid'}</span>}
                          </label>
                        </div>

                        {/* Skills */}
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                            <Tag size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{t('skills')} {isAr ? '(مفصولة بفاصلة)' : '(comma separated)'}
                          </label>
                          <input className="form-input" placeholder="React, Node.js, Python" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
                          {form.skills && (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                              {form.skills.split(',').filter(s => s.trim()).map((skill, i) => (
                                <span key={i} style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '1rem', fontWeight: 600 }}>
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('description')} *</label>
                          <textarea className="form-input" rows={4} placeholder={t('description_placeholder')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                        </div>

                        {/* Requirements */}
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('requirements')}</label>
                          <textarea className="form-input" rows={3} placeholder={t('requirements_placeholder')} value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
                        </div>

                        {/* Submit */}
                        <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.75rem' }}>
                          <button type="submit" className="btn-primary" disabled={posting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {posting ? <LoadingSpinner size={18} /> : (editingInternship ? <Edit3 size={18} /> : <Plus size={18} />)}
                            {posting ? t('posting') : (editingInternship ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : t('post_internship'))}
                          </button>
                          {editingInternship && (
                            <button type="button" className="btn-secondary" onClick={() => { setEditingInternship(null); setForm(defaultForm); }}>
                              {isAr ? 'إلغاء التعديل' : 'Cancel Edit'}
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* ══════════════ INTERNSHIPS TAB ══════════════ */}
                {tab === 'internships' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{isAr ? 'الفرص التدريبية المنشورة' : 'Posted Internships'}</h3>
                      <button onClick={() => { setEditingInternship(null); setForm(defaultForm); setTab('post'); window.location.hash = 'post'; }} className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Plus size={15} /> {isAr ? 'نشر جديد' : 'New Post'}
                      </button>
                    </div>

                    {internships.length === 0 ? (
                      <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                        <Briefcase size={52} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
                        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{isAr ? 'لا توجد فرص منشورة بعد' : 'No internships posted yet'}</p>
                        <button onClick={() => { setTab('post'); window.location.hash = 'post'; }} className="btn-primary" style={{ marginTop: '0.75rem' }}>
                          {isAr ? 'انشر أول فرصة' : 'Post Your First Internship'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {internships.map(i => {
                          const apps = applications.filter(a => a.internship?._id === i._id);
                          const acc = apps.filter(a => a.status === 'accepted').length;
                          const pend = apps.filter(a => a.status === 'pending').length;
                          const daysLeft = Math.ceil((new Date(i.deadline) - new Date()) / 86400000);
                          const isExpanded = expandedInternship === i._id;
                          return (
                            <div key={i._id} className="card" style={{ borderLeft: `4px solid ${i.status === 'open' ? '#10b981' : '#64748b'}` }}>
                              {/* Header */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                    <h4 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{i.title}</h4>
                                    <span className={`badge ${i.status === 'open' ? 'badge-success' : 'badge-gray'}`}>{tStatus(i.status)}</span>
                                    {i.isPaid && <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '1rem', fontWeight: 700 }}>$ {isAr ? 'مدفوع' : 'Paid'}</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span>📍 {i.location}</span>
                                    <span>⏱ {i.duration}</span>
                                    <span>🏷 {i.type}</span>
                                    <span>📂 {i.category}</span>
                                    <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : 'var(--text-muted)' }}>
                                      📅 {daysLeft < 0 ? (isAr ? 'انتهى' : 'Expired') : `${daysLeft}d ${isAr ? 'متبقي' : 'left'}`}
                                    </span>
                                  </div>
                                </div>

                                {/* Quick stats */}
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-light)' }}>{apps.length}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{isAr ? 'طلب' : 'Apps'}</div>
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>{acc}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{isAr ? 'مقبول' : 'Accept.'}</div>
                                  </div>
                                  {pend > 0 && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>{pend}</div>
                                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{isAr ? 'منتظر' : 'Pend.'}</div>
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                                  <button
                                    onClick={() => toggleInternshipStatus(i._id, i.status)}
                                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: i.status === 'open' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: i.status === 'open' ? '#ef4444' : '#10b981', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                                    {i.status === 'open' ? (isAr ? 'إغلاق' : 'Close') : (isAr ? 'فتح' : 'Open')}
                                  </button>
                                  <button onClick={() => startEditInternship(i)} style={{ padding: '0.3rem 0.55rem', background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)', border: 'none', borderRadius: '0.4rem', cursor: 'pointer' }}>
                                    <Edit3 size={14} />
                                  </button>
                                  <button onClick={() => setExpandedInternship(isExpanded ? null : i._id)} style={{ padding: '0.3rem 0.55rem', background: 'var(--bg-lighter)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.4rem', cursor: 'pointer' }}>
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                </div>
                              </div>

                              {/* Expanded detail */}
                              {isExpanded && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                    <div>
                                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>{isAr ? 'الوصف:' : 'Description:'}</p>
                                      <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{i.description || '—'}</p>
                                    </div>
                                    {i.requirements && (
                                      <div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>{isAr ? 'المتطلبات:' : 'Requirements:'}</p>
                                        <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{i.requirements}</p>
                                      </div>
                                    )}
                                    {(i.skills?.length > 0) && (
                                      <div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>{isAr ? 'المهارات المطلوبة:' : 'Required Skills:'}</p>
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                          {i.skills.map((sk, idx) => (
                                            <span key={idx} style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '1rem', fontWeight: 600 }}>{sk}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {/* Mini applicants list */}
                                  {apps.length > 0 && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem' }}>{isAr ? 'المتقدمون:' : 'Applicants:'}</p>
                                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {apps.slice(0, 5).map(a => (
                                          <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', background: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.status === 'accepted' ? '#10b981' : a.status === 'rejected' ? '#ef4444' : '#f59e0b' }} />
                                            {a.student?.name}
                                          </div>
                                        ))}
                                        {apps.length > 5 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.2rem 0.6rem' }}>+{apps.length - 5} {isAr ? 'أكثر' : 'more'}</span>}
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

                {/* ══════════════ APPLICANTS TAB ══════════════ */}
                {tab === 'applicants' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Filters */}
                    <div className="card" style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input className="form-input" placeholder={isAr ? 'بحث بالاسم أو الإيميل...' : 'Search by name or email...'}
                            value={searchApps} onChange={e => setSearchApps(e.target.value)}
                            style={{ paddingInlineStart: '2rem' }} />
                        </div>
                        <select className="form-input" style={{ width: 'auto', minWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                          <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                          {['pending', 'reviewing', 'accepted', 'rejected'].map(s => <option key={s} value={s}>{tStatus(s)}</option>)}
                        </select>
                        <select className="form-input" style={{ width: 'auto', minWidth: 160 }} value={filterInternship} onChange={e => setFilterInternship(e.target.value)}>
                          <option value="all">{isAr ? 'كل الفرص' : 'All Internships'}</option>
                          {internships.map(i => <option key={i._id} value={i._id}>{i.title}</option>)}
                        </select>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {filteredApps.length} {isAr ? 'نتيجة' : 'results'}
                        </span>
                      </div>
                    </div>

                    {/* Applicant cards grid */}
                    {filteredApps.length === 0 ? (
                      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
                        <p style={{ fontWeight: 700 }}>{isAr ? 'لا توجد نتائج' : 'No results found'}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {filteredApps.map(app => (
                          <div key={app._id} className="card" style={{ borderTop: `3px solid ${app.status === 'accepted' ? '#10b981' : app.status === 'rejected' ? '#ef4444' : app.status === 'reviewing' ? '#6366f1' : '#f59e0b'}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onClick={() => setSelectedApp(app)}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem' }}>
                              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
                                {app.student?.name?.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{app.student?.name}</h4>
                                  <span className={`badge ${appStatusBadge[app.status]}`} style={{ fontSize: '0.65rem' }}>{tStatus(app.status)}</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{app.student?.email}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--primary-light)', marginTop: '0.2rem', fontWeight: 600 }}>{app.internship?.title}</p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                              <span>📅 {new Date(app.createdAt).toLocaleDateString()}</span>
                              {app.student?.university && <span>🏛 {app.student.university}</span>}
                              {app.student?.gpa && <span>🎓 GPA: {app.student.gpa}</span>}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                              {app.status === 'pending' && (
                                <>
                                  <button onClick={() => updateStatus(app._id, 'accepted')} style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                                    <CheckCircle size={13} /> {t('accept')}
                                  </button>
                                  <button onClick={() => updateStatus(app._id, 'rejected')} style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                                    <XCircle size={13} /> {t('reject')}
                                  </button>
                                  <button onClick={() => triggerAIEvaluation(app._id)} disabled={evaluatingAI === app._id} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: evaluatingAI === app._id ? 'wait' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {evaluatingAI === app._id ? <LoadingSpinner size={11} /> : <Brain size={13} />} AI
                                  </button>
                                </>
                              )}
                              {app.status === 'accepted' && (
                                <button onClick={() => { setEvalForm(f => ({ ...f, applicationId: app._id, studentId: app.student?._id, internshipId: app.internship?._id })); setTab('evaluations'); window.location.hash = 'evaluations'; }} style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Star size={13} /> {isAr ? 'تقييم' : 'Evaluate'}
                                </button>
                              )}
                              {app.status === 'reviewing' && (
                                <>
                                  <button onClick={() => updateStatus(app._id, 'accepted')} style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>{t('accept')}</button>
                                  <button onClick={() => updateStatus(app._id, 'rejected')} style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>{t('reject')}</button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════ EVALUATIONS TAB ══════════════ */}
                {tab === 'evaluations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(99,102,241,0.08))', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <Award size={20} style={{ color: '#f59e0b' }} /> {t('evaluate_student')}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isAr ? 'قيّم أداء المتدربين المقبولين وأضف توصيتك النهائية' : 'Evaluate the performance of accepted interns and add your final recommendation'}
                      </p>
                    </div>

                    {/* Evaluation form */}
                    <div className="card">
                      <form onSubmit={submitEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('select_student')} *</label>
                          <select className="form-input" value={evalForm.applicationId} onChange={e => {
                            const app = acceptedApps.find(a => a._id === e.target.value);
                            setEvalForm({ ...evalForm, applicationId: e.target.value, studentId: app ? app.student?._id : '', internshipId: app ? app.internship?._id : '' });
                          }} required>
                            <option value="">{t('choose_accepted_student')}</option>
                            {acceptedApps.map(app => (
                              <option key={app._id} value={app._id}>{app.student?.name} — {app.internship?.title}</option>
                            ))}
                          </select>
                        </div>

                        {/* Score sliders */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                          {Object.keys(evalForm.scores).map(key => {
                            const val = evalForm.scores[key];
                            const pct = (val / 10) * 100;
                            const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                            return (
                              <div key={key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{scoreLabels[key]}</label>
                                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: barColor }}>{val}/10</span>
                                </div>
                                <input type="range" min="0" max="10" step="1"
                                  style={{ width: '100%', cursor: 'pointer', accentColor: barColor }}
                                  value={val}
                                  onChange={e => setEvalForm({ ...evalForm, scores: { ...evalForm.scores, [key]: parseInt(e.target.value) } })} />
                                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 2 }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.2s' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Overall computed score summary */}
                        {(() => {
                          const scores = Object.values(evalForm.scores);
                          const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                          const pct = (avg / 10) * 100;
                          const col = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                          return (
                            <div style={{ background: `${col}12`, border: `1px solid ${col}35`, borderRadius: '0.75rem', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ fontSize: '2rem', fontWeight: 900, color: col }}>{avg}</div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{isAr ? 'متوسط النتيجة الكلية' : 'Overall Average Score'}</p>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pct >= 80 ? (isAr ? 'أداء ممتاز 🌟' : 'Excellent Performance 🌟') : pct >= 60 ? (isAr ? 'أداء جيد 👍' : 'Good Performance 👍') : (isAr ? 'يحتاج تحسين ⚠️' : 'Needs Improvement ⚠️')}</p>
                              </div>
                            </div>
                          );
                        })()}

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{t('comments')}</label>
                          <textarea className="form-input" rows={3} value={evalForm.comments} onChange={e => setEvalForm({ ...evalForm, comments: e.target.value })} placeholder={t('comments_placeholder')} />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>{t('recommendation_label')}</label>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {[
                              { val: 'highly_recommended', icon: '🌟', color: '#10b981' },
                              { val: 'recommended', icon: '👍', color: '#6366f1' },
                              { val: 'neutral', icon: '😐', color: '#64748b' },
                              { val: 'not_recommended', icon: '👎', color: '#ef4444' },
                            ].map(r => (
                              <button type="button" key={r.val}
                                onClick={() => setEvalForm({ ...evalForm, recommendation: r.val })}
                                style={{ padding: '0.5rem 0.9rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: `2px solid ${evalForm.recommendation === r.val ? r.color : 'var(--border)'}`, background: evalForm.recommendation === r.val ? `${r.color}20` : 'var(--bg-lighter)', color: evalForm.recommendation === r.val ? r.color : 'var(--text-muted)', transition: 'all 0.15s' }}>
                                {r.icon} {tRec(r.val)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={submittingEval} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {submittingEval ? <LoadingSpinner size={18} /> : <Send size={18} />}
                          {submittingEval ? t('submitting_eval') : t('submit_evaluation')}
                        </button>
                      </form>
                    </div>

                    {/* Past evaluations */}
                    {evaluations.length > 0 && (
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('past_evaluations')}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
                          {evaluations.map(ev => {
                            const pct = (ev.totalScore / 10) * 100;
                            const col = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                            return (
                              <div key={ev._id} style={{ background: 'var(--bg)', border: `1px solid var(--border)`, borderRadius: '0.75rem', padding: '1rem', borderLeft: `4px solid ${col}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${col}20`, border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: col, flexShrink: 0 }}>
                                    {ev.student?.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{ev.student?.name}</p>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ev.internship?.title}</p>
                                  </div>
                                  <div style={{ marginInlineStart: 'auto', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: col }}>{ev.totalScore}</div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>/10</div>
                                  </div>
                                </div>
                                {/* Mini scores */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.35rem', fontSize: '0.68rem' }}>
                                  {Object.entries(ev.scores || {}).map(([k, v]) => (
                                    <div key={k} style={{ textAlign: 'center', background: 'var(--bg-lighter)', padding: '0.25rem', borderRadius: '0.35rem' }}>
                                      <div style={{ fontWeight: 700 }}>{v}/10</div>
                                      <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scoreLabels[k]}</div>
                                    </div>
                                  ))}
                                </div>
                                {ev.recommendation && (
                                  <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', fontWeight: 700, color: col }}>
                                    {({ highly_recommended: '🌟', recommended: '👍', neutral: '😐', not_recommended: '👎' }[ev.recommendation] || '')} {tRec(ev.recommendation)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════ NOTIFICATIONS TAB ══════════════ */}
                {tab === 'notifications' && (
                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={18} style={{ color: 'var(--primary-light)' }} /> {t('notifications')}
                      </h3>
                      {unreadNotifs > 0 && (
                        <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '1rem', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>
                          {unreadNotifs} {isAr ? 'غير مقروء' : 'unread'}
                        </span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        <Bell size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.25 }} />
                        <p>{t('no_notifications')}</p>
                      </div>
                    ) : notifications.map(n => (
                      <div key={n._id} style={{ display: 'flex', gap: '1rem', padding: '0.85rem 0.5rem', borderBottom: '1px solid rgba(51,65,85,0.4)', opacity: n.isRead ? 0.55 : 1, borderRadius: '0.35rem', transition: 'background 0.15s', cursor: 'default' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: n.isRead ? 'var(--border)' : 'var(--primary)', flexShrink: 0, marginTop: '0.35rem' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{n.title}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{n.message}</p>
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

      {/* ══════════════ APPLICANT DETAIL MODAL ══════════════ */}
      {selectedApp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setSelectedApp(null)}>
          <div className="card fade-in" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedApp(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22} /></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.4rem', flexShrink: 0 }}>
                {selectedApp.student?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>{selectedApp.student?.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedApp.student?.email}</p>
              </div>
              <span className={`badge ${appStatusBadge[selectedApp.status]}`} style={{ marginInlineStart: 'auto', fontSize: '0.8rem' }}>{tStatus(selectedApp.status)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: isAr ? 'الفرصة التدريبية' : 'Internship', val: selectedApp.internship?.title },
                { label: isAr ? 'تاريخ التقديم' : 'Applied', val: new Date(selectedApp.createdAt).toLocaleDateString() },
                { label: isAr ? 'الجامعة' : 'University', val: selectedApp.student?.university || '—' },
                { label: 'GPA', val: selectedApp.student?.gpa || '—' },
                { label: isAr ? 'التخصص' : 'Major', val: selectedApp.student?.major || '—' },
              ].map(row => (
                <div key={row.label} style={{ background: 'var(--bg)', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{row.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{row.val}</div>
                </div>
              ))}
            </div>

            {selectedApp.coverLetter && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>{isAr ? 'رسالة التقديم:' : 'Cover Letter:'}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, background: 'var(--bg)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  {selectedApp.coverLetter}
                </p>
              </div>
            )}

            {selectedApp.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { updateStatus(selectedApp._id, 'accepted'); setSelectedApp(null); }} style={{ flex: 1, padding: '0.65rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={16} /> {t('accept')}
                </button>
                <button onClick={() => { updateStatus(selectedApp._id, 'rejected'); setSelectedApp(null); }} style={{ flex: 1, padding: '0.65rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <XCircle size={16} /> {t('reject')}
                </button>
                <button onClick={() => { triggerAIEvaluation(selectedApp._id); setSelectedApp(null); }} style={{ padding: '0.65rem 1rem', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Brain size={16} /> AI
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ AI EVAL MODAL ══════════════ */}
      {aiEval && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card fade-in" style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setAiEval(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22} /></button>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Brain style={{ color: 'var(--primary-light)' }} /> {isAr ? 'التقييم الذكي للمرشح' : 'AI Candidate Evaluation'}
            </h3>

            {/* Match score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.25)', padding: '1.25rem', borderRadius: '0.85rem' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: aiEval.matchScore > 75 ? '#10b981' : aiEval.matchScore > 50 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
                {aiEval.matchScore}%
              </div>
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{isAr ? 'درجة التطابق' : 'Match Score'}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isAr ? 'بناءً على المهارات والتخصص والمتطلبات' : 'Based on skills, major & requirements'}</p>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginTop: '0.6rem', width: 180 }}>
                  <div style={{ height: '100%', width: `${aiEval.matchScore}%`, background: aiEval.matchScore > 75 ? '#10b981' : aiEval.matchScore > 50 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.6rem', fontSize: '0.9rem' }}>✅ {isAr ? 'نقاط القوة' : 'Strengths'}</h4>
                <ul style={{ paddingInlineStart: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {aiEval.strengths?.map((s, i) => <li key={i} style={{ fontSize: '0.825rem', color: 'var(--text)' }}>{s}</li>) || <li style={{ fontSize: '0.825rem' }}>{isAr ? 'لا يوجد' : 'None identified'}</li>}
                </ul>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.6rem', fontSize: '0.9rem' }}>❌ {isAr ? 'نقاط الضعف' : 'Weaknesses'}</h4>
                <ul style={{ paddingInlineStart: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {aiEval.weaknesses?.map((w, i) => <li key={i} style={{ fontSize: '0.825rem', color: 'var(--text)' }}>{w}</li>) || <li style={{ fontSize: '0.825rem' }}>{isAr ? 'لا يوجد' : 'None'}</li>}
                </ul>
              </div>
            </div>

            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', padding: '1rem', borderRadius: '0.6rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontWeight: 700, color: 'var(--primary-light)', marginBottom: '0.4rem', fontSize: '0.875rem' }}>🤖 {isAr ? 'توصية الذكاء الاصطناعي' : 'AI Recommendation'}</h4>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{aiEval.recommendation}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setAiEval(null)} className="btn-secondary" style={{ flex: 1 }}>{isAr ? 'إغلاق' : 'Close'}</button>
              <button onClick={() => { updateStatus(aiEval.appId, 'accepted'); setAiEval(null); }} className="btn-primary" style={{ flex: 1, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <CheckCircle size={16} /> {isAr ? 'قبول المرشح' : 'Accept Candidate'}
              </button>
              <button onClick={() => { updateStatus(aiEval.appId, 'rejected'); setAiEval(null); }} style={{ flex: 1, padding: '0.65rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <XCircle size={16} /> {isAr ? 'رفض' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

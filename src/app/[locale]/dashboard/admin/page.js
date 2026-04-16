'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { adminAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Users, Building2, Briefcase, FileText, CheckCircle, ShieldCheck, UserCog, Clock, X, Edit3, Trash2, UserMinus, UserPlus, GraduationCap } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTranslations, useLocale } from 'next-intl';

export default function AdminDashboard() {
  const t = useTranslations('AdminDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const { user } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setTab(hash);
      else setTab('analytics');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const [usersList, setUsersList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [internships, setInternships] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningSupervisor, setAssigningSupervisor] = useState(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [rejectingUser, setRejectingUser] = useState(null);

  // Supervisor Management State
  const [supervisors, setSupervisors] = useState([]);
  const [studentsWithSupervisors, setStudentsWithSupervisors] = useState([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [editingShift, setEditingShift] = useState(null); // supervisor id being edited
  const [shiftForm, setShiftForm] = useState({ shiftStart: '', shiftEnd: '' });
  const [savingShift, setSavingShift] = useState(false);
  const [supSearch, setSupSearch] = useState('');
  const [stdSearch, setStdSearch] = useState('');
  const [supView, setSupView] = useState('supervisors'); // 'supervisors' | 'students'
  const [assigningStudentId, setAssigningStudentId] = useState(null);
  const [assignStudentSupId, setAssignStudentSupId] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  const fetchUsers = async () => {
    try { const res = await adminAPI.getUsers(); setUsersList(res.data.data); } catch { }
  };

  const fetchCompanies = async () => {
    try { const res = await adminAPI.getCompanies(); setCompanies(res.data.data); } catch { }
  };

  const fetchInternships = async () => {
    try { const res = await adminAPI.getAllInternships(); setInternships(res.data.data); } catch { }
  };

  const fetchReports = async () => {
    try { const res = await adminAPI.getAllReports(); setReports(res.data.data); } catch { }
  };

  const fetchPending = async () => {
    try { const res = await adminAPI.getPendingUsers(); setPendingUsers(res.data.data); } catch { }
  };

  const fetchSupervisorData = useCallback(async () => {
    setSupervisorsLoading(true);
    try {
      const [supRes, stdRes] = await Promise.all([
        adminAPI.getSupervisors(),
        adminAPI.getStudentsWithSupervisors(),
      ]);
      setSupervisors(supRes.data.data || []);
      setStudentsWithSupervisors(stdRes.data.data || []);
    } catch (err) {
      toast.error(isAr ? 'فشل تحميل بيانات المشرفين' : 'Failed to load supervisor data');
    } finally {
      setSupervisorsLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [analyticsRes] = await Promise.all([
          adminAPI.getAnalytics(),
          fetchPending(),
        ]);
        setAnalytics(analyticsRes.data.data);
      } catch { toast.error(t('failed_to_load')); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (tab === 'users' && usersList.length === 0) fetchUsers();
    if (tab === 'companies' && companies.length === 0) fetchCompanies();
    if (tab === 'internships' && internships.length === 0) fetchInternships();
    if (tab === 'reports' && reports.length === 0) fetchReports();
    if (tab === 'pending') fetchPending();
    if (tab === 'supervisors') fetchSupervisorData();
  }, [tab]);

  const toggleUser = async (id) => {
    try {
      await adminAPI.toggleUser(id);
      setUsersList(usersList.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u));
      toast.success(t('status_updated'));
    } catch { toast.error(t('update_failed')); }
  };

  const deleteUser = async (id) => {
    if (!confirm(t('confirm_delete_user'))) return;
    try {
      await adminAPI.deleteUser(id);
      setUsersList(usersList.filter(u => u._id !== id));
      toast.success(t('user_deleted'));
    } catch { toast.error(t('delete_failed')); }
  };

  const verifyCompany = async (id) => {
    try {
      await adminAPI.verifyCompany(id);
      setCompanies(companies.map(c => c._id === id ? { ...c, isVerified: true } : c));
      toast.success(tCommon('verified'));
    } catch { toast.error(t('verification_failed')); }
  };

  const toggleInternship = async (id) => {
    try {
      await adminAPI.toggleInternship(id);
      setInternships(internships.map(i => i._id === id ? { ...i, status: i.status === 'open' ? 'closed' : 'open' } : i));
      toast.success(tCommon('status_updated'));
    } catch { toast.error(tCommon('update_failed')); }
  };

  const handleAssignSupervisor = async (studentId) => {
    if (!selectedSupervisorId) return toast.error(t('select_supervisor_error'));
    try {
      await adminAPI.assignSupervisor(studentId, selectedSupervisorId);
      toast.success(t('supervisor_assigned'));
      setAssigningSupervisor(null);
      setSelectedSupervisorId('');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('assignment_failed'));
    }
  };

  const handleVerifyUser = async (id) => {
    try {
      await adminAPI.verifyUser(id);
      setPendingUsers(prev => prev.filter(u => u._id !== id));
      toast.success(t('user_verified') || 'User verified successfully');
    } catch {
      toast.error(t('verification_failed'));
    }
  };

  const handleRejectUser = async () => {
    if (!rejectingUser) return;
    try {
      await adminAPI.rejectUser(rejectingUser._id);
      setPendingUsers(prev => prev.filter(u => u._id !== rejectingUser._id));
      toast.success(isAr ? 'تم رفض الحساب بنجاح' : 'User rejected successfully');
      setRejectingUser(null);
    } catch {
      toast.error(t('delete_failed') || 'Action failed');
    }
  };

  // ── Supervisor Tab Actions ───────────────────────────
  const handleSaveShift = async (supId) => {
    if (!shiftForm.shiftStart || !shiftForm.shiftEnd) {
      return toast.error(isAr ? 'أدخل وقت البداية والنهاية' : 'Enter both start and end time');
    }
    setSavingShift(true);
    try {
      await adminAPI.updateSupervisorShift(supId, shiftForm);
      toast.success(isAr ? 'تم تحديث وقت الحضور' : 'Shift hours updated');
      setSupervisors(prev => prev.map(s => s._id === supId ? { ...s, shiftStart: shiftForm.shiftStart, shiftEnd: shiftForm.shiftEnd } : s));
      setEditingShift(null);
    } catch {
      toast.error(isAr ? 'فشل التحديث' : 'Update failed');
    } finally {
      setSavingShift(false);
    }
  };

  const handleAssignStudentSupervisor = async (studentUserId) => {
    if (!assignStudentSupId) return toast.error(isAr ? 'اختر مشرفاً' : 'Select a supervisor');
    setSavingAssign(true);
    try {
      await adminAPI.assignSupervisor(studentUserId, assignStudentSupId);
      toast.success(isAr ? 'تم تعيين المشرف بنجاح' : 'Supervisor assigned successfully');
      setAssigningStudentId(null);
      setAssignStudentSupId('');
      fetchSupervisorData();
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? 'فشل التعيين' : 'Assignment failed'));
    } finally {
      setSavingAssign(false);
    }
  };

  const handleRemoveSupervisor = async (studentUserId, studentName) => {
    if (!confirm(isAr ? `هل تريد إزالة المشرف من ${studentName}؟` : `Remove supervisor from ${studentName}?`)) return;
    try {
      await adminAPI.removeSupervisor(studentUserId);
      toast.success(isAr ? 'تم إزالة المشرف' : 'Supervisor removed');
      fetchSupervisorData();
    } catch {
      toast.error(isAr ? 'فشلت العملية' : 'Action failed');
    }
  };

  const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const filteredSupervisors = supervisors.filter(s =>
    !supSearch || s.name?.toLowerCase().includes(supSearch.toLowerCase()) || s.email?.toLowerCase().includes(supSearch.toLowerCase())
  );
  const filteredStudents = studentsWithSupervisors.filter(s =>
    !stdSearch || s.user?.name?.toLowerCase().includes(stdSearch.toLowerCase()) || s.user?.email?.toLowerCase().includes(stdSearch.toLowerCase())
  );

  /* ─── Supervisor panel card for each supervisor ──────── */
  const SupervisorCard = ({ sup }) => {
    const isEditing = editingShift === sup._id;
    const avatarChar = sup.name?.charAt(0).toUpperCase() || 'S';
    return (
      <div style={{
        background: 'var(--bg-lighter)',
        border: '1px solid var(--border)',
        borderRadius: '1rem',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0,
          }}>
            {avatarChar}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sup.name}</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sup.email}</p>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)' }}>{sup.studentCount || 0}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isAr ? 'طالب' : 'Students'}</div>
          </div>
        </div>

        {/* Shift Hours */}
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={13} /> {isAr ? 'ساعات الحضور' : 'Attendance Window'}
            </span>
            {!isEditing && (
              <button
                onClick={() => { setEditingShift(sup._id); setShiftForm({ shiftStart: sup.shiftStart || '09:00', shiftEnd: sup.shiftEnd || '17:00' }); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}
              >
                <Edit3 size={13} /> {isAr ? 'تعديل' : 'Edit'}
              </button>
            )}
          </div>

          {isEditing ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="time" className="form-input" value={shiftForm.shiftStart}
                onChange={e => setShiftForm(f => ({ ...f, shiftStart: e.target.value }))}
                style={{ flex: 1, minWidth: 90, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>→</span>
              <input type="time" className="form-input" value={shiftForm.shiftEnd}
                onChange={e => setShiftForm(f => ({ ...f, shiftEnd: e.target.value }))}
                style={{ flex: 1, minWidth: 90, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }} />
              <div style={{ display: 'flex', gap: '0.4rem', width: '100%', marginTop: '0.25rem' }}>
                <button onClick={() => handleSaveShift(sup._id)} disabled={savingShift}
                  style={{ flex: 1, padding: '0.4rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                  {savingShift ? '...' : (isAr ? 'حفظ' : 'Save')}
                </button>
                <button onClick={() => setEditingShift(null)}
                  style={{ flex: 1, padding: '0.4rem', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '0.5rem', padding: '0.4rem 0.6rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{isAr ? 'وقت الحضور' : 'Check-in'}</div>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>{sup.shiftStart || '09:00'}</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontWeight: 700 }}>→</div>
              <div style={{ flex: 1, textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.4rem 0.6rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{isAr ? 'وقت الانصراف' : 'Check-out'}</div>
                <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.95rem' }}>{sup.shiftEnd || '17:00'}</div>
              </div>
            </div>
          )}

          {/* Status badge */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem' }}>
            <span style={{
              fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600,
              background: sup.isVerified ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: sup.isVerified ? '#10b981' : '#f59e0b',
            }}>
              {sup.isVerified ? (isAr ? '✓ موثق' : '✓ Verified') : (isAr ? 'قيد المراجعة' : 'Pending')}
            </span>
            <span style={{
              fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600,
              background: sup.isActive ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.15)',
              color: sup.isActive ? 'var(--primary-light)' : 'var(--text-muted)',
            }}>
              {sup.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
            </span>
          </div>

          {/* Assigned students mini list */}
          {sup.assignedStudents?.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                {isAr ? 'الطلاب المُعينون:' : 'Assigned Students:'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {sup.assignedStudents.slice(0, 3).map(st => (
                  <div key={st._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-light)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{st.user?.name}</span>
                    <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.user?.email}</span>
                  </div>
                ))}
                {sup.assignedStudents.length > 3 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                    +{sup.assignedStudents.length - 3} {isAr ? 'أكثر' : 'more'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div>
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('title')}</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('subtitle')}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'analytics', label: t('analytics') },
                { key: 'pending', label: t('pending_approvals') || 'طلبات التحقق' },
                { key: 'supervisors', label: isAr ? '👥 إدارة المشرفين' : '👥 Supervisors' },
                { key: 'users', label: t('users') },
                { key: 'companies', label: t('companies') },
                { key: 'internships', label: t('internships_tab') },
                { key: 'reports', label: t('reports_tab') },
              ].map(tabItem => (
                <button key={tabItem.key} onClick={() => { setTab(tabItem.key); window.location.hash = tabItem.key; }} style={{ padding: '0.6rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent', color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === tabItem.key ? 700 : 500, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {tabItem.label}
                  {tabItem.key === 'pending' && pendingUsers.length > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{pendingUsers.length}</span>
                  )}
                  {tabItem.key === 'supervisors' && supervisors.length > 0 && (
                    <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '1rem', padding: '0 6px', height: 18, fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{supervisors.length}</span>
                  )}
                </button>
              ))}
            </div>

            {loading ? <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={40} /></div> : (
              <>
                {/* Analytics */}
                {tab === 'analytics' && analytics && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <StatCard title={t('total_users')} value={analytics.summary.totalUsers} subtitle={`${analytics.summary.totalStudents} ${t('students')}`} icon={Users} color="indigo" />
                      <StatCard title={t('total_companies')} value={analytics.summary.totalCompanies} icon={Building2} color="sky" />
                      <StatCard title={t('total_internships')} value={analytics.summary.totalInternships} subtitle={`${analytics.summary.openInternships} ${t('open')}`} icon={Briefcase} color="emerald" />
                      <StatCard title={t('acceptance_rate')} value={`${analytics.summary.acceptanceRate}%`} icon={CheckCircle} color="amber" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>{t('internships_by_category')}</h3>
                        <div style={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                              <Pie data={analytics.internshipsByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="count" nameKey="_id" label>
                                {analytics.internshipsByCategory.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }} />
                            </RechartsPie>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>{t('applications_by_status')}</h3>
                        <div style={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.applicationsByStatus}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="_id" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                              <Bar dataKey="count" fill="var(--primary-light)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Approvals */}
                {tab === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(239,68,68,0.05) 100%)', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <ShieldCheck style={{ color: '#f59e0b' }} />
                        {t('pending_approvals') || 'طلبات التحقق من الحسابات'}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {t('pending_approvals_desc') || 'حسابات الشركات والمشرفين الجدد بانتظار موافقتك.'}
                      </p>
                    </div>

                    {pendingUsers.length === 0 ? (
                      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, color: '#10b981' }} />
                        <p style={{ fontWeight: 700 }}>{t('no_pending') || 'لا توجد طلبات معلقة حالياً.'}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {pendingUsers.map(pu => (
                          <div key={pu._id} className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                              <div>
                                <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{pu.name}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pu.email}</p>
                              </div>
                              <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>{pu.role === 'company' ? (t('company') || 'شركة') : (t('supervisor') || 'مشرف')}</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                              {t('joined') || 'تاريخ التسجيل'}: {new Date(pu.createdAt).toLocaleString()}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => handleVerifyUser(pu._id)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#10b981' }}>
                                <CheckCircle size={16} /> {t('approve') || 'موافقة'}
                              </button>
                              <button onClick={() => setRejectingUser(pu)} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem', padding: '0.5rem', fontSize: '0.85rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                                {t('reject') || 'رفض'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── SUPERVISORS MANAGEMENT TAB ─────────────────────── */}
                {tab === 'supervisors' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Header Banner */}
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                            <UserCog size={22} style={{ color: 'var(--primary-light)' }} />
                            {isAr ? 'إدارة المشرفين والطلاب' : 'Supervisor & Student Management'}
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {isAr
                              ? 'عيّن المشرفين على الطلاب، وتحكم في ساعات الحضور المسموح بها لكل مشرف.'
                              : 'Assign supervisors to students and control allowed attendance windows per supervisor.'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setSupView('supervisors')}
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '0.6rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer', background: supView === 'supervisors' ? 'var(--primary)' : 'var(--bg-lighter)', color: supView === 'supervisors' ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <UserCog size={15} /> {isAr ? 'المشرفون' : 'Supervisors'} ({supervisors.length})
                          </button>
                          <button
                            onClick={() => setSupView('students')}
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '0.6rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer', background: supView === 'students' ? 'var(--primary)' : 'var(--bg-lighter)', color: supView === 'students' ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <GraduationCap size={15} /> {isAr ? 'الطلاب' : 'Students'} ({studentsWithSupervisors.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {supervisorsLoading ? (
                      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={36} /></div>
                    ) : (
                      <>
                        {/* SUPERVISORS VIEW */}
                        {supView === 'supervisors' && (
                          <>
                            <input
                              className="form-input"
                              placeholder={isAr ? '🔍 ابحث عن مشرف...' : '🔍 Search supervisors...'}
                              value={supSearch}
                              onChange={e => setSupSearch(e.target.value)}
                              style={{ maxWidth: 350 }}
                            />
                            {filteredSupervisors.length === 0 ? (
                              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <UserCog size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p style={{ fontWeight: 700 }}>{isAr ? 'لا يوجد مشرفون مسجلون.' : 'No supervisors found.'}</p>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                                {filteredSupervisors.map(sup => <SupervisorCard key={sup._id} sup={sup} />)}
                              </div>
                            )}
                          </>
                        )}

                        {/* STUDENTS VIEW */}
                        {supView === 'students' && (
                          <>
                            <input
                              className="form-input"
                              placeholder={isAr ? '🔍 ابحث عن طالب...' : '🔍 Search students...'}
                              value={stdSearch}
                              onChange={e => setStdSearch(e.target.value)}
                              style={{ maxWidth: 350 }}
                            />
                            {filteredStudents.length === 0 ? (
                              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <GraduationCap size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p style={{ fontWeight: 700 }}>{isAr ? 'لا يوجد طلاب.' : 'No student profiles found.'}</p>
                              </div>
                            ) : (
                              <div className="card" style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>{isAr ? 'الطالب' : 'Student'}</th>
                                      <th>{isAr ? 'الجامعة / التخصص' : 'University / Major'}</th>
                                      <th>{isAr ? 'المشرف الحالي' : 'Current Supervisor'}</th>
                                      <th>{isAr ? 'ساعات الحضور' : 'Shift Window'}</th>
                                      <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredStudents.map(st => {
                                      const isAssigning = assigningStudentId === st.user?._id;
                                      return (
                                        <tr key={st._id}>
                                          <td>
                                            <div>
                                              <p style={{ fontWeight: 700 }}>{st.user?.name || '—'}</p>
                                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{st.user?.email}</p>
                                            </div>
                                          </td>
                                          <td>
                                            <p style={{ fontSize: '0.85rem' }}>{st.university || '—'}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.major || ''}</p>
                                          </td>
                                          <td>
                                            {st.supervisor ? (
                                              <div>
                                                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{st.supervisor.name}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.supervisor.email}</p>
                                              </div>
                                            ) : (
                                              <span className="badge badge-warning">{isAr ? 'غير مُعيَّن' : 'Not Assigned'}</span>
                                            )}
                                          </td>
                                          <td>
                                            {st.supervisor ? (
                                              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>{st.supervisor.shiftStart || '09:00'}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>{st.supervisor.shiftEnd || '17:00'}</span>
                                              </div>
                                            ) : (
                                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                                            )}
                                          </td>
                                          <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                              {isAssigning ? (
                                                <>
                                                  <select
                                                    className="form-input"
                                                    value={assignStudentSupId}
                                                    onChange={e => setAssignStudentSupId(e.target.value)}
                                                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: 'auto' }}
                                                  >
                                                    <option value="">{isAr ? '-- اختر مشرفاً --' : '-- Select Supervisor --'}</option>
                                                    {supervisors.filter(s => s.isVerified && s.isActive).map(s => (
                                                      <option key={s._id} value={s._id}>{s.name} ({s.studentCount || 0} {isAr ? 'طالب' : 'students'})</option>
                                                    ))}
                                                  </select>
                                                  <button onClick={() => handleAssignStudentSupervisor(st.user?._id)} disabled={savingAssign}
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                                                    {savingAssign ? '...' : (isAr ? 'حفظ' : 'Save')}
                                                  </button>
                                                  <button onClick={() => { setAssigningStudentId(null); setAssignStudentSupId(''); }}
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'var(--bg-lighter)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.4rem', cursor: 'pointer' }}>
                                                    {isAr ? 'إلغاء' : 'Cancel'}
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={() => { setAssigningStudentId(st.user?._id); setAssignStudentSupId(''); }}
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <UserPlus size={13} /> {st.supervisor ? (isAr ? 'تغيير' : 'Change') : (isAr ? 'تعيين' : 'Assign')}
                                                  </button>
                                                  {st.supervisor && (
                                                    <button
                                                      onClick={() => handleRemoveSupervisor(st.user?._id, st.user?.name)}
                                                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                      <UserMinus size={13} /> {isAr ? 'إزالة' : 'Remove'}
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Users Management */}
                {tab === 'users' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('user_directory')}</h3>
                    <table className="data-table">
                      <thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th>{t('joined')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
                      <tbody>
                        {usersList.map(u => (
                          <tr key={u._id}>
                            <td style={{ fontWeight: 600 }}>
                              {u.name}
                              {u.role === 'student' && assigningSupervisor === u._id && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <select
                                    className="form-input"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
                                    value={selectedSupervisorId}
                                    onChange={(e) => setSelectedSupervisorId(e.target.value)}
                                  >
                                    <option value="">{t('select_supervisor')}</option>
                                    {usersList.filter(user => user.role === 'supervisor' && user.isActive).map(sup => (
                                      <option key={sup._id} value={sup._id}>{sup.name}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => handleAssignSupervisor(u._id)} className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>{t('save')}</button>
                                  <button onClick={() => setAssigningSupervisor(null)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>{t('cancel')}</button>
                                </div>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                            <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>
                              {u.isRejected ? (
                                <span className="badge badge-danger" style={{ background: '#ef4444', color: '#fff' }}>{isAr ? 'مرفوض' : 'Rejected'}</span>
                              ) : !u.isVerified && (u.role === 'company' || u.role === 'supervisor') ? (
                                <span className="badge badge-warning" style={{ background: '#f59e0b', color: '#fff' }}>{isAr ? 'قيد المراجعة' : 'Pending'}</span>
                              ) : (
                                <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? t('active') : t('disabled')}</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {u.role === 'student' && assigningSupervisor !== u._id && (
                                  <button onClick={() => setAssigningSupervisor(u._id)} className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: 'none' }}>
                                    {t('assign_supervisor')}
                                  </button>
                                )}
                                <button onClick={() => toggleUser(u._id)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: u.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.isActive ? '#ef4444' : '#10b981', border: 'none' }}>
                                  {u.isActive ? t('disable') : t('enable')}
                                </button>
                                {u.role !== 'admin' && (
                                  <button onClick={() => deleteUser(u._id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '0.3rem', cursor: 'pointer', fontWeight: 600 }}>{t('delete')}</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Companies Verification */}
                {tab === 'companies' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('companies')}</h3>
                    <table className="data-table">
                      <thead><tr><th>{t('company')}</th><th>{t('user_account')}</th><th>{t('industry')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
                      <tbody>
                        {companies.map(c => (
                          <tr key={c._id}>
                            <td style={{ fontWeight: 600 }}>{c.companyName}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{c.user?.email || '—'}</td>
                            <td>{c.industry || '—'}</td>
                            <td><span className={`badge ${c.isVerified ? 'badge-success' : 'badge-warning'}`}>{c.isVerified ? t('verified') : t('unverified')}</span></td>
                            <td>
                              {!c.isVerified && (
                                <button onClick={() => verifyCompany(c._id)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '0.3rem', cursor: 'pointer', fontWeight: 600 }}>{t('verify')}</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Internships Management */}
                {tab === 'internships' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('internships_tab')}</h3>
                    <table className="data-table">
                      <thead><tr><th>{tCommon('title')}</th><th>{t('company')}</th><th>{tCommon('type')}</th><th>{tCommon('status')}</th><th>{t('actions')}</th></tr></thead>
                      <tbody>
                        {internships.map(i => (
                          <tr key={i._id}>
                            <td style={{ fontWeight: 600 }}>{i.title}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{i.company?.name || i.company?.companyName || '—'}</td>
                            <td>{i.type}</td>
                            <td><span className={`badge badge-${i.status === 'open' ? 'success' : 'gray'}`}>{tStatus(i.status) || i.status}</span></td>
                            <td>
                              <button onClick={() => toggleInternship(i._id)} className="btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                                {i.status === 'open' ? t('close_internship') : t('open_internship')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Reports Overview */}
                {tab === 'reports' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('reports_tab')}</h3>
                    <table className="data-table">
                      <thead><tr><th>{t('student')}</th><th>{t('internship')}</th><th>{t('week')}</th><th>{tCommon('status')}</th><th>{t('grade')}</th><th>{t('reviewed_by')}</th></tr></thead>
                      <tbody>
                        {reports.map(r => (
                          <tr key={r._id}>
                            <td style={{ fontWeight: 600 }}>{r.student?.name}</td>
                            <td>{r.internship?.title}</td>
                            <td>{r.weekNumber}</td>
                            <td><span className={`badge badge-${r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : r.status === 'submitted' ? 'info' : 'warning'}`}>{tStatus(r.status) || r.status}</span></td>
                            <td style={{ fontWeight: 700 }}>{r.grade ? r.grade + '/100' : '—'}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.reviewedBy?.name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {rejectingUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
          <div className="fade-in glass" style={{ maxWidth: 420, width: '100%', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#ef4444' }}>
              <ShieldCheck size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>{isAr ? 'تأكيد الرفض' : 'Confirm Rejection'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              {isAr
                ? `هل أنت متأكد من رفض طلب الانضمام الخاص بـ ${rejectingUser.name}؟ لن يتمكن من الدخول للمنصة وسيتم إخباره بالرفض عند محاولته تسجيل الدخول.`
                : `Are you sure you want to reject the request for ${rejectingUser.name}? They will be notified upon attempting to login.`}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setRejectingUser(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-lighter)', color: 'var(--text)', border: '1px solid var(--border)', fontWeight: 600, cursor: 'pointer' }}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleRejectUser} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', background: '#ef4444', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>
                {isAr ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

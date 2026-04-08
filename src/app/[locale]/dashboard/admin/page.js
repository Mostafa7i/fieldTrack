'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { adminAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Users, Building2, Briefcase, FileText, CheckCircle, PieChart } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTranslations } from 'next-intl';

export default function AdminDashboard() {
  const t = useTranslations('AdminDashboard');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const { user } = useAuth();
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

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getAnalytics();
        setAnalytics(res.data.data);
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
    } catch (err) {
      toast.error(err.response?.data?.message || t('assignment_failed'));
    }
  };

  const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
                { key: 'users', label: t('users') },
                { key: 'companies', label: t('companies') },
                { key: 'internships', label: t('internships_tab') },
                { key: 'reports', label: t('reports_tab') },
              ].map(tabItem => (
                <button key={tabItem.key} onClick={() => { setTab(tabItem.key); window.location.hash = tabItem.key; }} style={{ padding: '0.6rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent', color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === tabItem.key ? 700 : 500, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  {tabItem.label}
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
                            <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? t('active') : t('disabled')}</span></td>
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
    </ProtectedRoute>
  );
}

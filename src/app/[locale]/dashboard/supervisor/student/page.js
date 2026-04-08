'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { applicationAPI, reportAPI, evaluationAPI, notificationAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  Briefcase, FileText, Star, Bell, CheckCircle, Clock, XCircle, AlertCircle, Plus
} from 'lucide-react';

const statusBadge = {
  pending: 'badge-warning',
  reviewing: 'badge-info',
  accepted: 'badge-success',
  rejected: 'badge-danger',
  withdrawn: 'badge-gray',
};

const reportStatusBadge = {
  draft: 'badge-gray',
  submitted: 'badge-info',
  reviewed: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [reports, setReports] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportForm, setReportForm] = useState({ internshipId: '', weekNumber: '', title: '', content: '', hoursWorked: '' });
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [appRes, repRes, evalRes, notifRes] = await Promise.all([
          applicationAPI.getAll(),
          reportAPI.getAll(),
          evaluationAPI.getAll(),
          notificationAPI.getAll(),
        ]);
        setApplications(appRes.data.data || []);
        setReports(repRes.data.data || []);
        setEvaluations(evalRes.data.data || []);
        setNotifications(notifRes.data.data || []);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await reportAPI.submit({ ...reportForm, weekNumber: parseInt(reportForm.weekNumber), hoursWorked: parseInt(reportForm.hoursWorked) });
      toast.success('Report submitted!');
      setReportForm({ internshipId: '', weekNumber: '', title: '', content: '', hoursWorked: '' });
      const res = await reportAPI.getAll();
      setReports(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const pendingApps = applications.filter(a => a.status === 'pending');

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div>
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Student Dashboard</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Welcome back, {user?.name}!</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard title="Applications" value={applications.length} subtitle={`${pendingApps.length} pending`} icon={Briefcase} color="indigo" />
              <StatCard title="Accepted" value={acceptedApps.length} subtitle="Active training" icon={CheckCircle} color="emerald" />
              <StatCard title="Reports Submitted" value={reports.length} subtitle={`${reports.filter(r => r.status === 'approved').length} approved`} icon={FileText} color="sky" />
              <StatCard title="Evaluations" value={evaluations.length} icon={Star} color="amber" />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {['overview', 'applications', 'reports', 'evaluations', 'notifications'].map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '0.6rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent', color: tab === t ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: tab === t ? 700 : 500, cursor: 'pointer', fontSize: '0.875rem', textTransform: 'capitalize', transition: 'color 0.15s' }}>
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={40} /></div>
            ) : (
              <>
                {/* Overview tab */}
                {tab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Briefcase size={18} style={{ color: 'var(--primary-light)' }} /> Recent Applications
                      </h3>
                      {applications.slice(0, 4).map((app) => (
                        <div key={app._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{app.internship?.title || '—'}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(app.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`badge ${statusBadge[app.status]}`}>{app.status}</span>
                        </div>
                      ))}
                      {applications.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No applications yet. <a href="/internships" style={{ color: 'var(--primary-light)' }}>Browse internships</a></p>}
                    </div>

                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={18} style={{ color: 'var(--primary-light)' }} /> Notifications
                      </h3>
                      {notifications.slice(0, 5).map((n) => (
                        <div key={n._id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(51,65,85,0.5)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', opacity: n.isRead ? 0.6 : 1 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.isRead ? 'var(--border)' : 'var(--primary)', marginTop: '0.4rem', flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{n.title}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.message}</p>
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No notifications.</p>}
                    </div>
                  </div>
                )}

                {/* Applications tab */}
                {tab === 'applications' && (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>My Applications</h3>
                    {applications.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No applications yet.</p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Internship</th><th>Company</th><th>Applied</th><th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((app) => (
                            <tr key={app._id}>
                              <td style={{ fontWeight: 600 }}>{app.internship?.title}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{app.internship?.companyProfile?.companyName || '—'}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                              <td><span className={`badge ${statusBadge[app.status]}`}>{app.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Reports tab */}
                {tab === 'reports' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Submit form */}
                    <div className="card">
                      <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} style={{ color: 'var(--primary-light)' }} /> Submit Training Report
                      </h3>
                      <form onSubmit={handleSubmitReport} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Internship ID</label>
                          <input className="form-input" placeholder="Paste internship ID" value={reportForm.internshipId} onChange={e => setReportForm({ ...reportForm, internshipId: e.target.value })} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Week #</label>
                          <input type="number" className="form-input" min="1" placeholder="1" value={reportForm.weekNumber} onChange={e => setReportForm({ ...reportForm, weekNumber: e.target.value })} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Hours Worked</label>
                          <input type="number" className="form-input" min="0" placeholder="40" value={reportForm.hoursWorked} onChange={e => setReportForm({ ...reportForm, hoursWorked: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Title</label>
                          <input className="form-input" placeholder="Week 1 Progress" value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })} required />
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Content</label>
                          <textarea className="form-input" rows={4} placeholder="Describe your work this week…" value={reportForm.content} onChange={e => setReportForm({ ...reportForm, content: e.target.value })} required />
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                          <button type="submit" className="btn-primary" disabled={submittingReport}>
                            {submittingReport ? 'Submitting…' : 'Submit Report'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Reports list */}
                    <div className="card" style={{ overflowX: 'auto' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>My Reports</h3>
                      {reports.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No reports submitted yet.</p> : (
                        <table className="data-table">
                          <thead><tr><th>Title</th><th>Week</th><th>Hours</th><th>Status</th><th>Grade</th></tr></thead>
                          <tbody>
                            {reports.map((r) => (
                              <tr key={r._id}>
                                <td style={{ fontWeight: 600 }}>{r.title}</td>
                                <td>Week {r.weekNumber}</td>
                                <td>{r.hoursWorked}h</td>
                                <td><span className={`badge ${reportStatusBadge[r.status]}`}>{r.status}</span></td>
                                <td>{r.grade != null ? `${r.grade}/100` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Evaluations tab */}
                {tab === 'evaluations' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {evaluations.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>No evaluations yet.</p>
                    ) : evaluations.map((ev) => (
                      <div className="card" key={ev._id}>
                        <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{ev.internship?.title || 'Internship'}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>by {ev.company?.name}</p>
                        {Object.entries(ev.scores || {}).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: v >= 7 ? '#10b981' : v >= 5 ? '#f59e0b' : '#ef4444' }}>{v}/10</span>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Score</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-light)' }}>{ev.totalScore}/10</span>
                        </div>
                        {ev.comments && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>"{ev.comments}"</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notifications tab */}
                {tab === 'notifications' && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontWeight: 700 }}>Notifications</h3>
                      <button
                        onClick={async () => { await notificationAPI.markAllRead(); setNotifications(n => n.map(x => ({ ...x, isRead: true }))); }}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                      >
                        Mark all read
                      </button>
                    </div>
                    {notifications.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No notifications.</p> :
                      notifications.map((n) => (
                        <div key={n._id} style={{ display: 'flex', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(51,65,85,0.4)', opacity: n.isRead ? 0.55 : 1 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: n.isRead ? 'var(--border)' : 'var(--primary)', flexShrink: 0, marginTop: '0.35rem' }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{n.title}</p>
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

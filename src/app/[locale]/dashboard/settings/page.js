'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import ProtectedRoute from '../../../components/ProtectedRoute';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { Settings, Save, Lock, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const { user, login } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authAPI.getMe();
        const userData = res.data.data || res.data || {};
        setFormData(prev => ({
          ...prev,
          name: userData.name || '',
          email: userData.email || ''
        }));
      } catch (err) {
        toast.error(t('failed_to_load'));
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchUser();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(t('passwords_mismatch'));
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email
      };
      
      if (formData.currentPassword && formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }
      
      const res = await authAPI.updateProfile(payload);
      toast.success(t('profile_updated'));
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      if (res.data.token) {
        login(res.data.token);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('failed_to_update'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <ProtectedRoute allowedRoles={['student', 'company', 'supervisor', 'admin']}>
      <div>
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Settings size={28} style={{ color: 'var(--primary-light)' }} /> {t('title')}
              </h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('subtitle')}</p>
            </div>

            {loading ? (
              <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner size={40} />
              </div>
            ) : (
              <div className="card" style={{ maxWidth: '800px' }}>
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* Profile Section */}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                      <User size={20} style={{ color: 'var(--primary-light)' }} /> {t('profile_info')}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('full_name')} {user.role === 'company' && t('company_contact')}</label>
                        <input
                          type="text"
                          name="name"
                          className="form-input"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('email_address')}</label>
                        <input
                          type="email"
                          name="email"
                          className="form-input"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div>
                         <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('role')}</label>
                         <input
                           type="text"
                           className="form-input"
                           value={user.role}
                           disabled
                           style={{ opacity: 0.7, textTransform: 'capitalize', cursor: 'not-allowed' }}
                         />
                      </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                      <Lock size={20} style={{ color: 'var(--primary-light)' }} /> {t('update_password')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>{t('optional')}</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('current_password')}</label>
                        <input
                          type="password"
                          name="currentPassword"
                          className="form-input"
                          placeholder={t('current_password_placeholder')}
                          value={formData.currentPassword}
                          onChange={handleChange}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('new_password')}</label>
                        <input
                          type="password"
                          name="newPassword"
                          className="form-input"
                          placeholder={t('new_password_placeholder')}
                          value={formData.newPassword}
                          onChange={handleChange}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('confirm_password')}</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          className="form-input"
                          placeholder={t('confirm_password_placeholder')}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={saving}
                      style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Save size={18} /> {saving ? t('saving') : t('save_changes')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

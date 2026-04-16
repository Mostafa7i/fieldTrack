'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Briefcase, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pendingUser, setPendingUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(t('welcome_back', { name: data.user.name }));
      router.push(`/dashboard/${data.user.role}`);
    } catch (err) {
      const res = err.response?.data;
      if (res?.code === 'PENDING_VERIFICATION' || res?.code === 'REJECTED_VERIFICATION') {
        setPendingUser({ ...res.user, isRejected: res.code === 'REJECTED_VERIFICATION' });
      } else {
        toast.error(res?.message || t('login_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pending / Rejected Approval Screen ──────────────────────────
  if (pendingUser) {
    const isCompany = pendingUser.role === 'company';
    const isRejected = pendingUser.isRejected;
    const colorCode = isRejected ? '#ef4444' : '#f59e0b';
    const bgColor = isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';
    const iconStr = isRejected ? '❌' : '⏳';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
        <div className="fade-in glass" style={{ maxWidth: 480, width: '100%', padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: bgColor, border: `2px solid ${colorCode}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
            {iconStr}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: colorCode }}>
            {isRejected 
              ? (isAr ? 'تم رفض طلبك' : 'Account Request Rejected')
              : (isAr ? 'حسابك قيد المراجعة' : 'Account Pending Approval')
            }
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            {isRejected
              ? (isAr 
                ? `مرحباً ${pendingUser.name}، نأسف لإخبارك أنه تم رفض طلب الانضمام كـ ${isCompany ? 'شركة' : 'مشرف'} من قِبل الإدارة.`
                : `Hi ${pendingUser.name}, we are sorry to inform you that your request to join as a ${isCompany ? 'company' : 'supervisor'} has been rejected by the admin.`)
              : (isAr
                ? `مرحباً ${pendingUser.name}، تم إنشاء حسابك بنجاح كـ ${isCompany ? 'شركة' : 'مشرف'}. يحتاج حسابك إلى موافقة المشرف العام قبل أن تتمكن من الدخول. سيتم إعلامك فور القبول.`
                : `Hi ${pendingUser.name}, your ${isCompany ? 'company' : 'supervisor'} account has been created successfully. An admin must verify your account before you can access the dashboard. You'll be able to log in once approved.`)
            }
          </p>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'start' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{isAr ? 'البريد الإلكتروني' : 'Email'}</p>
            <p style={{ fontWeight: 700 }}>{pendingUser.email}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', marginTop: '0.5rem' }}>{isAr ? 'الدور' : 'Role'}</p>
            <p style={{ fontWeight: 700, textTransform: 'capitalize' }}>{isCompany ? (isAr ? 'شركة' : 'Company') : (isAr ? 'مشرف' : 'Supervisor')}</p>
          </div>
          <button onClick={() => setPendingUser(null)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            {isAr ? '← العودة لتسجيل الدخول' : '← Back to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }} className="group">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/20 border border-slate-200 dark:border-slate-800 group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="FieldTrack Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-baseline tracking-tighter text-4xl" dir="ltr">
              <span className="font-black text-slate-900 dark:text-slate-100">F</span>
              <span className="font-black bg-clip-text text-transparent bg-gradient-to-tr from-indigo-600 to-sky-500 dark:from-indigo-500 dark:to-cyan-400">T</span>
              <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-cyan-400 ml-1 mt-auto mb-1.5"></span>
            </div>
          </Link>
        </div>

        <div className="glass" style={{ padding: '2.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t('sign_in')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            {t('welcome_back_desc')}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                {t('email_address')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder={t('email_placeholder')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                {t('password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full justify-center p-3 text-lg bg-sky-600 flex rounded-2xl items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 hover:scale-105 transition hover:shadow-lg shadow-2xs shadow-sky-500"              
              disabled={loading}
            >
              {loading ? t('signing_in') : <><span>{t('sign_in')}</span> <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t('no_account')}{' '}
            <Link href="/register" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>
              {t('register_here')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

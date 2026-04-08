'use client';
import { Link } from '@/i18n/routing';
import { usePathname } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard, Briefcase, FileText, Bell, Users, Building2,
  BarChart3, GraduationCap, ClipboardList, Star, Settings, LogOut, X
} from 'lucide-react';

const menuByRole = (t) => ({
  student: [
    { label: t('dashboard'), href: '/dashboard/student', icon: LayoutDashboard },
    { label: t('browse_internships'), href: '/internships', icon: Briefcase },
    { label: t('my_applications'), href: '/dashboard/student#applications', icon: ClipboardList },
    { label: t('training_reports'), href: '/dashboard/student#reports', icon: FileText },
    { label: t('evaluations'), href: '/dashboard/student#evaluations', icon: Star },
    { label: t('notifications'), href: '/dashboard/student#notifications', icon: Bell },
  ],
  company: [
    { label: t('dashboard'), href: '/dashboard/company', icon: LayoutDashboard },
    { label: t('post_internship'), href: '/dashboard/company#post', icon: Briefcase },
    { label: t('my_internships'), href: '/dashboard/company#internships', icon: Building2 },
    { label: t('applicants'), href: '/dashboard/company#applicants', icon: Users },
    { label: t('evaluations'), href: '/dashboard/company#evaluations', icon: Star },
    { label: t('notifications'), href: '/dashboard/company#notifications', icon: Bell },
  ],
  supervisor: [
    { label: t('dashboard'), href: '/dashboard/supervisor', icon: LayoutDashboard },
    { label: t('students'), href: '/dashboard/supervisor#students', icon: GraduationCap },
    { label: t('training_reports'), href: '/dashboard/supervisor#reports', icon: FileText },
    { label: t('notifications'), href: '/dashboard/supervisor#notifications', icon: Bell },
  ],
  admin: [
    { label: t('dashboard'), href: '/dashboard/admin', icon: LayoutDashboard },
    { label: t('analytics'), href: '/dashboard/admin#analytics', icon: BarChart3 },
    { label: t('users'), href: '/dashboard/admin#users', icon: Users },
    { label: t('companies'), href: '/dashboard/admin#companies', icon: Building2 },
    { label: t('internships'), href: '/internships', icon: Briefcase },
    { label: t('reports'), href: '/dashboard/admin#reports', icon: FileText },
  ],
});

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHash(window.location.hash);
      const handleHashChange = () => setCurrentHash(window.location.hash);
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  if (!user) return null;

  const menu = (menuByRole(t)[user.role]) || [];

  return (
    <>
      {/* Overlay on mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 39, display: 'none'
          }}
          className="md:hidden"
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        style={{ paddingTop: '64px' }}
      >
        {/* User info */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: 'white', fontSize: '1rem', flexShrink: 0
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user.role}
              </p>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <nav style={{ padding: '0 0.75rem' }}>
          {menu.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname + currentHash === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  onClose();
                  if (item.href.startsWith(pathname + '#')) {
                    e.preventDefault();
                    window.location.hash = item.href.split('#')[1];
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.15rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary-light)' : 'var(--text-muted)',
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout & Lang */}
        <div style={{ position: 'absolute', bottom: '1.5rem', left: 0, right: 0, padding: '0 0.75rem' }}>
          <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher />
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: 'none',
              background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600
            }}
          >
            <LogOut size={18} /> {t('sign_out')}
          </button>
        </div>
      </aside>
    </>
  );
}

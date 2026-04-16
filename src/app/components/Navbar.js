'use client';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';
import { useState } from 'react';
import {LogOut, Menu, Briefcase, GraduationCap, Building2, ShieldCheck, User} from 'lucide-react';

const roleIcons = {
  student: <GraduationCap size={16} />,
  company: <Building2 size={16} />,
  supervisor: <ShieldCheck size={16} />,
  admin: <User size={16} />,
};

const roleColors = {
  student: 'bg-blue-500/20 text-blue-400',
  company: 'bg-indigo-500/20 text-indigo-400',
  supervisor: 'bg-green-500/20 text-green-400',
  admin: 'bg-amber-500/20 text-amber-400',
};

export default function Navbar({ onMenuToggle }) {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const t = useTranslations('Navigation');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    return `/dashboard/${user.role}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 md:px-6 gap-4 bg-slate-900/85 backdrop-blur-xl border-b border-slate-800">
      
      {/* Menu toggle (mobile) - يظهر فقط في الشاشات الصغيرة */}
      {isAuthenticated && (
        <button
          onClick={onMenuToggle}
          className="md:hidden text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 flex-1 no-underline font-extrabold text-xl group"
      >
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-slate-700/50 group-hover:shadow-blue-500/40 transition-shadow">
          <img src="/logo.png" alt="FieldTrack Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-baseline tracking-tighter text-2xl" dir="ltr">
          <span className="font-black text-slate-100">F</span>
          <span className="font-black bg-clip-text text-transparent bg-gradient-to-tr from-indigo-500 to-cyan-400">T</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-0.5 mt-auto mb-1"></span>
        </div>
      </Link>

      {/* Nav links & Actions */}
      <div className="flex items-center gap-4 md:gap-6">
        <LanguageSwitcher />
        <Link href="/internships" className="hidden sm:block text-sm font-medium text-slate-400 hover:text-white transition-colors">
          {t('internships')}
        </Link>

        {isAuthenticated ? (
          <>
            <Link href={getDashboardLink()} className="hidden sm:block text-sm font-medium text-slate-400 hover:text-white transition-colors">
              {t('dashboard')}
            </Link>

        {/* User menu */}
<div className="relative">
  <button
    onClick={() => setDropdownOpen(!dropdownOpen)}
    className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full py-1.5 px-3 hover:bg-slate-700 transition-all text-slate-200 text-sm font-semibold"
  >
    <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
      {user?.name?.charAt(0).toUpperCase()}
    </div>
    <span className="max-w-[80px] md:max-w-[120px] truncate hidden xs:block">
      {user?.name}
    </span>
  </button>

  {dropdownOpen && (
    <div className="absolute top-[120%] ltr:right-0 rtl:left-0 min-w-[220px] bg-slate-900 border border-slate-800 rounded-xl py-2 z-[100] shadow-2xl animate-in fade-in zoom-in duration-200 origin-top">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-sm font-bold text-white truncate">{user?.name}</p>
        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-2 ${roleColors[user?.role]}`}>
          {roleIcons[user?.role]} {user?.role ? t(user.role) : ''}
        </div>
      </div>
      
      <Link
        href="/dashboard/settings"
        onClick={() => setDropdownOpen(false)}
        className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
      >
        {t('dashboard_settings')}
      </Link>
      
      <button
        onClick={handleLogout}
        /* التعديل هنا: محاذاة النص حسب اتجاه اللغة */
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors ltr:text-left rtl:text-right"
      >
        <LogOut size={14} className="rtl:rotate-180" /> {t('sign_out')}
      </button>
    </div>
  )}
</div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              {t('login')}
            </Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
              {t('register')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
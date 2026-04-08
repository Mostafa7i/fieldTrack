'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  Briefcase, Mail, Lock, User, Building2, 
  GraduationCap, ShieldCheck, Eye, EyeOff, ArrowRight 
} from 'lucide-react';

export default function RegisterPage() {
  const t = useTranslations('Auth');
  const { register } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'student', label: t('role_student'), icon: GraduationCap },
    { value: 'company', label: t('role_company'), icon: Building2 },
    { value: 'supervisor', label: t('role_supervisor'), icon: ShieldCheck },
  ];

  // 1. تعريف مخطط التحقق باستخدام Yup
  const validationSchema = Yup.object({
    name: Yup.string().required(t('name_required')),
    email: Yup.string().email(t('invalid_email')).required(t('email_required')),
    password: Yup.string().min(6, t('password_length_error')).required(t('password_required')),
    role: Yup.string().required(),
    companyName: Yup.string().when('role', {
      is: 'company',
      then: (schema) => schema.required(t('company_name_required')),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

  // 2. إعداد Formik
  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      role: 'student',
      companyName: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const data = await register(values);
        toast.success(t('account_created_toast', { name: data.user.name }));
        router.push(`/dashboard/${data.user.role}`);
      } catch (err) {
        toast.error(err.response?.data?.message || t('registration_failed'));
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-6 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Background Ornament */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-in fade-in duration-700">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Briefcase size={22} className="text-white" />
            </div>
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500">
              FieldTrack
            </span>
          </Link>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">{t('create_account')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{t('choose_role')}</p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {roles.map((r) => {
              const Icon = r.icon;
              const active = formik.values.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => formik.setFieldValue('role', r.value)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                    active 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Icon size={20} className="mb-1.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{r.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('full_name')}</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="name"
                  type="text"
                  placeholder={t('full_name_placeholder')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 ${
                    formik.touched.name && formik.errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                  }`}
                  {...formik.getFieldProps('name')}
                />
              </div>
              {formik.touched.name && formik.errors.name && (
                <p className="text-red-500 text-[10px] mt-1 ml-1">{formik.errors.name}</p>
              )}
            </div>

            {/* Company name (Conditional) */}
            {formik.values.role === 'company' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('company_name')}</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="companyName"
                    type="text"
                    placeholder={t('company_name_placeholder')}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 ${
                        formik.touched.companyName && formik.errors.companyName ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                    }`}
                    {...formik.getFieldProps('companyName')}
                  />
                </div>
                {formik.touched.companyName && formik.errors.companyName && (
                  <p className="text-red-500 text-[10px] mt-1 ml-1">{formik.errors.companyName}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('email_address')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  placeholder={t('email_placeholder')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 ${
                    formik.touched.email && formik.errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                  }`}
                  {...formik.getFieldProps('email')}
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-[10px] mt-1 ml-1">{formik.errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('password_placeholder')}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border transition-all outline-none bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 ${
                    formik.touched.password && formik.errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                  }`}
                  {...formik.getFieldProps('password')}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-500 text-[10px] mt-1 ml-1">{formik.errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('creating_account')}
                </span>
              ) : (
                <>
                  <span>{t('create_account')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
            {t('already_have_account')}{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              {t('sign_in_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
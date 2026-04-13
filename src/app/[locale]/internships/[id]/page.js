'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../../app/components/Navbar';
import LoadingSpinner from '../../../../app/components/LoadingSpinner';
import { internshipAPI, applicationAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  MapPin, Clock, Briefcase, Building2, Calendar, DollarSign, ArrowLeft, Send
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

const statusColor = { open: 'badge-success', closed: 'badge-danger', draft: 'badge-gray' };

export default function InternshipDetailsPage() {
  const t = useTranslations('InternshipDetails');
  const tCommon = useTranslations('Common');
  const tStatus = useTranslations('Status');
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchInternship = async () => {
      try {
        const res = await internshipAPI.getOne(id);
        setInternship(res.data.data);
      } catch (err) {
        toast.error(t('failed_to_load'));
        router.push('/internships');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchInternship();
  }, [id, router]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      toast.error(t('must_login'));
      router.push('/login');
      return;
    }
    if (user?.role !== 'student') {
      toast.error(t('students_only'));
      return;
    }

    setApplying(true);
    try {
      await applicationAPI.apply({ internshipId: id });
      toast.success(t('applied_success'));
      router.push('/dashboard/student#applications');
    } catch (err) {
      toast.error(err.response?.data?.message || t('failed_to_apply'));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
         <Navbar />
         <div style={{ paddingTop: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <LoadingSpinner size={48} />
         </div>
      </div>
    );
  }

  if (!internship) return null;

  const deadline = new Date(internship.deadline);
  const isExpired = deadline < new Date();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      
      <div style={{ paddingTop: '80px', maxWidth: 1000, margin: '0 auto', padding: '96px 1.5rem 4rem' }}>
        <Link href="/internships" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, marginBottom: '2rem', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='var(--primary-light)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
          <ArrowLeft size={18} /> {t('back_to_internships')}
        </Link>
        
        {/* Header Section */}
        <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
               <div style={{ width: 80, height: 80, borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(14,165,233,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                 <Briefcase size={40} style={{ color: 'var(--primary-light)' }} />
               </div>
               <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.2 }}>{internship.title}</h1>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Building2 size={18} /> {internship.companyProfile?.companyName || internship.company?.name || tCommon('company')}
                  </p>
               </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
               <span className={`badge ${statusColor[internship.status]}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>{tStatus(internship.status).toUpperCase()}</span>
               
               {internship.status === 'open' && !isExpired && (
                  <button 
                     className="btn-primary" 
                     style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                     onClick={handleApply}
                     disabled={applying}
                  >
                     <Send size={18} /> {applying ? t('applying') : t('apply_now')}
                  </button>
               )}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)' }}><MapPin size={20} /></div>
                <div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{t('location')}</p>
                   <p style={{ fontWeight: 600 }}>{internship.location || tCommon('remote')}</p>
                </div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}><Clock size={20} /></div>
                <div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{t('type_duration')}</p>
                   <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{internship.type} • {internship.duration}</p>
                </div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Calendar size={20} /></div>
                <div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{t('deadline')}</p>
                   <p style={{ fontWeight: 600, color: isExpired ? '#ef4444' : 'inherit' }}>{deadline.toLocaleDateString()}</p>
                </div>
             </div>
             {internship.isPaid && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><DollarSign size={20} /></div>
                   <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{t('compensation')}</p>
                      <p style={{ fontWeight: 600, color: '#10b981' }}>{tCommon('paid')} {internship.salary > 0 && `(EGP ${internship.salary}/mo)`}</p>
                   </div>
                </div>
             )}
          </div>
        </div>
        
        {/* Content Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <div className="card" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   {t('about_role')}
                </h2>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                   {internship.description}
                </div>
             </div>
             
             {internship.requirements && (
                <div className="card" style={{ padding: '2rem' }}>
                   <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('requirements')}
                   </h2>
                   <div style={{ color: 'var(--text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {internship.requirements}
                   </div>
                </div>
             )}
          </div>
          
          {/* Sidebar Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('required_skills')}</h3>
                {internship.skills?.length > 0 ? (
                   <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {internship.skills.map(s => (
                         <span key={s} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            {s}
                         </span>
                      ))}
                   </div>
                ) : (
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('no_skills')}</p>
                )}
             </div>
             
             <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('overview')}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('category')}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{internship.category}</span>
                   </li>
                   <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('available_slots')}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{internship.slots}</span>
                   </li>
                   <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('applicants')}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{internship.applicationsCount || 0}</span>
                   </li>
                   <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('posted_on')}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{new Date(internship.createdAt).toLocaleDateString()}</span>
                   </li>
                </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

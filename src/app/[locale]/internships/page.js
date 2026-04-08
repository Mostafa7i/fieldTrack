'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { internshipAPI } from '@/services/api';
import { Link } from '@/i18n/routing';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Search, MapPin, Briefcase, Clock, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

const categories = ['All', 'IT', 'Engineering', 'Marketing', 'Finance', 'Design', 'Science', 'Other'];
const types = ['All', 'full-time', 'part-time', 'remote', 'hybrid'];

const statusColor = { open: 'badge-success', closed: 'badge-danger', draft: 'badge-gray' };

function InternshipCard({ internship, t }) {
  const deadline = new Date(internship.deadline);
  const isExpired = deadline < new Date();
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '0.6rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(14,165,233,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Briefcase size={20} style={{ color: 'var(--primary-light)' }} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{internship.title}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {internship.companyProfile?.companyName || internship.company?.name || t('company')}
          </p>
        </div>
        <span className={`badge ${statusColor[internship.status]}`}>{internship.status}</span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <MapPin size={12} /> {internship.location || t('remote')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Clock size={12} /> {internship.type}
        </span>
        {internship.isPaid && (
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            {t('paid')} {internship.salary > 0 ? `· $${internship.salary}/mo` : ''}
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {internship.description}
      </p>

      {/* Skills */}
      {internship.skills?.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {internship.skills.slice(0, 4).map((s) => (
            <span key={s} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '0.3rem', fontWeight: 600 }}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: isExpired ? '#ef4444' : 'var(--text-muted)' }}>
          {t('deadline_prefix')}{deadline.toLocaleDateString()}
        </span>
        <Link
          href={`/internships/${internship._id}`}
          style={{ fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}
        >
          {t('view_details')}
        </Link>
      </div>
    </div>
  );
}

export default function InternshipsPage() {
  const t = useTranslations('Internships');
  const tCommon = useTranslations('Common');
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchInternships = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      if (type !== 'All') params.type = type;
      const res = await internshipAPI.getAll(params);
      setInternships(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error(t('failed_to_load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInternships(); }, [page, category, type]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInternships();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
      <div style={{ paddingTop: '80px', maxWidth: 1200, margin: '0 auto', padding: '96px 1.5rem 4rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t('browse_internships')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{total} {t('opportunities_available')}</p>
        </div>

        {/* Search & Filters */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, minWidth: 200, gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder={t('search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.2rem' }}>{tCommon('search')}</button>
          </form>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select className="form-input" style={{ width: 'auto' }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              {categories.map((c) => <option key={c} value={c}>{c === 'All' ? t('all_categories') : t(`categories.${c}`)}</option>)}
            </select>
            <select className="form-input" style={{ width: 'auto' }} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              {types.map((tp) => <option key={tp} value={tp}>{tp === 'All' ? t('all_types') : t(`types.${tp}`)}</option>)}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center' }}><LoadingSpinner size={48} /></div>
        ) : internships.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
            <Briefcase size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '1.1rem' }}>{t('no_internships_found')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {internships.map((i) => <InternshipCard key={i._id} internship={i} t={t} />)}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={16} /> {tCommon('prev')}
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('page_of', { page, pages })}</span>
            <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
              {tCommon('next')} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

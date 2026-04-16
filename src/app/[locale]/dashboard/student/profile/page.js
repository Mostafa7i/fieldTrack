'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../../../components/Navbar';
import Sidebar from '../../../../components/Sidebar';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { studentAPI, authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { useLocale } from 'next-intl';
import {
  User, GraduationCap, Code, Target, Link, Star, Save, Check,
  MapPin, Calendar, Heart, Sparkles, BookOpen, Globe
} from 'lucide-react';

const CATEGORIES = ['IT', 'Engineering', 'Marketing', 'Finance', 'Design', 'Science', 'Healthcare', 'Education', 'Other'];
const WORK_TYPES = ['full-time', 'part-time', 'remote', 'hybrid'];
const LANGUAGES_LIST = ['Arabic', 'English', 'French', 'German', 'Spanish', 'Chinese', 'Other'];
const SKILL_SUGGESTIONS = ['Python', 'JavaScript', 'React', 'Node.js', 'Java', 'C++', 'SQL', 'Excel', 'Figma', 'AutoCAD', 'MATLAB', 'Machine Learning', 'Data Analysis', 'Photoshop', 'Leadership', 'Communication', 'Teamwork', 'Problem Solving'];

const PillToggle = ({ options, selected, onChange, color = '#6366f1' }) => (
  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
    {options.map(opt => {
      const active = (selected || []).includes(opt);
      return (
        <button key={opt} type="button"
          onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...(selected || []), opt])}
          style={{ padding: '0.35rem 0.85rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: `2px solid ${active ? color : 'var(--border)'}`, background: active ? `${color}22` : 'var(--bg-lighter)', color: active ? color : 'var(--text-muted)', transition: 'all 0.15s' }}>
          {active && <Check size={11} style={{ marginInlineEnd: 4 }} />}{opt}
        </button>
      );
    })}
  </div>
);

const SectionCard = ({ icon: Icon, title, color = '#6366f1', children }) => (
  <div className="card" style={{ borderTop: `3px solid ${color}` }}>
    <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem' }}>
      <div style={{ width: 32, height: 32, borderRadius: '0.6rem', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} style={{ color }} />
      </div>
      {title}
    </h3>
    {children}
  </div>
);

export default function StudentProfilePage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [hobbyInput, setHobbyInput] = useState('');

  const [form, setForm] = useState({
    // basic user
    name: '',
    // academic
    studentId: '', university: '', faculty: '', major: '', gpa: '', graduationYear: '', phone: '',
    bio: '',
    // skills
    skills: [],
    languages: [],
    // preferences
    preferredCategories: [], preferredTypes: [], preferredLocations: '', availableFrom: '',
    // goals
    careerGoals: '', hobbies: [],
    // links
    linkedIn: '', github: '', portfolio: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await studentAPI.getProfile();
        const p = res.data.data;
        setForm(f => ({
          ...f,
          name: user?.name || '',
          studentId: p.studentId || '',
          university: p.university || '',
          faculty: p.faculty || '',
          major: p.major || '',
          gpa: p.gpa || '',
          graduationYear: p.graduationYear || '',
          phone: p.phone || '',
          bio: p.bio || '',
          skills: p.skills || [],
          languages: p.languages || [],
          preferredCategories: p.preferredCategories || [],
          preferredTypes: p.preferredTypes || [],
          preferredLocations: (p.preferredLocations || []).join(', '),
          availableFrom: p.availableFrom ? new Date(p.availableFrom).toISOString().split('T')[0] : '',
          careerGoals: p.careerGoals || '',
          hobbies: p.hobbies || [],
          linkedIn: p.linkedIn || '',
          github: p.github || '',
          portfolio: p.portfolio || '',
        }));
      } catch { toast.error(isAr ? 'فشل تحميل بياناتك' : 'Failed to load profile'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addSkill = (s) => { const v = s.trim(); if (v && !form.skills.includes(v)) set('skills', [...form.skills, v]); setSkillInput(''); };
  const removeSkill = (s) => set('skills', form.skills.filter(x => x !== s));
  const addHobby = (h) => { const v = h.trim(); if (v && !form.hobbies.includes(v)) set('hobbies', [...form.hobbies, v]); setHobbyInput(''); };
  const removeHobby = (h) => set('hobbies', form.hobbies.filter(x => x !== h));

  const handleSave = async () => {
    setSaving(true);
    try {
      // update user name
      if (form.name !== user?.name) {
        await authAPI.updateProfile({ name: form.name });
      }
      // update student profile
      await studentAPI.updateProfile({
        studentId: form.studentId,
        university: form.university,
        faculty: form.faculty,
        major: form.major,
        gpa: form.gpa ? parseFloat(form.gpa) : 0,
        graduationYear: form.graduationYear ? parseInt(form.graduationYear) : undefined,
        phone: form.phone,
        bio: form.bio,
        skills: form.skills,
        languages: form.languages,
        preferredCategories: form.preferredCategories,
        preferredTypes: form.preferredTypes,
        preferredLocations: form.preferredLocations ? form.preferredLocations.split(',').map(l => l.trim()).filter(Boolean) : [],
        availableFrom: form.availableFrom || undefined,
        careerGoals: form.careerGoals,
        hobbies: form.hobbies,
        linkedIn: form.linkedIn,
        github: form.github,
        portfolio: form.portfolio,
        profileCompleted: true,
      });
      toast.success(isAr ? '✅ تم حفظ التغييرات بنجاح' : '✅ Changes saved successfully');
    } catch { toast.error(isAr ? 'فشل الحفظ' : 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div>
        <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
        <div className="dashboard-layout" style={{ paddingTop: '64px' }}>
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="main-content">

            {/* Header */}
            <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                  {isAr ? '⚙️ ملفي الشخصي وتفضيلاتي' : '⚙️ My Profile & Preferences'}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  {isAr
                    ? 'حدّث معلوماتك لتحصل على توصيات تدريب أكثر دقة من الذكاء الاصطناعي'
                    : 'Keep your info updated for more accurate AI-powered internship recommendations'}
                </p>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 140, justifyContent: 'center' }}>
                {saving ? <LoadingSpinner size={18} /> : <Save size={18} />}
                {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
              </button>
            </div>

            {/* AI context banner */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.3)', marginBottom: '1.5rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary-light)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem', color: 'var(--primary-light)' }}>
                  {isAr ? 'كلما كان ملفك أكثر اكتمالاً، كانت توصيات الذكاء الاصطناعي أدق' : 'The more complete your profile, the more accurate the AI recommendations'}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {isAr
                    ? 'يستخدم نظامنا الذكي مهاراتك وتفضيلاتك وأهدافك المهنية معاً لاقتراح أنسب فرص التدريب لك.'
                    : 'Our AI uses your skills, preferences, and career goals together to suggest the most suitable internships for you.'}
                </p>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner size={40} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* ── Section 1: Personal ─────────────────── */}
                <SectionCard icon={User} title={isAr ? 'المعلومات الشخصية' : 'Personal Information'} color="#6366f1">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'الاسم الكامل' : 'Full Name'}</label>
                      <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'الرقم الجامعي' : 'Student ID'}</label>
                      <input className="form-input" value={form.studentId} onChange={e => set('studentId', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'الهاتف' : 'Phone'}</label>
                      <input className="form-input" placeholder="+20 1xx xxxx xxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{isAr ? 'نبذة شخصية (Bio)' : 'Personal Bio'}</label>
                      <textarea className="form-input" rows={3} maxLength={800} value={form.bio} onChange={e => set('bio', e.target.value)}
                        placeholder={isAr ? 'نبذة مختصرة تعرّف بنفسك...' : 'Brief description about yourself...'} />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'end', marginTop: '0.2rem' }}>{form.bio.length}/800</p>
                    </div>
                  </div>
                </SectionCard>

                {/* ── Section 2: Academic ─────────────────── */}
                <SectionCard icon={GraduationCap} title={isAr ? 'المعلومات الأكاديمية' : 'Academic Information'} color="#10b981">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🏛 {isAr ? 'الجامعة' : 'University'}</label>
                      <input className="form-input" placeholder={isAr ? 'جامعة القاهرة' : 'Cairo University'} value={form.university} onChange={e => set('university', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>📚 {isAr ? 'الكلية' : 'Faculty'}</label>
                      <input className="form-input" placeholder={isAr ? 'كلية الهندسة' : 'Faculty of Engineering'} value={form.faculty} onChange={e => set('faculty', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🎓 {isAr ? 'التخصص' : 'Major'}</label>
                      <input className="form-input" placeholder={isAr ? 'هندسة البرمجيات' : 'Software Engineering'} value={form.major} onChange={e => set('major', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>📊 GPA (0–5)</label>
                      <input className="form-input" type="number" min="0" max="5" step="0.01" placeholder="3.5" value={form.gpa} onChange={e => { let v = e.target.value; if (v !== '' && Number(v) > 5) v = '5'; else if (v !== '' && Number(v) < 0) v = '0'; set('gpa', v); }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🗓 {isAr ? 'سنة التخرج' : 'Graduation Year'}</label>
                      <input className="form-input" type="number" min="2024" max="2035" placeholder="2026" value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)} />
                    </div>
                  </div>
                </SectionCard>

                {/* ── Section 3: Skills ───────────────────── */}
                <SectionCard icon={Code} title={isAr ? 'المهارات واللغات' : 'Skills & Languages'} color="#f59e0b">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>💡 {isAr ? 'مهاراتك' : 'Your Skills'}</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <input className="form-input" placeholder={isAr ? 'أضف مهارة...' : 'Add a skill...'} value={skillInput}
                          onChange={e => setSkillInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                          style={{ flex: 1 }} />
                        <button type="button" onClick={() => addSkill(skillInput)} className="btn-primary" style={{ padding: '0 1rem', flexShrink: 0, fontSize: '0.85rem' }}>{isAr ? 'إضافة' : 'Add'}</button>
                      </div>
                      {form.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          {form.skills.map(s => (
                            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>
                              {s}
                              <button type="button" onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: 0, fontSize: '1rem', opacity: 0.7 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>{isAr ? 'اقتراحات:' : 'Suggestions:'}</p>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {SKILL_SUGGESTIONS.filter(s => !form.skills.includes(s)).map(s => (
                          <button key={s} type="button" onClick={() => addSkill(s)}
                            style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg-lighter)', border: '1px solid var(--border)', borderRadius: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            + {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>🌍 {isAr ? 'اللغات التي تتحدثها' : 'Languages You Speak'}</label>
                      <PillToggle options={LANGUAGES_LIST} selected={form.languages} onChange={val => set('languages', val)} color="#f59e0b" />
                    </div>
                  </div>
                </SectionCard>

                {/* ── Section 4: Preferences ──────────────── */}
                <SectionCard icon={Target} title={isAr ? 'تفضيلات التدريب' : 'Internship Preferences'} color="#8b5cf6">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>📂 {isAr ? 'المجالات المفضلة' : 'Preferred Categories'}</label>
                      <PillToggle options={CATEGORIES} selected={form.preferredCategories} onChange={val => set('preferredCategories', val)} color="#8b5cf6" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>🏢 {isAr ? 'نوع العمل المفضل' : 'Preferred Work Type'}</label>
                      <PillToggle options={WORK_TYPES} selected={form.preferredTypes} onChange={val => set('preferredTypes', val)} color="#8b5cf6" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                          <MapPin size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{isAr ? 'المواقع المفضلة' : 'Preferred Locations'}
                        </label>
                        <input className="form-input" placeholder={isAr ? 'القاهرة، Remote (افصل بفاصلة)' : 'Cairo, Remote (comma separated)'} value={form.preferredLocations} onChange={e => set('preferredLocations', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                          <Calendar size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{isAr ? 'متاح للبدء من' : 'Available From'}
                        </label>
                        <input type="date" className="form-input" value={form.availableFrom} onChange={e => set('availableFrom', e.target.value)} min={new Date().toISOString().split('T')[0]} />
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* ── Section 5: Goals & Hobbies ──────────── */}
                <SectionCard icon={Star} title={isAr ? 'الأهداف المهنية والاهتمامات' : 'Career Goals & Interests'} color="#ec4899">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🎯 {isAr ? 'أهدافك المهنية' : 'Career Goals'}</label>
                      <textarea className="form-input" rows={4} maxLength={600} value={form.careerGoals} onChange={e => set('careerGoals', e.target.value)}
                        placeholder={isAr ? 'ما الذي تطمح إليه مهنياً؟' : 'What do you aspire to professionally?'} />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'end', marginTop: '0.2rem' }}>{form.careerGoals.length}/600</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                        <Heart size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />{isAr ? 'الاهتمامات والهوايات' : 'Interests & Hobbies'}
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input className="form-input" placeholder={isAr ? 'أضف هواية...' : 'Add a hobby...'} value={hobbyInput}
                          onChange={e => setHobbyInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHobby(hobbyInput); } }} style={{ flex: 1 }} />
                        <button type="button" onClick={() => addHobby(hobbyInput)} className="btn-secondary" style={{ padding: '0 1rem', flexShrink: 0, fontSize: '0.85rem' }}>{isAr ? 'إضافة' : 'Add'}</button>
                      </div>
                      {form.hobbies.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {form.hobbies.map(h => (
                            <span key={h} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.35)', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700, color: '#ec4899' }}>
                              {h}
                              <button type="button" onClick={() => removeHobby(h)} style={{ background: 'none', border: 'none', color: '#ec4899', cursor: 'pointer', padding: 0, fontSize: '1rem', opacity: 0.7 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </SectionCard>

                {/* ── Section 6: Links ────────────────────── */}
                <SectionCard icon={Link} title={isAr ? 'الروابط المهنية' : 'Professional Links'} color="#0ea5e9">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>💼 LinkedIn</label>
                      <input className="form-input" placeholder="linkedin.com/in/yourname" value={form.linkedIn} onChange={e => set('linkedIn', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🐱 GitHub</label>
                      <input className="form-input" placeholder="github.com/username" value={form.github} onChange={e => set('github', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🌐 Portfolio</label>
                      <input className="form-input" placeholder="yourportfolio.com" value={form.portfolio} onChange={e => set('portfolio', e.target.value)} />
                    </div>
                  </div>
                </SectionCard>

                {/* Save button (bottom) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '1rem' }}>
                  <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 160, justifyContent: 'center' }}>
                    {saving ? <LoadingSpinner size={18} /> : <Save size={18} />}
                    {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ جميع التغييرات' : 'Save All Changes')}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

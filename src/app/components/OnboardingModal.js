'use client';
import { useState } from 'react';
import { studentAPI } from '@/services/api';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import {
  GraduationCap, Target, ChevronRight, ChevronLeft,
  Check, Sparkles, MapPin, Calendar, Code,
  Heart, Link, User, Star, X
} from 'lucide-react';

/* ── Data constants ──────────────────────────────────── */
const CATEGORIES = ['IT', 'Engineering', 'Marketing', 'Finance', 'Design', 'Science', 'Healthcare', 'Education', 'Other'];
const WORK_TYPES = ['full-time', 'part-time', 'remote', 'hybrid'];
const LANGUAGES = ['Arabic', 'English', 'French', 'German', 'Spanish', 'Chinese', 'Other'];
const SKILL_SUGGESTIONS = [
  'Python', 'JavaScript', 'React', 'Node.js', 'Java', 'C++', 'SQL',
  'Excel', 'Figma', 'AutoCAD', 'MATLAB', 'Machine Learning',
  'Data Analysis', 'Photoshop', 'Leadership', 'Communication',
  'Teamwork', 'Problem Solving',
];

/* ── Pill toggle (safe: always uses array) ───────────── */
const PillToggle = ({ options = [], selected, onChange, color = '#6366f1' }) => {
  const safeSelected = Array.isArray(selected) ? selected : [];
  return (
    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = safeSelected.includes(opt);
        return (
          <button key={opt} type="button"
            onClick={() => onChange(active ? safeSelected.filter(s => s !== opt) : [...safeSelected, opt])}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', border: `2px solid ${active ? color : 'var(--border)'}`,
              background: active ? `${color}22` : 'var(--bg-lighter)',
              color: active ? color : 'var(--text-muted)',
              transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            }}>
            {active && <Check size={11} />}{opt}
          </button>
        );
      })}
    </div>
  );
};

/* ── Steps ───────────────────────────────────────────── */
const STEPS = [
  { id: 'academic',     icon: GraduationCap, titleAr: 'المعلومات الأكاديمية',      titleEn: 'Academic Information',       descAr: 'أخبرنا عن دراستك لتحسين توصياتنا',               descEn: 'Tell us about your studies',               color: '#6366f1' },
  { id: 'skills',       icon: Code,          titleAr: 'مهاراتك وخبراتك',           titleEn: 'Skills & Experience',        descAr: 'ما المهارات التي تمتلكها؟',                       descEn: 'What skills do you have?',                 color: '#10b981' },
  { id: 'preferences',  icon: Target,        titleAr: 'تفضيلات التدريب',           titleEn: 'Internship Preferences',     descAr: 'ما الذي تبحث عنه في التدريب المثالي؟',           descEn: 'What do you look for in an internship?',   color: '#f59e0b' },
  { id: 'goals',        icon: Star,          titleAr: 'أهدافك المهنية',            titleEn: 'Career Goals',               descAr: 'أين تريد أن تصل مهنياً؟',                        descEn: 'Where do you want to go in your career?',  color: '#8b5cf6' },
  { id: 'links',        icon: Link,          titleAr: 'روابطك المهنية',            titleEn: 'Professional Links',         descAr: 'أضف روابط لتقوية ملفك الشخصي',                   descEn: 'Add links to strengthen your profile',     color: '#0ea5e9' },
];

/* ── Default state (all fields guaranteed to exist) ─── */
const INITIAL = {
  university: '', faculty: '', major: '', gpa: '', graduationYear: '',
  studentId: '', phone: '', bio: '',
  skills: [],
  languages: [],
  preferredCategories: [], preferredTypes: [],
  preferredLocations: '', availableFrom: '',
  careerGoals: '',
  hobbies: [],
  linkedIn: '', github: '', portfolio: '',
};

export default function OnboardingModal({ onComplete, userName }) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [hobbyInput, setHobbyInput] = useState('');
  const [data, setData]       = useState(INITIAL);

  /* helpers */
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const addSkill = (raw) => {
    const v = (raw || '').trim();
    if (!v) return;
    const skills = Array.isArray(data.skills) ? data.skills : [];
    if (!skills.includes(v)) set('skills', [...skills, v]);
    setSkillInput('');
  };

  const removeSkill = (s) =>
    set('skills', (Array.isArray(data.skills) ? data.skills : []).filter(x => x !== s));

  const addHobby = (raw) => {
    const v = (raw || '').trim();
    if (!v) return;
    const hobbies = Array.isArray(data.hobbies) ? data.hobbies : [];
    if (!hobbies.includes(v)) set('hobbies', [...hobbies, v]);
    setHobbyInput('');
  };

  const removeHobby = (h) =>
    set('hobbies', (Array.isArray(data.hobbies) ? data.hobbies : []).filter(x => x !== h));

  const isStepValid = () => {
    if (step === 0) return (data.university || '').trim() && (data.major || '').trim();
    if (step === 1) return (Array.isArray(data.skills) ? data.skills : []).length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const skills    = Array.isArray(data.skills)    ? data.skills    : [];
      const hobbies   = Array.isArray(data.hobbies)   ? data.hobbies   : [];
      const languages = Array.isArray(data.languages)  ? data.languages  : [];
      const prefCats  = Array.isArray(data.preferredCategories) ? data.preferredCategories : [];
      const prefTypes = Array.isArray(data.preferredTypes)      ? data.preferredTypes      : [];
      const prefLocs  = (data.preferredLocations || '')
        .split(',').map(l => l.trim()).filter(Boolean);

      await studentAPI.updateProfile({
        ...data,
        skills, hobbies, languages,
        preferredCategories: prefCats,
        preferredTypes: prefTypes,
        preferredLocations: prefLocs,
        gpa: data.gpa ? parseFloat(data.gpa) : 0,
        graduationYear: data.graduationYear ? parseInt(data.graduationYear) : undefined,
        profileCompleted: true,
      });
      toast.success(isAr ? '🎉 تم حفظ ملفك الشخصي!' : '🎉 Profile saved!');
      onComplete();
    } catch {
      toast.error(isAr ? 'فشل الحفظ، حاول مرة أخرى' : 'Save failed, please try again');
    } finally {
      setSaving(false);
    }
  };

  /* derived */
  const currentStep = STEPS[step];
  const StepIcon    = currentStep.icon;
  const progress    = ((step + 1) / STEPS.length) * 100;
  const skills      = Array.isArray(data.skills)  ? data.skills  : [];
  const hobbies     = Array.isArray(data.hobbies) ? data.hobbies : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(12px)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 620, maxHeight: '95vh', overflowY: 'auto',
        background: 'var(--bg-card)', borderRadius: '1.25rem',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)', border: '1px solid var(--border)',
        direction: isAr ? 'rtl' : 'ltr',
      }}>

        {/* ── Header ──────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${currentStep.color}22, ${currentStep.color}08)`,
          borderBottom: '1px solid var(--border)', padding: '1.75rem 2rem 1.5rem',
        }}>
       
          {step === 0 && (
            <div style={{ display: 'flex', alignItems: 'center',justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.82rem', color: currentStep.color, fontWeight: 700 }}>
              <div>
                <Sparkles size={15} />
              {isAr ? `مرحباً ${userName || ''}! دعنا نعرفك 👋` : `Welcome ${userName || ''}! Let's get to know you 👋`}
              </div>
                 <button onClick={onComplete} style={{  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', color: 'var(--text-primary)' }}>
            <X size={20} />
          </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: `${currentStep.color}22`, border: `2px solid ${currentStep.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <StepIcon size={22} style={{ color: currentStep.color }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>
                {isAr ? currentStep.titleAr : currentStep.titleEn}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.15rem 0 0' }}>
                {isAr ? currentStep.descAr : currentStep.descEn}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              <span>{isAr ? `الخطوة ${step + 1} من ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}</span>
              <span style={{ color: currentStep.color, fontWeight: 700 }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${currentStep.color}, ${currentStep.color}cc)`, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', justifyContent: 'center' }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i <= step ? 24 : 8, height: 8, borderRadius: 4, background: i <= step ? currentStep.color : 'rgba(255,255,255,0.12)', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────── */}
        <div style={{ padding: '1.75rem 2rem' }}>

          {/* STEP 0: Academic */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🏛 {isAr ? 'الجامعة *' : 'University *'}</label>
                  <input className="form-input" placeholder={isAr ? 'جامعة القاهرة' : 'Cairo University'} value={data.university} onChange={e => set('university', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>📚 {isAr ? 'الكلية' : 'Faculty'}</label>
                  <input className="form-input" placeholder={isAr ? 'كلية الهندسة' : 'Faculty of Engineering'} value={data.faculty} onChange={e => set('faculty', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🎓 {isAr ? 'التخصص *' : 'Major *'}</label>
                <input className="form-input" placeholder={isAr ? 'هندسة البرمجيات' : 'Software Engineering'} value={data.major} onChange={e => set('major', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>📊 {isAr ? 'المعدل (GPA)' : 'GPA (0–5)'}</label>
                  <input className="form-input" type="number" min="0" max="5" step="0.01" placeholder="3.5" value={data.gpa} onChange={e => { let v = e.target.value; if (v !== '' && Number(v) > 5) v = '5'; else if (v !== '' && Number(v) < 0) v = '0'; set('gpa', v); }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🗓 {isAr ? 'سنة التخرج' : 'Grad. Year'}</label>
                  <input className="form-input" type="number" min="2024" max="2035" placeholder="2026" value={data.graduationYear} onChange={e => set('graduationYear', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>📞 {isAr ? 'الهاتف' : 'Phone'}</label>
                  <input className="form-input" placeholder="+20 1xx..." value={data.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🌍 {isAr ? 'اللغات التي تتحدثها' : 'Languages You Speak'}</label>
                <PillToggle options={LANGUAGES} selected={data.languages} onChange={val => set('languages', val)} color="#6366f1" />
              </div>
            </div>
          )}

          {/* STEP 1: Skills */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  💡 {isAr ? 'أضف مهاراتك *' : 'Add Your Skills *'}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input className="form-input" placeholder={isAr ? 'مثال: Python، React...' : 'e.g. Python, React...'}
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                    style={{ flex: 1 }} />
                  <button type="button" onClick={() => addSkill(skillInput)} className="btn-primary" style={{ padding: '0 1rem', flexShrink: 0, fontSize: '0.85rem' }}>
                    {isAr ? 'إضافة' : 'Add'}
                  </button>
                </div>

                {skills.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {skills.map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
                        {s}
                        <button type="button" onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1, opacity: 0.7 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {isAr ? 'اقتراحات سريعة:' : 'Quick suggestions:'}
                </p>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).map(s => (
                    <button key={s} type="button" onClick={() => addSkill(s)}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg-lighter)', border: '1px solid var(--border)', borderRadius: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>📝 {isAr ? 'نبذة عنك (اختياري)' : 'About You (optional)'}</label>
                <textarea className="form-input" rows={3}
                  placeholder={isAr ? 'اكتب نبذة مختصرة...' : 'Write a brief about yourself...'}
                  value={data.bio} onChange={e => set('bio', e.target.value)} maxLength={800} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'end', marginTop: '0.25rem' }}>
                  {(data.bio || '').length}/800
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Preferences */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>📂 {isAr ? 'المجالات المفضلة' : 'Preferred Categories'}</label>
                <PillToggle options={CATEGORIES} selected={data.preferredCategories} onChange={val => set('preferredCategories', val)} color="#f59e0b" />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>🏢 {isAr ? 'نوع العمل المفضل' : 'Preferred Work Type'}</label>
                <PillToggle options={WORK_TYPES} selected={data.preferredTypes} onChange={val => set('preferredTypes', val)} color="#f59e0b" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    <MapPin size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
                    {isAr ? 'المواقع المفضلة' : 'Preferred Locations'}
                  </label>
                  <input className="form-input" placeholder={isAr ? 'القاهرة، Remote' : 'Cairo, Remote'} value={data.preferredLocations} onChange={e => set('preferredLocations', e.target.value)} />
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{isAr ? 'افصل بفاصلة' : 'Comma separated'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    <Calendar size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
                    {isAr ? 'متاح من' : 'Available From'}
                  </label>
                  <input type="date" className="form-input" value={data.availableFrom} onChange={e => set('availableFrom', e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Goals */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🎯 {isAr ? 'أهدافك المهنية' : 'Career Goals'}</label>
                <textarea className="form-input" rows={4}
                  placeholder={isAr ? 'مثال: أريد أن أصبح مهندس برمجيات متخصص في الذكاء الاصطناعي...' : 'e.g. I want to become a software engineer specializing in AI...'}
                  value={data.careerGoals} onChange={e => set('careerGoals', e.target.value)} maxLength={600} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'end', marginTop: '0.25rem' }}>
                  {(data.careerGoals || '').length}/600
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  <Heart size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
                  {isAr ? 'الهوايات (اختياري)' : 'Hobbies (optional)'}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input className="form-input" placeholder={isAr ? 'مثال: القراءة، شطرنج...' : 'e.g. Reading, Chess...'}
                    value={hobbyInput}
                    onChange={e => setHobbyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHobby(hobbyInput); } }}
                    style={{ flex: 1 }} />
                  <button type="button" onClick={() => addHobby(hobbyInput)} className="btn-secondary" style={{ padding: '0 0.9rem', fontSize: '0.82rem', flexShrink: 0 }}>
                    {isAr ? 'إضافة' : 'Add'}
                  </button>
                </div>
                {hobbies.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {hobbies.map(h => (
                      <span key={h} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700, color: '#8b5cf6' }}>
                        {h}
                        <button type="button" onClick={() => removeHobby(h)} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1, opacity: 0.7 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* AI hint */}
              <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.75rem', padding: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14} /> {isAr ? 'كيف يستخدم الذكاء الاصطناعي هذه المعلومات؟' : 'How does AI use this?'}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {isAr
                    ? 'يستخدم AI أهدافك وتفضيلاتك لاقتراح فرص تدريبية تتوافق مع مسيرتك المهنية، وليس فقط مهاراتك.'
                    : 'AI uses your goals and preferences to match internships to your career path — not just your skills.'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Links + Summary */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>💼 LinkedIn URL</label>
                <input className="form-input" placeholder="linkedin.com/in/yourname" value={data.linkedIn} onChange={e => set('linkedIn', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🐱 GitHub URL</label>
                <input className="form-input" placeholder="github.com/username" value={data.github} onChange={e => set('github', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🌐 {isAr ? 'الموقع الشخصي / Portfolio' : 'Portfolio / Website'}</label>
                <input className="form-input" placeholder="yourportfolio.com" value={data.portfolio} onChange={e => set('portfolio', e.target.value)} />
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '1.25rem' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: '0 0 0.85rem' }}>
                  <User size={16} style={{ color: 'var(--primary-light)' }} />
                  {isAr ? 'ملخص ملفك الشخصي' : 'Your Profile Summary'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                  {[
                    { label: isAr ? 'الجامعة'        : 'University',      val: data.university || '—' },
                    { label: isAr ? 'التخصص'          : 'Major',           val: data.major || '—' },
                    { label: 'GPA',                                         val: data.gpa || '—' },
                    { label: isAr ? 'المهارات'        : 'Skills',          val: skills.length > 0 ? skills.slice(0, 5).join(', ') + (skills.length > 5 ? ` +${skills.length - 5}` : '') : '—' },
                    { label: isAr ? 'المجالات المفضلة' : 'Preferred Fields', val: (Array.isArray(data.preferredCategories) ? data.preferredCategories : []).join(', ') || '—' },
                    { label: isAr ? 'نوع العمل'       : 'Work Type',       val: (Array.isArray(data.preferredTypes) ? data.preferredTypes : []).join(', ') || '—' },
                    { label: isAr ? 'اللغات'          : 'Languages',       val: (Array.isArray(data.languages) ? data.languages : []).join(', ') || '—' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 120, flexShrink: 0 }}>{row.label}:</span>
                      <span style={{ fontWeight: 600 }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 2rem', borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.15)', borderRadius: '0 0 1.25rem 1.25rem',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <button type="button"
            onClick={() => step > 0 && setStep(s => s - 1)}
            disabled={step === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', background: 'none', border: '1px solid var(--border)', borderRadius: '0.6rem', color: 'var(--text-muted)', cursor: step > 0 ? 'pointer' : 'default', fontWeight: 600, fontSize: '0.85rem', opacity: step === 0 ? 0.4 : 1 }}>
            {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {isAr ? 'السابق' : 'Previous'}
          </button>

          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isAr ? 'يمكنك تعديل هذه المعلومات لاحقاً' : 'You can edit this info later'}
          </span>

          {step < STEPS.length - 1 ? (
            <button type="button"
              onClick={() => {
                if (isStepValid()) setStep(s => s + 1);
                else toast.error(isAr ? 'رجاءً أكمل الحقول المطلوبة *' : 'Please fill required fields *');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', background: currentStep.color, color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
              {isAr ? 'التالي' : 'Next'}
              {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <button type="button" onClick={handleFinish} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.4rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? <LoadingSpinner size={16} /> : <Check size={16} />}
              {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? '🎉 أكمل ملفي الشخصي' : '🎉 Complete My Profile')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

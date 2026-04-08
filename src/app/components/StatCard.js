export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) {
  return (
    <div className={`stat-card ${color}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            {title}
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{value ?? '—'}</p>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '0.6rem',
              background: colorBg[color],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={22} style={{ color: colorFg[color] }} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
          <span style={{ color: trend >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
          <span style={{ color: 'var(--text-muted)' }}>vs last month</span>
        </div>
      )}
    </div>
  );
}

const colorBg = {
  indigo: 'rgba(99,102,241,0.12)',
  sky: 'rgba(14,165,233,0.12)',
  emerald: 'rgba(16,185,129,0.12)',
  amber: 'rgba(245,158,11,0.12)',
  rose: 'rgba(239,68,68,0.12)',
};
const colorFg = {
  indigo: '#818cf8',
  sky: '#38bdf8',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fca5a5',
};

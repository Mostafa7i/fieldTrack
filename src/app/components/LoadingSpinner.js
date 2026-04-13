export default function LoadingSpinner({ size = 32 }) {
  return (
    <div className="flex items-center justify-center">
      <div 
        style={{
          width: size,
          height: size,
          border: `3px solid rgba(99,102,241,0.2)`,
          borderTop: `3px solid var(--primary)`,
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { useApp } from '../context/AppContext';

const COLORS = {
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' },
  info: { bg: 'rgba(37,99,255,0.12)', border: 'rgba(37,99,255,0.3)', color: '#60a5fa' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' },
};

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const c = COLORS[toast.type] || COLORS.info;
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: c.bg, border: `1px solid ${c.border}`,
        color: c.color, borderRadius: 8, padding: '10px 16px',
        fontSize: 13, fontFamily: 'IBM Plex Sans', maxWidth: 360,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        animation: 'fadeIn .2s ease',
      }}
    >
      {toast.msg}
    </div>
  );
}

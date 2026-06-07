import { useApp } from '../context/AppContext';

// FIX #12: Modal interno substitui alert() nativo
export default function Modal() {
  const { modal, closeModal } = useApp();
  if (!modal) return null;

  const VARIANT_STYLES = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="card" style={{ maxWidth: 460, width: '100%', padding: '24px', background: '#111318' }}>
        <h3 className="text-base font-semibold mb-3" style={{ color: '#e2e8f0' }}>{modal.title}</h3>
        {modal.message && (
          <p className="text-sm mb-5" style={{ color: '#9ca3af', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
            {modal.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2 justify-end">
          {(modal.actions || []).map((action, i) => (
            <button key={i} className={`btn ${VARIANT_STYLES[action.variant] || 'btn-secondary'}`} onClick={action.action}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

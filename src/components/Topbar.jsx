import { useApp } from '../context/AppContext';
import { Save, RotateCcw, Undo2, Download } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, formatDateTime } from '../lib/helpers';

const TABS = [
  { id: 'dados', label: 'Dados' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'copies', label: 'Copies' },
  { id: 'executar', label: 'Executar' },
  { id: 'historico', label: 'Histórico' },
];

export default function Topbar() {
  const { draft, activeTab, setActiveTab, isDirty, lastSavedAt, salvar, desfazer, exportarLancamento } = useApp();

  if (!draft) return null;

  const syncStatus = draft.syncStatus || 'sincronizado';
  const syncLabel = { sincronizado: 'Sincronizado', pendente: 'Alterações pendentes', erro: 'Erro de sincronização' }[syncStatus];
  const syncColor = { sincronizado: '#22c55e', pendente: '#f59e0b', erro: '#ef4444' }[syncStatus];
  const syncDot = { sincronizado: 'dot-green', pendente: 'dot-amber', erro: 'dot-red' }[syncStatus];

  const dirtyLabel = isDirty ? '🟡 Alterações não salvas' : null;

  return (
    <div style={{ background: '#0d1117', borderBottom: '1px solid #1a2233' }}>
      {/* Title row */}
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold truncate" style={{ color: '#e2e8f0', fontSize: 15 }}>
            {draft.nome || 'Sem nome'}
          </span>
          {draft.statusLancamento && (
            <span className={`badge ${STATUS_COLORS[draft.statusLancamento]}`}>
              {STATUS_LABELS[draft.statusLancamento]}
            </span>
          )}
          {dirtyLabel && (
            <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'IBM Plex Mono, monospace' }}>{dirtyLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 px-2">
            <span className={`status-dot ${syncDot}`} />
            <span style={{ fontSize: 11, color: syncColor, fontFamily: 'IBM Plex Mono, monospace' }}>{syncLabel}</span>
          </div>

          {lastSavedAt && (
            <span style={{ fontSize: 10, color: '#374151', fontFamily: 'IBM Plex Mono, monospace' }}>
              Salvo {formatDateTime(lastSavedAt)}
            </span>
          )}

          <button className="btn btn-ghost btn-sm" onClick={desfazer} title="Desfazer alterações">
            <Undo2 size={13} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportarLancamento} title="Exportar lançamento">
            <Download size={13} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={salvar}>
            <Save size={13} /> Salvar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 gap-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

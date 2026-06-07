import { useApp } from '../context/AppContext';
import { formatDateTime } from '../lib/helpers';
import { RotateCcw, Clock } from 'lucide-react';

export default function TabHistorico() {
  const { draft, reverterVersao } = useApp();
  if (!draft) return null;

  const versoes = draft.versoes || [];

  return (
    <div className="max-w-xl">
      <h2 className="text-base font-semibold mb-1" style={{ color: '#e2e8f0' }}>Histórico de Versões</h2>
      <p className="text-xs mb-4" style={{ color: '#6b7280' }}>Últimas 3 versões salvas. Restaurar retorna ao estado exato daquela versão.</p>

      {versoes.length === 0 && (
        <div className="card p-8 text-center">
          <Clock size={24} style={{ color: '#374151', margin: '0 auto 8px' }} />
          <p style={{ color: '#4b5563', fontSize: 14 }}>Nenhuma versão salva ainda.</p>
          <p className="text-xs mt-1" style={{ color: '#374151' }}>Clique em Salvar para criar a primeira versão.</p>
        </div>
      )}

      <div className="space-y-3">
        {versoes.map((versao, i) => {
          const lanc = versao.data;
          return (
            <div key={i} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {i === 0 && <span className="badge badge-green" style={{ fontSize: 10 }}>Mais recente</span>}
                    <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'IBM Plex Mono' }}>
                      Versão {versoes.length - i} · {formatDateTime(versao.savedAt)}
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: '#e2e8f0' }}>{lanc?.nome || 'Sem nome'}</div>
                  <div className="text-xs mt-1 space-x-3" style={{ color: '#4b5563' }}>
                    <span>{lanc?.copies?.length || 0} copies</span>
                    <span>Status: {lanc?.statusLancamento || '—'}</span>
                    <span>Checkout: {lanc?.linkCheckout ? '✓' : '—'}</span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { if (confirm(`Restaurar versão de ${formatDateTime(versao.savedAt)}? As alterações não salvas serão perdidas.`)) reverterVersao(i); }}
                >
                  <RotateCcw size={12} /> Restaurar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useApp } from '../context/AppContext';
import { STATUS_LABELS } from '../lib/helpers';

const Field = ({ label, children }) => (
  <div>
    <label>{label}</label>
    {children}
  </div>
);

export default function TabDados() {
  const { draft, updateDraft } = useApp();
  if (!draft) return null;

  const set = (key, val) => updateDraft(d => { d[key] = val; return d; });

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#e2e8f0' }}>Dados do Lançamento</h2>

        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nome do lançamento">
                <input value={draft.nome} onChange={e => set('nome', e.target.value)} placeholder="ex: Meteórico #01" />
              </Field>
            </div>
            <Field label="Nome da campanha no Devzapp">
              <input value={draft.nomeCampanhaDevzapp} onChange={e => set('nomeCampanhaDevzapp', e.target.value)} placeholder="ex: Meteórico - Saradas ON - Leads" />
            </Field>
            <Field label="Produto">
              <input value={draft.produto} onChange={e => set('produto', e.target.value)} placeholder="ex: Saradas ON" />
            </Field>
            <Field label="Ticket">
              <input value={draft.ticket} onChange={e => set('ticket', e.target.value)} placeholder="ex: R$197 ou 3x R$69" />
            </Field>
            <Field label="Link de checkout">
              <input value={draft.linkCheckout} onChange={e => set('linkCheckout', e.target.value)} placeholder="https://..." />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Data de início">
              <input type="date" value={draft.dataInicio} onChange={e => set('dataInicio', e.target.value)} />
            </Field>
            <Field label="Data de abertura">
              <input type="date" value={draft.dataAbertura} onChange={e => set('dataAbertura', e.target.value)} />
            </Field>
            <Field label="Data de fechamento">
              <input type="date" value={draft.dataFechamento} onChange={e => set('dataFechamento', e.target.value)} />
            </Field>
          </div>

          <Field label="Status do lançamento">
            <select value={draft.statusLancamento} onChange={e => set('statusLancamento', e.target.value)}>
              <option value="rascunho">Rascunho</option>
              <option value="em_preparacao">Em preparação</option>
              <option value="em_execucao">Em execução</option>
              <option value="em_venda">Em venda</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>

          <Field label="Observações internas">
            <textarea
              value={draft.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              rows={4}
              placeholder="Notas internas sobre este lançamento..."
            />
          </Field>
        </div>
      </div>

      {/* Resumo */}
      <div className="card p-4">
        <div className="text-xs mb-3" style={{ color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'IBM Plex Mono' }}>Resumo Operacional</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Copies" value={draft.copies?.length || 0} />
          <InfoRow label="Disparos agendados" value={draft.copies?.filter(c => c.data && c.hora).length || 0} />
          <InfoRow label="Grupo Leads" value={draft.grupos?.leads?.nome || '—'} />
          <InfoRow label="Grupo Alunas" value={draft.grupos?.alunas?.nome || '—'} />
          <InfoRow label="Admins (Leads)" value={draft.grupos?.leads?.admins?.length || 0} />
          <InfoRow label="Admins (Alunas)" value={draft.grupos?.alunas?.admins?.length || 0} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid #1e232d' }}>
      <span style={{ color: '#6b7280', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 13, fontFamily: 'IBM Plex Mono' }}>{value}</span>
    </div>
  );
}

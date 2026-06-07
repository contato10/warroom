import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { validarBloqueantes, validarAlertas, sortCopies, TIPO_BLOCO_LABELS, formatDate, formatDateTime } from '../lib/helpers';
import { AlertTriangle, CheckCircle, XCircle, PlayCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

function gerarEtapasIniciais(lanc) {
  const etapas = [];
  etapas.push({ id: 'f1_login', fase: 1, label: 'Abrir Devzapp e verificar login', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_leads_criar', fase: 1, label: 'Criar grupo Leads no Devzapp', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_leads_foto', fase: 1, label: 'Inserir foto do grupo Leads', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_leads_bio', fase: 1, label: 'Inserir bio do grupo Leads', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_leads_admins_config', fase: 1, label: 'Configurar: somente admins enviam (Leads)', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_leads_admins', fase: 1, label: `Adicionar admins (Leads): ${(lanc.grupos?.leads?.admins || []).join(', ') || '—'}`, status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_alunas_criar', fase: 1, label: 'Criar grupo Alunas no Devzapp', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_alunas_foto', fase: 1, label: 'Inserir foto do grupo Alunas', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_alunas_bio', fase: 1, label: 'Inserir bio do grupo Alunas', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_alunas_admins_config', fase: 1, label: 'Configurar: somente admins enviam (Alunas)', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f1_alunas_admins', fase: 1, label: `Adicionar admins (Alunas): ${(lanc.grupos?.alunas?.admins || []).join(', ') || '—'}`, status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f2_campanha', fase: 2, label: `Criar campanha: "${lanc.nomeCampanhaDevzapp || lanc.nome}"`, status: 'pendente', inicio: null, fim: null, erro: null });
  const sorted = sortCopies(lanc.copies || []);
  for (const copy of sorted) {
    const grupo = copy.grupoDestino === 'leads' ? lanc.grupos?.leads?.nome || 'Leads' : lanc.grupos?.alunas?.nome || 'Alunas';
    etapas.push({
      id: `f2_copy_${copy.id}`, fase: 2,
      label: `Programar "${copy.nome || copy.id}" → ${grupo} · ${copy.data || '—'} ${copy.hora || ''}`,
      sub: copy.blocos.map((b, i) => `${i+1}. [${TIPO_BLOCO_LABELS[b.tipo].toUpperCase()}]${b.arquivoNome ? ` ${b.arquivoNome}` : b.conteudo ? ` "${b.conteudo.slice(0,50)}${b.conteudo.length>50?'...':''}"` : ''}`),
      status: 'pendente', inicio: null, fim: null, erro: null,
    });
  }
  etapas.push({ id: 'f3_grupos', fase: 3, label: 'Auditar grupos: nome, foto, bio, admins, restrição', status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f3_msgs', fase: 3, label: `Auditar ${sorted.length} copies programadas`, status: 'pendente', inicio: null, fim: null, erro: null });
  etapas.push({ id: 'f3_relatorio', fase: 3, label: 'Gerar relatório final', status: 'pendente', inicio: null, fim: null, erro: null });
  return etapas;
}

const STATUS_ICON = {
  pendente: <span style={{ color: '#4b5563', fontSize: 12 }}>⏳</span>,
  executando: <span style={{ color: '#f59e0b', fontSize: 12 }}>⚡</span>,
  concluida: <span style={{ color: '#22c55e', fontSize: 12 }}>✅</span>,
  erro: <span style={{ color: '#ef4444', fontSize: 12 }}>❌</span>,
};

// FIX #13: etapa pode ser marcada manualmente pelo operador
function FilaSection({ titulo, fase, etapas, onMarcarEtapa }) {
  const [collapsed, setCollapsed] = useState(false);
  const faseEtapas = etapas.filter(e => e.fase === fase);
  const done = faseEtapas.filter(e => e.status === 'concluida').length;
  const temErro = faseEtapas.some(e => e.status === 'erro');

  return (
    <div className="card mb-3" style={{ borderColor: temErro ? 'rgba(239,68,68,0.3)' : '#252b38' }}>
      <button className="flex items-center justify-between w-full px-4 py-3" onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{titulo}</span>
          <span className={`badge ${done === faseEtapas.length ? 'badge-green' : temErro ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: 10 }}>
            {done}/{faseEtapas.length}
          </span>
        </div>
      </button>
      {!collapsed && (
        <div className="px-4 pb-3 space-y-1.5">
          {faseEtapas.map(etapa => (
            <div key={etapa.id} className="rounded px-3 py-2" style={{ background: '#0a0c0f' }}>
              <div className="flex items-start gap-2">
                {STATUS_ICON[etapa.status]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs flex-1" style={{ color: etapa.status === 'erro' ? '#ef4444' : etapa.status === 'concluida' ? '#22c55e' : '#9ca3af' }}>
                      {etapa.label}
                    </span>
                    {/* FIX #13: botões para operador marcar status */}
                    <div className="flex gap-1 flex-shrink-0">
                      {etapa.status !== 'concluida' && (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px', color: '#22c55e' }}
                          onClick={() => onMarcarEtapa(etapa.id, 'concluida')}>✓ OK</button>
                      )}
                      {etapa.status !== 'erro' && (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px', color: '#ef4444' }}
                          onClick={() => onMarcarEtapa(etapa.id, 'erro')}>✗ Erro</button>
                      )}
                      {(etapa.status === 'concluida' || etapa.status === 'erro') && (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px', color: '#6b7280' }}
                          onClick={() => onMarcarEtapa(etapa.id, 'pendente')}>↺</button>
                      )}
                    </div>
                  </div>
                  {etapa.sub?.map((s, i) => (
                    <div key={i} className="text-xs mt-0.5 ml-1" style={{ color: '#374151', fontFamily: 'IBM Plex Mono' }}>{s}</div>
                  ))}
                  {etapa.erro && <div className="text-xs mt-1" style={{ color: '#ef4444' }}>↳ {etapa.erro}</div>}
                  {(etapa.inicio || etapa.fim) && (
                    <div className="text-xs mt-0.5" style={{ color: '#374151', fontFamily: 'IBM Plex Mono' }}>
                      {etapa.inicio && `▶ ${etapa.inicio}`}{etapa.fim && ` · ■ ${etapa.fim}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstrucoesComputerUse({ lanc }) {
  const sorted = sortCopies(lanc.copies || []);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="card mt-4">
      <button className="flex items-center justify-between w-full px-4 py-3" onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Instruções de Execução para Claude (Computer Use)</span>
          <span className="badge badge-blue" style={{ fontSize: 10 }}>Ler antes de iniciar</span>
        </div>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs" style={{ color: '#6b7280' }}>Este bloco é a fonte de verdade para a operação no Devzapp. Leia completamente antes de qualquer ação.</p>

          <Sec t="🔐 1. LOGIN">
            <It>Acessar devzapp.com.br</It>
            <It>Verificar sessão autenticada antes de qualquer ação</It>
            <It c="amber">Se não autenticado: PARAR. Exibir: "Abra o Devzapp e realize o login." Retomar a partir da próxima etapa pendente após detectar sessão ativa. NÃO reiniciar do zero.</It>
          </Sec>

          <Sec t="📱 2. GRUPO LEADS">
            <It>Nome: <code>{lanc.grupos?.leads?.nome || '—'}</code></It>
            <It c="red">Criar como NOVO grupo. Nunca reutilizar grupo existente.</It>
            <It>Aplicar foto (arquivo associado ao grupo Leads)</It>
            <It>Aplicar bio completa (copiar exatamente do War Room)</It>
            <It>Configurar: somente administradores podem enviar mensagens</It>
            <It>Adicionar admins: {(lanc.grupos?.leads?.admins || []).map((a, i) => <code key={i} style={{ marginRight: 4 }}>{a}</code>)}</It>
          </Sec>

          <Sec t="📱 3. GRUPO ALUNAS">
            <It>Nome: <code>{lanc.grupos?.alunas?.nome || '—'}</code></It>
            <It c="red">Criar como NOVO grupo. Nunca reutilizar grupo existente.</It>
            <It>Aplicar foto (arquivo associado ao grupo Alunas)</It>
            <It>Aplicar bio completa (copiar exatamente do War Room)</It>
            <It>Configurar: somente administradores podem enviar mensagens</It>
            <It>Adicionar admins: {(lanc.grupos?.alunas?.admins || []).map((a, i) => <code key={i} style={{ marginRight: 4 }}>{a}</code>)}</It>
          </Sec>

          <Sec t="📅 4. CAMPANHA">
            <It>Nome da campanha no Devzapp: <code>{lanc.nomeCampanhaDevzapp || lanc.nome}</code></It>
            <It>Produto: <code>{lanc.produto || '—'}</code></It>
            <It>Link de checkout: <code>{lanc.linkCheckout || '—'}</code></It>
          </Sec>

          <Sec t="💬 5. PROGRAMAÇÃO DAS COPIES">
            <It c="amber">Programar EXATAMENTE na ordem dos blocos de cada copy. A ordem visual no War Room é a ordem operacional de envio.</It>
            <It c="amber">Verificar data e hora de cada copy antes de programar. Não alterar nenhum valor.</It>
            {sorted.map((copy, i) => (
              <div key={copy.id} className="mt-2 p-2 rounded" style={{ background: '#0a0c0f', border: '1px solid #1e232d' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#e2e8f0' }}>
                  {i+1}. {copy.nome || 'Sem nome'} — {copy.data || '—'} às {copy.hora || '—'} → {copy.grupoDestino === 'leads' ? (lanc.grupos?.leads?.nome || 'Leads') : (lanc.grupos?.alunas?.nome || 'Alunas')}
                </div>
                {copy.blocos.map((b, bi) => (
                  <div key={b.id} className="text-xs ml-3" style={{ color: '#4b5563', fontFamily: 'IBM Plex Mono' }}>
                    {bi+1}. [{TIPO_BLOCO_LABELS[b.tipo].toUpperCase()}]{b.possuiArquivo ? ` ARQ:${b.arquivoNome || 'obrigatório'}` : ''}{b.conteudo ? ` "${b.conteudo.slice(0,60)}${b.conteudo.length>60?'...':''}"` : ''}
                  </div>
                ))}
              </div>
            ))}
          </Sec>

          <Sec t="🔍 6. AUDITORIA">
            <It>Verificar grupos: nome ✓, foto ✓, bio ✓, admins ✓, restrição de envio ✓</It>
            <It>Verificar {sorted.length} copies: datas ✓, horários ✓, grupos destino ✓, blocos ✓, arquivos ✓</It>
            <It>Gerar relatório: previstas vs. programadas, arquivos previstos vs. enviados</It>
          </Sec>

          <Sec t="⚠️ 7. REGRAS ABSOLUTAS">
            <It c="red">NUNCA alterar outro expert ou outro lançamento</It>
            <It c="red">NUNCA alterar conteúdo de nenhuma mensagem</It>
            <It c="red">NUNCA reutilizar grupo existente</It>
            <It c="amber">Se houver ERRO: marcar etapa como erro na fila, parar, informar etapa exata e mensagem de erro</It>
            <It c="amber">AO RETOMAR: continuar da próxima etapa pendente. Nunca reiniciar do zero.</It>
            <It c="amber">Se existir correspondência clara com programação existente: editar, não recriar</It>
            <It c="red">Se houver divergência não-trivial: parar e solicitar ação do usuário</It>
          </Sec>
        </div>
      )}
    </div>
  );
}

function Sec({ t, children }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-1.5" style={{ color: '#60a5fa', fontFamily: 'IBM Plex Mono' }}>{t}</div>
      <div className="space-y-0.5 ml-2">{children}</div>
    </div>
  );
}
function It({ children, c = 'default' }) {
  const col = { default: '#9ca3af', amber: '#f59e0b', red: '#ef4444', green: '#22c55e' }[c];
  return (
    <div className="flex items-start gap-1.5 text-xs py-0.5" style={{ color: col }}>
      <span style={{ color: '#374151', flexShrink: 0 }}>›</span>
      <span>{children}</span>
    </div>
  );
}

export default function TabExecutar() {
  const { draft, salvar, isDirty, salvarCheckpoints, showModal, closeModal } = useApp();

  // FIX #13: inicializar fila a partir de checkpoints salvos no draft
  const [fila, setFila] = useState(() => draft?.checkpoints?.etapas || null);
  const [showFila, setShowFila] = useState(!!(draft?.checkpoints?.etapas));

  if (!draft) return null;

  const erros = validarBloqueantes(draft);
  const alertas = validarAlertas(draft);
  const podeExecutar = erros.length === 0;

  // FIX #13: marcar etapa e persistir checkpoints
  const marcarEtapa = async (etapaId, novoStatus) => {
    if (!fila) return;
    const now = new Date().toLocaleTimeString('pt-BR');
    const novaFila = fila.map(e => {
      if (e.id !== etapaId) return e;
      return {
        ...e,
        status: novoStatus,
        inicio: novoStatus === 'executando' ? now : e.inicio,
        fim: novoStatus === 'concluida' || novoStatus === 'erro' ? now : e.fim,
      };
    });
    setFila(novaFila);
    await salvarCheckpoints({ etapas: novaFila, atualizadoEm: new Date().toISOString() });
  };

  // FIX #12 + #13: gerar fila com aviso se já existe em andamento
  const handleGerarFila = () => {
    const temAndamento = fila?.some(e => e.status === 'concluida' || e.status === 'erro');
    if (temAndamento) {
      showModal({
        title: 'Fila em andamento',
        message: 'Já existe uma fila com etapas marcadas. Gerar nova fila irá apagar o progresso registrado. Deseja retomar a fila existente ou iniciar do zero?',
        actions: [
          { label: 'Retomar existente', variant: 'primary', action: () => { setShowFila(true); closeModal(); } },
          { label: 'Iniciar do zero', variant: 'danger', action: async () => {
            const nova = gerarEtapasIniciais(draft);
            setFila(nova);
            setShowFila(true);
            await salvarCheckpoints({ etapas: nova, atualizadoEm: new Date().toISOString() });
            closeModal();
          }},
          { label: 'Cancelar', variant: 'ghost', action: closeModal },
        ],
      });
    } else {
      const nova = gerarEtapasIniciais(draft);
      setFila(nova);
      setShowFila(true);
      salvarCheckpoints({ etapas: nova, atualizadoEm: new Date().toISOString() });
    }
  };

  // FIX #12: substituir alert() por modal interno
  const handleExecutar = () => {
    if (!podeExecutar) return;
    const nova = fila || gerarEtapasIniciais(draft);
    if (!fila) {
      setFila(nova);
      salvarCheckpoints({ etapas: nova, atualizadoEm: new Date().toISOString() });
    }
    setShowFila(true);
    showModal({
      title: '🚀 Iniciar Execução',
      message: `Fila gerada com ${nova.length} etapas.\n\nClaude Computer Use deve:\n1. Ler as Instruções de Execução abaixo\n2. Acessar devzapp.com.br\n3. Executar Infraestrutura → Programação → Auditoria\n4. Marcar cada etapa como ✓ OK ou ✗ Erro na fila\n\nNão interrompa a execução exceto em caso de erro.`,
      actions: [
        { label: 'Entendido — Iniciar', variant: 'primary', action: closeModal },
        { label: 'Cancelar', variant: 'ghost', action: closeModal },
      ],
    });
  };

  const totalCopies = draft.copies?.length || 0;
  const totalBlocos = (draft.copies || []).reduce((acc, c) => acc + c.blocos.length, 0);
  const totalArquivos = (draft.copies || []).reduce((acc, c) => acc + c.blocos.filter(b => b.possuiArquivo && b.arquivoId).length, 0);
  const arquivosObrigatorios = (draft.copies || []).reduce((acc, c) => acc + c.blocos.filter(b => b.possuiArquivo).length, 0);
  const etapasConcluidas = fila?.filter(e => e.status === 'concluida').length || 0;
  const etapasTotal = fila?.length || 0;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Executar Lançamento</h2>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Infraestrutura → Programação → Auditoria · sem intervenção humana exceto erro, conflito ou login</p>
        </div>
        {fila && (
          <span className="badge badge-gray" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
            {etapasConcluidas}/{etapasTotal} etapas
          </span>
        )}
      </div>

      {/* Resumo */}
      <div className="card p-4 mb-4">
        <div className="text-xs mb-3" style={{ color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'IBM Plex Mono' }}>Resumo</div>
        <div className="grid grid-cols-3 gap-4">
          <InfoItem label="Copies" value={totalCopies} />
          <InfoItem label="Blocos" value={totalBlocos} />
          <InfoItem label="Arquivos" value={`${totalArquivos}/${arquivosObrigatorios}`} ok={totalArquivos === arquivosObrigatorios} />
          <InfoItem label="Grupo Leads" value={draft.grupos?.leads?.nome || '—'} ok={!!draft.grupos?.leads?.nome} />
          <InfoItem label="Grupo Alunas" value={draft.grupos?.alunas?.nome || '—'} ok={!!draft.grupos?.alunas?.nome} />
          <InfoItem label="Checkout" value={draft.linkCheckout ? '✓ definido' : '—'} ok={!!draft.linkCheckout} />
        </div>
      </div>

      {/* Erros bloqueantes */}
      {erros.length > 0 && (
        <div className="card p-4 mb-4" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={15} style={{ color: '#ef4444' }} />
            <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>EXECUÇÃO BLOQUEADA — {erros.length} erro{erros.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1.5">
            {erros.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span style={{ color: '#ef4444', flexShrink: 0 }}>✗</span>
                <span style={{ color: '#fca5a5' }}>[{e.campo}] {e.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="card p-4 mb-4" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>{alertas.length} alerta{alertas.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1.5">
            {alertas.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span style={{ color: '#f59e0b', flexShrink: 0 }}>⚠</span>
                <span style={{ color: '#fcd34d' }}>{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {podeExecutar && alertas.length === 0 && (
        <div className="card p-3 mb-4 flex items-center gap-2" style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
          <CheckCircle size={14} style={{ color: '#22c55e' }} />
          <span className="text-sm" style={{ color: '#22c55e' }}>Validações OK. Pronto para executar.</span>
        </div>
      )}

      {/* Ações principais */}
      <div className="flex gap-3 mb-4">
        <button className="btn btn-secondary" onClick={handleGerarFila}>
          <RefreshCw size={13} /> {fila ? 'Regenerar fila' : 'Gerar fila'}
        </button>
        <button
          className={`btn ${podeExecutar ? 'btn-green' : 'btn-secondary'} flex-1 justify-center`}
          disabled={!podeExecutar}
          style={{ opacity: podeExecutar ? 1 : 0.5, cursor: podeExecutar ? 'pointer' : 'not-allowed' }}
          onClick={handleExecutar}
        >
          <PlayCircle size={15} /> {podeExecutar ? 'EXECUTAR LANÇAMENTO' : 'EXECUÇÃO BLOQUEADA'}
        </button>
      </div>

      {/* Aplicar Alterações */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Aplicar Alterações</div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Sincroniza apenas alterações pendentes. Nunca executa automaticamente.</div>
          </div>
          <button
            className="btn btn-secondary flex-shrink-0"
            onClick={() => showModal({
              title: 'Aplicar Alterações',
              message: 'Claude Computer Use irá sincronizar somente as alterações pendentes no Devzapp.\n\nIsso editará programações existentes onde houver correspondência clara. Não apaga nem recria.\n\nSe houver divergência relevante, a execução será interrompida para revisão.',
              actions: [
                { label: 'Iniciar sincronização', variant: 'primary', action: closeModal },
                { label: 'Cancelar', variant: 'ghost', action: closeModal },
              ],
            })}
          >
            Aplicar Alterações
          </button>
        </div>
      </div>

      {/* Fila de execução */}
      {showFila && fila && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Fila de Execução</span>
            <span className="text-xs" style={{ color: '#4b5563', fontFamily: 'IBM Plex Mono' }}>
              Marque cada etapa conforme executa no Devzapp
            </span>
          </div>
          <FilaSection titulo="FASE 1 — Infraestrutura" fase={1} etapas={fila} onMarcarEtapa={marcarEtapa} />
          <FilaSection titulo="FASE 2 — Programação" fase={2} etapas={fila} onMarcarEtapa={marcarEtapa} />
          <FilaSection titulo="FASE 3 — Auditoria" fase={3} etapas={fila} onMarcarEtapa={marcarEtapa} />
        </div>
      )}

      {/* Instruções Computer Use */}
      <InstrucoesComputerUse lanc={draft} />
    </div>
  );
}

function InfoItem({ label, value, ok }) {
  return (
    <div className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid #111318' }}>
      <span style={{ color: '#6b7280', fontSize: 12 }}>{label}</span>
      <span style={{ color: ok === undefined ? '#e2e8f0' : ok ? '#22c55e' : '#ef4444', fontSize: 12, fontFamily: 'IBM Plex Mono' }}>{value}</span>
    </div>
  );
}

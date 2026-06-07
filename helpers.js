// ID generation
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Deep clone — NOTE: não clona Blobs. Usado apenas para dados JSON-serializáveis.
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// FIX #8: snapshot limpo para versioning — remove versoes aninhadas
export function snapshotParaVersao(lanc) {
  const snap = deepClone(lanc);
  snap.versoes = []; // nunca guardar histórico dentro do histórico
  return snap;
}

// Normaliza hora para HH:MM — FIX #14
export function normalizarHora(hora) {
  if (!hora) return '';
  const parts = hora.split(':');
  if (parts.length < 2) return hora;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

// Format date/time
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// Blank lancamento template
export function blankLancamento(expertId) {
  return {
    id: uid(),
    expertId,
    nome: '',
    nomeCampanhaDevzapp: '',
    produto: '',
    ticket: '',
    linkCheckout: '',
    dataInicio: '',
    dataAbertura: '',
    dataFechamento: '',
    observacoes: '',
    statusLancamento: 'rascunho',
    grupos: {
      leads: { nome: '', fotoArquivoId: null, bio: '', admins: [] },
      alunas: { nome: '', fotoArquivoId: null, bio: '', admins: [] },
    },
    copies: [],
    versoes: [],
    checkpoints: null, // FIX #13: persistido aqui
    syncStatus: 'sincronizado',
    ultimoSalvoEm: null,
    criadoEm: new Date().toISOString(),
  };
}

// Blank copy
export function blankCopy() {
  return {
    id: uid(),
    nome: '',
    data: '',
    hora: '',
    grupoDestino: 'leads',
    blocos: [],
  };
}

// Blank bloco
export function blankBloco(tipo = 'texto') {
  return {
    id: uid(),
    tipo,
    conteudo: '',
    possuiArquivo: tipo !== 'texto',
    arquivoId: null,
    arquivoNome: null,
  };
}

// Status labels
export const STATUS_LABELS = {
  rascunho: 'Rascunho',
  em_preparacao: 'Em preparação',
  em_execucao: 'Em execução',
  em_venda: 'Em venda',
  encerrado: 'Encerrado',
};

export const STATUS_COLORS = {
  rascunho: 'badge-gray',
  em_preparacao: 'badge-blue',
  em_execucao: 'badge-amber',
  em_venda: 'badge-green',
  encerrado: 'badge-gray',
};

export const TIPO_BLOCO_LABELS = {
  texto: 'Texto',
  imagem: 'Imagem',
  video: 'Vídeo',
  pdf: 'PDF',
  audio: 'Áudio',
};

export const TIPO_BLOCO_ICONS = {
  texto: '✏️',
  imagem: '🖼️',
  video: '🎬',
  pdf: '📄',
  audio: '🎙️',
};

// FIX #9: sortCopies — copies sem data vão para o final
export function sortCopies(copies) {
  return [...copies].sort((a, b) => {
    const aHasDate = !!a.data;
    const bHasDate = !!b.data;
    if (!aHasDate && !bHasDate) return 0;
    if (!aHasDate) return 1;
    if (!bHasDate) return -1;
    const da = `${a.data}T${normalizarHora(a.hora) || '00:00'}`;
    const db = `${b.data}T${normalizarHora(b.hora) || '00:00'}`;
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

// ---- VALIDATIONS ----

// FIX #10: status que são "em andamento" não bloqueam por data no passado
const STATUS_EXECUCAO_ATIVA = new Set(['em_execucao', 'em_venda', 'encerrado']);

export function validarBloqueantes(lanc, now = new Date()) {
  const erros = [];

  if (!lanc.nome?.trim()) erros.push({ campo: 'Dados', msg: 'Nome do lançamento está vazio.' });
  if (!lanc.nomeCampanhaDevzapp?.trim()) erros.push({ campo: 'Dados', msg: 'Nome da campanha no Devzapp está vazio.' });
  if (!lanc.linkCheckout?.trim()) erros.push({ campo: 'Dados', msg: 'Link de checkout está vazio.' });

  for (const g of ['leads', 'alunas']) {
    const grupo = lanc.grupos[g];
    const label = g === 'leads' ? 'Leads' : 'Alunas';
    if (!grupo.nome?.trim()) erros.push({ campo: `Grupo ${label}`, msg: `Nome do grupo ${label} está vazio.` });
    if (!grupo.fotoArquivoId) erros.push({ campo: `Grupo ${label}`, msg: `Foto do grupo ${label} não foi enviada.` });
    if (!grupo.bio?.trim()) erros.push({ campo: `Grupo ${label}`, msg: `Bio do grupo ${label} está vazia.` });
    if (!grupo.admins?.length) erros.push({ campo: `Grupo ${label}`, msg: `Nenhum admin configurado no grupo ${label}.` });
  }

  const emExecucao = STATUS_EXECUCAO_ATIVA.has(lanc.statusLancamento);

  // FIX #14: usar hora normalizada na chave de conflito
  const seen = {};
  for (const copy of lanc.copies) {
    const cLabel = `Copy "${copy.nome || copy.id}"`;
    if (!copy.data) erros.push({ campo: 'Copies', msg: `${cLabel}: data não preenchida.` });
    if (!copy.hora) erros.push({ campo: 'Copies', msg: `${cLabel}: hora não preenchida.` });
    if (!copy.grupoDestino) erros.push({ campo: 'Copies', msg: `${cLabel}: grupo destino não definido.` });

    // FIX #10: data no passado só bloqueia para rascunho/em_preparacao
    if (!emExecucao && copy.data && copy.hora) {
      const dt = new Date(`${copy.data}T${normalizarHora(copy.hora)}`);
      if (dt < now) erros.push({ campo: 'Copies', msg: `${cLabel}: data/hora (${formatDate(copy.data)} ${copy.hora}) já passou.` });
    }

    // FIX #14: normalizar hora na chave
    if (copy.data && copy.hora && copy.grupoDestino) {
      const key = `${copy.data}_${normalizarHora(copy.hora)}_${copy.grupoDestino}`;
      if (seen[key]) {
        erros.push({ campo: 'Copies', msg: `Conflito de horário exato: "${seen[key]}" e ${cLabel} no mesmo grupo, data e hora.` });
      } else {
        seen[key] = copy.nome || copy.id;
      }
    }

    if (!copy.blocos?.length) {
      erros.push({ campo: 'Copies', msg: `${cLabel}: não possui nenhum bloco.` });
    } else {
      for (const bloco of copy.blocos) {
        const bLabel = `${cLabel} / bloco ${TIPO_BLOCO_LABELS[bloco.tipo]}`;
        if (bloco.tipo === 'texto' && !bloco.conteudo?.trim()) {
          erros.push({ campo: 'Copies', msg: `${bLabel}: texto está vazio.` });
        }
        if (bloco.possuiArquivo && !bloco.arquivoId) {
          erros.push({ campo: 'Copies', msg: `${bLabel}: arquivo obrigatório não enviado.` });
        }
      }
    }
  }

  // Ordem cronológica
  const sorted = sortCopies(lanc.copies);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.data && prev.hora && curr.data && curr.hora) {
      const dp = `${prev.data}T${normalizarHora(prev.hora)}`;
      const dc = `${curr.data}T${normalizarHora(curr.hora)}`;
      if (dc < dp) {
        erros.push({ campo: 'Cronograma', msg: `Conflito cronológico: "${curr.nome || curr.id}" (${formatDate(curr.data)} ${curr.hora}) antes de "${prev.nome || prev.id}" (${formatDate(prev.data)} ${prev.hora}).` });
      }
    }
  }

  return erros;
}

export function validarAlertas(lanc) {
  const alertas = [];
  const sorted = sortCopies(lanc.copies);
  const emExecucao = STATUS_EXECUCAO_ATIVA.has(lanc.statusLancamento);

  // FIX #10: alertas de data passada para status em execução
  if (emExecucao) {
    const now = new Date();
    for (const copy of lanc.copies) {
      if (!copy.data || !copy.hora) continue;
      const dt = new Date(`${copy.data}T${normalizarHora(copy.hora)}`);
      if (dt < now) {
        alertas.push({ msg: `Copy "${copy.nome || copy.id}": data/hora já passou — verifique se foi disparada no Devzapp.` });
      }
    }
  }

  // Intervalo curto no mesmo grupo
  const porGrupo = {};
  for (const c of sorted) {
    if (!c.data || !c.hora) continue;
    const key = `${c.data}_${c.grupoDestino}`;
    if (!porGrupo[key]) porGrupo[key] = [];
    porGrupo[key].push(c);
  }
  for (const group of Object.values(porGrupo)) {
    for (let i = 1; i < group.length; i++) {
      const prev = new Date(`${group[i-1].data}T${normalizarHora(group[i-1].hora)}`);
      const curr = new Date(`${group[i].data}T${normalizarHora(group[i].hora)}`);
      const diffMin = (curr - prev) / 60000;
      if (diffMin > 0 && diffMin < 30) {
        alertas.push({ msg: `Intervalo curto (${Math.round(diffMin)} min) entre "${group[i-1].nome || group[i-1].id}" e "${group[i].nome || group[i].id}" no mesmo grupo.` });
      }
    }
  }

  // Checkout antes da abertura
  if (lanc.dataAbertura && lanc.linkCheckout) {
    for (const c of lanc.copies) {
      if (!c.data) continue;
      const hasCheckout = c.blocos.some(b => b.tipo === 'texto' && b.conteudo?.includes(lanc.linkCheckout));
      if (hasCheckout && c.data < lanc.dataAbertura) {
        alertas.push({ msg: `Copy "${c.nome || c.id}": contém link de checkout mas é anterior à data de abertura (${formatDate(lanc.dataAbertura)}).` });
      }
    }
  }

  // Copy depois do fechamento
  if (lanc.dataFechamento) {
    for (const c of lanc.copies) {
      if (!c.data) continue;
      if (c.data > lanc.dataFechamento) {
        alertas.push({ msg: `Copy "${c.nome || c.id}": data (${formatDate(c.data)}) é posterior ao fechamento (${formatDate(lanc.dataFechamento)}).` });
      }
    }
  }

  // Referências temporais suspeitas
  const termosTemporais = ['hoje', 'amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  for (const c of lanc.copies) {
    for (const b of c.blocos) {
      if (b.tipo !== 'texto' || !b.conteudo) continue;
      const lower = b.conteudo.toLowerCase();
      for (const t of termosTemporais) {
        if (lower.includes(t)) {
          alertas.push({ msg: `Copy "${c.nome || c.id}": texto menciona "${t}" — verifique se bate com a data configurada (${formatDate(c.data)}).` });
          break;
        }
      }
    }
  }

  return alertas;
}

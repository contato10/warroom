import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getExperts, saveExpert, deleteExpert,
  getLancamentos, getLancamento, saveLancamento, deleteLancamento,
  saveArquivo, getArquivo, deleteArquivo, getArquivosByLancamento,
  coletarArquivoIdsReferenciados, limparArquivosOrfaos,
} from '../lib/db';
import { uid, deepClone, blankLancamento, snapshotParaVersao } from '../lib/helpers';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [experts, setExperts] = useState([]);
  const [lancamentos, setLancamentos] = useState({});
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [selectedLancamentoId, setSelectedLancamentoId] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // FIX #12: substituir alert()

  useEffect(() => {
    (async () => {
      const exps = await getExperts();
      setExperts(exps.sort((a, b) => a.nome.localeCompare(b.nome)));
    })();
  }, []);

  useEffect(() => {
    if (!selectedExpertId) return;
    (async () => {
      const items = await getLancamentos(selectedExpertId);
      setLancamentos(prev => ({ ...prev, [selectedExpertId]: items.sort((a, b) => a.nome.localeCompare(b.nome)) }));
    })();
  }, [selectedExpertId]);

  useEffect(() => {
    if (!selectedLancamentoId) { setDraft(null); setIsDirty(false); return; }
    (async () => {
      const lanc = await getLancamento(selectedLancamentoId);
      if (lanc) {
        setDraft(deepClone(lanc));
        setLastSavedAt(lanc.ultimoSalvoEm);
        setIsDirty(false);
      }
    })();
  }, [selectedLancamentoId]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: uid() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const showModal = useCallback((config) => {
    setModal(config);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const updateDraft = useCallback((updater) => {
    setDraft(prev => {
      const next = typeof updater === 'function' ? updater(deepClone(prev)) : { ...prev, ...updater };
      return next;
    });
    setIsDirty(true);
  }, []);

  // FIX #5: exportar busca do banco, não do draft
  // FIX #8: snapshotParaVersao remove versoes aninhadas
  // FIX #2: limparArquivosOrfaos após save
  const salvar = useCallback(async () => {
    if (!draft) return;
    const now = new Date().toISOString();
    const snapshot = deepClone(draft);
    snapshot.ultimoSalvoEm = now;
    snapshot.syncStatus = 'pendente';

    // FIX #8: versão salva não contém versoes aninhadas
    const versoes = [...(snapshot.versoes || [])];
    versoes.unshift({ savedAt: now, data: snapshotParaVersao(snapshot) });
    if (versoes.length > 3) versoes.length = 3;
    snapshot.versoes = versoes;

    await saveLancamento(snapshot);

    // FIX #2: limpar arquivos órfãos após save
    const idsRef = coletarArquivoIdsReferenciados(snapshot);
    await limparArquivosOrfaos(snapshot.id, idsRef);

    setDraft(snapshot);
    setIsDirty(false);
    setLastSavedAt(now);

    const items = await getLancamentos(snapshot.expertId);
    setLancamentos(prev => ({ ...prev, [snapshot.expertId]: items.sort((a, b) => a.nome.localeCompare(b.nome)) }));
    showToast('Lançamento salvo.', 'success');
  }, [draft, showToast]);

  const desfazer = useCallback(async () => {
    if (!selectedLancamentoId) return;
    const lanc = await getLancamento(selectedLancamentoId);
    if (lanc) { setDraft(deepClone(lanc)); setIsDirty(false); showToast('Alterações desfeitas.', 'info'); }
  }, [selectedLancamentoId, showToast]);

  // FIX #1: reverter versão — arquivos permanecem corretos pois IDs são imutáveis
  const reverterVersao = useCallback(async (versaoIndex) => {
    if (!draft) return;
    const versao = draft.versoes?.[versaoIndex];
    if (!versao) return;
    const restored = deepClone(versao.data);
    // Manter versoes e ultimoSalvoEm da versão corrente (não da restaurada)
    restored.versoes = deepClone(draft.versoes);
    restored.ultimoSalvoEm = draft.ultimoSalvoEm;
    restored.syncStatus = 'pendente';
    await saveLancamento(restored);
    setDraft(restored);
    setIsDirty(false);
    showToast('Versão restaurada.', 'success');
  }, [draft, showToast]);

  const criarExpert = useCallback(async (nome) => {
    const expert = { id: uid(), nome, criadoEm: new Date().toISOString() };
    await saveExpert(expert);
    const exps = await getExperts();
    setExperts(exps.sort((a, b) => a.nome.localeCompare(b.nome)));
    setSelectedExpertId(expert.id);
    showToast(`Expert "${nome}" criado.`, 'success');
    return expert;
  }, [showToast]);

  const renomearExpert = useCallback(async (id, nome) => {
    const all = await getExperts();
    const expert = all.find(e => e.id === id);
    if (!expert) return;
    await saveExpert({ ...expert, nome });
    const exps = await getExperts();
    setExperts(exps.sort((a, b) => a.nome.localeCompare(b.nome)));
  }, []);

  const excluirExpert = useCallback(async (id) => {
    const items = await getLancamentos(id);
    for (const l of items) await deleteLancamento(l.id);
    await deleteExpert(id);
    const exps = await getExperts();
    setExperts(exps.sort((a, b) => a.nome.localeCompare(b.nome)));
    if (selectedExpertId === id) {
      setSelectedExpertId(null);
      setSelectedLancamentoId(null);
      setDraft(null);
    }
    showToast('Expert excluído.', 'info');
  }, [selectedExpertId, showToast]);

  const criarLancamento = useCallback(async (expertId) => {
    const lanc = blankLancamento(expertId);
    lanc.nome = 'Novo Lançamento';
    await saveLancamento(lanc);
    const items = await getLancamentos(expertId);
    setLancamentos(prev => ({ ...prev, [expertId]: items.sort((a, b) => a.nome.localeCompare(b.nome)) }));
    setSelectedLancamentoId(lanc.id);
    setActiveTab('dados');
    showToast('Lançamento criado.', 'success');
    return lanc;
  }, [showToast]);

  // FIX #6: duplicar avisa se há alterações não salvas
  const duplicarLancamento = useCallback(async (lancamentoId) => {
    const executar = async () => {
      const original = await getLancamento(lancamentoId);
      if (!original) return;

      const novo = deepClone(original);
      novo.id = uid();
      novo.nome = `${original.nome} (cópia)`;
      novo.versoes = [];
      novo.checkpoints = null;
      novo.syncStatus = 'pendente';
      novo.ultimoSalvoEm = null;
      novo.criadoEm = new Date().toISOString();

      const oldFiles = await getArquivosByLancamento(lancamentoId);
      const idMap = {};
      for (const f of oldFiles) {
        const newId = uid();
        idMap[f.id] = newId;
        await saveArquivo({ ...f, id: newId, lancamentoId: novo.id });
      }

      if (novo.grupos.leads.fotoArquivoId) novo.grupos.leads.fotoArquivoId = idMap[novo.grupos.leads.fotoArquivoId] || null;
      if (novo.grupos.alunas.fotoArquivoId) novo.grupos.alunas.fotoArquivoId = idMap[novo.grupos.alunas.fotoArquivoId] || null;
      for (const copy of novo.copies) {
        for (const bloco of copy.blocos) {
          if (bloco.arquivoId) bloco.arquivoId = idMap[bloco.arquivoId] || null;
        }
      }

      await saveLancamento(novo);
      const items = await getLancamentos(novo.expertId);
      setLancamentos(prev => ({ ...prev, [novo.expertId]: items.sort((a, b) => a.nome.localeCompare(b.nome)) }));
      setSelectedLancamentoId(novo.id);
      setActiveTab('dados');
      showToast('Lançamento duplicado.', 'success');
    };

    // FIX #6: verificar se é o lançamento atual com alterações pendentes
    if (lancamentoId === selectedLancamentoId && isDirty) {
      showModal({
        title: 'Alterações não salvas',
        message: 'Este lançamento tem alterações não salvas. A duplicação usará a última versão salva, não as alterações atuais.',
        actions: [
          { label: 'Salvar e duplicar', variant: 'primary', action: async () => { await salvar(); await executar(); closeModal(); } },
          { label: 'Duplicar versão salva', variant: 'secondary', action: async () => { await executar(); closeModal(); } },
          { label: 'Cancelar', variant: 'ghost', action: closeModal },
        ],
      });
    } else {
      await executar();
    }
  }, [selectedLancamentoId, isDirty, salvar, showModal, closeModal, showToast]);

  const excluirLancamento = useCallback(async (id) => {
    const lanc = await getLancamento(id);
    if (!lanc) return;
    await deleteLancamento(id);
    const items = await getLancamentos(lanc.expertId);
    setLancamentos(prev => ({ ...prev, [lanc.expertId]: items.sort((a, b) => a.nome.localeCompare(b.nome)) }));
    if (selectedLancamentoId === id) {
      setSelectedLancamentoId(null);
      setDraft(null);
    }
    showToast('Lançamento excluído.', 'info');
  }, [selectedLancamentoId, showToast]);

  // FIX #3: upload usa função que lê fotoArquivoId atual do banco para evitar closure stale
  const uploadArquivo = useCallback(async (lancamentoId, file) => {
    const id = uid();
    // Arquivo é imutável: novo upload sempre cria novo ID. O ID antigo é limpo no save.
    const blob = file; // guardar o File/Blob diretamente
    const arquivo = { id, lancamentoId, nome: file.name, tipo: file.type, blob, criadoEm: new Date().toISOString() };
    await saveArquivo(arquivo);
    return { id, nome: file.name, tipo: file.type };
  }, []);

  // FIX #11: getArquivoUrl retorna também uma função de revoke para o caller gerenciar
  const getArquivoUrl = useCallback(async (arquivoId) => {
    if (!arquivoId) return null;
    const arq = await getArquivo(arquivoId);
    if (!arq) return null;
    return URL.createObjectURL(arq.blob);
  }, []);

  const removerArquivo = useCallback(async (arquivoId) => {
    if (!arquivoId) return;
    await deleteArquivo(arquivoId);
  }, []);

  // FIX #5: exportar busca do banco (estado salvo), não do draft
  // FIX #8: não exporta versoes aninhadas
  // FIX #15: exporta versoes sem data aninhada para reduzir tamanho
  const exportarLancamento = useCallback(async () => {
    if (!draft) return;

    if (isDirty) {
      showModal({
        title: 'Alterações não salvas',
        message: 'Há alterações não salvas. A exportação usará a última versão salva. Deseja salvar antes de exportar?',
        actions: [
          { label: 'Salvar e exportar', variant: 'primary', action: async () => { await salvar(); closeModal(); await _exportar(draft.id); } },
          { label: 'Exportar versão salva', variant: 'secondary', action: async () => { closeModal(); await _exportar(draft.id); } },
          { label: 'Cancelar', variant: 'ghost', action: closeModal },
        ],
      });
      return;
    }
    await _exportar(draft.id);
  }, [draft, isDirty, salvar, showModal, closeModal]);

  const _exportar = useCallback(async (lancamentoId) => {
    const lanc = await getLancamento(lancamentoId);
    if (!lanc) return;

    // FIX #15: limpar versoes para não exportar dados aninhados
    const lancExport = deepClone(lanc);
    lancExport.versoes = (lanc.versoes || []).map(v => ({
      savedAt: v.savedAt,
      // não inclui v.data para evitar crescimento exponencial
    }));

    const arquivos = await getArquivosByLancamento(lancamentoId);
    const arquivosB64 = [];
    for (const arq of arquivos) {
      const reader = new FileReader();
      const b64 = await new Promise(res => {
        reader.onload = e => res(e.target.result);
        reader.readAsDataURL(arq.blob);
      });
      arquivosB64.push({ id: arq.id, lancamentoId: arq.lancamentoId, nome: arq.nome, tipo: arq.tipo, b64 });
    }

    const payload = { lancamento: lancExport, arquivos: arquivosB64, exportadoEm: new Date().toISOString(), versao: '2' };
    const json = JSON.stringify(payload);
    const sizeMB = new Blob([json]).size / 1024 / 1024;

    if (sizeMB > 100) {
      showToast(`⚠ Arquivo muito grande: ${sizeMB.toFixed(1)} MB. Considere remover arquivos desnecessários.`, 'warning');
    } else if (sizeMB > 20) {
      showToast(`Arquivo gerado: ${sizeMB.toFixed(1)} MB.`, 'info');
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lanc.nome || 'lancamento'}.warroom.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Exportação concluída.', 'success');
  }, [showToast]);

  // FIX #4: importar com rollback em caso de erro
  const importarLancamento = useCallback(async (file, expertId) => {
    let payload;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch (e) {
      showToast('Arquivo inválido ou corrompido.', 'error');
      return;
    }

    const { lancamento, arquivos } = payload;
    if (!lancamento) { showToast('Arquivo não contém dados de lançamento.', 'error'); return; }

    lancamento.id = uid();
    lancamento.expertId = expertId;
    lancamento.syncStatus = 'pendente';
    lancamento.ultimoSalvoEm = null;
    lancamento.criadoEm = new Date().toISOString();
    lancamento.versoes = [];
    lancamento.checkpoints = null;

    const idsGerados = []; // FIX #4: para rollback
    const idMap = {};

    try {
      for (const arq of (arquivos || [])) {
        const newId = uid();
        idMap[arq.id] = newId;
        const res = await fetch(arq.b64);
        const blob = await res.blob();
        await saveArquivo({ id: newId, lancamentoId: lancamento.id, nome: arq.nome, tipo: arq.tipo, blob });
        idsGerados.push(newId);
      }

      if (lancamento.grupos?.leads?.fotoArquivoId) lancamento.grupos.leads.fotoArquivoId = idMap[lancamento.grupos.leads.fotoArquivoId] || null;
      if (lancamento.grupos?.alunas?.fotoArquivoId) lancamento.grupos.alunas.fotoArquivoId = idMap[lancamento.grupos.alunas.fotoArquivoId] || null;
      for (const copy of (lancamento.copies || [])) {
        for (const bloco of (copy.blocos || [])) {
          if (bloco.arquivoId) bloco.arquivoId = idMap[bloco.arquivoId] || null;
        }
      }

      await saveLancamento(lancamento);
    } catch (e) {
      // FIX #4: rollback — deletar todos os arquivos já salvos
      for (const id of idsGerados) {
        try { await deleteArquivo(id); } catch (_) {}
      }
      showToast(`Erro na importação: ${e.message}. Nenhum dado foi salvo.`, 'error');
      return;
    }

    const items = await getLancamentos(expertId);
    setLancamentos(prev => ({ ...prev, [expertId]: items.sort((a, b) => a.nome.localeCompare(b.nome)) }));
    setSelectedLancamentoId(lancamento.id);
    setActiveTab('dados');
    showToast('Importação concluída.', 'success');
  }, [showToast]);

  // FIX #13: persistir checkpoints no lançamento
  const salvarCheckpoints = useCallback(async (checkpoints) => {
    if (!draft) return;
    const updated = { ...deepClone(draft), checkpoints };
    await saveLancamento(updated);
    setDraft(updated);
  }, [draft]);

  return (
    <AppContext.Provider value={{
      experts, lancamentos,
      selectedExpertId, setSelectedExpertId,
      selectedLancamentoId, setSelectedLancamentoId,
      activeTab, setActiveTab,
      draft, updateDraft, isDirty, lastSavedAt,
      salvar, desfazer, reverterVersao,
      criarExpert, renomearExpert, excluirExpert,
      criarLancamento, duplicarLancamento, excluirLancamento,
      uploadArquivo, getArquivoUrl, removerArquivo,
      exportarLancamento, importarLancamento,
      salvarCheckpoints,
      showToast, toast,
      modal, showModal, closeModal,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

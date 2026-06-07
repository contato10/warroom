import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, ChevronUp, ChevronDown, Upload, FileText, Image, Video, Music, File } from 'lucide-react';
import { uid, blankCopy, blankBloco, TIPO_BLOCO_LABELS, TIPO_BLOCO_ICONS, sortCopies } from '../lib/helpers';

const TIPO_ICONS_COMP = { texto: FileText, imagem: Image, video: Video, audio: Music, pdf: File };

// FIX #11: gerenciamento correto de object URLs com ref
function BlocoEditor({ bloco, index, totalBlocos, onUpdate, onDelete, onMoveUp, onMoveDown, lancamentoId }) {
  const { uploadArquivo, getArquivoUrl, removerArquivo } = useApp();
  const [fileUrl, setFileUrl] = useState(null);
  const fileRef = useRef();
  const urlRef = useRef(null); // FIX #11

  useEffect(() => {
    let cancelled = false;
    // FIX #11: revogar URL anterior antes de criar nova
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (bloco.arquivoId) {
      getArquivoUrl(bloco.arquivoId).then(url => {
        if (cancelled) { if (url) URL.revokeObjectURL(url); return; }
        urlRef.current = url;
        setFileUrl(url);
      });
    } else {
      setFileUrl(null);
    }
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [bloco.arquivoId]);

  // FIX #3: arquivo antigo é limpo no save (orphan cleanup), não precisamos deletar aqui
  // pois o ID antigo continua válido para outras versões no histórico.
  // Apenas criamos o novo arquivo e atualizamos o ID no draft.
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arq = await uploadArquivo(lancamentoId, file);
    onUpdate({ arquivoId: arq.id, arquivoNome: arq.nome });
    e.target.value = '';
  };

  // FIX #2: ao remover arquivo do bloco, também deletar do banco imediatamente
  const handleRemoveFile = async () => {
    if (bloco.arquivoId) await removerArquivo(bloco.arquivoId);
    onUpdate({ arquivoId: null, arquivoNome: null });
    setFileUrl(null);
  };

  const Icon = TIPO_ICONS_COMP[bloco.tipo] || File;
  const needsFile = bloco.possuiArquivo;
  const missingFile = needsFile && !bloco.arquivoId;

  return (
    <div className="card-inner p-3 space-y-2" style={{ borderColor: missingFile ? 'rgba(239,68,68,0.3)' : '#252b38' }}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0">
          <button className="btn-ghost p-0.5 rounded" onClick={onMoveUp} disabled={index === 0} style={{ opacity: index === 0 ? 0.3 : 1 }}>
            <ChevronUp size={12} />
          </button>
          <button className="btn-ghost p-0.5 rounded" onClick={onMoveDown} disabled={index === totalBlocos - 1} style={{ opacity: index === totalBlocos - 1 ? 0.3 : 1 }}>
            <ChevronDown size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: '#1e232d' }}>
          <Icon size={11} style={{ color: '#6b7280' }} />
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'IBM Plex Mono' }}>{TIPO_BLOCO_LABELS[bloco.tipo]}</span>
        </div>

        <div className="flex-1" />

        {bloco.tipo !== 'texto' && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bloco.possuiArquivo}
              onChange={e => onUpdate({ possuiArquivo: e.target.checked })}
              style={{ width: 'auto', display: 'inline-block' }}
            />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Possui arquivo</span>
          </label>
        )}

        <button className="btn-ghost p-1 rounded hover:text-red-400" onClick={onDelete}>
          <Trash2 size={12} />
        </button>
      </div>

      {bloco.tipo === 'texto' ? (
        <textarea
          value={bloco.conteudo}
          onChange={e => onUpdate({ conteudo: e.target.value })}
          rows={5}
          placeholder="Conteúdo da mensagem..."
          style={{ fontSize: 13, fontFamily: 'IBM Plex Sans', lineHeight: '1.6' }}
        />
      ) : (
        <div>
          <input
            value={bloco.conteudo}
            onChange={e => onUpdate({ conteudo: e.target.value })}
            placeholder="Legenda / descrição (opcional)"
            style={{ fontSize: 13, marginBottom: 8 }}
          />
          {needsFile && (
            <div className="flex items-center gap-2 flex-wrap">
              {bloco.arquivoNome ? (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded flex-1 min-w-0" style={{ background: '#1e232d' }}>
                  <Icon size={13} style={{ color: '#22c55e' }} />
                  <span className="text-xs flex-1 truncate" style={{ color: '#22c55e' }}>{bloco.arquivoNome}</span>
                  <button className="btn-ghost p-0.5 flex-shrink-0" onClick={handleRemoveFile}><Trash2 size={11} /></button>
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                  <Upload size={12} /> Enviar arquivo
                </button>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              {missingFile && <span style={{ fontSize: 11, color: '#ef4444' }}>⚠ Arquivo obrigatório</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyEditor({ copy, onUpdate, onDelete, lancamentoId }) {
  const [expanded, setExpanded] = useState(true);

  const updateBloco = (blocoId, changes) => {
    const blocos = copy.blocos.map(b => b.id === blocoId ? { ...b, ...changes } : b);
    onUpdate({ blocos });
  };

  const addBloco = (tipo) => {
    const bloco = blankBloco(tipo);
    onUpdate({ blocos: [...copy.blocos, bloco] });
  };

  // FIX #2: deletar copy remove arquivos dos blocos imediatamente
  const deleteBloco = async (blocoId, removerArquivoFn) => {
    const bloco = copy.blocos.find(b => b.id === blocoId);
    if (bloco?.arquivoId) await removerArquivoFn(bloco.arquivoId);
    onUpdate({ blocos: copy.blocos.filter(b => b.id !== blocoId) });
  };

  const moveBloco = (index, dir) => {
    const blocos = [...copy.blocos];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= blocos.length) return;
    [blocos[index], blocos[newIndex]] = [blocos[newIndex], blocos[index]];
    onUpdate({ blocos });
  };

  const hasErrors = !copy.data || !copy.hora || !copy.grupoDestino || !copy.blocos.length
    || copy.blocos.some(b => b.possuiArquivo && !b.arquivoId)
    || copy.blocos.some(b => b.tipo === 'texto' && !b.conteudo?.trim());

  const { removerArquivo } = useApp();

  return (
    <div className="card" style={{ borderColor: hasErrors ? 'rgba(245,158,11,0.3)' : '#252b38' }}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ borderBottom: expanded ? '1px solid #252b38' : 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasErrors && <span style={{ color: '#f59e0b', fontSize: 12 }}>⚠</span>}
          <span className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
            {copy.nome || 'Copy sem nome'}
          </span>
          {copy.data && copy.hora && (
            <span className="badge badge-gray" style={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}>
              {copy.data.split('-').reverse().join('/')} {copy.hora}
            </span>
          )}
          {copy.grupoDestino && (
            <span className={`badge ${copy.grupoDestino === 'leads' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: 10 }}>
              {copy.grupoDestino === 'leads' ? 'Leads' : 'Alunas'}
            </span>
          )}
          <span className="badge badge-gray" style={{ fontSize: 10 }}>{copy.blocos.length} bloco{copy.blocos.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost p-1 rounded hover:text-red-400"
            onClick={async e => {
              e.stopPropagation();
              if (confirm('Excluir esta copy e todos os seus arquivos?')) onDelete();
            }}
          >
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={13} style={{ color: '#6b7280' }} /> : <ChevronDown size={13} style={{ color: '#6b7280' }} />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label>Nome da copy</label>
              <input value={copy.nome} onChange={e => onUpdate({ nome: e.target.value })} placeholder="ex: Copy 01 — Boas-vindas" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label>Data</label>
              <input type="date" value={copy.data} onChange={e => onUpdate({ data: e.target.value })} style={{ fontSize: 13 }} />
            </div>
            <div>
              <label>Hora</label>
              <input type="time" value={copy.hora} onChange={e => onUpdate({ hora: e.target.value })} style={{ fontSize: 13 }} />
            </div>
          </div>
          <div style={{ maxWidth: 200 }}>
            <label>Grupo destino</label>
            <select value={copy.grupoDestino} onChange={e => onUpdate({ grupoDestino: e.target.value })} style={{ fontSize: 13 }}>
              <option value="leads">Leads</option>
              <option value="alunas">Alunas</option>
            </select>
          </div>

          <div>
            <div className="text-xs mb-2" style={{ color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'IBM Plex Mono' }}>
              Blocos — ordem de disparo
            </div>
            {copy.blocos.length === 0 && (
              <div className="text-xs py-3 text-center rounded" style={{ color: '#4b5563', background: '#1e232d' }}>
                ⚠ Nenhum bloco. Adicione pelo menos um bloco abaixo.
              </div>
            )}
            <div className="space-y-2">
              {copy.blocos.map((bloco, i) => (
                <BlocoEditor
                  key={bloco.id}
                  bloco={bloco}
                  index={i}
                  totalBlocos={copy.blocos.length}
                  onUpdate={changes => updateBloco(bloco.id, changes)}
                  onDelete={() => deleteBloco(bloco.id, removerArquivo)}
                  onMoveUp={() => moveBloco(i, -1)}
                  onMoveDown={() => moveBloco(i, 1)}
                  lancamentoId={lancamentoId}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-xs self-center" style={{ color: '#4b5563' }}>Adicionar bloco:</span>
              {Object.entries(TIPO_BLOCO_LABELS).map(([tipo, label]) => (
                <button key={tipo} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => addBloco(tipo)}>
                  {TIPO_BLOCO_ICONS[tipo]} {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabCopies() {
  const { draft, updateDraft, removerArquivo } = useApp();
  if (!draft) return null;

  const sorted = sortCopies(draft.copies || []);

  const addCopy = () => {
    const copy = blankCopy();
    updateDraft(d => { d.copies = [...(d.copies || []), copy]; return d; });
  };

  const updateCopy = (copyId, changes) => {
    updateDraft(d => {
      d.copies = d.copies.map(c => c.id === copyId ? { ...c, ...changes } : c);
      return d;
    });
  };

  // FIX #2: deletar copy limpa arquivos de todos os seus blocos
  const deleteCopy = async (copyId) => {
    const copy = draft.copies.find(c => c.id === copyId);
    if (copy) {
      for (const bloco of copy.blocos) {
        if (bloco.arquivoId) await removerArquivo(bloco.arquivoId);
      }
    }
    updateDraft(d => { d.copies = d.copies.filter(c => c.id !== copyId); return d; });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Copies</h2>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
            {sorted.length} cop{sorted.length !== 1 ? 'ies' : 'y'} · ordenadas por data e hora · copies sem data ficam no final
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={addCopy}>
          <Plus size={13} /> Nova Copy
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map(copy => (
          <CopyEditor
            key={copy.id}
            copy={copy}
            onUpdate={changes => updateCopy(copy.id, changes)}
            onDelete={() => deleteCopy(copy.id)}
            lancamentoId={draft.id}
          />
        ))}
        {sorted.length === 0 && (
          <div className="card p-8 text-center">
            <p style={{ color: '#4b5563', fontSize: 14 }}>Nenhuma copy cadastrada ainda.</p>
            <button className="btn btn-primary btn-sm mt-3" onClick={addCopy}><Plus size={13} /> Adicionar primeira copy</button>
          </div>
        )}
      </div>
    </div>
  );
}

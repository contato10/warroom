import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, ChevronRight, Plus, Copy, Trash2, Upload, Download, Pencil, X, Check } from 'lucide-react';

function ExpertItem({ expert }) {
  const {
    lancamentos, selectedExpertId, setSelectedExpertId,
    selectedLancamentoId, setSelectedLancamentoId,
    criarLancamento, duplicarLancamento, excluirLancamento,
    renomearExpert, excluirExpert, importarLancamento,
    setActiveTab,
  } = useApp();

  const [open, setOpen] = useState(expert.id === selectedExpertId);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(expert.nome);
  const [hovering, setHovering] = useState(false);
  const importRef = useRef();

  const items = lancamentos[expert.id] || [];

  const handleSelectLanc = (id) => {
    setSelectedExpertId(expert.id);
    setSelectedLancamentoId(id);
    setActiveTab('dados');
  };

  const handleRename = async () => {
    if (nameVal.trim()) await renomearExpert(expert.id, nameVal.trim());
    setEditingName(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await importarLancamento(file, expert.id);
    setOpen(true);
    e.target.value = '';
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer group select-none"
        style={{ color: '#9ca3af' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 flex-1 min-w-0">
          {open ? <ChevronDown size={13} className="flex-shrink-0" /> : <ChevronRight size={13} className="flex-shrink-0" />}
          {editingName ? (
            <input
              className="flex-1 bg-transparent border-b border-blue-500 outline-none text-sm text-white py-0"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #2563FF', borderRadius: 0, padding: '0', width: '100%' }}
            />
          ) : (
            <span className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>{expert.nome}</span>
          )}
        </button>
        {hovering && !editingName && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button className="btn-ghost p-0.5 rounded hover:text-white" title="Renomear" onClick={e => { e.stopPropagation(); setEditingName(true); }}>
              <Pencil size={11} />
            </button>
            <button className="btn-ghost p-0.5 rounded hover:text-white" title="Importar lançamento" onClick={e => { e.stopPropagation(); importRef.current?.click(); }}>
              <Upload size={11} />
            </button>
            <button className="btn-ghost p-0.5 rounded" title="Novo lançamento" style={{ color: '#2563FF' }} onClick={e => { e.stopPropagation(); criarLancamento(expert.id); setOpen(true); }}>
              <Plus size={11} />
            </button>
            <button className="btn-ghost p-0.5 rounded hover:text-red-400" title="Excluir expert" onClick={e => { e.stopPropagation(); if (confirm(`Excluir "${expert.nome}" e todos os seus lançamentos?`)) excluirExpert(expert.id); }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {open && (
        <div className="ml-4 border-l pl-2" style={{ borderColor: '#252b38' }}>
          {items.length === 0 && (
            <div className="py-1 px-2 text-xs" style={{ color: '#4b5563' }}>Nenhum lançamento</div>
          )}
          {items.map(l => (
            <LancamentoItem
              key={l.id}
              lanc={l}
              isSelected={selectedLancamentoId === l.id}
              onSelect={() => handleSelectLanc(l.id)}
              onDuplicate={() => duplicarLancamento(l.id)}
              onDelete={() => { if (confirm(`Excluir "${l.nome}"?`)) excluirLancamento(l.id); }}
            />
          ))}
          <button
            className="flex items-center gap-1 text-xs py-1 px-2 rounded w-full text-left hover:bg-surface2 mt-0.5"
            style={{ color: '#4b5563' }}
            onClick={() => criarLancamento(expert.id)}
          >
            <Plus size={11} /> Novo lançamento
          </button>
        </div>
      )}
    </div>
  );
}

function LancamentoItem({ lanc, isSelected, onSelect, onDuplicate, onDelete }) {
  const [hovering, setHovering] = useState(false);
  const { exportarLancamento, selectedLancamentoId } = useApp();

  const statusDot = { sincronizado: 'dot-green', pendente: 'dot-amber', erro: 'dot-red' }[lanc.syncStatus] || 'dot-gray';

  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer group"
      style={{ background: isSelected ? '#1e232d' : 'transparent', color: isSelected ? '#e2e8f0' : '#9ca3af' }}
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span className={`status-dot flex-shrink-0 ${statusDot}`} style={{ width: 5, height: 5 }} />
      <span className="text-xs truncate flex-1">{lanc.nome || 'Sem nome'}</span>
      {hovering && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button className="btn-ghost p-0.5 rounded" title="Duplicar" onClick={e => { e.stopPropagation(); onDuplicate(); }}>
            <Copy size={10} />
          </button>
          {isSelected && (
            <button className="btn-ghost p-0.5 rounded" title="Exportar" onClick={e => { e.stopPropagation(); exportarLancamento(); }}>
              <Download size={10} />
            </button>
          )}
          <button className="btn-ghost p-0.5 rounded hover:text-red-400" title="Excluir" onClick={e => { e.stopPropagation(); onDelete(); }}>
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { experts, criarExpert, setSelectedExpertId, setSelectedLancamentoId } = useApp();
  const [newExpertName, setNewExpertName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleCreate = async () => {
    if (!newExpertName.trim()) return;
    await criarExpert(newExpertName.trim());
    setNewExpertName('');
    setShowInput(false);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0d1117', borderRight: '1px solid #1a2233', width: 240 }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#1a2233' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span className="font-bold text-sm tracking-tight" style={{ color: '#e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>WAR ROOM</span>
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#4b5563', fontFamily: 'IBM Plex Mono, monospace' }}>Lançamentos Meteóricos</div>
      </div>

      {/* Experts list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <div className="text-xs px-2 mb-1" style={{ color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono, monospace' }}>Experts</div>
        {experts.map(e => <ExpertItem key={e.id} expert={e} />)}
        {experts.length === 0 && (
          <div className="px-2 py-3 text-xs text-center" style={{ color: '#374151' }}>Nenhum expert ainda.<br />Crie o primeiro abaixo.</div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: '#1a2233' }}>
        {showInput ? (
          <div className="flex gap-1">
            <input
              autoFocus
              value={newExpertName}
              onChange={e => setNewExpertName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowInput(false); }}
              placeholder="Nome do expert"
              style={{ fontSize: 12, padding: '6px 8px' }}
            />
            <button className="btn btn-primary btn-sm px-2" onClick={handleCreate}><Check size={12} /></button>
            <button className="btn btn-secondary btn-sm px-2" onClick={() => setShowInput(false)}><X size={12} /></button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm w-full justify-center" style={{ fontSize: 12 }} onClick={() => setShowInput(true)}>
            <Plus size={13} /> Novo Expert
          </button>
        )}
      </div>
    </div>
  );
}

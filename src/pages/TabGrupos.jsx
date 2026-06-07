import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Upload, Image } from 'lucide-react';

function GrupoPanel({ grupoKey, label }) {
  const { draft, updateDraft, uploadArquivo, getArquivoUrl, removerArquivo } = useApp();
  const grupo = draft.grupos[grupoKey];
  const [fotoUrl, setFotoUrl] = useState(null);
  const [newAdmin, setNewAdmin] = useState('');
  const fileRef = useRef();
  // FIX #11: ref para URL atual, evita double-revoke
  const urlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (grupo.fotoArquivoId) {
      getArquivoUrl(grupo.fotoArquivoId).then(url => {
        if (cancelled) { if (url) URL.revokeObjectURL(url); return; }
        urlRef.current = url;
        setFotoUrl(url);
      });
    } else {
      setFotoUrl(null);
    }
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [grupo.fotoArquivoId]);

  const setGrupo = (key, val) => updateDraft(d => {
    d.grupos[grupoKey][key] = val;
    return d;
  });

  // FIX #3: novo upload sempre cria novo arquivo. O antigo é limpo no save via orphan cleanup.
  // Não deletamos aqui para preservar integridade caso o usuário desfaça antes de salvar.
  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arq = await uploadArquivo(draft.id, file);
    setGrupo('fotoArquivoId', arq.id);
    e.target.value = '';
  };

  // FIX #2: remover foto deleta imediatamente do banco
  const handleRemoveFoto = async () => {
    if (grupo.fotoArquivoId) await removerArquivo(grupo.fotoArquivoId);
    setGrupo('fotoArquivoId', null);
    setFotoUrl(null);
  };

  const addAdmin = () => {
    if (!newAdmin.trim()) return;
    const admins = [...(grupo.admins || []), newAdmin.trim()];
    setGrupo('admins', admins);
    setNewAdmin('');
  };

  const removeAdmin = (i) => {
    const admins = [...(grupo.admins || [])];
    admins.splice(i, 1);
    setGrupo('admins', admins);
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Grupo {label}</span>
        <span className="badge badge-gray text-xs" style={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}>somente admins enviam</span>
      </div>

      <div>
        <label>Nome do grupo (visível no WhatsApp)</label>
        <input value={grupo.nome} onChange={e => setGrupo('nome', e.target.value)} placeholder={label === 'Leads' ? 'ex: SARADAS ON #10 GRUPO OFICIAL' : 'ex: GRUPO OFICIAL DAS SARADAS'} />
      </div>

      <div>
        <label>Foto do grupo</label>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full cursor-pointer overflow-hidden flex-shrink-0"
            style={{ width: 64, height: 64, background: '#1e232d', border: '2px solid #252b38' }}
            onClick={() => fileRef.current?.click()}
          >
            {fotoUrl ? (
              <img src={fotoUrl} alt="foto" className="w-full h-full object-cover" />
            ) : (
              <Image size={22} style={{ color: '#4b5563' }} />
            )}
          </div>
          <div className="space-y-1">
            <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              <Upload size={12} /> {fotoUrl ? 'Trocar foto' : 'Enviar foto'}
            </button>
            {fotoUrl && (
              <button className="btn btn-danger btn-sm" onClick={handleRemoveFoto}>
                <Trash2 size={12} /> Remover
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
        </div>
        {!grupo.fotoArquivoId && (
          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>⚠ Foto obrigatória para execução</p>
        )}
      </div>

      <div>
        <label>Bio / Descrição do grupo</label>
        <textarea
          value={grupo.bio}
          onChange={e => setGrupo('bio', e.target.value)}
          rows={4}
          placeholder="Texto que aparece na descrição do grupo no WhatsApp..."
        />
      </div>

      <div>
        <label>Administradores</label>
        <div className="space-y-1.5 mb-2">
          {(grupo.admins || []).map((admin, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: '#1e232d' }}>
              <span className="flex-1 text-sm" style={{ color: '#e2e8f0' }}>{admin}</span>
              <button className="btn-ghost p-0.5" onClick={() => removeAdmin(i)}>
                <Trash2 size={12} style={{ color: '#6b7280' }} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newAdmin}
            onChange={e => setNewAdmin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAdmin()}
            placeholder="Nome ou número do admin"
            style={{ fontSize: 13 }}
          />
          <button className="btn btn-secondary btn-sm flex-shrink-0" onClick={addAdmin}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {!grupo.admins?.length && (
          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>⚠ Pelo menos um admin é obrigatório</p>
        )}
      </div>
    </div>
  );
}

export default function TabGrupos() {
  const { draft } = useApp();
  if (!draft) return null;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: '#e2e8f0' }}>Configuração dos Grupos</h2>
        <p className="text-xs mb-4" style={{ color: '#6b7280' }}>Ambos os grupos serão criados como novos no Devzapp. Nunca reutilizar grupos existentes.</p>
      </div>
      <GrupoPanel grupoKey="leads" label="Leads" />
      <GrupoPanel grupoKey="alunas" label="Alunas" />
    </div>
  );
}

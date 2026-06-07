import { openDB } from 'idb';

const DB_NAME = 'warroom_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('experts')) {
          db.createObjectStore('experts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('lancamentos')) {
          const ls = db.createObjectStore('lancamentos', { keyPath: 'id' });
          ls.createIndex('expertId', 'expertId');
        }
        if (!db.objectStoreNames.contains('arquivos')) {
          const as = db.createObjectStore('arquivos', { keyPath: 'id' });
          as.createIndex('lancamentoId', 'lancamentoId');
        }
      },
    });
  }
  return dbPromise;
}

// ---------- EXPERTS ----------
export async function getExperts() {
  const db = await getDB();
  return db.getAll('experts');
}
export async function saveExpert(expert) {
  const db = await getDB();
  await db.put('experts', expert);
}
export async function deleteExpert(id) {
  const db = await getDB();
  await db.delete('experts', id);
}

// ---------- LANÇAMENTOS ----------
export async function getLancamentos(expertId) {
  const db = await getDB();
  return db.getAllFromIndex('lancamentos', 'expertId', expertId);
}
export async function getLancamento(id) {
  const db = await getDB();
  return db.get('lancamentos', id);
}
export async function saveLancamento(lancamento) {
  const db = await getDB();
  await db.put('lancamentos', lancamento);
}

// FIX #7: deletar arquivos ANTES do lançamento, em operações separadas mas ordenadas
// (IDB não suporta transações cross-store em idb wrapper facilmente; ordenamos manualmente)
export async function deleteLancamento(id) {
  const db = await getDB();
  // 1. Buscar e deletar arquivos primeiro
  const files = await db.getAllFromIndex('arquivos', 'lancamentoId', id);
  for (const f of files) {
    await db.delete('arquivos', f.id);
  }
  // 2. Só então deletar o lançamento
  await db.delete('lancamentos', id);
}

// ---------- ARQUIVOS ----------
export async function saveArquivo(arquivo) {
  const db = await getDB();
  await db.put('arquivos', arquivo);
}
export async function getArquivo(id) {
  const db = await getDB();
  return db.get('arquivos', id);
}
export async function deleteArquivo(id) {
  const db = await getDB();
  await db.delete('arquivos', id);
}
export async function getArquivosByLancamento(lancamentoId) {
  const db = await getDB();
  return db.getAllFromIndex('arquivos', 'lancamentoId', lancamentoId);
}

// FIX #2 / cleanup: Coleta todos os arquivoIds referenciados em um lançamento
export function coletarArquivoIdsReferenciados(lanc) {
  const ids = new Set();
  if (lanc.grupos?.leads?.fotoArquivoId) ids.add(lanc.grupos.leads.fotoArquivoId);
  if (lanc.grupos?.alunas?.fotoArquivoId) ids.add(lanc.grupos.alunas.fotoArquivoId);
  for (const copy of (lanc.copies || [])) {
    for (const bloco of (copy.blocos || [])) {
      if (bloco.arquivoId) ids.add(bloco.arquivoId);
    }
  }
  return ids;
}

// Deleta arquivos órfãos (não referenciados pelo lançamento atual)
export async function limparArquivosOrfaos(lancamentoId, idsReferenciados) {
  const db = await getDB();
  const todos = await db.getAllFromIndex('arquivos', 'lancamentoId', lancamentoId);
  for (const arq of todos) {
    if (!idsReferenciados.has(arq.id)) {
      await db.delete('arquivos', arq.id);
    }
  }
}

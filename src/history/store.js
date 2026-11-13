// Histórico de medições guardado no aparelho (IndexedDB). Nada é enviado para a rede.

const DB = 'flechas', VERSION = 1, STORE = 'medicoes';

const req = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const done = tx => new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error); });

/** Abre o histórico. Devolve null se o IndexedDB não existir ou não abrir (ex.: navegação privada). */
export async function openHistory(idbFactory = globalThis.indexedDB) {
  if (!idbFactory) return null;
  let db;
  try {
    const open = idbFactory.open(DB, VERSION);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE, { keyPath: 'id' }); };
    db = await req(open);
  } catch (e) { return null; }

  const store = mode => db.transaction(STORE, mode).objectStore(STORE);
  return {
    async add(rec) { const s = store('readwrite'); s.put(rec); await done(s.transaction); },
    async list() {
      const all = await req(store('readonly').getAll());
      return all.sort((x, y) => (x.savedAt < y.savedAt ? 1 : x.savedAt > y.savedAt ? -1 : 0));
    },
    async remove(id) { const s = store('readwrite'); s.delete(id); await done(s.transaction); },
    /** Junta registos importados; um id que já exista é ignorado (prevalece o que está no aparelho). */
    async importMany(recs) {
      const s = store('readwrite');
      const existing = new Set(await req(s.getAllKeys()));
      let added = 0, skipped = 0;
      for (const r of recs) {
        if (existing.has(r.id)) { skipped++; continue; }
        s.put(r); existing.add(r.id); added++;
      }
      await done(s.transaction);
      return { added, skipped };
    },
  };
}

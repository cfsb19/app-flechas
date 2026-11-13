// Aviso de versão nova do APK Android. A PWA atualiza-se sozinha pelo service worker.

const parse = v => (/^\d+\.\d+\.\d+$/.test(String(v)) ? String(v).split('.').map(Number) : null);

/** true se `remote` (x.y.z) for mais recente que `local`. */
export function isNewer(remote, local) {
  const r = parse(remote), l = parse(local);
  if (!r || !l) return false;
  for (let i = 0; i < 3; i++) if (r[i] !== l[i]) return r[i] > l[i];
  return false;
}

const isNative = () => !!(globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform());
const localVersion = () => (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0');

/** Consulta version.json no alojamento. Devolve { version, apk } (apk com URL absoluto) ou null. */
export async function checkApkUpdate({
  fetchImpl = globalThis.fetch,
  baseUrl = import.meta.env?.VITE_HOSTING_URL,
  local = localVersion(),
  native = isNative(),
} = {}) {
  if (!native || !baseUrl) return null;
  try {
    const base = String(baseUrl).replace(/\/+$/, '');
    const res = await fetchImpl(base + '/version.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const v = await res.json();
    if (!v || !isNewer(v.version, local) || typeof v.apk !== 'string') return null;
    return { version: v.version, apk: new URL(v.apk, base + '/').href };
  } catch (e) { return null; }
}

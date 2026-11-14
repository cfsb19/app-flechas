// Alerta por email ao administrador quando alguém pede acesso.
// Faz POST para um script Google Apps Script na conta do administrador, que envia o email.
// Sem URL configurado, ou se a rede falhar, não faz nada: o pedido fica registado na mesma.

export async function enviarAlerta({ nome, email }, { url = import.meta.env?.VITE_ALERTA_URL, fetchImpl = globalThis.fetch } = {}) {
  if (!url) return false;
  try {
    await fetchImpl(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ nome: String(nome || '').slice(0, 80), email: String(email || '').slice(0, 120) }),
    });
    return true;
  } catch (e) { return false; }
}

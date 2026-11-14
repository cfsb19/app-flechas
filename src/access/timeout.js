// Limite de tempo para operações de rede que podem ficar penduradas (ex.: escritas do Firestore sem rede).
export function comTimeout(promessa, ms) {
  let t;
  const limite = new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'timeout' })), ms); });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(t));
}

// Encartes e horário editados pelo painel do dono (painel/). Ficam no banco "Órbita Sites".
// Sem banco ou sem resposta, o site usa a última cópia salva no aparelho ou o encartes.js.
import {banco} from './config.js?v=encarte-20261125';
import {encartes} from './encartes.js?v=encarte-20261125';

const CACHE = 'smiguel-remoto';
export const horario = {abre: 6, fecha: 19};
const fotoOk = s => typeof s === 'string' && (/^assets\/[\w./-]+$/.test(s) || (s.startsWith(banco.url + '/storage/v1/object/public/fotos/' + banco.site + '/') && /^[\w:./%-]+$/.test(s)));
const dataOk = s => typeof s === 'string' && Number.isFinite(Date.parse(s));

function aplicar(ajustes) {
  let mudou = false;
  const enc = ajustes.find(a => a.chave === 'encartes')?.dados;
  if (Array.isArray(enc)) {
    const lista = enc.filter(e => e && typeof e.id === 'string' && fotoOk(e.imagem) && dataOk(e.inicio) && dataOk(e.fim))
      .map(e => ({id: String(e.id).slice(0, 80), titulo: String(e.titulo || 'Encarte').slice(0, 140), imagem: e.imagem, inicio: e.inicio, fim: e.fim}));
    encartes.splice(0, encartes.length, ...lista); mudou = true;
  }
  const h = ajustes.find(a => a.chave === 'horario')?.dados;
  if (h && Number.isInteger(h.abre) && Number.isInteger(h.fecha) && h.abre >= 0 && h.fecha <= 24 && h.abre < h.fecha) { horario.abre = h.abre; horario.fecha = h.fecha; mudou = true; }
  return mudou;
}

// Aplica já a cópia salva (sem esperar a internet).
try { const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (Array.isArray(c)) aplicar(c); } catch {}

// Busca a versão nova no banco (até 5 s). Devolve true se algo mudou.
export async function atualizarDoBanco() {
  if (!banco.url || !banco.chave || !banco.site) return false;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(banco.url + '/rest/v1/ajustes?select=chave,dados&site=eq.' + encodeURIComponent(banco.site), {headers: {apikey: banco.chave, Authorization: 'Bearer ' + banco.chave}, signal: ctl.signal});
    clearTimeout(t);
    if (!r.ok) return false;
    const dados = await r.json();
    try { localStorage.setItem(CACHE, JSON.stringify(dados)); } catch {}
    return aplicar(dados);
  } catch { return false; }
}

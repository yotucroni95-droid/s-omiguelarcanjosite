import { encartes, encarteAtivo } from './encartes.js?v=encarte-20261125b';
import { horario, atualizarDoBanco } from './remoto.js?v=encarte-20261125b';

const $ = (s, el = document) => el.querySelector(s);
const FUSO = 'America/Recife';
// Horário vem do painel do dono (remoto.js); padrão 6h às 19h.
const ABRE_ = () => horario.abre, FECHA_ = () => horario.fecha;

// Para conferir um encarte programado antes da data: ?simular=2026-11-14T10:00
const simulado = (() => {
  const p = new URLSearchParams(location.search).get('simular');
  const t = p ? Date.parse(p.length <= 16 ? p + ':00-03:00' : p) : NaN;
  return Number.isFinite(t) ? t - Date.now() : 0;
})();
const agora = () => Date.now() + simulado;

/* ---------- topo fica sólido ao rolar ---------- */
const topo = $('#topo');
const marcarTopo = () => topo.classList.toggle('solid', scrollY > 30);
addEventListener('scroll', marcarTopo, { passive: true });
marcarTopo();

/* ---------- aberto ou fechado agora ---------- */
const horaRecife = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
function atualizarStatus() {
  const [h, m] = horaRecife.format(agora()).split(':').map(Number);
  const min = h * 60 + m;
  const aberto = min >= ABRE_() * 60 && min < FECHA_() * 60;
  const falta = FECHA_() * 60 - min;
  const txt = aberto
    ? (falta <= 60 ? `Aberto agora · fecha em ${falta} min` : `Aberto agora · até as ${FECHA_()}h`)
    : (min < ABRE_() * 60 ? `Fechado agora · abre às ${ABRE_()}h` : `Fechado agora · abre amanhã às ${ABRE_()}h`);
  const st = $('[data-status]');
  st.classList.toggle('aberto', aberto);
  st.classList.toggle('fechado', !aberto);
  $('[data-status-txt]').textContent = txt;
  const card = $('[data-status-card]');
  card.textContent = aberto ? 'Aberto agora.' : (min < ABRE_() * 60 ? `Fechado agora. Abre às ${ABRE_()}h.` : `Fechado agora. Abre amanhã às ${ABRE_()}h.`);
  card.classList.toggle('aberto', aberto);
  card.classList.toggle('fechado', !aberto);
}

/* ---------- encarte ---------- */
const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: '2-digit', month: '2-digit' });
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
const nomeCampanha = t => t.replace(/\s*[—-]\s*p[áa]gina\s*\d+\s*$/i, '').trim();

let assinatura = null;
let fimAtual = 0;
let observadorPaginas = null;

function textoValidade(fim) {
  // fim à meia-noite = vale o dia anterior inteiro
  const ultimo = new Date(fim - 1);
  const meiaNoite = hora.format(new Date(fim)) === '00:00';
  return meiaNoite ? `Válido até ${dia.format(ultimo)}` : `Válido até ${dia.format(ultimo)}, ${hora.format(new Date(fim))}`;
}

function atualizarContagem() {
  const el = $('[data-countdown]');
  if (!fimAtual) { el.textContent = ''; return; }
  let s = Math.max(0, Math.floor((fimAtual - agora()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const p = n => String(n).padStart(2, '0');
  el.textContent = d > 0 ? `Termina em ${d}d ${p(h)}h ${p(m)}min` : `Termina em ${p(h)}:${p(m)}:${p(s)}`;
}

function renderEncartes() {
  const ativos = encartes.filter(e => encarteAtivo(e, agora()));
  const chave = ativos.map(e => e.id).join('|');
  if (chave === assinatura) return;
  assinatura = chave;
  if ($('#visor').open && !ativos.length) fecharVisor();

  const tem = ativos.length > 0;
  $('[data-encarte]').hidden = !tem;
  $('[data-sem-encarte]').hidden = tem;
  $('[data-validade]').hidden = !tem;
  $('[data-hero-cta-txt]').textContent = tem ? 'Ver o encarte da semana' : 'Ver as novidades';
  $('[data-cta-ofertas]').classList.toggle('pulse', tem);

  const paginas = $('[data-paginas]');
  const nav = $('[data-paginas-nav]');
  paginas.replaceChildren();
  nav.replaceChildren();
  observadorPaginas?.disconnect();
  fimAtual = 0;

  if (!tem) {
    $('[data-ofertas-titulo]').textContent = 'Ofertas da semana';
    atualizarContagem();
    return;
  }

  fimAtual = Math.min(...ativos.map(e => Date.parse(e.fim)));
  const campanhas = [...new Set(ativos.map(e => nomeCampanha(e.titulo).split(/\s+[—–]\s+/)[0]))];
  $('[data-ofertas-titulo]').textContent = campanhas.length === 1 && campanhas[0].length <= 40 ? campanhas[0] : 'Ofertas da semana';
  $('[data-validade-txt]').textContent = textoValidade(fimAtual);
  atualizarContagem();
  paginas.classList.toggle('uma', ativos.length === 1);
  nav.hidden = ativos.length < 2;

  ativos.forEach((e, i) => {
    const fig = document.createElement('figure');
    fig.className = 'pagina';
    fig.id = `encarte-${i + 1}`;
    const img = document.createElement('img');
    img.src = e.imagem;
    img.alt = e.titulo;
    img.decoding = 'async';
    if (i > 0) img.loading = 'lazy';
    img.addEventListener('load', () => fig.style.setProperty('--ar', `${img.naturalWidth}/${img.naturalHeight}`), { once: true });
    img.addEventListener('dblclick', () => abrirVisor(e));
    fig.append(img);
    if (ativos.length > 1) {
      const n = document.createElement('span');
      n.className = 'pagina-n';
      n.textContent = `Página ${i + 1} de ${ativos.length}`;
      fig.append(n);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ampliar';
    b.innerHTML = '<svg class="icon"><use href="#expand"/></svg>Tela cheia';
    b.setAttribute('aria-label', `Ver ${e.titulo} em tela cheia`);
    b.addEventListener('click', () => abrirVisor(e));
    fig.append(b);
    paginas.append(fig);

    const nb = document.createElement('button');
    nb.type = 'button';
    nb.textContent = `Página ${i + 1}`;
    nb.addEventListener('click', () => fig.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    nav.append(nb);
  });

  // marca a página que está na tela e faz cada uma aparecer ao rolar
  const botoes = [...nav.children];
  observadorPaginas = new IntersectionObserver(entradas => {
    for (const en of entradas) {
      if (en.isIntersecting) en.target.classList.add('visto');
      if (en.isIntersecting && en.intersectionRatio > 0.25) {
        const i = [...paginas.children].indexOf(en.target);
        botoes.forEach((b, j) => b.setAttribute('aria-current', String(i === j)));
      }
    }
  }, { threshold: [0, 0.25, 0.5], rootMargin: '0px 0px -10% 0px' });
  [...paginas.children].forEach(f => observadorPaginas.observe(f));
  botoes[0]?.setAttribute('aria-current', 'true');
}

/* ---------- tela cheia com zoom ---------- */
const visor = $('#visor');
const area = $('[data-visor-area]');
function abrirVisor(e) {
  $('[data-visor-img]').src = e.imagem;
  $('[data-visor-img]').alt = e.titulo;
  $('[data-visor-titulo]').textContent = nomeCampanha(e.titulo).split(/\s+[—–]\s+/)[0] +(/\d+\s*$/.test(e.titulo) ? ` · pág. ${e.titulo.match(/(\d+)\s*$/)[1]}` : '');
  area.classList.remove('zoom');
  area.scrollTo(0, 0);
  visor.showModal();
  document.body.classList.add('travado');
}
function fecharVisor() { if (visor.open) visor.close(); }
$('[data-visor-fechar]').addEventListener('click', fecharVisor);
visor.addEventListener('close', () => { document.body.classList.remove('travado'); $('[data-visor-img]').removeAttribute('src'); });
let ultimoToque = 0;
function alternarZoom(x, y) {
  const r = area.getBoundingClientRect();
  const fx = (x - r.left + area.scrollLeft) / area.scrollWidth;
  const fy = (y - r.top + area.scrollTop) / area.scrollHeight;
  area.classList.toggle('zoom');
  requestAnimationFrame(() => setTimeout(() => {
    area.scrollTo(fx * area.scrollWidth - r.width / 2, fy * area.scrollHeight - r.height / 2);
  }, 260));
}
area.addEventListener('dblclick', ev => alternarZoom(ev.clientX, ev.clientY));
area.addEventListener('touchend', ev => {
  if (ev.changedTouches.length !== 1 || ev.touches.length) return;
  const t = Date.now();
  if (t - ultimoToque < 300) { ev.preventDefault(); const p = ev.changedTouches[0]; alternarZoom(p.clientX, p.clientY); ultimoToque = 0; }
  else ultimoToque = t;
});

/* ---------- mandar o encarte ---------- */
$('[data-compartilhar]').addEventListener('click', async () => {
  const url = location.origin + location.pathname + '#ofertas';
  const texto = 'Olha as ofertas do São Miguel Arcanjo!';
  if (navigator.share) {
    try { await navigator.share({ title: 'Encarte São Miguel Arcanjo', text: texto, url }); return; }
    catch (err) { if (err && err.name === 'AbortError') return; }
  }
  open('https://wa.me/?text=' + encodeURIComponent(`${texto} ${url}`), '_blank', 'noopener');
});

/* ---------- setores: bolinhas acompanham o deslize ---------- */
const trilho = $('[data-trilho]');
const dots = [...$('[data-trilho-dots]').children];
trilho.addEventListener('scroll', () => {
  const cards = [...trilho.children];
  const meio = trilho.scrollLeft + trilho.clientWidth / 2;
  let i = 0, menor = Infinity;
  cards.forEach((c, j) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - meio); if (d < menor) { menor = d; i = j; } });
  dots.forEach((d, j) => d.classList.toggle('on', j === i));
}, { passive: true });
dots[0]?.classList.add('on');

/* ---------- aparecer ao rolar ---------- */
const obs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

/* ---------- ciclo ---------- */
// Textos com o horário (ex.: "das 6h às 19h") acompanham o que o dono salvou no painel.
function textosHorario() {
  document.querySelectorAll('[data-horario]').forEach(el => { el.textContent = el.dataset.horario.replace('{abre}', horario.abre).replace('{fecha}', horario.fecha); });
}
function tique() { renderEncartes(); atualizarStatus(); }
textosHorario();
tique();
atualizarDoBanco().then(mudou => { if (mudou) { assinatura = null; textosHorario(); tique(); } });
setInterval(atualizarContagem, 1000);
setInterval(tique, 1000);
addEventListener('pageshow', tique);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tique(); });
$('#ano').textContent = new Date(agora()).getFullYear();

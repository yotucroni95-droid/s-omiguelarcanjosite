// Painel do São Miguel Arcanjo: o dono e a equipe entram com usuário e senha e trocam encartes e horário.
// Os dados vão para o banco "Órbita Sites" (site 'sao-miguel'). As regras do banco só deixam a equipe deste site alterar.
import {banco} from '../config.js?v=encarte-20261125';
import {encartes as encartesArquivo} from '../encartes.js?v=encarte-20261125';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'encarte';
const paraLogin = v => { v = String(v || '').trim().toLowerCase(); return v.includes('@') ? v : v + '@' + banco.site + '.invalid'; };
const mostrarUsuario = e => String(e || '').endsWith('.invalid') ? String(e).split('@')[0] : e;
const app = document.getElementById('app'), quem = document.getElementById('quem');
const SITE = banco.site;
let sb, email = '', orbita = false, dono = false, aba = 'encartes';

function aviso(texto, tipo = 'ok') {
  let t = document.querySelector('.aviso'); if (!t) { t = document.createElement('div'); t.className = 'aviso'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = texto; t.dataset.tipo = tipo; t.classList.add('mostra'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('mostra'), 4000);
}

async function iniciar() {
  try {
    const {createClient} = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    sb = createClient(banco.url, banco.chave, {auth: {persistSession: true, detectSessionInUrl: false, storageKey: 'orbita-sites-sessao'}});
  } catch { app.innerHTML = '<div class="caixa"><p class="erro">Não foi possível carregar. Verifique a internet e recarregue a página.</p></div>'; return; }
  const {data} = await sb.auth.getSession();
  if (data.session) await entrou(data.session); else telaLogin();
}

// ---------- login ----------
function telaLogin(msg = '') {
  quem.innerHTML = '';
  app.innerHTML = '<form class="caixa login" data-login><img src="../assets/marca.jpg" alt="" width="64" height="64"><h1>Painel do mercado</h1><p class="nota">Entre com o seu usuário e senha.</p>' +
    (msg ? '<p class="erro" role="alert">' + esc(msg) + '</p>' : '') +
    '<label>Usuário<input name="usuario" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label>Senha<input name="senha" type="password" autocomplete="current-password" required></label>' +
    '<button class="bt principal">Entrar</button><p class="nota">Esqueceu a senha? Peça para o dono criar uma nova na aba Equipe.</p></form>';
  app.querySelector('[data-login]').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), bt = e.target.querySelector('button'); bt.disabled = true; bt.textContent = 'Entrando…';
    const {data, error} = await sb.auth.signInWithPassword({email: paraLogin(f.get('usuario')), password: f.get('senha')});
    if (error) return telaLogin('Usuário ou senha incorretos.');
    await entrou(data.session);
  };
}

async function entrou(sessao) {
  email = sessao.user.email.toLowerCase();
  const minhas = (await sb.from('equipe').select('site,papel')).data || [];
  orbita = minhas.some(r => r.site === '*');
  const aqui = minhas.find(r => r.site === SITE);
  if (!orbita && !aqui) {
    // A sessão é a mesma em todos os painéis da Órbita: não desloga, só oferece trocar de usuário.
    app.innerHTML = '<div class="caixa login"><h1>Sem acesso a este site</h1><p class="nota">O usuário ' + esc(mostrarUsuario(email)) + ' não tem permissão para editar o São Miguel Arcanjo.</p><button class="bt principal" data-trocar>Entrar com outro usuário</button></div>';
    app.querySelector('[data-trocar]').onclick = async () => { await sb.auth.signOut(); telaLogin(); };
    return;
  }
  dono = orbita || aqui?.papel === 'dono';
  quem.innerHTML = '<span>' + esc(mostrarUsuario(email)) + '</span><button class="bt" data-sair>Sair</button>';
  quem.querySelector('[data-sair]').onclick = async () => { await sb.auth.signOut(); telaLogin(); };
  desenhar();
}

function desenhar() {
  const abas = [['encartes', 'Encartes'], ['horario', 'Horário'], ...(dono ? [['equipe', 'Equipe']] : []), ['conta', 'Minha senha']];
  app.innerHTML = '<nav class="abas" role="tablist">' + abas.map(([id, n]) => '<button role="tab" aria-selected="' + (aba === id) + '" data-aba="' + id + '">' + n + '</button>').join('') + '</nav><div id="conteudo"></div>';
  app.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { aba = b.dataset.aba; desenhar(); });
  ({encartes: telaEncartes, horario: telaHorario, equipe: telaEquipe, conta: telaConta})[aba]();
}
const conteudo = () => document.getElementById('conteudo');

// ---------- ajustes no banco ----------
async function lerAjuste(chave) {
  const {data, error} = await sb.from('ajustes').select('dados').eq('site', SITE).eq('chave', chave).maybeSingle();
  if (error) throw error;
  return data?.dados;
}
async function salvarAjuste(chave, dados) {
  const {error} = await sb.from('ajustes').upsert({site: SITE, chave, dados}, {onConflict: 'site,chave'});
  if (error) throw error;
}

// ---------- encartes ----------
// Cada página de encarte: {id, grupo, titulo, imagem, inicio, fim}. Páginas do mesmo "grupo" formam uma campanha.
const grupoDe = e => e.grupo || e.id.replace(/-\d+$/, '');
const nomeDe = t => String(t).replace(/\s*[—-]\s*p[áa]gina\s*\d+\s*$/i, '').trim();
const diaBr = iso => new Date(iso).toLocaleDateString('pt-BR', {timeZone: 'America/Recife', weekday: 'short', day: '2-digit', month: '2-digit'});
const ultimoDia = fim => new Date(Date.parse(fim) - 1).toISOString();
const inicioDe = d => d + 'T00:00:00-03:00';
const fimDe = d => { const t = new Date(d + 'T12:00:00-03:00'); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10) + 'T00:00:00-03:00'; };
const hojeRecife = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

let lista = [];
async function telaEncartes() {
  conteudo().innerHTML = '<p class="nota">Carregando…</p>';
  try { const d = await lerAjuste('encartes'); lista = Array.isArray(d) ? d : encartesArquivo.map(e => ({...e, grupo: grupoDe(e)})); }
  catch (e) { conteudo().innerHTML = '<p class="erro">Não foi possível ler os encartes: ' + esc(e.message) + '</p>'; return; }
  const grupos = [...new Set(lista.map(grupoDe))].map(g => { const pags = lista.filter(e => grupoDe(e) === g); return {g, pags, nome: nomeDe(pags[0].titulo), inicio: pags[0].inicio, fim: pags[0].fim}; })
    .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
  const agora = Date.now();
  const estado = c => agora < Date.parse(c.inicio) ? ['agendado', 'Agendado'] : agora < Date.parse(c.fim) ? ['no-ar', 'No ar agora'] : ['terminou', 'Terminou'];
  conteudo().innerHTML =
    '<form class="caixa" data-novo><h2>Novo encarte</h2><p class="nota">Envie as fotos das páginas na ordem (página 1, depois 2…). O site mostra sozinho no período escolhido e tira do ar quando acabar.</p>' +
    '<label>Nome da campanha<input name="nome" required maxlength="80" placeholder="Ex.: FDS de Ofertas Arrasadoras"></label>' +
    '<div class="dois"><label>Começa no dia<input name="inicio" type="date" required value="' + hojeRecife() + '"></label><label>Último dia da oferta<input name="fim" type="date" required></label></div>' +
    '<label>Fotos das páginas<input name="fotos" type="file" accept="image/*" multiple required></label><div class="previa" data-previa></div>' +
    '<button class="bt principal">Publicar encarte</button></form>' +
    '<h2>Encartes</h2>' + (grupos.length ? '<ul class="campanhas">' + grupos.map(c => { const [cl, tx] = estado(c);
      return '<li class="campanha"><div class="campanha-topo"><div><h3>' + esc(c.nome) + '</h3><p class="nota">' + diaBr(c.inicio) + ' até ' + diaBr(ultimoDia(c.fim)) + ' · ' + c.pags.length + (c.pags.length > 1 ? ' páginas' : ' página') + '</p></div><span class="selo ' + cl + '">' + tx + '</span></div>' +
        '<div class="paginas">' + c.pags.map((p, i) => '<figure><img src="' + esc(p.imagem.startsWith('assets/') ? '../' + p.imagem : p.imagem) + '" alt="" loading="lazy"><small>Pág. ' + (i + 1) + '</small></figure>').join('') + '</div>' +
        '<div>' + (cl !== 'terminou' ? '<button class="bt" data-encerrar="' + esc(c.g) + '">Tirar do ar agora</button> ' : '') + '<button class="bt perigo" data-apagar="' + esc(c.g) + '">Apagar</button></div></li>'; }).join('') + '</ul>' : '<p class="nota">Nenhum encarte ainda.</p>');

  const f = conteudo().querySelector('[data-novo]');
  f.fotos.onchange = () => { const prev = f.querySelector('[data-previa]'); prev.innerHTML = ''; [...f.fotos.files].forEach(a => { const i = new Image(); i.src = URL.createObjectURL(a); prev.append(i); }); };
  f.onsubmit = async e => {
    e.preventDefault();
    const nome = f.nome.value.trim(), ini = f.inicio.value, fim = f.fim.value, arqs = [...f.fotos.files];
    if (!nome || !ini || !fim || !arqs.length) return aviso('Preencha o nome, as datas e escolha as fotos.', 'erro');
    if (fim < ini) return aviso('O último dia precisa ser igual ou depois do primeiro.', 'erro');
    if (arqs.length > 12) return aviso('No máximo 12 páginas por encarte.', 'erro');
    const bt = f.querySelector('button.principal'); bt.disabled = true;
    const grupo = slug(nome) + '-' + ini;
    const novas = [];
    try {
      for (let i = 0; i < arqs.length; i++) {
        bt.textContent = 'Enviando página ' + (i + 1) + ' de ' + arqs.length + '…';
        const imagem = await enviarFoto(arqs[i], grupo + '-' + (i + 1));
        novas.push({id: grupo + '-' + (i + 1), grupo, titulo: nome + (arqs.length > 1 ? ' — página ' + (i + 1) : ''), imagem, inicio: inicioDe(ini), fim: fimDe(fim)});
      }
      await salvarAjuste('encartes', [...lista.filter(x => grupoDe(x) !== grupo), ...novas]);
      aviso('Encarte publicado! Já aparece no site no período escolhido.'); telaEncartes();
    } catch (err) { aviso('Não foi possível publicar: ' + err.message, 'erro'); bt.disabled = false; bt.textContent = 'Publicar encarte'; }
  };
  conteudo().querySelectorAll('[data-encerrar]').forEach(b => b.onclick = async () => {
    if (!confirm('Tirar este encarte do site agora?')) return;
    const agoraIso = new Date().toISOString();
    try { await salvarAjuste('encartes', lista.map(x => grupoDe(x) === b.dataset.encerrar ? {...x, grupo: grupoDe(x), fim: agoraIso, inicio: Date.parse(x.inicio) > Date.now() ? new Date(Date.now() - 1000).toISOString() : x.inicio} : x)); aviso('Encarte tirado do ar.'); telaEncartes(); }
    catch (err) { aviso('Não foi possível: ' + err.message, 'erro'); }
  });
  conteudo().querySelectorAll('[data-apagar]').forEach(b => b.onclick = async () => {
    if (!confirm('Apagar este encarte da lista? (Não dá para desfazer.)')) return;
    try { await salvarAjuste('encartes', lista.filter(x => grupoDe(x) !== b.dataset.apagar)); aviso('Encarte apagado.'); telaEncartes(); }
    catch (err) { aviso('Não foi possível: ' + err.message, 'erro'); }
  });
}

// Reduz a foto no próprio aparelho (até 1800 px, JPG) e envia para a pasta deste site.
async function enviarFoto(arq, nome) {
  const bmp = await createImageBitmap(arq);
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .85));
  const caminho = SITE + '/encartes/' + slug(nome) + '-' + Date.now() + '.jpg';
  const {error} = await sb.storage.from('fotos').upload(caminho, blob, {contentType: 'image/jpeg', cacheControl: '31536000'});
  if (error) throw error;
  return sb.storage.from('fotos').getPublicUrl(caminho).data.publicUrl;
}

// ---------- horário ----------
async function telaHorario() {
  let h = {abre: 6, fecha: 19};
  try { h = {...h, ...(await lerAjuste('horario') || {})}; } catch {}
  const op = (sel, ini, fim) => Array.from({length: fim - ini + 1}, (_, i) => ini + i).map(n => '<option value="' + n + '"' + (n === sel ? ' selected' : '') + '>' + n + 'h</option>').join('');
  conteudo().innerHTML = '<form class="caixa" data-horario><h2>Horário de funcionamento</h2><p class="nota">O site mostra "Aberto agora" ou "Fechado agora" e o horário em todos os lugares a partir daqui.</p>' +
    '<div class="dois"><label>Abre às<select name="abre">' + op(h.abre, 0, 23) + '</select></label><label>Fecha às<select name="fecha">' + op(h.fecha, 1, 24) + '</select></label></div>' +
    '<button class="bt principal">Salvar horário</button></form>';
  conteudo().querySelector('[data-horario]').onsubmit = async e => {
    e.preventDefault(); const abre = +e.target.abre.value, fecha = +e.target.fecha.value;
    if (abre >= fecha) return aviso('O horário de fechar precisa ser depois do de abrir.', 'erro');
    try { await salvarAjuste('horario', {abre, fecha}); aviso('Horário salvo!'); } catch (err) { aviso('Não foi possível salvar: ' + err.message, 'erro'); }
  };
}

// ---------- equipe (dono) ----------
async function chamarEquipe(corpo) {
  const {data, error} = await sb.functions.invoke(banco.funcaoEquipe || 'equipe', {body: {site: SITE, ...corpo}});
  if (!error) return data;
  let msg = 'Não foi possível falar com o banco.';
  try { msg = (await error.context.json()).erro || msg; } catch {}
  throw new Error(msg);
}
async function telaEquipe() {
  conteudo().innerHTML = '<p class="nota">Carregando…</p>';
  let pessoas;
  try { pessoas = (await chamarEquipe({acao: 'listar'})).equipe; } catch (e) { conteudo().innerHTML = '<p class="erro">' + esc(e.message) + '</p>'; return; }
  const nomes = {dono: 'Dono: troca encartes e horário e cadastra a equipe', funcionario: 'Funcionário: troca encartes e horário'};
  conteudo().innerHTML = '<section class="caixa"><h2>Equipe</h2>' + (pessoas.length ? '<ul class="pessoas">' + pessoas.map(r => '<li><div><b>' + esc(mostrarUsuario(r.email)) + '</b><small>' + esc(nomes[r.papel] || r.papel) + '</small></div>' +
      (r.email !== email ? '<div><button class="bt" data-senha="' + esc(r.email) + '">Nova senha</button><button class="bt perigo" data-tirar="' + esc(r.email) + '">Tirar acesso</button></div>' : '<small>você</small>') + '</li>').join('') + '</ul>' : '<p class="nota">Ninguém cadastrado.</p>') + '</section>' +
    '<form class="caixa" data-add><h2>Cadastrar funcionário</h2><label>Nome de usuário (ex.: maria)<input name="usuario" required autocomplete="off" autocapitalize="none" spellcheck="false" pattern="[a-zA-Z0-9._\\-]{3,30}"></label>' +
    '<label>Senha inicial (mínimo 8)<input name="senha" type="text" minlength="8" required autocomplete="off"></label>' +
    (orbita ? '<label>Função<select name="papel"><option value="funcionario">Funcionário</option><option value="dono">Dono</option></select></label>' : '') +
    '<button class="bt principal">Cadastrar</button><p class="nota">Passe o usuário, a senha e este endereço para a pessoa.</p></form>';
  const f = conteudo().querySelector('[data-add]');
  f.onsubmit = async e => {
    e.preventDefault(); const d = new FormData(f), bt = f.querySelector('button'); bt.disabled = true;
    try { await chamarEquipe({acao: 'adicionar', usuario: d.get('usuario'), senha: d.get('senha'), papel: d.get('papel') || 'funcionario'}); aviso('Pessoa cadastrada!'); telaEquipe(); }
    catch (err) { aviso(err.message, 'erro'); bt.disabled = false; }
  };
  conteudo().querySelectorAll('[data-tirar]').forEach(b => b.onclick = async () => {
    if (!confirm('Tirar o acesso de ' + mostrarUsuario(b.dataset.tirar) + '?')) return;
    try { await chamarEquipe({acao: 'remover', email: b.dataset.tirar}); aviso('Acesso retirado.'); telaEquipe(); } catch (err) { aviso(err.message, 'erro'); }
  });
  conteudo().querySelectorAll('[data-senha]').forEach(b => b.onclick = async () => {
    const senha = prompt('Nova senha para ' + mostrarUsuario(b.dataset.senha) + ' (mínimo 8 caracteres):'); if (!senha) return;
    if (senha.length < 8) return aviso('A senha precisa ter pelo menos 8 caracteres.', 'erro');
    try { await chamarEquipe({acao: 'senha', email: b.dataset.senha, senha}); aviso('Senha trocada.'); } catch (err) { aviso(err.message, 'erro'); }
  });
}

// ---------- minha senha ----------
function telaConta() {
  conteudo().innerHTML = '<form class="caixa" data-senha-form><h2>Trocar minha senha</h2><label>Nova senha<input name="s1" type="password" minlength="8" autocomplete="new-password" required></label><label>Repita<input name="s2" type="password" minlength="8" autocomplete="new-password" required></label><button class="bt principal">Salvar</button></form>';
  conteudo().querySelector('[data-senha-form]').onsubmit = async e => {
    e.preventDefault(); const d = new FormData(e.target);
    if (d.get('s1') !== d.get('s2')) return aviso('As duas senhas não são iguais.', 'erro');
    const {error} = await sb.auth.updateUser({password: d.get('s1')});
    aviso(error ? 'Não foi possível trocar: ' + error.message : 'Senha trocada!', error ? 'erro' : 'ok'); if (!error) e.target.reset();
  };
}

iniciar();

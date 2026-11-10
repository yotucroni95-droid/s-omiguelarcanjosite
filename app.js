import { encartes, encarteAtivo } from './encartes.js?v=esquenta-20261111';

const menuButton = document.querySelector('.menu-toggle');
const menu = document.getElementById('mobile-menu');
menuButton.addEventListener('click', () => {
  const aberto = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!aberto));
  menuButton.setAttribute('aria-label', aberto ? 'Abrir menu' : 'Fechar menu');
  menu.hidden = aberto;
});
menu.addEventListener('click', event => {
  if (event.target.closest('a')) {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
  }
});

const painel = document.getElementById('flyers');
const lista = document.getElementById('flyer-list');
const dialog = document.getElementById('flyer-dialog');
let encarteAberto = null;
let ultimaLista = null;
const formatoData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'short'
});

function abrirEncarte(encarte) {
  if (!encarteAtivo(encarte)) {
    atualizarEncartes();
    return;
  }
  encarteAberto = encarte;
  document.getElementById('flyer-dialog-title').textContent = encarte.titulo;
  const imagem = document.getElementById('flyer-image');
  imagem.src = encarte.imagem;
  imagem.alt = encarte.titulo;
  document.getElementById('flyer-validity').textContent = `Válido até ${formatoData.format(new Date(encarte.fim))} (horário de Pernambuco).`;
  document.getElementById('flyer-original').href = encarte.imagem;
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

function atualizarEncartes() {
  if (encarteAberto && !encarteAtivo(encarteAberto)) dialog.close();
  const ativos = encartes.filter(encarte => encarteAtivo(encarte));
  const assinatura = JSON.stringify(ativos);
  if (assinatura === ultimaLista) return;
  ultimaLista = assinatura;
  painel.hidden = ativos.length === 0;
  lista.replaceChildren();
  for (const encarte of ativos) {
    const button = document.createElement('button');
    button.className = 'flyer-button';
    button.type = 'button';
    const imagem = document.createElement('img');
    imagem.src = encarte.imagem;
    imagem.alt = encarte.titulo;
    imagem.loading = 'lazy';
    const texto = document.createElement('span');
    texto.textContent = `${encarte.titulo} — toque para ampliar. Válido até ${formatoData.format(new Date(encarte.fim))}.`;
    button.append(imagem, texto);
    button.addEventListener('click', () => abrirEncarte(encarte));
    lista.append(button);
  }
}

document.getElementById('close-flyer').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  encarteAberto = null;
  document.body.classList.remove('dialog-open');
  document.getElementById('flyer-image').removeAttribute('src');
});
atualizarEncartes();
setInterval(atualizarEncartes, 1000);
window.addEventListener('pageshow', atualizarEncartes);
document.addEventListener('visibilitychange', atualizarEncartes);
document.getElementById('year').textContent = new Date().getFullYear();

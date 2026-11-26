// Exibição até o fim do domingo, no horário de Pernambuco (-03:00).
export const encartes = [
  {
    "id": "fds-2026-11-27-1",
    "titulo": "FDS de Ofertas Arrasadoras — 27, 28 e 29 de novembro — página 1",
    "imagem": "assets/encartes/fds-2026-11-27-1.jpg",
    "inicio": "2026-11-26T00:00:00-03:00",
    "fim": "2026-11-30T00:00:00-03:00"
  },
  {
    "id": "fds-2026-11-27-2",
    "titulo": "FDS de Ofertas Arrasadoras — 27, 28 e 29 de novembro — página 2",
    "imagem": "assets/encartes/fds-2026-11-27-2.jpg",
    "inicio": "2026-11-26T00:00:00-03:00",
    "fim": "2026-11-30T00:00:00-03:00"
  }
];

export function encarteAtivo(encarte, agora = Date.now()) {
  const inicio = Date.parse(encarte.inicio);
  const fim = Date.parse(encarte.fim);
  return Number.isFinite(inicio) && Number.isFinite(fim)
    && inicio < fim && agora >= inicio && agora < fim;
}

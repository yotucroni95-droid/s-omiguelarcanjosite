// Validade no horário de Pernambuco (-03:00).
export const encartes = [
  {
    "id": "fds-2026-11-13-1",
    "titulo": "FDS do Esquenta Black Friday — 13, 14 e 15 de novembro — página 1",
    "imagem": "assets/encartes/fds-2026-11-13-1.jpg",
    "inicio": "2026-11-13T00:00:00-03:00",
    "fim": "2026-11-16T00:00:00-03:00"
  },
  {
    "id": "fds-2026-11-13-2",
    "titulo": "FDS do Esquenta Black Friday — 13, 14 e 15 de novembro — página 2",
    "imagem": "assets/encartes/fds-2026-11-13-2.jpg",
    "inicio": "2026-11-13T00:00:00-03:00",
    "fim": "2026-11-16T00:00:00-03:00"
  }
];

export function encarteAtivo(encarte, agora = Date.now()) {
  const inicio = Date.parse(encarte.inicio);
  const fim = Date.parse(encarte.fim);
  return Number.isFinite(inicio) && Number.isFinite(fim)
    && inicio < fim && agora >= inicio && agora < fim;
}

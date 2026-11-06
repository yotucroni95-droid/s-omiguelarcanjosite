// Validade com fuso explícito de Pernambuco (-03:00).
// Adicione encartes apenas após confirmar imagem e período com a loja.
// Exemplo de estrutura: { id, titulo, imagem, inicio, fim }.
export const encartes = [
  {
    "id": "fds-2026-11-07-1",
    "titulo": "FDS Imbatível — 07 e 08 de novembro — página 1",
    "imagem": "assets/encartes/fds-2026-11-07-1.jpg",
    "inicio": "2026-11-07T00:00:00-03:00",
    "fim": "2026-11-09T00:00:00-03:00"
  },
  {
    "id": "fds-2026-11-07-2",
    "titulo": "FDS Imbatível — 07 e 08 de novembro — página 2",
    "imagem": "assets/encartes/fds-2026-11-07-2.jpg",
    "inicio": "2026-11-07T00:00:00-03:00",
    "fim": "2026-11-09T00:00:00-03:00"
  }
];

export function encarteAtivo(encarte, agora = Date.now()) {
  const inicio = Date.parse(encarte.inicio);
  const fim = Date.parse(encarte.fim);
  return Number.isFinite(inicio) && Number.isFinite(fim)
    && inicio < fim && agora >= inicio && agora < fim;
}

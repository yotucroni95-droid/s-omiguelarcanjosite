// Exibição no horário de Pernambuco (-03:00). Ofertas para 25/11.
export const encartes = [
  {
    "id": "quarta-2026-11-25-1",
    "titulo": "Esquenta da Black Friday — 25 de novembro — página 1",
    "imagem": "assets/encartes/quarta-2026-11-25-1.jpg",
    "inicio": "2026-11-24T00:00:00-03:00",
    "fim": "2026-11-26T00:00:00-03:00"
  },
  {
    "id": "quarta-2026-11-25-2",
    "titulo": "Esquenta da Black Friday — 25 de novembro — página 2",
    "imagem": "assets/encartes/quarta-2026-11-25-2.jpg",
    "inicio": "2026-11-24T00:00:00-03:00",
    "fim": "2026-11-26T00:00:00-03:00"
  }
];

export function encarteAtivo(encarte, agora = Date.now()) {
  const inicio = Date.parse(encarte.inicio);
  const fim = Date.parse(encarte.fim);
  return Number.isFinite(inicio) && Number.isFinite(fim)
    && inicio < fim && agora >= inicio && agora < fim;
}

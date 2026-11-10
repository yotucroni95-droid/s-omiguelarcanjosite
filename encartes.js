// Exibição no horário de Pernambuco; a arte informa ofertas para 11/11.
export const encartes = [
  {
    "id": "esquenta-2026-11-11",
    "titulo": "Esquenta Black Friday — ofertas para 11 de novembro",
    "imagem": "assets/encartes/esquenta-2026-11-11.jpg",
    "inicio": "2026-11-10T18:00:00-03:00",
    "fim": "2026-11-11T23:00:00-03:00"
  }
];

export function encarteAtivo(encarte, agora = Date.now()) {
  const inicio = Date.parse(encarte.inicio);
  const fim = Date.parse(encarte.fim);
  return Number.isFinite(inicio) && Number.isFinite(fim)
    && inicio < fim && agora >= inicio && agora < fim;
}

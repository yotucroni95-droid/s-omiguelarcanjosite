// Validade com fuso explícito de Pernambuco (-03:00).
// Adicione encartes apenas após confirmar imagem e período com a loja.
// Exemplo de estrutura: { id, titulo, imagem, inicio, fim }.
export const encartes = [];

export function encarteAtivo(encarte, agora = Date.now()) {
  const inicio = Date.parse(encarte.inicio);
  const fim = Date.parse(encarte.fim);
  return Number.isFinite(inicio) && Number.isFinite(fim)
    && inicio < fim && agora >= inicio && agora < fim;
}

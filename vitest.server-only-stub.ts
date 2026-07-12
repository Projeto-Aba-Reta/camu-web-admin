// Stub para o pacote "server-only": fora do bundler do Next.js (ex. rodando
// sob Vitest puro), o pacote real lança um erro só para marcar "isto não
// pode ser importado por um Client Component" — uma checagem de build, não
// de runtime. Sem este stub, qualquer teste que importe (mesmo
// transitivamente) um módulo com `import "server-only"` falha ao carregar.
export {};

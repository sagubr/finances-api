# Raiz do Projeto e Estratégia de Build da API

Status: decisão implementada  
Substitui: estrutura `apps/*` e `packages/*` herdada

## Decisão

A API será um único package npm. Modularidade é responsabilidade de `src/modules`, não de workspaces npm. Packages separados só poderão voltar quando houver consumidor independente, versionamento próprio ou boundary de deploy comprovado.

## Estrutura alvo

```text
api/
├── .specs/
├── src/
│   ├── bootstrap/
│   ├── config/
│   ├── infrastructure/
│   ├── modules/
│   ├── shared/
│   ├── worker/
│   │   └── main.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── architecture/
├── migrations/
├── package.json
├── package-lock.json
├── tsconfig.json
├── vitest.config.ts
├── src/config/drizzle.config.ts
└── prettier.config.mjs
```

Arquivos adicionais só entram quando uma ferramenta realmente precisar deles. Não manter `tsconfig.base.json` para um único consumidor.

## Imports

- imports relativos dentro de uma mesma feature curta;
- imports de raiz usam subpath nativo `#/*`, não alias bundler `@/*`;
- TypeScript mapeia `#/*` para `src/*` durante desenvolvimento;
- `package.json#imports` mapeia `#/*` para `dist/*` no runtime;
- nenhum import aponta para `apps/api` ou `packages/*`;
- boundaries de módulo continuam verificadas por lint/teste arquitetural.

O mapeamento precisa ser provado em `tsx`, Vitest, `tsc` e Node antes de remover o build anterior.

## Build

### Decisão padrão

Usar `tsc` para emitir ESM sem bundle. A API não precisa de tree shaking nem chunking; dependências Node permanecem externas e stack traces refletem os arquivos reais.

Scripts alvo:

```json
{
  "dev": "tsx watch src/server.ts",
  "dev:worker": "tsx watch src/worker/main.ts",
  "typecheck": "tsc --noEmit",
  "build": "tsc",
  "start": "node --enable-source-maps dist/server.js",
  "start:worker": "node --enable-source-maps dist/worker/main.js"
}
```

O `tsconfig` usa `NodeNext`, `rootDir: src`, `outDir: dist`, sourcemaps e strict mode. Testes ficam fora de `src` para não serem emitidos no build.

### Destino do `tsup`

Remover `tsup` e `tsup.config.ts` após o build `tsc` cumprir os critérios abaixo. Ter dois entrypoints não exige bundler; ambos são emitidos pelo mesmo projeto.

`tsup` só poderá voltar por ADR se houver necessidade medida, como:

- restrição real de artifact único;
- cold start afetado por resolução de módulos;
- deploy que exija bundle;
- dependência interna que precise ser incorporada.

“Gerar menos arquivos em `dist`” isoladamente não justifica bundle de backend.

## Desenvolvimento e testes

- `tsx` executa TypeScript apenas em desenvolvimento;
- Vitest transpila testes sem alterar o build de produção;
- integração usa PostgreSQL real/efêmero;
- `dist` é sempre descartável e ignorado;
- `npm ci`, `typecheck`, testes e build partem do package raiz.

## Dependências

Depois da limpeza, o `package.json` contém somente dependências usadas pela plataforma mínima. Bibliotecas de analytics, DuckDB, NL2SQL, MySQL, Excel e SDKs externos saem até uma spec aprovada exigir seu retorno.

## Migração

1. criar manifest raiz alvo em mudança controlada;
2. mover o código mínimo aprovado de `apps/api/src` para `src`;
3. ajustar imports para `#/*` ou relativos;
4. mover configurações e testes necessários;
5. ativar `tsc` e validar server/worker compilados;
6. remover scripts/workspaces/packages antigos;
7. regenerar lockfile;
8. remover `tsup` após equivalência de runtime;
9. validar artifact, source maps, shutdown e observabilidade.

## Critérios de aceite

- existe um único package npm em `api`;
- `npm run dev` e `dev:worker` funcionam na raiz;
- `npm run build` usa `tsc` e ambos os entrypoints iniciam em Node;
- source maps apontam para o TypeScript correto;
- não há alias dependente de bundler;
- não há referências a `apps/*`, `packages/*`, workspaces ou `tsup` no projeto ativo;
- build, typecheck e testes passam a partir de checkout limpo.

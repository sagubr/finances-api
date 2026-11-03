# Limpeza do Legado da API

Status: executada na fundação; módulos de produto serão adicionados pelas ondas  
Pré-requisito: convenções aprovadas

## Princípio

O `_reference` permanece como fonte de consulta. O projeto ativo deve conter somente código usado ou imediatamente necessário às ondas aprovadas. “Talvez seja útil” não justifica dependência, módulo ou package ativo.

## Classificação

### Manter e adaptar

- bootstrap Fastify, CORS, security headers e Swagger;
- middleware de erro e envelope HTTP;
- logging e observabilidade genéricos;
- abstrações de cache e fila, somente quando usadas pela Onda 0;
- configuração e composition root após simplificação;
- health check mínimo;
- convenções de testes/build/TypeScript;
- ideias do request context, reescritas para PostgreSQL, sessão local e RLS.

### Reescrever, não portar cegamente

- `auth`, pois o legado é orientado a SSO/JIT e a spec pede identidade local;
- `workspaces`, `members` e autorização, preservando apenas conceitos úteis;
- provider, schemas e repositórios, pois o legado é MySQL;
- router/app composition, removendo registro de módulos analíticos;
- error catalog, mantendo o mecanismo e substituindo códigos do produto anterior.

### Remover do projeto ativo

Módulos copiados do produto analítico: `access-control`, `action-center`, `analytics`, `assistant`, `business`, `catalog`, `collections`, `dashboards`, `data-sources`, `groups`, `queries`, `shared-view-endpoints` e `views`. `auth`, `members` e `workspaces` também saem quando suas substituições limpas estiverem prontas.

Packages `analytical-engine`, `nl2sql` e `query-engine` não pertencem ao roadmap financeiro atual e devem sair dos workspaces ativos. `credential-vault` só permanece se uma spec aprovada exigir credenciais externas antes de ele ser removido.

A pasta `apps/api` também é estrutura legada. Seu conteúdo aprovado será promovido para a raiz (`src`, configurações e testes), e o campo `workspaces` será removido do `package.json`. Não haverá diretório `packages` no projeto ativo.

## Sequência segura

1. criar aplicação mínima com health, error handling e OpenAPI;
2. trocar composition root para registrar somente o mínimo;
3. remover rotas e imports de módulos legados;
4. promover `apps/api/src` e configurações aprovadas para a raiz;
5. remover schemas do agregador e qualquer migration antiga;
6. retirar workspaces/packages não usados dos manifests e lockfile;
7. remover módulos e diretórios vazios sem referências;
8. trocar o build de `tsup` para `tsc` e validar os dois entrypoints;
9. executar build, typecheck, testes e busca de identidade legada;
10. iniciar a implementação PostgreSQL/PLAT em árvore limpa.

Cada etapa deve compilar. Remoção acontece em mudança própria e revisável; não se mistura com a implementação de transações.

## Critério para reutilizar algo do `_reference`

Só copiar quando:

- resolve requisito de uma spec aprovada;
- não traz domínio ou dependências laterais desnecessárias;
- respeita PostgreSQL, RLS e as convenções atuais;
- possui testes adequados ou recebe testes na mesma mudança;
- é mais barato adaptar do que reescrever com clareza;
- a origem e as alterações ficam rastreáveis na revisão.

## Critério de conclusão

O build não referencia módulos analíticos, o app inicia apenas com plataforma mínima, `api` contém um único `package.json` sem workspaces, não existem `apps`/`packages` ativos, `tsup` não é dependência e uma busca por nomes do domínio anterior retorna apenas `_reference` ou documentação histórica.

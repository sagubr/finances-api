# Auditoria de Segurança dos Contratos do MVP

Data: 2 de novembro de 2026  
Status: contratos ativos liberados para integração local; produção condicionada à prova PostgreSQL/RLS

## Superfície ativa

O OpenAPI publica 72 operações em 56 paths para plataforma, contas, categorias, lançamentos, cartões, faturas, parcelamentos, recorrências, orçamentos, importação e relatórios calculados. Administração, billing, privacidade operacional, patrimônio, organização e exports não possuem rotas registradas.

## Proteções verificadas

- IDs públicos, datas civis, competências, valores, paginação e chaves de idempotência são validados por schemas Zod compartilhados;
- toda mutação publicada exige header CSRF e o OpenAPI declara o cookie de sessão;
- operações públicas removem explicitamente a segurança por cookie;
- CORS, cookies, Helmet, limite de corpo, rate limit e `trustProxy` vivem em configuração/plugins separados;
- repositories tenant executam dentro de `TenantUnitOfWork` e repetem o filtro de workspace;
- listas de crescimento livre usam cursor e limite máximo;
- importação limita arquivo, extensão, MIME, tamanho e quantidade de linhas;
- a API não aceita competência nem data de liquidação controladas pelo cliente;
- transferências e transações de cartão possuem comandos próprios;
- optimistic locking protege recursos versionados;
- contas/categorias inativas e dependências financeiras inválidas são rejeitadas;
- o worker não possui conexão ou query própria.

## Invariantes reforçadas no banco

- valores de lançamentos são positivos;
- competência tem formato válido e deve coincidir com a data do lançamento;
- somente transação `SETTLED` possui `settled_on`;
- pernas de transferência são distintas;
- FKs preservam workspace, conta, categoria, cartão, fatura, recorrência, importação e histórico;
- índices únicos protegem idempotência, ocorrências, ciclos de fatura, origens projetadas e pares de transferência.

## Limite assumido nesta fase

O ambiente local usa o usuário `postgres`, que normalmente é owner/superuser e pode contornar RLS. Assim, o isolamento atual também depende dos filtros explícitos dos repositories. Isso é aceitável para o desenvolvimento solicitado, mas não é um modelo de produção.

Antes de produção:

1. criar papel de runtime sem `BYPASSRLS` e diferente do owner;
2. aplicar e confirmar `FORCE ROW LEVEL SECURITY`;
3. executar testes A/B em PostgreSQL real, incluindo ausência de contexto e tentativas de escrita cruzada;
4. validar concorrência de idempotência, optimistic locking, jobs e commit de importação;
5. definir retenção e limpeza de sessões, tokens, histórico, outbox e jobs.

## Evidências executadas

- API: lint, typecheck, build e 63 testes em 15 arquivos aprovados;
- UI: lint, typecheck, build e 76 testes em 27 arquivos aprovados;
- OpenAPI: IDs de operação únicos e CSRF verificado automaticamente para toda mutação;
- Drizzle: 27 tabelas ativas com FKs, índices e checks financeiros;
- nenhuma migration nova criada ou aplicada nesta revisão.

## Critério de evolução

Um módulo futuro só entra no produto quando seus contratos forem aprovados e, na mesma mudança, forem promovidos conscientemente na allow-list do Drizzle, no registro de rotas, no worker quando aplicável, na interface e nos testes. Código-fonte futuro isolado não caracteriza funcionalidade ativa.

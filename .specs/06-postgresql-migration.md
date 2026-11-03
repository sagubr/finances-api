# Migração da Persistência para PostgreSQL

Status: fundação implementada; integração PostgreSQL/RLS pendente  
Prioridade: bloqueia a conclusão das ondas 0–2

## Contexto

O código copiado usa `drizzle-orm/mysql2`, `mysql2/promise` e schemas MySQL. O projeto Finances adotará PostgreSQL como banco principal. Como ainda não existem dados ou migrations oficiais do novo produto, a estratégia é converter a fundação e criar um baseline PostgreSQL limpo, não migrar o histórico do produto-modelo.

Os packages analíticos do `_reference`, inclusive `query-engine`, não fazem parte da aplicação ativa. Esta decisão se aplica à persistência do Finances.

## Resultado alvo

- provider baseado em `pg` e `drizzle-orm/node-postgres`;
- migrations geradas com dialect `postgresql`;
- schemas usando `pgTable` e tipos PostgreSQL;
- unidade de trabalho tenant obrigatória;
- RLS habilitado e forçado em toda tabela com `workspace_id`;
- papéis separados para migration owner, runtime e manutenção;
- testes de integração em PostgreSQL real e efêmero;
- nenhuma dependência runtime de `mysql2` na aplicação.

## Conversões de schema

| MySQL                  | PostgreSQL alvo                             |
| ---------------------- | ------------------------------------------- |
| `mysqlTable`           | `pgTable`                                   |
| auto increment         | `BIGINT GENERATED ALWAYS AS IDENTITY`       |
| `datetime`             | `timestamptz` ou `date`, conforme semântica |
| `json`                 | `jsonb`                                     |
| `tinyint` booleano     | `boolean`                                   |
| `varchar` para UUID    | `uuid`                                      |
| decimal                | `numeric(precision, scale)`                 |
| unsigned               | `check (value >= 0)` quando for invariante  |
| `onDuplicateKeyUpdate` | `onConflictDoUpdate`                        |
| `insertId`             | `returning()`                               |

Enums de domínio devem preferir `text/varchar + CHECK` quando evolução sem bloqueio for importante; `pgEnum` exige plano explícito de alteração.

## Contexto RLS

O middleware autentica e resolve workspace, mas não mantém uma conexão aberta. O caso de uso tenant executa por `TenantUnitOfWork.run(context, callback)`, que:

1. abre transação;
2. chama `set_config('app.workspace_id', internalId, true)`;
3. chama `set_config('app.actor_id', actorId, true)` quando houver;
4. entrega o transaction client aos repositórios;
5. confirma ou reverte;
6. nunca expõe o client fora do callback.

Queries globais usam uma unidade de trabalho própria e tabelas sem `workspace_id`. Jobs tenant percorrem workspaces em páginas e abrem uma unidade de trabalho por workspace.

## Papéis PostgreSQL

- `finances_migrator`: owner de schemas/tabelas e executor de migrations;
- `finances_app`: runtime HTTP/worker, sem ownership, superuser ou `BYPASSRLS`;
- `finances_maintenance`: uso humano/automatizado restrito, auditado e fora das credenciais da aplicação.

O runtime recebe apenas grants necessários. `FORCE ROW LEVEL SECURITY` é obrigatório. Testes também validam que o owner não é usado pelo runtime.

## Sequência de implementação

1. adicionar provider PostgreSQL e configuração sem remover o provider antigo;
2. criar abstração de unidade de trabalho e testes com pool;
3. converter schemas módulo a módulo;
4. substituir APIs específicas de MySQL (`insertId`, upsert, funções e locks);
5. criar helpers de policy RLS e o schema do baseline, sem escrever migration manual;
6. portar repositórios e testes de integração;
7. executar testes arquiteturais e isolamento A/B;
8. tornar PostgreSQL o único provider da aplicação;
9. remover `mysql2` da aplicação e documentação legada;
10. ao fim de todas as ondas, validar build, typecheck e testes antes de gerar uma única migration inicial com `src/config/drizzle.config.ts`.

## Testes obrigatórios

- contexto local não vaza entre conexões reutilizadas pelo pool;
- sem contexto retorna zero linhas e impede insert/update;
- workspace A não lê, altera, exclui nem referencia linha de B;
- foreign keys compostas impedem vínculo cross-workspace quando aplicável;
- runtime não desabilita RLS nem altera policies;
- rollback limpa contexto e dados não confirmados;
- jobs preservam isolamento a cada iteração;
- migrations sobem em banco vazio e são verificadas no pipeline de teste.

## Critério de conclusão

Todos os schemas e repositórios usados pelo Finances compilam e passam em PostgreSQL; `mysql2` não está nas dependências da aplicação; a suíte de RLS prova isolamento diretamente no banco e pela API; a Onda 0 pode começar sem provider legado no caminho de execução.

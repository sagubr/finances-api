# Especificações da API — Finances

Status geral: proposta revisada  
Fonte inicial: `Planos de Implementação dos Módulos.md`  
Regra: uma implementação não pode contradizer estas specs sem antes registrar e aprovar a decisão.

## Como usar

1. Leia os documentos transversais na ordem abaixo.
2. Implemente os módulos pela ordem das ondas.
3. Antes de cada módulo, resolva as questões abertas da spec correspondente.
4. Mantenha OpenAPI, catálogo de eventos e critérios de aceite sincronizados com o código.

## Documentos transversais

1. [Revisão do plano e decisões](./00-plan-review-and-decisions.md)
2. [Arquitetura e limites](./01-architecture-and-boundaries.md)
3. [Contratos HTTP](./02-http-contracts.md)
4. [Dados, tenancy e segurança](./03-data-tenancy-and-security.md)
5. [Eventos, jobs e observabilidade](./04-events-jobs-and-observability.md)
6. [Ondas e gates de entrega](./05-delivery-roadmap.md)
7. [Migração da persistência para PostgreSQL](./06-postgresql-migration.md)
8. [Convenções de código da API](./07-api-code-conventions.md)
9. [Limpeza do legado da API](./08-legacy-cleanup.md)
10. [Raiz do projeto e estratégia de build](./09-project-root-and-build.md)
11. [Auditoria de refatoração das ondas](./10-wave-refactor-audit.md)
12. [Auditoria de segurança dos contratos](./11-api-contract-security-audit.md)

## Specs de módulos

| Ordem | Spec                                                           | Módulo                      | Onda |
| ----: | -------------------------------------------------------------- | --------------------------- | ---: |
|     1 | [API-PLAT-000](./modules/API-PLAT-000-platform-identity.md)    | Plataforma e identidade     |    0 |
|     2 | [API-TX-001](./modules/API-TX-001-transactions.md)             | Transações                  |    1 |
|     3 | [API-IMP-002](./modules/API-IMP-002-batch-import.md)           | Importação em lote          |    1 |
|     4 | [API-RC-003](./modules/API-RC-003-recurrences-installments.md) | Recorrências e parcelamento |    2 |
|     5 | [API-CC-004](./modules/API-CC-004-credit-cards.md)             | Cartões e faturas           |    2 |
|     6 | [API-BG-005](./modules/API-BG-005-budgets.md)                  | Orçamentos                  |    2 |
|     7 | [API-RP-006](./modules/API-RP-006-reports.md)                  | Relatórios                  |    2 |
|     8 | [API-MD-007](./modules/API-MD-007-market-data.md)              | Dados de mercado            |    3 |
|     9 | [API-INV-008](./modules/API-INV-008-investments.md)            | Investimentos               |    3 |
|    10 | [API-AST-009](./modules/API-AST-009-assets-net-worth.md)       | Patrimônio                  |    4 |
|    11 | [API-PAY-010](./modules/API-PAY-010-payroll-calculators.md)    | Calculadoras trabalhistas   |    4 |
|    12 | [API-PLN-011](./modules/API-PLN-011-weekly-planner.md)         | Planner semanal             |    5 |
|    13 | [API-GL-012](./modules/API-GL-012-goals.md)                    | Metas                       |    5 |
|    14 | [API-WL-013](./modules/API-WL-013-wishlist.md)                 | Lista de desejos            |    5 |
|    15 | [API-NT-014](./modules/API-NT-014-notifications.md)            | Notificações                |    5 |
|    16 | [API-BIL-015](./modules/API-BIL-015-billing.md)                | Planos e cobrança           |    6 |
|    17 | [API-ADM-016](./modules/API-ADM-016-administration.md)         | Administração               |    6 |
|    18 | [API-PRV-017](./modules/API-PRV-017-privacy.md)                | Privacidade e LGPD          |    6 |

## Estado de uma spec

- `proposta`: ainda contém decisões abertas;
- `aprovada`: contrato pronto para implementação;
- `em implementação`: código em andamento;
- `entregue`: aceite automatizado e operacional cumprido;
- `substituída`: aponta para a spec sucessora.

Cada spec deve declarar dependências, invariantes, persistência, casos de uso, contrato HTTP, eventos, segurança, testes, observabilidade, rollout e questões abertas.
Novas specs devem começar pelo [template da API](./TEMPLATE.md).

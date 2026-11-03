# API-AST-009 — Patrimônio e Bens

Status: proposta  
Onda: 4  
Dependências: API-TX-001, API-INV-008, API-CC-004

## Objetivo

Registrar bens e consolidar patrimônio líquido histórico a partir de componentes rastreáveis.

## Modelo

`asset_categories`, `assets`, `asset_cost_events`, `asset_valuations`, `asset_sales`, `net_worth_snapshots`, `net_worth_snapshot_components`.

## Invariantes

- custo total soma aquisição e eventos capitalizáveis;
- depreciação linear usa meses completos e data de referência explícita;
- valor residual fica entre zero e custo total;
- método `MARKET` exige avaliação, data, moeda e origem;
- bem planejado não entra no patrimônio;
- venda encerra o bem e pode criar receita em TX por comando idempotente;
- patrimônio = contas + investimentos + bens − passivos definidos;
- snapshot guarda componentes e versões das fontes para explicabilidade;
- snapshot diário é append-only; correção gera nova revisão administrativa, não edição silenciosa.

## HTTP

CRUD `/assets`, `/asset-categories`; ações `/assets/{id}/valuation`, `/assets/{id}/sell`; leituras `/net-worth`, `/net-worth/composition`.

## Jobs e eventos

Job diário no timezone do workspace produz `NetWorthSnapshotted.v1`. Reprocessamento é escopado, auditado e não automático em toda a história.

## Testes e aceite

Limites 0/100%, último dia do mês, valuation stale, venda, composição e versão de fontes. Aceite: total é exatamente a soma dos componentes exibidos; valor depreciado nunca é negativo.

## Questões abertas

- passivos além de faturas/parcelas;
- política de avaliação manual vencida;
- custo de aquisição versus valor fiscal.

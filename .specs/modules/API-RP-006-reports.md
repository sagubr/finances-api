# API-RP-006 — Relatórios e Visão Anual

Status: implementada no MVP  
Onda: 2  
Dependências: API-TX-001, API-RC-003, API-CC-004

## Objetivo

Expor matriz anual, comparativos, fluxo projetado e exports usando uma semântica financeira única.

## Regras

- toda agregação financeira usa readers públicos de TX/RC/CC;
- a soma mensal e anual deve reconciliar com o resumo canônico de TX;
- confirmado e previsto nunca são misturados sem campos separados;
- gastos por categoria incluem despesas realizadas e planejadas da competência;
- compras de cartão continuam na análise por categoria mesmo quando o modo contábil reconhece a
  despesa somente no pagamento da fatura;
- previsão de caixa exclui contas `BROKERAGE` e `BENEFIT` do caixa livre; contas `BENEFIT`
  também não alteram resultado mensal/anual, mas suas despesas continuam na análise por categoria;
- aportes previstos são transferências planejadas de uma conta de caixa para uma conta
  `BROKERAGE`; não são classificados como despesa;
- comparativos sem base retornam variação `null` com motivo;
- cache é escopado por workspace, versão da consulta, moeda e filtros;
- invalidação por evento oferece consistência eventual; resposta traz `calculatedAt` e `dataVersion`;
- a promessa é frescor observável, não “cache nunca desatualizado”;
- export é assíncrono, privado, expirável e auditado.

## HTTP

`GET /reports/annual`, `/reports/compare`, `/reports/cashflow-forecast` e
`/reports/category-spending`; `POST /exports`; `GET /exports/{id}`;
`POST /exports/{id}/download-token`.

CSV protege contra formula injection. XLSX e PDF possuem limites de período e tamanho. URL de download não é registrada em logs.

## Testes e aceite

Fixtures sintéticas de cinco anos, invariantes de soma, timezone, cache invalidado e tolerância declarada, export grande, cancelamento e isolamento. Aceite: matriz e resumos mensais reconciliam ao centavo; export de cenário de referência conclui dentro do orçamento medido e publica progresso.

## Questões abertas

- moeda base e conversão histórica;
- retenção de exports;
- limites definitivos de período e SLO.

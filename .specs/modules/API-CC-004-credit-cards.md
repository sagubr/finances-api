# API-CC-004 — Cartões e Faturas

Status: implementada no MVP  
Onda: 2  
Dependências: API-TX-001, API-RC-003

## Objetivo

Modelar compras, ciclos, limite e pagamento de cartão sem duplicar despesa ou saldo.

## Modelo

`credit_cards`, `statement_cycles`, `card_statements`, `statement_payments`, `statement_adjustments`. Dados completos do cartão nunca são armazenados; o módulo guarda apenas nome/apelido e, se útil, últimos quatro dígitos não sensíveis.

## Invariantes

- compra até a data efetiva de fechamento pertence ao ciclo atual; depois, ao seguinte;
- cálculo considera timezone do workspace e último dia quando fechamento/vencimento não existir;
- fatura fechada é imutável; ajustes posteriores entram no ciclo seguinte;
- compra manual de fatura aberta pode ser editada ou excluída; mudança de data pode movê-la para outra fatura aberta;
- parcelas e recorrências são corrigidas no recurso de origem, não diretamente na fatura;
- modo `DETAILED`: compras contam como despesas por competência e pagamento é `CARD_PAYMENT`, fora da despesa;
- modo `PAYMENT_ONLY`: somente pagamento conta como despesa; não se mistura modos dentro do mesmo ciclo fechado;
- pagamento parcial acumula e não excede saldo salvo ajuste explícito;
- limite disponível inclui faturas não pagas e parcelas futuras contratadas;
- alteração de datas afeta apenas ciclos ainda não materializados;
- fechamento e pagamento são idempotentes.

## Integração com TX/RC

CC usa portas de TX para registrar compra/pagamento e de RC para obter parcelas. Não lê schemas privados. A associação de transação à fatura é um contrato explícito e reconciliável.

## HTTP

CRUD `/credit-cards`; `POST/PATCH/DELETE /credit-cards/{id}/purchases[/{purchaseId}]`; `GET /credit-cards/{id}/statements`; `GET /statements/{id}`; `POST /statements/{id}/close`; `POST /statements/{id}/pay`. Fechamento manual é administrativo/diagnóstico na V1 normal, pois job é o caminho padrão.

## Eventos, testes e aceite

Publica eventos de correção de compra, fechamento e pagamento. Testar dia de corte, fim de mês, timezone, edição que muda o ciclo, exclusão, compra concorrente ao fechamento, parcela futura, pagamento parcial/repetido e mudança de modo. Aceite: compras em lados opostos do corte caem em faturas diferentes; pagamento detalhado reduz saldo uma única vez sem nova despesa.

## Questões abertas

- inclusão ou não do próprio dia de fechamento por emissor;
- juros, encargos, crédito e estorno;
- cartão compartilhado e cartões adicionais;
- regra de migração entre modos.

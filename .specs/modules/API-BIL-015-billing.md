# API-BIL-015 — Planos e Cobrança

Status: proposta condicionada ao provedor  
Onda: 6  
Dependências: API-PLAT-000

## Objetivo

Controlar assinatura e capacidades sem espalhar conhecimento de planos pelos módulos.

## Modelo

`plans`, `plan_versions`, `subscriptions`, `subscription_state_changes`, `usage_counters`, `billing_webhook_events`, `billing_customers`.

## Decisões

- módulos consultam apenas `Entitlements.check` e `Entitlements.getLimits`;
- catálogo de plano é versionado; assinatura aponta para versão contratada;
- inadimplência/cancelamento preserva leitura e exportação dos próprios dados;
- downgrade preserva dados e bloqueia apenas novas criações acima do limite;
- webhook é verificado sobre corpo bruto, armazenado com hash e processado idempotentemente;
- evento fora de ordem usa versão/timestamp do provedor e máquina de estados;
- nenhum dado de cartão é persistido;
- contadores críticos possuem reconciliação com fonte canônica.

## HTTP

`GET /billing/plans`, `/billing/subscription`, `/billing/usage`; `POST /billing/checkout`, `/billing/portal`; webhook fora de `/api/v1` conforme exigência do provedor, com autenticação própria.

## Testes e aceite

Assinatura inválida, replay, assinatura incorreta, ordem invertida, downgrade e limite concorrente. Aceite: webhook repetido é neutro; usuário inadimplente exporta dados e não cria acima do entitlement.

## Bloqueadores

Provedor, país/moeda, impostos, emissão fiscal, termos de trial, política de reembolso e tratamento contábil.

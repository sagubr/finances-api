# API-GL-012 — Metas

Status: proposta  
Onda: 5  
Dependências: API-TX-001, API-INV-008, API-AST-009, API-PLN-011, API-BG-005

## Objetivo

Gerenciar metas manuais ou calculadas com progresso explicável, reconciliável e sem acoplamento direto a tabelas de outros módulos.

## Modelo

`goals`, `goal_source_bindings`, `goal_checkins`, `goal_progress_snapshots`, `goal_event_deliveries`.

## Invariantes

- tipos V1: `MANUAL`, `COUNT`, `AMOUNT_INVESTED`, `NET_WORTH`, `CATEGORY_LIMIT`, `HABIT_HOURS`;
- binding valida que recurso de origem pertence ao workspace;
- valor atual automático vem de um `GoalProgressProvider` publicado pelo módulo fonte;
- eventos aceleram atualização e job periódico reconcilia todas as metas ativas;
- exibição limita percentual, mas valor bruto pode ultrapassar alvo;
- ritmo linear é apenas default e não se aplica sem prazo;
- conclusão automática é idempotente; reabrir exige comando e auditoria;
- `GoalBehindSchedule` possui janela/deduplicação para evitar spam.

## HTTP

CRUD `/goals`; `POST /goals/{id}/checkins`; `GET /goals/{id}/progress`; `POST /goals/{id}/reopen`.

## Testes e aceite

Cada provider, origem removida, evento duplicado, reconciliação, meta sem prazo, alvo zero inválido e ultrapassagem. Aceite: meta automática avança a partir da fonte canônica e converge após evento perdido.

## Questões abertas

- progresso decrescente e metas de limite;
- metas compartilhadas entre membros;
- curvas de ritmo não lineares.

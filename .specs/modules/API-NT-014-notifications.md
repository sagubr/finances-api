# API-NT-014 — Notificações

Status: proposta  
Onda: 5  
Dependências: eventos estabilizados dos módulos produtores

## Objetivo

Transformar eventos em notificações in-app, e-mail e push com preferências, silêncio e deduplicação.

## Modelo

`notification_preferences`, `notifications`, `notification_deliveries`, `push_subscriptions`, `unsubscribe_tokens`, `notification_deduplication`.

## Regras

- mapeamento evento → tipo é versionado;
- deduplicação usa tipo, referência, usuário e janela;
- horário silencioso usa timezone do usuário/workspace e adia, não descarta;
- e-mail/push omitem valores por padrão;
- unsubscribe token é finalidade única, expirável quando aplicável e não revela identidade;
- falha de um canal não bloqueia outros;
- in-app separa estado de entrega e leitura;
- resumo semanal é opt-in;
- preferências são avaliadas no momento do envio, inclusive retries.

## HTTP

`GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, CRUD `/notification-preferences`, `POST/DELETE /push-subscriptions`.

## Jobs e testes

Consumers criam intenções; jobs entregam por canal. Testar evento duplicado, mudança de preferência, silêncio atravessando meia-noite/DST, token inválido, retry e dead-letter. Aceite: reentrega produz uma intenção; canal desligado não envia; falha é observável e reprocessável.

## Questões abertas

Provedores de e-mail/push, política de retenção, limites e quais notificações são transacionais obrigatórias.

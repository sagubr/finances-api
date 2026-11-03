# Eventos, Jobs e Observabilidade

Status: proposta

## Envelope de evento

```json
{
  "eventId": "uuidv7",
  "event": "TransactionCreated",
  "version": 1,
  "occurredAt": "2026-11-02T12:00:00.000Z",
  "workspaceId": "uuidv7-ou-null",
  "aggregate": { "type": "transaction", "id": "uuidv7", "version": 1 },
  "correlationId": "uuid",
  "causationId": "uuid-ou-null",
  "payload": {}
}
```

Payload carrega apenas fatos necessários. Não replica a linha inteira nem inclui texto sensível sem justificativa.

## Outbox e inbox

- caso de uso grava mudança e outbox na mesma transação;
- dispatcher publica com entrega pelo menos uma vez;
- consumidor registra `eventId` em inbox antes ou junto do efeito;
- evento duplicado termina com sucesso sem repetir efeito;
- ordenação só é assumida dentro do mesmo agregado e deve ser verificada pela versão;
- evento desconhecido vai para observabilidade, não é tratado como outro tipo.

## Eventos canônicos

Plataforma: `UserRegistered`, `WorkspaceCreated`, `WorkspaceDeletionRequested`.  
Transações: `TransactionCreated`, `TransactionUpdated`, `TransactionDeleted`, `TransactionRestored`, `TransactionSettled`, `TransactionConfirmed`.  
Recorrências: `OccurrencesGenerated`.  
Cartões: `StatementClosed`, `StatementPaid`.  
Orçamentos: `BudgetThresholdReached`.  
Mercado: `QuotesRefreshed`.  
Investimentos: `OrderRecorded`, `PositionsRecalculated`.  
Patrimônio: `NetWorthSnapshotted`.  
Planner: `PlannerChanged`.  
Metas: `GoalCompleted`, `GoalBehindSchedule`.

Adicionar evento exige atualizar este catálogo, produtor, consumidores, versão e teste de compatibilidade.

## Jobs

Cada job possui:

- nome e versão;
- chave única de execução;
- payload validado;
- timeout e cancelamento cooperativo;
- tentativas com backoff e jitter;
- dead-letter após limite;
- progresso quando durar mais de alguns segundos;
- comando administrativo seguro de reprocessamento;
- teste de execução repetida.

BullMQ/Redis é a infraestrutura inicial. Domínio e casos de uso dependem de uma porta, não de BullMQ.

## Reconciliação

Projeções como posições, progresso de metas, orçamento e cache de relatório têm processo de reconciliação. Eventos aceleram atualização, mas não são a única forma de recuperar consistência.

## Observabilidade

Logs estruturados incluem `requestId`, `correlationId`, módulo, operação e identificadores públicos seguros. `workspaceId` pode ser registrado como identificador, nunca junto de conteúdo financeiro detalhado.

Métricas mínimas:

- contagem, latência e erros por caso de uso/rota;
- lag e falhas de outbox;
- duração, retry e dead-letter de jobs;
- conflitos de versão e idempotência;
- falhas de autorização e rate limit;
- frescor de cotações e projeções.

Alertas devem indicar ação operacional e evitar cardinalidade ilimitada.

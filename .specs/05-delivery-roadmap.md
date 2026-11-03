# Ondas e Gates de Entrega da API

Status: proposta

## Gate global

Todo módulo precisa de:

- spec aprovada e questões bloqueantes resolvidas;
- migrations revisadas, sem execução automática em ambiente compartilhado;
- domínio e casos de uso cobertos;
- integração de repositório e isolamento A/B;
- contrato OpenAPI e catálogo de erros;
- idempotência e concorrência quando aplicáveis;
- eventos/jobs com repetição testada;
- logs e métricas;
- hooks de exportação, exclusão e retenção;
- flag por workspace até aceite da onda.

## Onda 0 — Fundação

Antes de `PLAT`, concluir a conversão do provider e dos schemas para PostgreSQL. O gate inclui identidade, sessão, workspace, contexto transacional, RLS forçado, erros, idempotência, outbox, jobs, auditoria e suíte de isolamento funcionando.

## Onda 1 — MVP financeiro

Entrega `TX` e `IMP`. `IMP` pode ficar depois do aceite manual do núcleo. Gate: um usuário consegue registrar e conferir um mês completo, transferências não alteram resultado e importação é reversível.

## Onda 2 — Planejamento de curto prazo

Entrega `RC`, `CC`, `BG`, `RP`. Sequência interna: recorrências → cartões → orçamento → relatórios. Gate: parcelamento, fatura, orçamento e projeção usam a mesma semântica de transação.

## Onda 3 — Investimentos

Entrega `MD` antes de `INV`. Gate: posição reconstruível por ordens e cotação com frescor visível.

## Onda 4 — Patrimônio e cálculos

Entrega `AST` e `PAY`. São independentes após plataforma, exceto composição de patrimônio. Gate: casos de referência reproduzíveis e fontes legais registradas.

## Onda 5 — Organização e engajamento

Entrega `PLN`, `GL`, `WL`, `NT`. Metas entram depois das fontes que calculam seu progresso. Notificações entram por último para não consolidar eventos instáveis.

## Onda 6 — Operação comercial e conformidade

Entrega `BIL`, `ADM`, `PRV`. Preparação de LGPD começa na Onda 0 por interfaces; esta onda conclui orquestração e operação.

## Regra de rollout

Cada módulo passa por: schema inativo → escrita sombra quando necessária → equipe interna → workspaces piloto → expansão gradual → retirada da flag. Rollback deve desativar comportamento sem apagar dados recém-gravados.

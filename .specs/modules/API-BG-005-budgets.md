# API-BG-005 — Orçamentos

Status: proposta  
Onda: 2  
Dependências: API-TX-001

## Objetivo

Definir limites mensais por categoria ou grupo e acompanhar realizado e projetado sem bloquear transações.

## Modelo e invariantes

`budgets`, `budget_threshold_deliveries`. O alvo é categoria ou grupo, nunca ambos. Há uma entrada por workspace, mês e alvo.

- grupo e categorias filhas não coexistem no mesmo mês;
- realizado usa despesas confirmadas conforme consulta canônica de TX;
- projetado é separado e inclui estados previstos definidos na resposta;
- consumo com orçamento zero é `null` e sinalizado, não divisão artificial;
- marcos V1: 80% e 100%, configuráveis no futuro;
- evento de marco é único por orçamento, versão do marco e ciclo de vida;
- cair abaixo do marco não apaga histórico nem permite spam ao subir de novo;
- copiar mês é comando idempotente e conflito explícito quando destino já tem dados.

## HTTP

`GET/POST /budgets`, `PATCH/DELETE /budgets/{id}`, `POST /budgets/copy`, `GET /budgets/progress?month=YYYY-MM`.

## Eventos e consistência

Consome eventos de TX para invalidar projeção e avaliar marcos. Um job de reconciliação recalcula o mês atual e corrige eventos perdidos. Publica `BudgetThresholdReached.v1` sem descrição de transação.

## Testes e aceite

Sobreposição grupo/categoria, edição retroativa, exclusão/restauração, denominador zero, evento duplicado e reconciliação. Aceite: 80% e 100% são registrados uma vez; excluir despesa reduz o consumo sem reemitir marco já entregue.

## Questões abertas

- tratamento de reembolso;
- carry-over de saldo entre meses;
- moeda diferente da moeda base do workspace.

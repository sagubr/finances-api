# API-PLN-011 — Planner Semanal

Status: proposta  
Onda: 5  
Dependências: API-PLAT-000

## Objetivo

Organizar uma semana padrão em blocos e aplicar exceções por data, produzindo resumo por atividade.

## Modelo

`planner_activities`, `planner_templates`, `planner_slots`, `planner_day_overrides`. Slots usam minuto inicial local e duração; a V1 limita a grade visual a 30 minutos, sem codificar `0..47` como única representação de domínio.

## Regras

- slots de uma mesma data/template não se sobrepõem;
- edição por intervalo é atômica e idempotente;
- override substitui apenas os intervalos declarados ou o dia inteiro conforme modo explícito;
- atividade em uso é arquivada;
- resumo diferencia duração civil planejada de duração real em transições de DST;
- timezone é o do workspace, com data local explícita;
- templates prontos são copiados para o workspace e podem ser editados.

## HTTP

CRUD `/planner/activities`; `GET /planner/week?date=`; `PUT /planner/template/slots`; `PUT /planner/overrides/{date}`; `GET /planner/summary?week=`.

## Eventos, testes e aceite

Publica `PlannerChanged.v1` com semana afetada. Testar sobreposição, lote repetido, override, arquivamento, timezone e DST. Aceite: semana sem DST reconcilia 336 blocos de 30 min; a API não afirma sempre 168 horas em semanas civis afetadas por mudança de relógio.

## Questões abertas

- V1 aceita slots diferentes de 30 minutos via API?
- recorrência além da semana padrão;
- integração futura com calendários externos.

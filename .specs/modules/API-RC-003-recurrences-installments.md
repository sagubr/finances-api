# API-RC-003 — Recorrências e Parcelamento

Status: proposta  
Onda: 2  
Dependências: API-TX-001 com estado `PLANNED`

## Objetivo

Gerar transações previstas recorrentes e parcelas cuja soma seja exatamente o valor contratado.

## Modelo

`recurring_rules`, `recurring_occurrences`, `installment_plans`; TX recebe referências públicas/privadas por contrato de integração, sem RC escrever seu schema diretamente.

## Invariantes

- frequências V1: semanal, mensal e anual, com intervalo positivo;
- dia inexistente usa último dia do mês;
- horizonte padrão de geração: 60 dias, configurável sem alterar regra;
- ocorrência é única por regra e data lógica;
- pausa não gera retroativo automaticamente;
- ocorrências confirmadas ficam destacadas da regra e não são reescritas;
- parcelas distribuem resto de centavos da primeira em diante e somam o total;
- editar/excluir exige escopo `THIS`, `FOLLOWING` ou `ALL_PLANNED`;
- toda computação recebe timezone e data de referência explícitos.

## Casos de uso e HTTP

CRUD em `/recurring-rules`, comandos `/pause` e `/resume`, `POST /installment-plans`, e comandos de escopo sobre a regra/ocorrência. Não sobrecarregar `PATCH /transactions` com semântica de RC.

`GenerateOccurrences` é job idempotente. Para cada ocorrência chama a porta de criação planejada de TX com chave natural.

## Eventos

Publica `RecurringRuleCreated.v1` e `OccurrencesGenerated.v1` com intervalo e IDs, não todas as descrições. Consome confirmação de transação apenas quando necessário para atualizar vínculo, com reconciliação periódica.

## Testes e aceite

Calendário, timezone, ano bissexto, dia 31, DST, job repetido, pausa/retomada, edição por escopo e distribuição de centavos. Aceite canônico: R$ 100,00 em 3 parcelas = 33,34 + 33,33 + 33,33; regra dia 31 usa 28/29 em fevereiro.

## Questões abertas

- regra para feriados e dias úteis;
- edição de valor nas seguintes preserva total original ou cria nova série;
- recorrências sem data final e limite máximo operacional.

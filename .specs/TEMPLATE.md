# API-XXX-000 — Nome do Módulo

Status: proposta  
Onda: N  
Dependências: specs e capacidades necessárias

## Problema e objetivo

Descreva o resultado de negócio e o limite do módulo.

## Escopo e fora do escopo

Liste o mínimo da entrega e o que exige spec futura.

## Linguagem e invariantes

Defina termos, estados, transições, precisão, datas, autorização e regras que nunca podem ser violadas.

## Modelo e ownership

Declare agregados, tabelas próprias, dados derivados, índices, retenção e quais dados não pertencem ao módulo.

## Casos de uso e limites

Liste comandos/readers e as portas usadas para conversar com outros módulos. Proíba acesso direto a schemas vizinhos.

## Contrato HTTP

Rotas, payloads, erros, paginação, idempotência, concorrência e exemplos relevantes.

## Eventos e jobs

Eventos produzidos/consumidos, versões, chaves idempotentes, reconciliação, retries e dead-letter.

## Segurança, privacidade e auditoria

Isolamento A/B, capabilities, dados sensíveis, redaction, exportação, exclusão e retenção.

## Observabilidade e desempenho

Logs, métricas, alertas, cenários de carga e SLO a medir.

## Estratégia de testes

Unidade, propriedades, integração, contrato, isolamento, concorrência, repetição e casos de falha.

## Rollout e aceite

Flag, migração, backfill, piloto, rollback seguro e critérios verificáveis.

## Questões abertas

Decisões que impedem aprovação ou produção, com responsável quando conhecido.

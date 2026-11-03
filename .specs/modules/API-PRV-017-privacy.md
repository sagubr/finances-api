# API-PRV-017 — Privacidade e LGPD

Status: proposta condicionada à validação jurídica  
Onda: transversal, conclusão na 6  
Dependências: todos os módulos com dados pessoais

## Objetivo

Registrar consentimentos e orquestrar acesso, exportação, correção e exclusão conforme matriz de retenção.

## Contratos transversais

Cada módulo registra implementações de:

- `PersonalDataExporter`;
- `WorkspaceDataEraser`;
- `RetentionPolicyProvider`;
- `SensitiveAccessDescriptor`.

O orquestrador falha de forma visível se um módulo ativo não estiver registrado.

## Modelo

`legal_documents`, `consents`, `data_subject_requests`, `data_export_requests`, `account_deletion_requests`, `deletion_module_runs`, `sensitive_access_log`.

## Regras

- consentimento registra documento, versão, finalidade, instante e evidência;
- bases legais que não são consentimento não são modeladas como consentimento falso;
- export é assíncrono, aberto, privado, criptografado quando necessário e com link curto;
- exclusão tem carência cancelável, step-up de autenticação e notificação;
- apagar/anonymizar respeita retenção legal aprovada e explica exceções;
- handlers são idempotentes e retomáveis por módulo;
- teste de completude percorre registro de tabelas, não apenas nomes por convenção;
- backups seguem expiração documentada; restauração não pode reativar conta apagada sem reaplicar tombstones.

## HTTP

`GET /privacy/documents`, `POST /privacy/consents`, `POST /privacy/exports`, `GET /privacy/exports/{id}`, `POST /privacy/deletion`, `POST /privacy/deletion/{id}/cancel`, `GET /privacy/access-log`.

## Eventos e testes

Publica `WorkspaceDeletionRequested.v1` e eventos de conclusão internos. Testar export completo, módulo falhando e retomada, cancelamento, retenção, isolamento e link expirado. Aceite: todos os módulos ativos respondem; nenhuma consulta comum retorna dados apagados; exceções de retenção são verificáveis.

## Bloqueadores

Controlador/operador, DPO/canal, matriz legal de retenção, prazo de atendimento, formato do pacote e política de backups/incidentes.

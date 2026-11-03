# API-ADM-016 — Administração

Status: proposta  
Onda: 6  
Dependências: módulos operados

## Objetivo

Operar catálogos, regras, usuários e filas com identidade administrativa separada e mínimo acesso a dados financeiros.

## Limite de segurança

- principal administrativo não é membro de workspace por padrão;
- `ADMIN`, `SUPPORT`, `FINANCE` são papéis globais separados;
- TOTP é obrigatório;
- toda ação requer motivo e gera audit log append-only;
- listagens de usuários mostram metadados de conta, não transações/saldos;
- suporte com consentimento usa grant temporário, finalidade, expiração e trilha completa;
- impersonação silenciosa é proibida;
- ações de alto risco exigem step-up e, quando definido, dupla aprovação.

## Capacidades

Publicar tabelas trabalhistas, manter instrumentos/categorias padrão, flags, suspender conta, reenviar confirmação, inspecionar/reprocessar dead-letter, acompanhar métricas agregadas e grants de suporte.

## Persistência

`admin_users` ou vínculo a identidade separada, `admin_roles`, `admin_audit_log`, `support_access_grants`, `approval_requests`.

## HTTP

Namespace `/admin/*` com autenticação e rate limit próprios. Controllers administrativos não reutilizam routes de usuário elevando papel; chamam casos de uso dedicados.

## Testes e aceite

Matriz papel × ação, 2FA, grant expirado/revogado, dupla aprovação por atores distintos, auditoria e redaction. Aceite: nenhuma rota retorna conteúdo financeiro sem grant ativo; toda ação material é rastreável.

## Questões abertas

Modelo de identidade administrativa, política de acesso emergencial, retenção do log e processo de revisão periódica.

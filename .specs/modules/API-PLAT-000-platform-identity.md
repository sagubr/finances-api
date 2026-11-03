# API-PLAT-000 — Plataforma e Identidade

Status: proposta  
Onda: 0  
Dependências: nenhuma

## Objetivo

Entregar identidade local, sessões, workspaces, contexto tenant e capacidades operacionais usadas por todos os demais módulos.

## Escopo V1

- cadastro, confirmação de e-mail, login e logout;
- recuperação e troca de senha;
- sessão revogável e listagem de dispositivos;
- workspace pessoal criado no cadastro;
- papéis `OWNER`, `EDITOR`, `VIEWER`;
- contexto de request, auditoria, idempotência, outbox, jobs e flags;
- unidade de trabalho PostgreSQL com contexto RLS transacional;
- rate limit e bloqueio progressivo.

Login social e TOTP ficam fora do MVP, mas TOTP é obrigatório antes de liberar perfis administrativos.

## Decisões

- autenticação local é uma implementação atrás de uma porta; SSO legado não define o novo domínio;
- senha usa Argon2id e parâmetros versionados;
- consulta a senha vazada não pode enviar a senha; indisponibilidade do serviço não bloqueia cadastro indefinidamente;
- sessão usa cookie opaco; o banco guarda hash do token, família, expiração absoluta e última atividade;
- expiração deslizante possui limite absoluto;
- `X-Workspace` seleciona apenas workspace do qual o usuário é membro ativo;
- `VIEWER` não executa mutações; `EDITOR` não altera owner, cobrança ou exclusão;
- acesso a outro workspace retorna 404 para recursos de negócio.

## Persistência

`users`, `user_credentials`, `workspaces`, `workspace_members`, `sessions`, `email_tokens`, `login_attempts`, `feature_flags`, `idempotency_records`, `audit_log`, `outbox_events`, `inbox_events`, `job_runs`.

E-mail é normalizado, possui índice único e alteração exige reconfirmação. Tokens são uso único, possuem finalidade e hash.

Todas as tabelas tenant habilitam e forçam RLS. O resolver converte o UUID público do workspace para a chave interna, abre a unidade de trabalho e executa `set_config` local antes de entregar o transaction client ao caso de uso.

## Casos de uso

`RegisterUser`, `ConfirmEmail`, `AuthenticateUser`, `TerminateSession`, `TerminateAllSessions`, `RequestPasswordReset`, `ResetPassword`, `ChangePassword`, `ListWorkspaces`, `SwitchWorkspace`, `ResolveRequestContext`.

## HTTP

- `POST /auth/register`, `/auth/login`, `/auth/logout`;
- `POST /auth/email/confirm`, `/auth/email/resend`;
- `POST /auth/password/forgot`, `/auth/password/reset`, `/auth/password/change`;
- `GET /auth/session`, `GET /auth/sessions`, `DELETE /auth/sessions/{id}`;
- `GET /workspaces`, `GET /workspaces/{id}`.

Respostas de recuperação e reenvio não revelam existência do e-mail. Login aplica limites por conta, IP e fingerprint segura.

## Eventos

Publica `UserRegistered.v1` e `WorkspaceCreated.v1` após commit. Consumidores não devem depender de ordem entre agregados diferentes.

## Segurança e testes

- matriz de papéis por rota;
- fixação e rotação de sessão;
- token expirado, reutilizado e de finalidade errada;
- enumeration, brute force e rate limit;
- CSRF em todas as mutações por cookie;
- suíte A/B de workspace sobre catálogo de rotas;
- suíte de banco que prova `USING`, `WITH CHECK`, ausência de contexto e papel sem `BYPASSRLS`;
- auditoria sem senha, token ou cookie.

## Aceite

Usuário confirma e-mail, entra, recebe workspace e revoga sessões. Uma tentativa de acesso cruzado não lê nem altera dados. Reentrega de `WorkspaceCreated` não repete defaults.

## Questões abertas

- provedor e política de entrega de e-mail;
- duração absoluta e deslizante da sessão;
- exigência de confirmação antes do primeiro login;
- política final de TOTP para usuários comuns.

# Dados, Tenancy e Segurança

Status: proposta

## Persistência

- PostgreSQL e Drizzle são o baseline oficial.
- Todas as tabelas de negócio possuem `workspace_id BIGINT NOT NULL` e índice iniciado por ele nas consultas frequentes.
- Toda entidade exposta possui `public_id UUID NOT NULL`, preenchido com UUIDv7 pela aplicação, com índice único.
- chaves internas usam `BIGINT GENERATED ALWAYS AS IDENTITY`;
- instantes usam `TIMESTAMPTZ`; datas civis usam `DATE`; `version` inicia em 1;
- objetos consultáveis usam `JSONB`; valores monetários comuns usam `BIGINT` em centavos; preços e quantidades usam `NUMERIC` com precisão declarada;
- `deleted_at` existe somente em recursos restauráveis. Logs, eventos, cotações, snapshots e tabelas de junção não recebem soft delete automaticamente.
- `created_by` e `updated_by` são usados quando há ator humano e valor operacional.

## Isolamento no PostgreSQL

Cada método de repositório recebe `workspaceId` separadamente do filtro do usuário. Métodos como `findByPublicId(id)` são proibidos para dados tenant; use `findByPublicId(workspaceId, id)`.

Toda operação tenant começa uma transação e define o contexto antes da primeira query:

```sql
SELECT set_config('app.workspace_id', $1, true);
SELECT set_config('app.actor_id', $2, true);
```

O terceiro parâmetro `true` torna a configuração local à transação e evita vazamento pelo pool. A policy base é fail-closed:

```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY transactions_workspace_policy ON transactions
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::bigint
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::bigint
);
```

Ausência ou formato inválido de contexto não concede linha alguma. Policies reais devem usar uma função SQL estável e versionada para evitar duplicação, sem conceder bypass.

Defesas obrigatórias:

1. contexto autenticado resolvido antes do controller;
2. autorização de capacidade no caso de uso;
3. transação com contexto RLS definido;
4. policy `USING` e `WITH CHECK`, com `FORCE ROW LEVEL SECURITY`;
5. filtro de workspace no repositório como defesa e auxílio ao planner;
6. constraints compostas incluindo workspace quando necessário;
7. teste A/B para leitura e mutação em cada rota e diretamente no banco;
8. teste arquitetural sobre schemas, assinaturas e queries de repositório.

SQL bruto exige revisão explícita e teste de isolamento. Background jobs tenant iteram workspaces e abrem uma transação contextualizada para cada um; não usam um papel amplo. Operações excepcionais de manutenção usam papel separado, auditado e indisponível ao processo HTTP.

## Catálogos globais

Instrumentos e tabelas públicas não possuem workspace, mas são somente leitura para usuários comuns. Escrita ocorre em contexto administrativo separado e auditado. Preferências ou extensões do usuário vivem em tabelas tenant próprias.

## Segredos e dados sensíveis

- senhas com Argon2id e parâmetros versionados;
- tokens persistidos apenas como hash quando validação por comparação for suficiente;
- credenciais externas passam por `credential-vault` e nunca entram em logs ou auditoria;
- valores financeiros são classificados como dados pessoais de alta sensibilidade operacional;
- exports usam armazenamento privado, URL curta e de uso único quando possível;
- uploads são validados por tamanho, tipo detectado e conteúdo, não apenas extensão.

## Auditoria

Auditar autenticação, autorização sensível, mutações financeiras, mudanças administrativas, exports e operações LGPD. O registro inclui ator, workspace, ação, recurso público, instante, request ID e diferença redigida.

Nunca auditar:

- senha ou hash de senha;
- cookie, token ou chave;
- credencial de banco;
- arquivo integral importado;
- conteúdo livre sem necessidade comprovada.

## Exclusão e retenção

Cada módulo declara:

- dados exportáveis;
- dados apagáveis;
- dados anonimizáveis;
- retenção legal/operacional;
- tratamento em backups.

Exclusão física não pode ser prometida até aprovação da matriz jurídica de retenção.

## Migrações

- expandir e contrair em releases separadas;
- schema novo deve coexistir com versão anterior durante rollout;
- backfill é job observável, retomável e limitado;
- migração deve ter teste de upgrade e estratégia de rollback ou roll-forward;
- nenhum comando de migração é executado em ambiente compartilhado sem autorização explícita.

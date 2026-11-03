# Arquitetura e Limites da API

Status: proposta  
Aplica-se a: todos os módulos

## Estilo

A API é uma aplicação única e um monólito modular Fastify/TypeScript, não um monorepo. O deploy pode executar servidor HTTP e worker como processos separados, mas ambos são entrypoints do mesmo package e usam os mesmos casos de uso e contratos internos.

```text
src/modules/<module>/
├── domain/           entidades, value objects, invariantes e erros
├── application/      casos de uso, serviços e portas
├── infrastructure/   Drizzle, filas e integrações externas
├── presentation/     controllers e routes Fastify
├── dtos/             schemas de entrada/saída
└── factories/        composição de dependências
```

Pastas só existem quando têm responsabilidade real. Controllers simples do mesmo recurso podem ser agrupados em um arquivo; use cases permanecem separados por intenção. Routes não contêm regra de negócio. A granularidade completa está em `07-api-code-conventions.md`.

## Regras de dependência

1. `domain` depende apenas da linguagem e utilitários puros.
2. `application` depende de `domain` e interfaces próprias.
3. `infrastructure` depende das portas que implementa.
4. `presentation` depende de DTOs e casos de uso, nunca de Drizzle.
5. Factories são o composition root do módulo.
6. Imports internos entre módulos apontam apenas para um contrato público explicitamente exportado.
7. Schemas Drizzle permanecem privados; o agregador global existe somente para inicialização do ORM e migrações.

Testes de arquitetura devem verificar essas regras.

## Persistência e unidade de trabalho

PostgreSQL é a persistência da aplicação. Todo caso de uso tenant executa em uma unidade de trabalho transacional que define o contexto RLS antes da primeira query. Repositórios recebem o transaction client; usar o pool global diretamente dentro de módulos de negócio é proibido.

O owner de migrations e o papel de runtime são credenciais distintas. O runtime não possui `BYPASSRLS`, não é owner de tabela e não pode desabilitar policies.

## Módulos transversais

- `platform/identity`: sessão, workspace, contexto, feature flags e rate limit;
- `audit`: registro redigido e imutável de ações materiais;
- `events`: outbox, dispatcher e inbox/idempotência de consumidores;
- `jobs`: execução, retry, dead-letter e reprocessamento;
- `exports`: geração e entrega segura de arquivos;
- `entitlements`: capacidades de plano, sem conhecimento de cobrança nos módulos;
- `privacy`: registro de exportadores, apagadores e retenções de cada módulo.

Esses serviços são portas de aplicação. Não devem virar uma pasta `shared` com regras de negócio sem proprietário.

## Consistência

- Uma transação de banco não atravessa integrações externas.
- Alteração e evento correspondente são gravados na mesma transação via outbox.
- Operações que alteram múltiplos agregados do mesmo módulo podem ser atômicas.
- Fluxos entre módulos são sagas explícitas ou convergência por evento; não se simula atomicidade distribuída.
- Projeções derivadas devem ser reconstruíveis e possuir comando de reconciliação.

## Código legado do modelo

Os módulos analíticos copiados são referência técnica, não domínio oficial do Finances. Antes da Onda 0 haverá um inventário que classifica cada módulo como:

- reutilizado sem mudança;
- adaptado;
- mantido temporariamente atrás de flag;
- removido em mudança separada e revisável.

Nenhuma spec financeira deve depender acidentalmente de `catalog`, `views`, `dashboards` ou `business` do produto anterior.

## Gate arquitetural

Uma entrega falha se:

- domínio importa framework ou persistência;
- controller instancia repositório;
- consulta por recurso de negócio não inclui workspace;
- tabela tenant não possui RLS habilitado e forçado;
- caso de uso tenant consulta fora da unidade de trabalho contextualizada;
- módulo lê tabela privada de outro;
- erro operacional não possui código estável;
- endpoint novo não aparece no OpenAPI;
- job ou consumidor não possui chave idempotente.

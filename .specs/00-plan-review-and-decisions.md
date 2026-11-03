# Revisão do Plano e Decisões Arquiteturais

Status: proposta para aprovação

## Síntese

O plano original é uma boa visão de produto e sequência de entrega. Ele acerta ao tornar explícitos dinheiro exato, idempotência, concorrência, auditoria, eventos, isolamento por workspace e critérios de saída por onda. Entretanto, ele mistura produto, API, UI, infraestrutura e tarefas em um único documento e assume mecanismos que não correspondem integralmente à base técnica atual.

Estas specs particionam a proposta e adotam a arquitetura existente quando ela oferece limites mais claros.

## O que foi preservado

- ondas com gates objetivos;
- transações como núcleo do domínio financeiro;
- valores monetários sem ponto flutuante;
- operações de criação idempotentes;
- concorrência otimista nas mutações editáveis;
- outbox transacional e consumidores idempotentes;
- auditoria de alterações financeiras;
- jobs repetíveis, observáveis e reprocessáveis;
- isolamento automatizado entre workspaces;
- eventos pequenos, versionados e no passado;
- LGPD como capacidade transversal, não tarefa final isolada.

## O que foi corrigido

### Persistência multi-tenant

PostgreSQL com Drizzle é o baseline oficial. O código copiado ainda contém um provider MySQL e deve ser convertido antes da Onda 0 conforme a spec de migração.

O isolamento usa defesas complementares:

- Row-Level Security nativo, habilitado e forçado em toda tabela tenant;
- contexto de workspace definido com `SET LOCAL` dentro da transação;
- papel de runtime sem `BYPASSRLS` e diferente do owner das tabelas;
- todo repositório de negócio ainda recebe `workspaceId` pelo `RequestContext` e o inclui nas operações;
- identificadores públicos nunca autorizam acesso sozinhos;
- testes arquiteturais e de integração falham quando policy, contexto ou filtro estão ausentes;
- recurso existente em outro workspace responde 404.

### Identificadores

O padrão será identidade dual:

- chave interna `BIGINT` para joins e índices locais;
- `public_id` UUIDv7 imutável e único para contratos HTTP e eventos;
- IDs internos jamais saem da API;
- catálogos globais também usam `public_id` nos contratos.

Isso preserva desempenho e evita expor cardinalidade ou acoplar clientes ao armazenamento.

### Contrato de erro

O envelope já implementado será preservado:

```json
{
  "success": false,
  "message": "Não foi possível concluir a operação.",
  "data": {
    "code": "VERSION_CONFLICT",
    "details": { "fields": [] },
    "requestId": "..."
  }
}
```

Não haverá um segundo formato concorrente.

### Limites de módulo

- `domain` não importa Fastify, Drizzle, filas ou módulos vizinhos;
- `application` coordena casos de uso por portas;
- `infrastructure` implementa persistência e integrações;
- `presentation` valida HTTP e delega;
- integração síncrona entre módulos ocorre por uma porta de aplicação explícita;
- integração assíncrona ocorre por eventos;
- um módulo nunca importa o repositório ou schema privado de outro.

### UI e cálculos

A API é fonte da verdade para totais, projeções, permissões, estados e cálculos financeiros. A UI pode formatar e validar ergonomicamente, mas não mantém uma segunda implementação de regras financeiras.

## Lacunas encontradas no plano

- `SPEC-TX-001` é citada como existente, porém não está no workspace;
- não há decisão sobre provedor de identidade, e-mail, push, cobrança ou cotações;
- câmbio, arredondamento entre moedas e timezone de fechamento precisam de regras por módulo;
- a política de auditoria precisa excluir senhas, tokens e segredos;
- exclusão LGPD conflita com retenções legais e financeiras e exige matriz de retenção;
- metas automáticas baseadas em eventos precisam de reconciliação para corrigir eventos perdidos;
- cache “nunca desatualizado” é uma promessa impossível; specs passam a definir consistência e tolerância;
- tarefas de até dois dias são uma regra de planejamento, não um contrato arquitetural.

## Decisões adiadas que bloqueiam produção, não desenvolvimento inicial

- provedor de e-mail;
- provedor de pagamento;
- fornecedores de cotações e licenças de redistribuição;
- política jurídica de retenção e anonimização;
- fonte oficial e responsável pela aprovação de tabelas trabalhistas;
- requisitos de recuperação de desastre e região de hospedagem.

## Decisão resolvida posteriormente

- Banco principal: PostgreSQL. O suporte a MySQL permanece apenas onde fizer sentido como fonte externa do `query-engine`, não como persistência da aplicação.

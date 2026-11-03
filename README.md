# Finances API

Aplicação Fastify/TypeScript em package único, com PostgreSQL, Drizzle e isolamento multi-tenant por RLS.

## Comandos

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

O servidor usa a porta `3009` por padrão. Comandos Drizzle exigem que a configuração de conexão seja injetada pelo ambiente ou secret manager.
Em desenvolvimento e teste, o contrato OpenAPI derivado dos DTOs Zod fica disponível em `/openapi.json` e a interface em `/docs`. A documentação interativa não é carregada em produção.

As decisões arquiteturais e convenções estão em [`.specs`](./.specs/README.md).

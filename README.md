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

## Processos com PM2

O servidor HTTP e o worker devem rodar como processos separados. Após gerar o build, inicie os
dois pelo ecosystem do projeto:

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Para acompanhar o processamento das recorrências e demais jobs:

```bash
pm2 logs finances-api-worker --lines 200
```

Os logs persistentes ficam em `logs/api.*.log` e `logs/worker.*.log`. Depois de alterar código ou
variáveis de ambiente, gere um novo build e reinicie os processos:

```bash
npm run build
pm2 restart ecosystem.config.cjs --update-env
```

O servidor usa a porta `3005` por padrão. Comandos Drizzle exigem que a configuração de conexão seja injetada pelo ambiente ou secret manager.
Em desenvolvimento e teste, o contrato OpenAPI derivado dos DTOs Zod fica disponível em `/openapi.json` e a interface em `/docs`. A documentação interativa não é carregada em produção.

## Login com Google

Crie um cliente OAuth 2.0 do tipo aplicação web e cadastre esta URI de redirecionamento no Google Cloud:

```text
http://localhost:3005/api/v1/auth/callback/google
```

Depois configure `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET`. Os defaults locais de `GOOGLE_OAUTH_REDIRECT_URI` e `WEB_APP_URL` já apontam, respectivamente, para o callback acima e para `http://localhost:3000`. Em produção, ambas as URLs devem usar HTTPS.

As decisões arquiteturais e convenções estão em [`.specs`](./.specs/README.md).

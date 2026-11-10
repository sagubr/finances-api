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
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Para acompanhar o processamento das recorrências e demais jobs:

```bash
pm2 logs finances-api-worker --lines 200
```

Os logs ficam no diretório padrão do PM2 e podem ser consultados com `pm2 logs`. Depois de alterar
código ou variáveis de ambiente, gere um novo build e reinicie os processos:

```bash
npm run build
pm2 restart ecosystem.config.cjs --env production --update-env
```

O `ecosystem.config.cjs` usa `/api` como diretório de trabalho, portanto o `dotenv` da aplicação
carrega `/api/.env`. O PM2 define apenas `NODE_ENV=production` e `LOG_LEVEL=info` quando iniciado
com `--env production`; as demais configurações continuam vindo do `.env` ou do secret manager.

Em uma máquina com 1 GB de RAM, a API reinicia ao ultrapassar 256 MB e o worker ao ultrapassar
224 MB. Use `DB_POOL_MAX=4` no ambiente de produção para limitar cada pool de conexões. Os limites
evitam que os dois processos consumam toda a memória disponível, mas importações muito grandes
podem exigir uma máquina maior.

Confira o ambiente efetivamente recebido pelo processo depois do deploy:

```bash
pm2 env 0 | grep -E 'NODE_ENV|DATABASE_HOST|DATABASE_NAME|DATABASE_USER|DB_SSL_MODE'
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

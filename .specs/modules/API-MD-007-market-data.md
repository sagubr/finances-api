# API-MD-007 — Dados de Mercado

Status: proposta  
Onda: 3  
Dependências: API-PLAT-000

## Objetivo

Manter catálogo global de instrumentos, cotações e câmbio com proveniência e frescor explícitos.

## Modelo

`instruments`, `instrument_provider_mappings`, `quotes`, `fx_rates`, `quote_rejections`, `instrument_requests`. Tabelas são globais; solicitações pertencem a workspace.

## Regras

- instrumento é único por símbolo normalizado, mercado e moeda;
- preço e taxa são `DECIMAL` e expostos como string;
- cada quote registra provedor, timestamp de mercado, timestamp de ingestão e qualidade;
- `stale` é calculado por classe, calendário e instante de referência;
- outlier é rejeitado ou marcado para revisão, nunca corrigido silenciosamente;
- atualização considera apenas instrumentos em uso, mas sem expor quais workspaces os usam;
- adaptadores obedecem rate limit, timeout, circuit breaker e licença;
- dado de mercado é informativo e não promessa de execução.

## Portas e HTTP

`QuoteReader.getLatest`, `QuoteReader.getAt`, `FxRateReader.getAt`. API pública autenticada: `GET /instruments?q=` e `GET /instruments/{id}/quote`. Administração de catálogo pertence a ADM.

## Eventos e jobs

Jobs agrupam por provedor e publicam `QuotesRefreshed.v1` com IDs e timestamps. Falha parcial não apaga última cotação válida.

## Testes e aceite

Provedores simulados, timeout, limite, failover, resposta inválida, mercado fechado e frescor. Aceite: falha do primário usa secundário quando permitido; sem dado novo, consumidor recebe última cotação com `stale=true`.

## Bloqueadores externos

Escolha de provedores, termos de uso, mercados cobertos, calendários e direito de armazenar/redistribuir histórico.

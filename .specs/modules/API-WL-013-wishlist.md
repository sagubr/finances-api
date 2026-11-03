# API-WL-013 — Lista de Desejos

Status: proposta  
Onda: 5  
Dependências: API-TX-001

## Objetivo

Registrar compras planejadas e convertê-las opcionalmente em despesa sem duplicação.

## Modelo

`wishlist_items`, `wishlist_purchase_links`. Campos: nome, URL opcional, preço estimado/moeda, prioridade, motivo, data planejada, estado, dados reais e vínculo TX.

## Regras

- URL aceita apenas `http`/`https`, até 2.048 caracteres;
- backend não acessa URL nem segue redirects na V1;
- conteúdo de URL não é usado como HTML;
- marcar comprado e criar TX ocorre por saga idempotente com estado recuperável;
- vínculo não implica cascade delete;
- total planejado é reader do módulo e separa moedas;
- item comprado é arquivável, não convertido de volta silenciosamente.

## HTTP

CRUD `/wishlist`; `POST /wishlist/{id}/purchase`; `POST /wishlist/{id}/archive`; `GET /wishlist/summary?month=`.

## Testes e aceite

URL inválida/interna continua apenas texto e nunca é acessada; comando repetido não duplica TX; falha entre compra e vínculo é reconciliada. Aceite: compra cria no máximo uma transação correta e preserva vínculo ao arquivar.

## Questões abertas

- múltiplas moedas no resumo;
- itens compartilhados;
- scraping futuro exige serviço isolado e spec de SSRF própria.

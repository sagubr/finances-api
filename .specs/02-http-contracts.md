# Contratos HTTP

Status: proposta  
Prefixo: `/api/v1`

## Envelope

Sucesso singular:

```json
{ "success": true, "data": {} }
```

Sucesso de lista:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pageInfo": { "nextCursor": null, "hasNextPage": false }
  }
}
```

Erro segue o formato definido na revisão. `message` é segura para exibição; detalhes técnicos ficam apenas nos logs.

## Identidade e contexto

- autenticação por cookie de sessão `HttpOnly`, `Secure` em produção e `SameSite` adequado;
- `X-Workspace` informa o `public_id` do workspace ativo quando o usuário possui mais de um;
- a API resolve usuário, membro e workspace; o cliente nunca envia `workspace_id` no corpo;
- mutações por cookie exigem proteção CSRF definida na spec de plataforma;
- `X-Request-Id` pode ser aceito se válido; caso contrário é gerado.

## Identificadores e datas

- todos os IDs HTTP são UUIDv7 em string;
- datas civis usam `YYYY-MM-DD`;
- instantes usam ISO 8601 UTC com `Z`;
- competência mensal usa `YYYY-MM`;
- timezone IANA do workspace é explícito quando afeta fechamento ou agenda.

## Dinheiro e decimais

- dinheiro comum: `{ "amountCents": 12345, "currency": "BRL" }` ou campos equivalentes;
- quantidade e preço de ativo são strings decimais, nunca JSON number;
- percentuais persistidos em pontos-base são expostos como inteiro quando isso fizer parte do domínio;
- arredondamento deve ser declarado por operação.

## Concorrência

- recursos editáveis retornam `version` inteiro;
- `PATCH`, ações de estado e exclusões exigem `expectedVersion` no corpo ou `If-Match` conforme definido pela spec do módulo;
- conflito retorna 409 `VERSION_CONFLICT` com a versão atual, sem aplicar alteração parcial.

## Idempotência

- criações financeiras e comandos externos aceitam `Idempotency-Key` de 16 a 128 caracteres;
- a chave é escopada por workspace, ator, operação e rota;
- mesma chave e mesmo hash devolvem a resposta original;
- mesma chave com payload diferente retorna 409 `IDEMPOTENCY_KEY_REUSED`;
- retenção mínima: 24 horas; módulos podem exigir mais.

## Listas

- cursor opaco codificado e ordenação total determinística;
- `limit` padrão 50, máximo 200;
- filtros são tipados no OpenAPI;
- busca textual tem limite, normalização e escape no repositório;
- paginação por número já existente permanece apenas em endpoints legados até migração explícita.

## Semântica

- `POST` cria ou executa comando não idempotente por natureza, protegido por chave;
- `PUT` substitui um recurso ou lote identificado e é idempotente;
- `PATCH` altera parcialmente com versão;
- exclusão lógica retorna 204; restauração é ação explícita;
- validação sintática retorna 400; regra de domínio, 422; conflito, 409;
- recurso de outro workspace e recurso inexistente retornam 404.

## Compatibilidade

- adicionar campo opcional é compatível;
- remover, renomear ou mudar significado exige nova versão ou janela de depreciação;
- enums desconhecidos devem falhar de forma visível na UI, nunca ser reinterpretados;
- exemplos e códigos de erro fazem parte do OpenAPI.

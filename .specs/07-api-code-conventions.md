# Convenções de Código da API

Status: adotada e automatizada nos gates  
Aplica-se a: package raiz `api`

## 1. Objetivo e ordem de prioridade

Estas regras reduzem variação acidental e tornam o código previsível. Em caso de conflito, a prioridade é:

1. correção e invariantes do domínio;
2. segurança, isolamento e privacidade;
3. clareza para leitura e manutenção;
4. consistência arquitetural;
5. desempenho medido;
6. concisão.

Uma regra pode ser excepcionada quando a alternativa for comprovadamente mais clara ou segura. A exceção deve ficar evidente na revisão; não se adiciona comentário defensivo para todo caso comum.

## 2. Unidade de organização

O módulo é a principal fronteira. A estrutura padrão é:

```text
modules/<module>/
├── domain/
├── application/
│   ├── use-cases/
│   ├── services/
│   └── ports/
├── infrastructure/
│   ├── database/
│   └── integrations/
├── presentation/
│   ├── controllers/
│   └── routes/
├── dtos/
└── factories/
```

Não criar uma camada ou pasta sem responsabilidade real. Código compartilhado continua no módulo proprietário e é exposto por contrato público; `shared` não é depósito de utilitários sem dono.

## 3. Arquivos e granularidade

### Controllers

Controllers são finos: recebem input validado, constroem o comando, chamam o caso de uso e convertem o resultado para HTTP.

Um arquivo pode conter várias classes de controller do mesmo recurso. Cada operação possui uma classe nomeada, recebe o use case no constructor e expõe `handle`:

```ts
export class ListTransactionsController {
  constructor(private readonly useCase: ListTransactionsUseCase) {}

  async handle(input: ListTransactionsControllerInput) {
    return this.useCase.execute(input);
  }
}

export class CreateTransactionController {
  constructor(private readonly useCase: CreateTransactionUseCase) {}

  async handle(input: CreateTransactionControllerInput) {
    return this.useCase.execute(input);
  }
}
```

Não representar controllers por objetos de callbacks anônimos. As classes dão nome às operações e tornam a injeção rastreável. Classes pequenas e coesas do mesmo recurso permanecem juntas no mesmo arquivo; não criar um arquivo para cada controller trivial.

Dividir o controller quando ocorrer qualquer um destes sinais:

- mais de sete handlers públicos;
- arquivo acima de aproximadamente 300 linhas;
- grupos com dependências ou autorização diferentes;
- mais de um recurso/agregado;
- helpers de transformação começam a esconder regra de negócio.

Não criar um arquivo por handler de cinco linhas. Também não criar um `controllers.ts` com recursos não relacionados.

### Use cases

Cada comando ou consulta relevante tem um arquivo próprio e um export público principal. Use cases são separados porque concentram autorização, transação, invariantes, eventos e coordenação.

```text
create-transaction.use-case.ts
update-transaction.use-case.ts
list-transactions.use-case.ts
```

Um use case não deve conter outros use cases como métodos de uma classe genérica. Extraia serviços de domínio/aplicação quando duas operações compartilham uma política real, não apenas algumas linhas.

Sinais de divisão:

- mais de uma intenção de negócio;
- branches independentes por tipo de operação;
- função principal acima de aproximadamente 100 linhas;
- mais de cinco dependências;
- transações ou eventos com ciclos de vida diferentes.

### DTOs, schemas e erros

- DTOs Zod relacionados ao mesmo recurso podem ficar em `<resource>.dto.ts`;
- separar quando o arquivo ultrapassar aproximadamente 300 linhas ou servir contextos de segurança diferentes;
- erros especializados ficam no módulo, agrupados por domínio quando pequenos;
- códigos públicos entram no catálogo central;
- tipos privados permanecem próximos do código que os usa.

### Repositórios e adapters

Um adapter pode implementar várias operações do mesmo agregado. Separar leitura pesada de escrita quando dependências, tuning ou modelo de consistência forem diferentes. Interfaces pertencem à camada que as consome, não à infraestrutura.

## 4. TypeScript

### Constância e mutabilidade

- usar `const` por padrão;
- `let` é permitido somente para estado local que realmente muda e fica contido em uma função curta;
- não trocar um loop claro por `reduce` complexo apenas para evitar `let`;
- não reatribuir parâmetros;
- inputs de domínio e aplicação são `readonly` sempre que possível;
- não mutar arrays/objetos recebidos; produzir um novo valor.

### Funções

- preferir `const` com arrow function para funções puras pequenas, factories, callbacks e funções locais;
- usar declaração `function` quando hoisting, overload, generator ou stack trace/nome semântico trouxer vantagem real;
- use cases e controllers são classes nomeadas; adapters com lifecycle/estado, erros especializados e entidades encapsuladas também podem ser classes;
- evitar métodos `static` usados como namespace; prefira módulo de funções;
- não usar default export em código de domínio/aplicação.

### Tipos

- `unknown` em fronteiras não tipadas; validar antes de usar;
- `any` é proibido, salvo adapter legado isolado e acompanhado de issue de remoção;
- evitar `as`, `!` e casts duplos; resolver a modelagem ou validar o dado;
- preferir unions discriminadas a booleanos combinatórios;
- preferir string literal unions e objetos `as const` a `enum` TypeScript;
- usar `satisfies` para provar mapas exaustivos sem perder inferência;
- usar `type` para unions/composições e `interface` para contratos extensíveis de portas quando isso melhorar a mensagem;
- não criar tipo duplicado da forma inferida por Zod/Drizzle sem uma razão de camada.

### Assinaturas

- acima de dois parâmetros conceituais, usar objeto nomeado;
- evitar parâmetros booleanos (`execute(true, false)`); usar opções semânticas;
- funções retornam um tipo estável; não alternar `null`, `undefined` e exceção para o mesmo caso;
- dinheiro, UUID, data civil e decimal devem usar tipos/constructors de fronteira, não strings soltas espalhadas.

## 5. Fluxo de controle

- usar guard clauses e retornos antecipados;
- não usar `else` após `return`, `throw`, `continue` ou `break`;
- profundidade máxima desejada: dois níveis;
- ternário é para expressão simples; ternário aninhado é proibido;
- `switch` é aceito quando exaustivo e curto;
- para dispatch por enum/tipo fechado, preferir mapa exaustivo de handlers;
- não transformar condição aberta ou dependente de ordem em mapa artificial;
- extrair predicados nomeados quando a condição não for imediatamente legível.

Exemplo de dispatch:

```ts
const handlers = {
  INCOME: handleIncome,
  EXPENSE: handleExpense,
  TRANSFER: handleTransfer,
} satisfies Record<TransactionType, TransactionHandler>;

const handler = handlers[input.type];
return handler(input);
```

Object Calisthenics é aplicado como heurística: funções pequenas, baixa indentação, coleções encapsuladas quando têm invariantes e ausência de primitivas ambíguas. Não se criam wrappers ou classes sem comportamento apenas para cumprir a técnica.

## 6. Use cases e injeção de dependências

O padrão é classe com injeção explícita no constructor e um único método público `execute`:

```ts
export class CreateTransactionUseCase {
  constructor(
    private readonly unitOfWork: TransactionsUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateTransactionCommand): Promise<TransactionOutput> {
    // autorização, unidade de trabalho, domínio, persistência e evento
  }
}
```

- dependências são explícitas e pequenas;
- use case tem nome semântico, arquivo próprio e não é uma função anônima retornada por factory;
- acima de dois valores de entrada, `execute` recebe um command/query object nomeado;
- relógio, gerador de ID e integrações externas são injetados quando afetam teste/regra;
- não usar service locator global;
- factories fazem composição, não regra de negócio;
- um use case tenant abre/participa da unidade de trabalho contextualizada e nunca usa pool global;
- eventos são gravados na outbox da mesma transação.

## 7. Rotas e controllers

- routes declaram método, path, schema, autenticação, capabilities e handler;
- validação acontece antes do controller;
- controller não captura erro de domínio para devolver status manualmente quando o error middleware já conhece o catálogo;
- não acessar repositório, Drizzle, Redis ou SDK externo na route/controller;
- não construir response inconsistente; usar o envelope comum;
- request e reply não atravessam a camada de aplicação;
- um endpoint novo exige OpenAPI e exemplos de erro relevantes.
- headers estruturais, como `x-workspace` e `idempotency-key`, são DTOs Zod e aparecem no OpenAPI; o middleware não entrega UUID arbitrário ao PostgreSQL;
- erros de validação, CSRF, rate limit e constraints esperadas possuem envelope público 4xx; apenas falhas não declaradas retornam 500;
- autenticação resolve o contexto em adapter injetado; autorização de mutação permanece no use case, antes da unidade de trabalho.

## 8. Domínio

- invariantes vivem em funções/objetos puros, não no controller ou schema SQL;
- schema Zod valida forma; domínio valida significado;
- nomes usam linguagem do produto, não nomes de tabela;
- entidades não persistem a si mesmas;
- side effects não acontecem em constructors;
- cálculo financeiro recebe data, moeda e política de arredondamento explicitamente;
- nenhuma regra usa relógio global diretamente.

## 9. PostgreSQL e persistência

- Drizzle fica em `infrastructure`;
- `src/config/drizzle.config.ts` é o arquivo próprio do Drizzle Kit, aponta para o schema agregado e é a única entrada de geração de migration;
- `env.config.ts` carrega e valida ambiente uma vez; `database.config.ts` deriva host, porta, credenciais, TLS e limites do pool;
- cada arquivo de configuração expõe uma factory pura para testes e uma instância derivada do `env` único; não volta a ler `process.env`;
- `runtime.config.ts` apenas agrega as configurações e valida requisitos cruzados; consumers recebem/importam somente o recorte de configuração que usam;
- o provider da conexão expõe `pool` e `db`; repositories recebem o database por injeção/provider e não criam conexões;
- nomes de adapters refletem o domínio (`AccountRepository`, `TransactionsUnitOfWork`), não a biblioteca usada; não prefixar classes/arquivos com `Drizzle`;
- repositories recebem `NodePgDatabase<typeof schema>` ou a transação equivalente; nunca `Record<string, never>`;
- selections e records derivam de `table.$inferSelect`/`table.$inferInsert`; não duplicar manualmente tipos snake_case retornados pelo driver;
- repository usa o query builder Drizzle para `select`, `insert`, `update`, `delete`, joins, filtros e `returning`;
- toda query tenant usa o transaction client da `TenantUnitOfWork`;
- RLS é obrigatório, mas o filtro explícito por workspace continua presente;
- usar `returning()` e `onConflict...` nativos do PostgreSQL;
- evitar N+1; carregar relações em lote;
- selecionar somente colunas necessárias;
- paginação precisa de ordenação total e índice compatível;
- SQL bruto é exceção para recursos PostgreSQL que o query builder não representa adequadamente (por exemplo advisory lock ou `set_config`), fica isolado no adapter, parametrizado com `sql` do Drizzle e exige teste de isolamento;
- transações são curtas e não englobam chamadas de rede;
- não capturar erro de constraint por texto; mapear códigos/constraints nomeadas;
- repositories retornam modelos de domínio/aplicação, não rows Drizzle vazando para cima.

## 10. Assincronismo, eventos e jobs

- `await` explícito para efeitos relevantes;
- tarefas independentes podem usar `Promise.all`, desde que concorrência seja limitada quando cardinalidade variar;
- não usar `forEach(async ...)`;
- não criar `new Promise` quando uma API promise já existe;
- todo retry precisa de idempotência;
- consumidor valida versão e payload;
- job recebe chave única, timeout, retry e observabilidade;
- não engolir erro; adicionar contexto seguro e relançar ou converter para erro operacional.

## 11. Nomes, imports e comentários

- arquivos em `kebab-case`;
- tipos/classes/componentes em `PascalCase`;
- variáveis/funções em `camelCase`;
- booleanos começam com `is`, `has`, `can`, `should`;
- evitar abreviações não pertencentes ao domínio;
- imports usam alias somente entre áreas estáveis; imports relativos dentro de uma pasta curta são aceitáveis;
- barrels existem apenas na API pública do módulo/package, nunca para esconder ciclos;
- comentário explica decisão, risco ou restrição; não repete o código;
- TODO contém contexto e issue/critério de remoção.

## 12. Testes

- teste segue Arrange/Act/Assert sem comentários redundantes;
- nome descreve comportamento e resultado;
- domínio financeiro usa testes de tabela e propriedades para invariantes;
- mock apenas portas externas; não mockar o próprio domínio;
- repositório e RLS são testados em PostgreSQL real;
- todo endpoint tenant tem cenário A/B;
- use case cobre sucesso, autorização, conflito, idempotência e falha de dependência aplicáveis;
- teste não depende de ordem, relógio ou rede reais;
- factories de teste produzem defaults válidos e overrides explícitos.

Até a migração dos módulos legados, arquivos de rota que ainda recebem `Pool` e executam SQL direto são compatibilidade temporária, não precedente arquitetural. Eles devem ser removidos slice a slice; nenhum endpoint novo pode copiar esse padrão.

## 13. Limites de complexidade

Estes números são gatilhos de revisão, não metas para contornar:

- função: revisar acima de 40 linhas ou complexidade ciclomática 8;
- use case: revisar acima de 100 linhas;
- arquivo: revisar acima de 300 linhas;
- parâmetros posicionais: máximo 2;
- nesting: máximo desejado 2;
- dependências de use case: revisar acima de 5.

Não dividir uma unidade coesa apenas para ficar uma linha abaixo do limite.

## 14. Automação esperada

Adicionar ESLint flat config com TypeScript type-aware para aplicar, no mínimo:

- `prefer-const`;
- `no-else-return`;
- `eqeqeq`;
- promises não tratadas;
- imports e dependências de camada;
- complexidade e profundidade como warnings/gates acordados;
- proibição de `any` explícito e non-null assertion salvo exceção local;
- detecção de código/imports não usados.

Prettier decide estilo visual. ESLint decide risco e arquitetura; não duplicar regras cosméticas.

## 15. Checklist de revisão

- O arquivo pertence ao módulo/camada corretos?
- A intenção está clara sem abrir cinco arquivos triviais?
- Controller está fino e o use case isolado?
- Há `else`, nesting ou dispatch que pode ser simplificado sem ocultar a regra?
- Tipos eliminam estados inválidos?
- Workspace/RLS e autorização estão explícitos?
- Transação não inclui rede?
- Erros, eventos e logs não expõem dados sensíveis?
- Testes cobrem invariantes e falhas, não apenas linhas?
- A abstração já tem uso real ou foi criada preventivamente?

## 16. Exceções

Código gerado, adapters de terceiros e algoritmos matemáticos podem precisar de estilo diferente. Isole a exceção, documente a razão no arquivo ou configuração e não deixe o padrão excepcional contaminar o domínio.

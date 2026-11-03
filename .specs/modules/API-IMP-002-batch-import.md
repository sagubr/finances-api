# API-IMP-002 — Importação em Lote

Status: proposta  
Onda: 1  
Dependências: API-TX-001

## Objetivo

Importar CSV/XLSX com prévia, correção, commit e rollback auditáveis, sem duplicar transações.

## Fluxo

1. upload cria lote `UPLOADED` e armazena arquivo em área privada temporária;
2. job detecta tipo real, lê por cabeçalho e produz linhas normalizadas;
3. lote vira `PREVIEWED` com `VALID`, `WARNING` ou `ERROR` por linha;
4. usuário corrige mapeamentos e confirma um conjunto explícito;
5. commit cria transações em blocos, com atomicidade definida abaixo;
6. rollback lógico fica disponível por 30 dias quando não houver dependências incompatíveis.

## Persistência

`import_batches`, `import_rows`, `import_column_mappings`, `import_commits`. Arquivo original possui checksum, expiração e referência de storage; conteúdo não entra em log ou auditoria.

## Decisões

- limite inicial: 10 MiB e 20.000 linhas;
- cabeçalhos são normalizados e versionados; posição não importa;
- datas e decimais brasileiros são aceitos sem usar float;
- deduplicação usa fingerprint canônico e também permite decisão manual;
- reenviar arquivo não cria lote comprometido duplicado;
- categoria aproximada é sugestão, nunca escolha silenciosa;
- `commit valid only` é permitido e registra exatamente as linhas escolhidas;
- atomicidade é por commit completo até 20.000 linhas; se o banco não sustentar o limite, a spec deve mudar antes de particionar;
- XLSX é tratado como conteúdo não confiável; fórmulas não são executadas.

## HTTP

`POST /imports`, `GET /imports/{id}`, `GET /imports/{id}/rows`, `PATCH /imports/{id}/rows/{rowId}`, `POST /imports/{id}/commit`, `POST /imports/{id}/rollback`, `GET /imports/template`.

Upload e commit exigem idempotência. Consulta de progresso usa polling na V1.

## Integração

Commit chama casos de uso públicos de TX em modo batch, preservando invariantes e eventos. É proibido inserir diretamente em `transactions` por um repositório do módulo IMP.

## Testes e aceite

Cobrir CSV com BOM e delimitadores, XLSX, colunas ausentes, planilha maliciosa, datas ambíguas, valores inválidos, duplicados internos/externos, limite e rollback. Aceite: contagens da prévia batem com commit; mesma entrada não duplica; rollback afeta somente transações daquele commit.

## Questões abertas

- storage temporário e antivírus;
- layouts bancários adicionais (OFX não entra sem spec própria);
- bloqueio de rollback quando transação gerou efeitos em outros módulos.

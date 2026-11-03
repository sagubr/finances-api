# Auditoria do Escopo Ativo da API

Data: 2 de novembro de 2026  
Status: MVP financeiro implementado e validado; módulos futuros fora da migration inicial

## Arquitetura aprovada

```text
DTO Zod → route → controller em classe → use case em classe
→ port → unit of work → repository Drizzle tipado
```

Routes descrevem HTTP e delegam. Controllers relacionados podem compartilhar arquivo, mas são classes nomeadas. Cada intenção de aplicação possui use case próprio, com injeção pelo construtor e método `execute`. Domínio e aplicação não dependem do ORM.

## Corte do primeiro entregável

| Área                                                       | Estado                                      |
| ---------------------------------------------------------- | ------------------------------------------- |
| Plataforma, sessão e workspace                             | Ativa                                       |
| Contas, categorias, transações, transferências e histórico | Ativa                                       |
| Cartões, faturas, parcelamentos, recorrências e orçamentos | Ativa                                       |
| Importação                                                 | Ativa                                       |
| Relatórios anual, comparativo e projeção                   | Ativa e calculada, sem persistência própria |
| Administração, billing e privacidade operacional           | Futura; sem rota e sem tabela ativa         |
| Patrimônio, mercado e organização                          | Futura; sem rota e sem tabela ativa         |
| Exports assíncronos                                        | Futuro; sem rota e sem handler de worker    |

O arquivo `src/infrastructure/database/schema.ts` é uma allow-list explícita. A exportação atual do Drizzle contém 27 tabelas. Código futuro não deve ser confundido com funcionalidade publicada.

## Invariantes revisadas

- competência derivada da data em todos os writers ativos;
- check SQL impede competência divergente da data;
- check SQL mantém estado e data de liquidação coerentes;
- máquina de estados impede saltos e transições repetidas;
- histórico cobre todas as mutações do lançamento;
- campos estruturais de conta/categoria são imutáveis;
- relações inativas são rejeitadas nos fluxos manual, cartão, recorrência, parcelamento, orçamento e importação;
- exclusões respeitam dependências financeiras ativas;
- worker acessa persistência apenas por unit of work e repositories.

## Evidências

- OpenAPI: 71 operações em 55 paths, com IDs únicos;
- API: 63 testes em 15 arquivos;
- UI: 76 testes em 27 arquivos;
- lint, typecheck e build aprovados nos dois projetos;
- SQL exportado contém FKs e índices esperados, além de checks de valor, competência e liquidação;
- nenhuma migration foi criada nesta revisão.

## Migration inicial

Não escrever migration manualmente. Depois de remover o histórico antigo e recriar o banco, gerar uma única migration a partir da allow-list atual com `npm run db:generate`, revisar o SQL e executar `npm run db:migrate`.

O projeto aceita reinicialização total dos dados; não há estratégia de compatibilidade com o banco anterior.

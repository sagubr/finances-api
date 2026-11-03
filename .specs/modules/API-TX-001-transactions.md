# API-TX-001 — Contas e Lançamentos

Status: implementada no MVP  
Onda: 1  
Dependências: API-PLAT-000

## Objetivo

Ser a fonte da verdade do fluxo financeiro diário: contas, categorias, receitas, despesas, transferências, planejamentos, liquidação, saldos e resumo mensal.

## Modelo ativo

- `accounts`: nome, tipo, moeda, saldo inicial, data-base e estado. Os tipos ativos incluem
  `BROKERAGE` para corretora/investimentos e `BENEFIT` para saldos restritos, como vale-alimentação;
- `categories`: nome, tipo, cor, origem padrão/pessoal e estado;
- `transactions`: tipo, estado, valor, moeda, data, competência derivada, conta, categoria e origem;
- `transaction_history`: ação, ator e snapshot após cada mutação;
- `transfer_pairs`: vínculo imutável entre as pernas de débito e crédito.

Grupos de categoria não fazem parte do MVP. Conta e moeda da conta, assim como tipo da categoria, são estruturais e não podem ser alterados após o cadastro.

## Invariantes

1. `amount_cents` é inteiro positivo; o tipo e o vínculo definem o efeito no saldo.
2. Conta e categoria devem pertencer ao workspace e estar ativas.
3. Categoria é compatível com o tipo da receita/despesa.
4. `competence_month` é derivada de `occurred_on` pelo servidor e conferida por check SQL.
5. Somente `SETTLED` possui `settled_on`.
6. A máquina normal de estados é `PLANNED → CONFIRMED → SETTLED`, com reversão no sentido oposto.
7. Transferência cria duas pernas atômicas, com mesmo valor/moeda e efeitos opostos; não altera o resultado.
8. Compra vinculada à fatura alimenta a fatura, mas não debita diretamente a conta de pagamento.
9. Pagamento de fatura reduz a conta e, no modo detalhado, não gera uma segunda despesa no resultado.
10. Alteração, mudança de estado, exclusão e restauração gravam histórico e incrementam `version`.
11. Conta/categoria com dependência financeira ativa não pode ser removida.
12. Conversão entre moedas fica fora do MVP; transferências exigem a mesma moeda.
13. Aporte não é receita nem despesa: é uma transferência para uma conta `BROKERAGE`.
14. Conta `BENEFIT` possui saldo próprio e suas compras alimentam a análise de consumo, mas seu
    saldo não compõe caixa livre nem previsão de caixa disponível.

## Saldos derivados

O saldo não é uma coluna mutável nem uma segunda fonte da verdade. `GET /accounts` calcula:

- `currentBalanceCents`: saldo inicial mais movimentos `SETTLED` até a data atual do timezone do workspace;
- `projectedBalanceCents`: saldo inicial mais todos os movimentos conhecidos, incluindo confirmados e planejados futuros.

Somente movimentos na data-base da conta ou posteriores participam do cálculo. Receitas creditam; despesas e pagamentos debitam; transferências aplicam o sinal da perna. Compras vinculadas a `statement_cycles` não alteram o caixa da conta; a projeção/pagamento da fatura produz o débito.

## Consultas canônicas

O resumo mensal separa realizado, previsto, receitas, despesas e pagamentos de cartão. Transferências e pagamento de fatura no modo detalhado não distorcem o resultado. Movimentos de contas `BENEFIT` não entram no resumo de dinheiro disponível; o consumo permanece no relatório por categoria e no saldo da própria conta.

Rendimentos, juros e dividendos podem usar categorias de receita. A compra de um ativo não usa
categoria de despesa: o aporte movimenta caixa para a corretora e a evolução patrimonial pertence
ao módulo de investimentos.

## HTTP

- `GET/POST /accounts`, `PATCH/DELETE /accounts/{id}`;
- `GET/POST /categories`, `PATCH/DELETE /categories/{id}`;
- `GET/POST /transactions`, `GET/PATCH/DELETE /transactions/{id}`;
- `POST /transactions/{id}/restore`, `/confirm`, `/settle`, `/revert-status`;
- `POST /transfers`;
- `GET /reports/monthly-summary?month=YYYY-MM`.

Criações exigem `Idempotency-Key`; mutações versionadas exigem `expectedVersion`. Listagens usam cursor e limites explícitos.

## Aceite

Com saldo inicial de R$ 2.000, salário liquidado de R$ 5.000 e despesa liquidada de R$ 300, o saldo atual é R$ 6.700. Uma compra de R$ 600 no cartão aumenta a fatura sem reduzir esse saldo; o pagamento liquidado da fatura reduz o saldo para R$ 6.100, sem duplicar a despesa no resultado detalhado.

## Testes adicionais após a migration

- cálculo integrado de saldo com salário, despesa, transferência e fatura;
- data-base e timezone do workspace;
- lançamentos futuros liquidados, confirmados e planejados;
- pagamento parcial de fatura e projeção do restante;
- isolamento entre contas e workspaces;
- plano de execução com volume representativo.

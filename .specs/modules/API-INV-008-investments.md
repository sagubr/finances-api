# API-INV-008 — Investimentos

Status: implementada parcialmente  
Onda: 3  
Dependências: API-TX-001, API-MD-007

## Objetivo

Registrar ordens e renda fixa, reconstruir posições, controlar proventos, alocação e projeções sem usar ponto flutuante.

## Modelo

`accounts` é a única fonte de identidade, nome, tipo, moeda, saldo e ciclo de vida das contas. Investimentos podem usar qualquer conta ativa; não existe cadastro ou listagem paralela de conta no módulo patrimonial. `investment_orders` e `position_projections` referenciam diretamente `accounts`. Os demais agregados são `realized_results`, `dividends`, `fixed_income_holdings`, `allocation_plans`, `allocation_targets` e `growth_plans`. Ordens são fonte da verdade; posições são derivadas e versionadas.

## Invariantes

- quantidade, preço e taxas usam decimal exato com escala definida;
- contas são criadas e mantidas pelo módulo TX, sem categoria exclusiva para investimentos;
- ordens e posições podem usar qualquer conta ativa do mesmo workspace e na mesma moeda do instrumento;
- preço médio é ponderado por compras; venda não muda custo unitário remanescente;
- venda acima da posição é recusada na V1;
- lucro realizado inclui taxas conforme alocação definida;
- edição/exclusão de ordem dispara reconstrução desde a data afetada;
- vínculo com TX é 1:1 quando representa o mesmo fluxo e nunca duplica valor;
- alvo ativo soma exatamente 10.000 pontos-base;
- rebalanceamento padrão sugere apenas compras;
- projeção recebe taxa, aporte e data explícitos e é identificada como simulação;
- cotação traz frescor e moeda; conversão requer taxa correspondente.

## HTTP

CRUD/comandos em `/investments/orders`, `/dividends`, `/fixed-income`, `/allocation-plans`, `/growth-plans`; leitura `/investments/positions`, `/investments/allocation`, `/investments/rebalance-suggestion`, `/growth-plans/{id}/projection`. Contas são consultadas exclusivamente pelo recurso geral `/accounts`; não existe `/investments/accounts`.

## Eventos e reconciliação

Publica `OrderRecorded.v1` e `PositionsRecalculated.v1`; consome quotes apenas para valor de mercado. Job reconstrói posição e compara com projeção persistida.

## Testes e aceite

Sequências manuais de compra/venda, frações, taxas, edição histórica, evento duplicado, quote stale, câmbio ausente e propriedade de reconstrução. Aceite: conjunto de referência produz quantidade, custo, preço médio e lucro exatamente esperados.

## Questões abertas

- métodos fiscais e tratamento de desdobramento/grupamento;
- aluguel, short, opções e fundos sem cotação;
- marcação de renda fixa e impostos;
- moeda base e fonte de câmbio.

# API-PAY-010 — Calculadoras Trabalhistas

Status: proposta condicionada à validação especializada  
Onda: 4  
Dependências: API-PLAT-000; publicação usa API-ADM-016

## Objetivo

Simular salário, FGTS e rescisão com tabelas versionadas, memória de cálculo e aviso explícito de estimativa.

## Modelo

Globais: `calculation_rule_sets`, `tax_tables`, `tax_brackets`, `legal_sources`, `rule_set_approvals`. Tenant: `payroll_simulations`, `severance_simulations`.

## Regras

- regra é escolhida pela data de referência e versão publicada;
- faixas são contíguas, crescentes e sem sobreposição;
- método vem do rule set, mas código executável arbitrário no banco é proibido;
- valores e arredondamentos intermediários são persistidos na memória de cálculo;
- toda resposta informa versão, vigência, fonte, data de cálculo e disclaimer;
- ausência ou ambiguidade de tabela retorna erro, nunca fallback silencioso;
- simulação salva é imutável; nova execução cria revisão;
- dados de remuneração não entram em telemetria.

## HTTP

`POST /payroll/net-salary`, `/payroll/fgts-projection`, `/payroll/severance`; `GET /payroll/simulations`, `GET /payroll/simulations/{id}`.

## Segurança e validação

Publicação exige aprovação dupla em ADM. Fixtures oficiais têm fonte e conferência humana registrada. A spec de cálculo detalhada por legislação é obrigatória antes da implementação de cada calculadora.

## Testes e aceite

Limites de faixa, arredondamento half-up, competências, versão histórica e casos oficiais. Aceite só ocorre após responsável qualificado aprovar resultados ao centavo.

## Questões bloqueantes

Escopo legal inicial, fontes oficiais, responsável por aprovação, periodicidade de atualização e política de disclaimer.

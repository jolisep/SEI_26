# Run guide

Este ficheiro descreve como instalar, testar, executar as experiências e
regenerar os resultados do projecto sem intervenção adicional.

## Estrutura

O projecto executável está em
[`playwright-ai-sample/`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample>).
O diagrama da arquitectura está em
[`playwright-ai-architecture.puml`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-architecture.puml>).

Componentes principais:

| Componente | Localização | Responsabilidade |
|---|---|---|
| Definição dos testes | [`tests/data/test-suite.json`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/tests/data/test-suite.json>) | Testes, passos, acções e estratégias |
| Leitor/validação JSON | [`src/readers/json-test-suite-reader.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/src/readers/json-test-suite-reader.ts>) | Lê e valida a definição |
| Orquestração | [`src/engine/adaptive-test-runner.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/src/engine/adaptive-test-runner.ts>) | Executa os testes e acções |
| Selecção/fallback | [`src/adapters/playwright-action-adapter.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/src/adapters/playwright-action-adapter.ts>) | Ordena locators por confiança e faz fallback |
| Confidence store | [`src/learning/confidence-store.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/src/learning/confidence-store.ts>) | Persiste `s`/`n` e actualiza a confiança |
| Adapters/factory | [`src/factories/action-adapter-factory.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/src/factories/action-adapter-factory.ts>) | Mapeia `click`, `fill`, `assertText` e `wait` |
| Recovery | [`src/recovery/recovery-manager.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/src/recovery/recovery-manager.ts>) | Retry, reload e captura de evidência |
| Logging | [`src/logging/structured-event-logger.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/src/logging/structured-event-logger.ts>) | Eventos estruturados |
| Aplicação sob teste | [`demo/index.html`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/demo/index.html>) | Checkout local |
| Servidor/mutações | [`demo/server.mjs`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/demo/server.mjs>) | Serve a aplicação e aplica `M01`–`M12` |
| Vanilla | [`tests/vanilla-checkout.spec.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/tests/vanilla-checkout.spec.ts>) | Baseline com locators `role` |
| Adaptativo | [`tests/adaptive-checkout.spec.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/tests/adaptive-checkout.spec.ts>) | Execução JSON-driven com fallback/aprendizagem |
| Métricas | [`tests/shared/evaluation-metrics.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/tests/shared/evaluation-metrics.ts>) | Extrai métricas por acção e run |
| Agregação | [`evaluation/aggregate-results.mjs`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/aggregate-results.mjs>) | Gera CSV/JSON resumidos |
| Gráficos | [`evaluation/generate-charts.mjs`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/generate-charts.mjs>) | Gera SVGs |
| Catálogo de mutações | [`evaluation/mutations.json`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/mutations.json>) | Mutações cosméticas e semânticas |

## Pré-requisitos

- Node.js 20 ou superior.
- PowerShell no Windows.
- Chromium do Playwright instalado no ambiente local.

## Instalação

```powershell
Set-Location "$userPathToProjectFolder\playwright-ai-sample"
npm install
npx playwright install chromium
```

## Testes normais

Executar todos os testes:

```powershell
npm test
```

Executar apenas uma versão:

```powershell
npm test -- --project=vanilla
npm test -- --project=adaptive
npm test -- --project=unit
```

Os testes unitários do `ConfidenceStore` estão em
[`tests/confidence-store.spec.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/tests/confidence-store.spec.ts>).
Os testes de Recovery estão em
[`tests/recovery.spec.ts`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/tests/recovery.spec.ts>).

Para executar com browser visível:

```powershell
npm run test:headed
```

Para usar a UI do Playwright:

```powershell
npm run test:ui
```

## Executar a aplicação manualmente

```powershell
npm run demo
```

Abrir `http://127.0.0.1:4173/`. Uma mutação pode ser seleccionada, por
exemplo, em `http://127.0.0.1:4173/?mutation=M01`.

O servidor usa a porta `4173`. Se aparecer `EADDRINUSE`, fechar o processo que
está a usar essa porta ou terminar a execução Playwright anterior antes de
iniciar outro servidor.

## Experiências

Todas as experiências são controladas por
[`evaluation/run-experiment.mjs`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/run-experiment.mjs>).
Por omissão são usadas 10 repetições. Para uma execução completa e limpa:

```powershell
$env:EXPERIMENT_REPETITIONS = '10'
$env:EVALUATION_CLEAN = 'true'
npm run evaluation:e1
Remove-Item Env:\EXPERIMENT_REPETITIONS
Remove-Item Env:\EVALUATION_CLEAN
```

Cada experiência remove automaticamente os ficheiros `confidence-store-*` no
início, antes do primeiro run. Isto garante que o run 1 começa com os priors
definidos no `test-suite.json`, mesmo que exista um store de uma execução
anterior. `EVALUATION_CLEAN=true` continua a ser necessário apenas quando se
pretende também apagar os resultados individuais anteriores.

Modos disponíveis:

```powershell
npm run evaluation:e1 # vanilla vs adaptive, M01-M12; store separado por mutação
npm run evaluation:e2 # adaptive fixed vs learning, M01
npm run evaluation:e3 # learning persistente ao longo dos runs, M01
```

E1 compara a baseline vanilla com a execução adaptativa. E2 compara
aprendizagem desligada e ligada. E3 mantém o store entre runs para observar a
evolução de `s`, `n` e da confiança.

Para executar uma experiência mais curta:

```powershell
$env:EXPERIMENT_REPETITIONS = '1'
$env:EVALUATION_CLEAN = 'true'
npm run evaluation:e1
Remove-Item Env:\EXPERIMENT_REPETITIONS
Remove-Item Env:\EVALUATION_CLEAN
```

Os resultados individuais ficam em
[`evaluation/results/runs/`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/results/runs>).
Os stores persistidos ficam em
[`evaluation/results/`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/results>).

## Agregar resultados

Depois de executar uma experiência:

```powershell
npm run evaluation:aggregate
```

São gerados:

- `evaluation/results/raw.csv`: uma linha por acção e run;
- `evaluation/results/summary.csv`: resumo por experiência, versão, variante e mutação;
- `evaluation/results/summary.json`: os resultados completos em JSON.

O resumo inclui, entre outras, as métricas `distinctLocatorsBroken`,
`failedRuns`, `recoveryChanges`, `fallbackRate`,
`nonPrimaryResolvedActions` e os tempos emparelhados. Os tempos emparelhados
consideram apenas runs em que vanilla e adaptive passaram.

## Gerar gráficos

```powershell
npm run evaluation:charts
```

Os SVGs são escritos em
[`evaluation/charts/`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/charts>):

- `success-rate.svg`;
- `strategy-usage.svg`;
- `confidence-evolution.svg`.

No gráfico `strategy-usage.svg`, cada estratégia é separada em:

- `direct`: a estratégia final foi seleccionada na primeira tentativa;
- `fallback`: a estratégia final foi seleccionada depois de pelo menos uma
  estratégia anterior ter falhado.

As cores identificam o tipo de locator. A tonalidade identifica o caminho:
as barras escuras/sólidas são selecções directas e as barras
claras/semitransparentes são fallbacks. O valor numérico de cada contagem é
apresentado por cima da barra.

O gráfico de confiança usa actualmente os resultados da E3 para M01 e agrega
`confidenceAfter` por run e por estratégia final. Não representa uma única
acção individual.

## Alterar testes e mutações

- Para alterar o fluxo, editar
  [`tests/data/test-suite.json`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/tests/data/test-suite.json>).
- Para adicionar uma mutação, adicionar a descrição/categoria em
  [`evaluation/mutations.json`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/evaluation/mutations.json>)
  e a transformação correspondente em
  [`demo/server.mjs`](<C:/Users/jpopa/Desktop/Simpósio Engenharia Informática/playwright-ai-sample/demo/server.mjs>).
- M11 e M12 são mutações semânticas: alteram o resultado observável do
  carrinho e da submissão da encomenda.
- As prioridades iniciais estão no JSON: `role=0.9`, `testId=0.85`,
  `css=0.6`, `xpath=0.4`.
- O `ConfidenceStore` usa `alpha=0.2` por omissão e a actualização
  `s' = (1 - alpha) * s + alpha * observation`.

## Resultados e limpeza

Relatórios Playwright ficam em `playwright-report/`; artefactos de falhas e
screenshots ficam em `test-results/` ou nos directórios de output configurados.
Os resultados da avaliação são deliberadamente mantidos para poderem ser
agregados depois.

Para limpar apenas resultados gerados pela avaliação, usar:

```powershell
$env:EVALUATION_CLEAN = 'true'
$env:EXPERIMENT_REPETITIONS = '1'
npm run evaluation:e1
Remove-Item Env:\EVALUATION_CLEAN
Remove-Item Env:\EXPERIMENT_REPETITIONS
```

Esta limpeza ocorre no início de uma nova experiência e remove os JSON gerados
em `evaluation/results/runs/` e os confidence stores `e1`/`e2`/`e3`; não apaga
o código-fonte.

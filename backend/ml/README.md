# Machine-learning advisory core

The ML package is an optional, read-only advice layer. It does not parse source
or determine diagnostics, generate TAC, optimize TAC, or change `/compile`
results. The lexer, parser, semantic analyzer, TAC generator, and optimizer
remain deterministic and authoritative.

## Generate and train

From the `backend/` directory:

```powershell
python -m ml.generate_dataset
python -m ml.train
```

The fixed seed (`42`) makes dataset generation, held-out splits, and training
reproducible. `generate_dataset.py` mutates valid mini-C source programs, runs
each error sample through the real lexer/parser/semantic pipeline, and keeps
only samples whose resulting diagnostic matches one of seven categories. The
optimization dataset consists of valid programs passed through the real parser,
semantic analyzer, TAC generator, and optimizer; the target is the observed
difference between original and optimized TAC instruction counts.

Generated files:

- `data/errors.csv`: diagnostic text, compiler phase, message, category, and
  mutated source.
- `data/optimization.csv`: seven features, source, TAC, optimized TAC, and
  measured instruction reduction.
- `models/`: the TF-IDF/logistic-regression error classifier, random-forest
  optimization classifier and regressor, and held-out metrics.

## Feature engineering and evaluation

Model A classifies compiler diagnostics using TF-IDF unigrams/bigrams over the
compiler phase and the exact diagnostic message. It uses a stratified 80/20
split and logistic regression. Model B uses the following features computed
from compiler output/source: TAC instruction count, constant-operation count,
unused assignments, constant branches, loops, function calls, and maximum
brace nesting depth. A random-forest classifier predicts whether optimizer
reductions occur; a random-forest regressor estimates the reduction count.
`models/metrics.json` records held-out classification accuracy and regressor
mean absolute error.

## Runtime behavior and limitations

`MLAdvisor` loads model artifacts once when the API starts. If artifacts are
not present or cannot be loaded, the API continues with deterministic
rule-based advice and `/ml/status` reports the unavailable models. Predictions
are advisory, are never applied to code, and never alter compiler output.
Training examples are generated from this project's deliberately limited
mini-C grammar; reported accuracy is not evidence of generalization to C/C++,
other compilers, or arbitrary diagnostics.

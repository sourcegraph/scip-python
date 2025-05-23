#!/bin/bash
#source ~/Projects/scip-python/.venv/bin/activate
#cd ~/Projects/source_code_analysis_llm/example_projects/23
#node ~/Projects/scip-python/packages/pyright-scip/index.js index .


source ~/Projects/scip-python/.venv/bin/activate
cd ~/Projects/source_code_analysis_llm/example_projects/23
cat requirements.txt | xargs -n 1 pip install

node ~/Projects/scip-python/packages/pyright-scip/index.js index .

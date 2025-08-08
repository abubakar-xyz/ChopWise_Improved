#!/usr/bin/env bash
set -o errexit

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Optionally prepare artifacts so first request is fast
python train_model.py || echo "Skipping training (model already present)."

echo "Build step complete. Start command should run: uvicorn main:app --host 0.0.0.0 --port $PORT"
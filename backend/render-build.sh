#!/bin/bash

# Exit on error
set -o errexit

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Create a local cache directory for pip
mkdir -p .pip_cache

# Install dependencies using the local cache
pip install --cache-dir .pip_cache -r requirements.txt

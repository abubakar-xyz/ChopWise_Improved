#!/bin/bash

# Exit on error
set -o errexit

# Set environment variables for local caching
export PIP_CACHE_DIR=$(pwd)/.pip_cache
export CARGO_HOME=$(pwd)/.cargo_cache

# Create cache directories
mkdir -p $PIP_CACHE_DIR
mkdir -p $CARGO_HOME

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

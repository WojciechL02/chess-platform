#!/bin/bash
set -e

echo "Starting application..."
fastapi run app/main.py --port 8000

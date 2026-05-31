#!/bin/bash
set -e

# Start the application
echo "Starting application..."
fastapi run app/main.py --port 8000

#!/bin/bash
set -e

# Run migrations
echo "Running migrations..."
alembic upgrade head

# Start the application
echo "Starting application..."
fastapi run app/main.py --port 8000

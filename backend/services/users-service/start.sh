#!/bin/bash
set -e

# Run migrations
if compgen -G "alembic/versions/*.py" > /dev/null; then
  echo "Running migrations..."
  PYTHONPATH="$(pwd)" alembic upgrade head
else
  echo "No migration scripts in alembic/versions, skipping."
fi

# Start the application
echo "Starting application..."
fastapi run app/main.py --port 8000

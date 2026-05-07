FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY common ./common
COPY services/users-service ./services/users-service

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app

WORKDIR /app/services/users-service
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

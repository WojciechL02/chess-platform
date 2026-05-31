# Use a Python base image
FROM python:3.13-slim-bookworm

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uv/bin/uv

# Set working directory
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy only the files needed for installing dependencies
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN /uv/bin/uv sync --frozen --no-install-project --no-dev

# Copy the common directory and the service itself
COPY common ./common
COPY services/api-gateway ./services/api-gateway

# Set the working directory to the service
WORKDIR /app/services/api-gateway

# Use the virtual environment created by uv
ENV PATH="/app/.venv/bin:$PATH"

# Copy start script
COPY services/api-gateway/start.sh ./start.sh
RUN chmod +x ./start.sh

# Run the start script
CMD ["./start.sh"]

# The Surveilled API for production. Built on the server itself (an Arm VM), so it needs no
# cross-architecture build. Settings come from the environment (deploy/compose.yaml passes the
# server's backend.env); nothing secret is baked into the image.
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.9.24 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first, so a code-only change reuses this layer.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY app ./app

RUN useradd --system --no-create-home surveilled
USER surveilled

EXPOSE 8000

# One worker on purpose: runs live in this process's memory, so a second worker would have its
# own, separate set of runs.
CMD ["/app/.venv/bin/fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

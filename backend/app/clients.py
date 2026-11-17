"""External clients, created in one place so every call site gets the same configuration.

Supabase is reached through its REST API (PostgREST) with the project's secret key. That key
bypasses row level security, so it is only ever used here on the server, and every rule about who
may write what is enforced by the service calling it.
"""

from functools import lru_cache

import httpx

from app.config import ConfigurationError, get_settings

_SUPABASE_TIMEOUT = httpx.Timeout(5.0)


@lru_cache
def get_supabase_rest() -> httpx.Client:
    """A client for the Supabase project's REST API, authorised with the secret key."""
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_secret_key is None:
        raise ConfigurationError(
            "Set SURVEILLED_SUPABASE_URL and SURVEILLED_SUPABASE_SECRET_KEY in the environment "
            "or backend/.env. See backend/.env.example."
        )
    base_url = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
    headers = supabase_headers(settings.supabase_secret_key.get_secret_value())
    return httpx.Client(base_url=base_url, headers=headers, timeout=_SUPABASE_TIMEOUT)


def supabase_headers(key: str) -> dict[str, str]:
    """Auth headers for a Supabase key. New secret keys (sb_secret_...) go in `apikey` only;
    legacy service_role keys are JWTs and also go in `Authorization`."""
    headers = {"apikey": key}
    if not key.startswith("sb_"):
        headers["Authorization"] = f"Bearer {key}"
    return headers

from app.clients import supabase_headers


def test_new_secret_keys_go_in_the_apikey_header_only() -> None:
    assert supabase_headers("sb_secret_abc") == {"apikey": "sb_secret_abc"}


def test_legacy_service_role_keys_also_authorise_as_a_bearer_token() -> None:
    assert supabase_headers("eyJhbGciOi.x.y") == {
        "apikey": "eyJhbGciOi.x.y",
        "Authorization": "Bearer eyJhbGciOi.x.y",
    }

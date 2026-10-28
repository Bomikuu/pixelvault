from urllib.parse import quote, urlparse

import httpx


class PixelflowError(Exception):
    def __init__(self, message, code="REQUEST_FAILED", status=0, request_id=""):
        self.code, self.status, self.request_id = code, status, request_id
        super().__init__(message)


class Pixelflow:
    def __init__(self, base_url, api_key, timeout=20):
        url = urlparse(base_url)
        if url.scheme != "https" and not (
            url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1", "::1"}
        ):
            raise ValueError("Use HTTPS, or localhost for development.")
        if url.username or url.password or not api_key or not 0.1 <= timeout <= 30:
            raise ValueError("Invalid client configuration.")
        self.base_url, self._key, self.timeout = base_url.rstrip("/"), api_key, timeout

    def _request(self, method, path, payload=None, idempotency_key=None, params=None):
        if method != "GET" and not idempotency_key:
            raise ValueError("An idempotency key is required.")
        headers = {"Authorization": "Bearer " + self._key, "Content-Type": "application/json"}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        try:
            with httpx.Client(
                timeout=self.timeout, follow_redirects=False, trust_env=False
            ) as client:
                response = client.request(
                    method, self.base_url + path, json=payload, params=params, headers=headers
                )
        except httpx.HTTPError:
            raise PixelflowError(
                "The request outcome is unknown. Preserve the original request key.",
                "NETWORK_ERROR",
            ) from None
        if response.status_code == 204:
            return None
        try:
            data = response.json()
        except ValueError:
            raise PixelflowError(
                "The server returned an unreadable response.",
                "INVALID_RESPONSE",
                response.status_code,
            ) from None
        if not response.is_success:
            error = data.get("error", {}) if isinstance(data, dict) else {}
            raise PixelflowError(
                error.get("message", "The request was rejected."),
                error.get("code", "REQUEST_FAILED"),
                response.status_code,
                error.get("request_id", ""),
            )
        return data

    def create_quote(self, payload, idempotency_key):
        return self._request("POST", "/checkout-quotes", payload, idempotency_key)

    def start_quote(self, quote_id, idempotency_key):
        return self._request(
            "POST",
            f"/checkout-quotes/{quote(str(quote_id), safe='')}/checkout-sessions",
            {},
            idempotency_key,
        )

    def create_embed_grant(self, payment_id, origin, idempotency_key):
        return self._request(
            "POST",
            f"/payments/{quote(str(payment_id), safe='')}/embed-grants",
            {"origin": origin},
            idempotency_key,
        )

    def create_checkout(self, payload, idempotency_key):
        return self._request("POST", "/checkout-sessions", payload, idempotency_key)

    def get_analytics(self, **filters):
        return self._request("GET", "/analytics", params=filters)

    def get_payment(self, payment_id):
        return self._request("GET", "/payments/" + quote(str(payment_id), safe=""))

    def list_payments(self, **filters):
        return self._request("GET", "/payments", params=filters)

    def request_refund(self, payment_id, amount, reason, idempotency_key):
        return self._request(
            "POST",
            "/payments/" + quote(str(payment_id), safe="") + "/refunds",
            {"amount": amount, "reason": reason},
            idempotency_key,
        )

    def record_cash_collection(self, payment_id, payload, idempotency_key):
        return self._request(
            "POST",
            "/payments/" + quote(str(payment_id), safe="") + "/cash-collections",
            payload,
            idempotency_key,
        )

    def reconcile_payment(self, payment_id, idempotency_key, **references):
        return self._request(
            "POST",
            "/payments/" + quote(str(payment_id), safe="") + "/reconcile",
            references,
            idempotency_key,
        )

    def cancel_checkout(self, payment_id, idempotency_key):
        return self._request(
            "POST", "/payments/" + quote(str(payment_id), safe="") + "/cancel", {}, idempotency_key
        )

    def list_events(self, **filters):
        return self._request("GET", "/events", params=filters)

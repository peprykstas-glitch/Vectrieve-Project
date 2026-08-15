"""
rate_limiter.py — singleton slowapi Limiter instance.

Extracted to its own module to avoid circular imports between main.py
(which wires up the app) and endpoint modules (which need the limiter).

Usage in endpoints:
    from core.rate_limiter import limiter

Usage in main.py:
    from core.rate_limiter import limiter
    app.state.limiter = limiter
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

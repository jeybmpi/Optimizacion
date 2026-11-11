"""Servidor local para la API (equivale a la función de Vercel). Uso:  python dev_server.py"""
import os
import sys
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "api"))
from solve import handler  # noqa: E402

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"API en http://127.0.0.1:{port}/api/solve")
    ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()

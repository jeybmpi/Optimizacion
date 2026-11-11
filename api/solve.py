"""Función serverless de Vercel (Python):  POST /api/solve

Body JSON:
  { "sense": "max"|"min",
    "c": ["50", "80"],
    "constraints": [ {"a": ["2","1"], "op": "<=", "b": "100"}, ... ],
    "with_steps": true,
    "method": "bigm" | "revised" }
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _solver import solve_problem  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length > 200_000:
                return self._send(413, {"status": "invalid", "errors": ["El problema es demasiado grande."]})
            raw = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._send(400, {"status": "invalid", "errors": ["El cuerpo no es un JSON válido."]})
        ok = isinstance(raw, dict)
        with_steps = bool(raw.get("with_steps", True)) if ok else True
        method = raw.get("method", "bigm") if ok else "bigm"
        self._send(200, solve_problem(raw, with_steps=with_steps, method=method))

    def do_GET(self):
        self._send(200, {"ok": True, "service": "lp-solver", "method": "gran_m"})

"""Local preview server with caching turned off, so every edit shows on reload.

    python serve.py          # http://127.0.0.1:5173
    python serve.py 8080     # any other port
"""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
    print(f"Serving Leno Instrument at http://127.0.0.1:{port}")
    server.serve_forever()

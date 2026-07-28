#!/usr/bin/env python3
"""
Standalone Frontend Server — Runs the frontend directory on FRONTEND_PORT specified in .env.
Usage: python3 serve_frontend.py
"""

from pathlib import Path
import os
import http.server
import socketserver
from dotenv import load_dotenv

# Load .env
root_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=root_dir / ".env")

frontend_port = int(os.getenv("FRONTEND_PORT", "3000"))
frontend_dir = root_dir / "frontend"

os.chdir(frontend_dir)


class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for local development
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


with socketserver.TCPServer(("", frontend_port), CustomHTTPRequestHandler) as httpd:
    print(f"🌐 SonRup Frontend running at: http://localhost:{frontend_port}")
    print(f"   Serving static files from: {frontend_dir}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped.")

#!/usr/bin/env python3
"""
SonRup Full-Stack Launcher — Self-contained script that starts both backend API and frontend servers simultaneously.
Automatically detects and utilizes the local Python virtual environment (.venv).
Usage: python3 main.py
"""

import os
import sys
import time
import http.server
import socketserver
import threading
import subprocess
from pathlib import Path

root_dir = Path(__file__).resolve().parent
venv_python = root_dir / ".venv" / "bin" / "python3"

# Automatically re-run using virtual environment Python if present and not already active
if venv_python.is_file() and os.path.realpath(sys.executable) != os.path.realpath(str(venv_python)):
    os.execv(str(venv_python), [str(venv_python)] + sys.argv)

from dotenv import load_dotenv
load_dotenv(dotenv_path=root_dir / ".env")


def run_frontend_thread(port: int):
    """Background daemon thread to serve the static frontend UI files."""
    frontend_dir = root_dir / "frontend"
    os.chdir(frontend_dir)

    class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # Disable caching for seamless local development
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            super().end_headers()

        def log_message(self, format, *args):
            # Format static server log messages cleanly
            sys.stdout.write(f"🌐 [Frontend UI] {self.address_string()} - - [{self.log_date_time_string()}] {format % args}\n")

    with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
        print(f"🌐 [Frontend UI] Serving interface at: http://localhost:{port}")
        try:
            httpd.serve_forever()
        except Exception:
            pass


if __name__ == "__main__":
    backend_port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8030")))
    frontend_port = int(os.getenv("FRONTEND_PORT", "3000"))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "false").lower() == "true"

    print("=" * 66)
    print("🌟   STARTING SONRUP FULL-STACK WEB APPLICATION   🌟")
    print("=" * 66)
    print(f"🔗 Backend API Server Port : {backend_port}  (http://localhost:{backend_port})")
    print(f"🔗 Frontend UI Server Port : {frontend_port}  (http://localhost:{frontend_port})")
    print(f"📦 Python Runtime          : {sys.executable}")
    print("=" * 66)

    backend_proc = None

    try:
        # Launch frontend UI server in a background daemon thread
        print("\n[1/2] Launching Frontend static UI server...")
        ui_thread = threading.Thread(target=run_frontend_thread, args=(frontend_port,), daemon=True)
        ui_thread.start()

        # Brief pause for UI startup logs before booting Uvicorn subprocess
        time.sleep(0.5)

        # Launch backend FastAPI server as a system subprocess (prevents Uvicorn reloader Errno 9 bad fd bugs)
        print("[2/2] Launching Backend API server via Uvicorn...")
        backend_dir = root_dir / "backend"
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", host, "--port", str(backend_port)]
        if debug:
            cmd.append("--reload")

        backend_proc = subprocess.Popen(cmd, cwd=str(backend_dir))

        print(f"\n✅ Both servers are LIVE! Open your browser at: http://localhost:{frontend_port}")
        print("💡 Press Ctrl+C at any time to shut down both servers.\n")

        # Monitor backend process health
        while True:
            ret = backend_proc.poll()
            if ret is not None:
                print(f"\n⚠️ Backend API server exited unexpectedly (exit code: {ret}).")
                break
            time.sleep(0.5)

    except (KeyboardInterrupt, SystemExit):
        print("\n\n🛑 Shutting down SonRup application servers...")
    finally:
        if backend_proc and backend_proc.poll() is None:
            print(f"   Terminating Backend API server (PID {backend_proc.pid})...")
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                backend_proc.kill()
        print("✅ All servers cleanly stopped. Goodbye!")
        sys.exit(0)

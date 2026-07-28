#!/usr/bin/env python3
"""
SonRup Full-Stack Launcher — Self-contained script that starts both backend API and frontend servers simultaneously.
Automatically detects and utilizes the local Python virtual environment.
Usage: python3 main.py
"""

import os
import sys
import time
import http.server
import socketserver
import multiprocessing
from pathlib import Path

root_dir = Path(__file__).resolve().parent
venv_python = root_dir / ".venv" / "bin" / "python3"

# Automatically re-run using virtual environment Python if present and not already active
if venv_python.is_file() and os.path.realpath(sys.executable) != os.path.realpath(str(venv_python)):
    os.execv(str(venv_python), [str(venv_python)] + sys.argv)

from dotenv import load_dotenv

load_dotenv(dotenv_path=root_dir / ".env")


def run_backend(host: str, port: int, debug: bool):
    """Worker process to run the FastAPI backend via Uvicorn."""
    import uvicorn

    backend_dir = root_dir / "backend"
    os.chdir(backend_dir)
    sys.path.insert(0, str(backend_dir))

    print(f"🚀 [Backend API] Starting on http://localhost:{port}")
    print(f"📖 [OpenAPI Docs] Interactive documentation: http://localhost:{port}/api/docs")
    uvicorn.run("main:app", host=host, port=port, reload=debug)


def run_frontend(port: int):
    """Worker process to serve the static frontend UI files."""
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
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    # Windows/macOS multiprocessing freeze_support
    multiprocessing.freeze_support()

    backend_port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8010")))
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

    processes = []

    try:
        # Launch backend worker process
        backend_proc = multiprocessing.Process(
            target=run_backend, args=(host, backend_port, debug), name="Backend-Server"
        )
        backend_proc.start()
        processes.append(("Backend API", backend_proc))

        # Brief delay to allow initial backend startup logs before UI server output
        time.sleep(1.5)

        # Launch frontend worker process
        frontend_proc = multiprocessing.Process(
            target=run_frontend, args=(frontend_port,), name="Frontend-Server"
        )
        frontend_proc.start()
        processes.append(("Frontend UI", frontend_proc))

        print(f"\n✅ Both servers are LIVE! Open your browser at: http://localhost:{frontend_port}")
        print("💡 Press Ctrl+C at any time to shut down both servers.\n")

        # Monitor child worker health
        while True:
            for name, proc in processes:
                if not proc.is_alive():
                    print(f"\n⚠️ {name} server exited unexpectedly (exit code: {proc.exitcode}).")
                    raise KeyboardInterrupt
            time.sleep(0.5)

    except (KeyboardInterrupt, SystemExit):
        print("\n\n🛑 Shutting down SonRup application servers...")
        for name, proc in processes:
            if proc.is_alive():
                print(f"   Terminating {name} server (PID {proc.pid})...")
                proc.terminate()
                proc.join(timeout=3)
                if proc.is_alive():
                    proc.kill()
        print("✅ All servers cleanly stopped. Goodbye!")
        sys.exit(0)

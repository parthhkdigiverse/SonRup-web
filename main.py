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
        def do_GET(self):
            url_path = self.path.split('?')[0].split('#')[0]
            query_and_hash = self.path[len(url_path):]

            # Redirect explicit .html requests to clean extensionless URLs (e.g. /shop.html -> /shop)
            if url_path.endswith('.html'):
                clean_name = url_path[:-5]
                if clean_name == '/index':
                    clean_name = '/'
                new_location = f"{clean_name}{query_and_hash}" if clean_name else f"/{query_and_hash}"
                self.send_response(301)
                self.send_header('Location', new_location)
                self.end_headers()
                return

            # Resolve clean URLs to .html files on disk internally
            if url_path != '/' and not url_path.endswith('/') and '.' not in url_path.split('/')[-1]:
                potential_name = f"{url_path.lstrip('/')}.html"
                if (frontend_dir / potential_name).is_file():
                    self.path = f"/{potential_name}{query_and_hash}"

            super().do_GET()

        def do_HEAD(self):
            url_path = self.path.split('?')[0].split('#')[0]
            query_and_hash = self.path[len(url_path):]

            if url_path.endswith('.html'):
                clean_name = url_path[:-5]
                if clean_name == '/index':
                    clean_name = '/'
                new_location = f"{clean_name}{query_and_hash}" if clean_name else f"/{query_and_hash}"
                self.send_response(301)
                self.send_header('Location', new_location)
                self.end_headers()
                return

            if url_path != '/' and not url_path.endswith('/') and '.' not in url_path.split('/')[-1]:
                potential_name = f"{url_path.lstrip('/')}.html"
                if (frontend_dir / potential_name).is_file():
                    self.path = f"/{potential_name}{query_and_hash}"

            super().do_HEAD()

        def end_headers(self):
            # Disable caching for seamless local development
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            super().end_headers()

        def log_message(self, format, *args):
            # Format static server log messages cleanly
            sys.stdout.write(f"🌐 [Frontend UI] {self.address_string()} - - [{self.log_date_time_string()}] {format % args}\n")

    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    try:
        with ReusableTCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"🌐 [Frontend UI] Serving interface at: http://localhost:{port}")
            httpd.serve_forever()
    except Exception as e:
        print(f"\n❌ [Frontend UI] Could not bind to port {port}: {e}")
        print(f"💡 Try running: lsof -ti :{port} | xargs kill -9\n")


def check_port_availability(port: int, name: str):
    """Check if a designated server port is occupied and raise an informative error without killing existing processes."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        if s.connect_ex(("localhost", port)) == 0 or s.connect_ex(("127.0.0.1", port)) == 0:
            print(f"\n❌ [Error] Port {port} ({name}) is currently in use by another running application.")
            print(f"💡 To check what is running on port {port}, run: lsof -i :{port}")
            print(f"💡 To manually stop the process if desired, run: lsof -ti :{port} | xargs kill -9\n")
            sys.exit(1)


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

    # Check that development ports are free before attempting to launch servers
    check_port_availability(frontend_port, "Frontend UI")
    check_port_availability(backend_port, "Backend API")

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

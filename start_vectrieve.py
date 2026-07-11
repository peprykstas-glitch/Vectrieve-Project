import sys
import os
import subprocess
import threading
import time
import webbrowser
import signal

# ANSI Color codes
GREEN = "\033[92m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"

processes = []
shutting_down = False

def log(tag, message, color=RESET):
    print(f"{color}[{tag}] {message}{RESET}")

def read_output(pipe, tag, color):
    try:
        for line in iter(pipe.readline, ''):
            if shutting_down:
                break
            clean_line = line.strip()
            if clean_line:
                print(f"{color}[{tag}]{RESET} {clean_line}")
    except Exception:
        pass

def start_process(cmd, cwd, tag, color):
    log("SYSTEM", f"Starting {tag}...", YELLOW)
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True
    )
    processes.append(proc)
    t = threading.Thread(target=read_output, args=(proc.stdout, tag, color), daemon=True)
    t.start()
    return proc

def cleanup(signum=None, frame=None):
    global shutting_down
    if shutting_down:
        return
    shutting_down = True
    print("\n")
    log("SYSTEM", "Shutting down all services...", RED + BOLD)
    
    # Terminate all processes we spawned (using process tree kill on Windows)
    for proc in processes:
        try:
            subprocess.run(f"taskkill /T /F /PID {proc.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            try:
                proc.terminate()
            except Exception:
                pass
                
    # Shutdown Docker compose databases
    log("SYSTEM", "Stopping Docker databases...", RED)
    subprocess.run("docker compose down", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    log("SYSTEM", "Vectrieve stopped. Goodbye!", GREEN + BOLD)
    sys.exit(0)

# Register signals for clean exit
signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    # Enable ANSI escape sequences on Windows console
    if os.name == 'nt':
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)

    os.system("cls" if os.name == "nt" else "clear")
    print(BOLD + GREEN + """
========================================================
  V E C T R I E V E   A I   -   S Y S T E M   L A U N C H E R
========================================================
""" + RESET)

    # 1. Start Qdrant & Postgres (Docker)
    log("SYSTEM", "Spinning up Qdrant & Postgres databases in Docker...", YELLOW)
    docker_res = subprocess.run("docker compose up -d", shell=True)
    if docker_res.returncode != 0:
        log("SYSTEM", "Warning: docker compose up failed. Make sure Docker is running.", RED)
    else:
        log("SYSTEM", "Docker databases started successfully.", GREEN)

    time.sleep(2)

    # 2. Start Backend (Python)
    # Use python.exe from venv
    venv_python = os.path.abspath(os.path.join("backend", "venv", "Scripts", "python.exe"))
    backend_cwd = os.path.abspath(os.path.join("backend", "app-backend"))
    backend_cmd = f'"{venv_python}" -u main.py'
    
    start_process(backend_cmd, backend_cwd, "BACKEND", CYAN)

    # 3. Start Frontend (Next.js)
    frontend_cwd = os.path.abspath("vectrieve-frontend")
    frontend_cmd = "npm run dev"
    start_process(frontend_cmd, frontend_cwd, "FRONTEND", GREEN)

    # 4. Start Ngrok Proxy (if needed, non-blocking)
    ngrok_cmd = "ngrok http 3000"
    try:
        ngrok_check = subprocess.run("where ngrok" if os.name == "nt" else "which ngrok", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ngrok_check.returncode == 0:
            start_process(ngrok_cmd, os.getcwd(), "NGROK", MAGENTA)
        else:
            log("SYSTEM", "Ngrok not found in PATH, skipping proxy...", YELLOW)
    except Exception:
        pass

    log("SYSTEM", "All servers started. Opening browser in 6 seconds...", YELLOW)
    time.sleep(6)
    
    webbrowser.open("http://localhost:3000")
    
    log("SYSTEM", "Vectrieve is active. Press CTRL+C to terminate all services.", GREEN + BOLD)
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()

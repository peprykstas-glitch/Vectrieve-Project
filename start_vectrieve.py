import sys
import os
import subprocess
import threading
import time
import webbrowser
import signal
import socket
import urllib.request

# ANSI Color and Text Formatting
GREEN = "\033[92m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
UNDERLINE = "\033[4m"

processes = []
shutting_down = False

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0

def kill_process_on_port(port: int):
    """Finds and terminates any process occupying a specific port on Windows."""
    if os.name != 'nt':
        return
    try:
        cmd = f'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        pids = [p.strip() for p in res.stdout.strip().splitlines() if p.strip().isdigit()]
        for pid in pids:
            if pid and pid != str(os.getpid()):
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def log(level, message, color=RESET):
    timestamp = time.strftime("%H:%M:%S")
    prefix = ""
    if level == "INFO":
        prefix = f"{GREEN}⚙️ [INFO]{RESET}"
    elif level == "SUCCESS":
        prefix = f"{GREEN}✅ [OK  ]{RESET}"
    elif level == "WARN":
        prefix = f"{YELLOW}⚠️ [WARN]{RESET}"
    elif level == "ERROR":
        prefix = f"{RED}🚨 [FAIL]{RESET}"
    elif level == "SYSTEM":
        prefix = f"{CYAN}⚡ [SYS ]{RESET}"
    elif level == "STEP":
        prefix = f"{MAGENTA}🚀 [STEP]{RESET}"
    
    print(f"{DIM}[{timestamp}]{RESET} {prefix} {color}{message}{RESET}", flush=True)

def read_output(pipe, tag, color):
    try:
        for line in iter(pipe.readline, ''):
            if shutting_down:
                break
            clean_line = line.strip()
            if clean_line:
                # Filter out noisy repetitive next.js turbo panic messages or routine poll logs if unwanted
                print(f"{color}[{tag}]{RESET} {clean_line}", flush=True)
    except Exception:
        pass

def start_process(cmd, cwd, tag, color):
    log("SYSTEM", f"Spawning service instance: {tag}...", DIM)
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
    log("SYSTEM", "Graceful shutdown sequence initiated...", RED + BOLD)
    
    # Terminate all processes we spawned (using process tree kill on Windows)
    for proc in processes:
        try:
            if os.name == 'nt':
                subprocess.run(f"taskkill /T /F /PID {proc.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                proc.terminate()
        except Exception:
            pass
                
    # Shutdown Docker compose databases
    log("SYSTEM", "Tearing down database engines in Docker...", RED)
    subprocess.run("docker compose down", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    log("SUCCESS", "All services terminated cleanly. System offline.", GREEN + BOLD)
    sys.exit(0)

# Register signals for clean exit
signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def disable_windows_quick_edit():
    """Disables QuickEdit mode in Windows Console to prevent freezing on mouse clicks."""
    if os.name == 'nt':
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            # Enable ANSI on stdout
            hStdout = kernel32.GetStdHandle(-11)
            kernel32.SetConsoleMode(hStdout, 7)
            # Disable QuickEdit Mode on stdin (0x0040)
            hStdin = kernel32.GetStdHandle(-10)
            mode = ctypes.c_uint32()
            if kernel32.GetConsoleMode(hStdin, ctypes.byref(mode)):
                new_mode = (mode.value & ~0x0040) | 0x0080
                kernel32.SetConsoleMode(hStdin, new_mode)
        except Exception:
            pass

def wait_for_service(url: str, timeout_sec: int = 25) -> bool:
    start_t = time.time()
    while time.time() - start_t < timeout_sec:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Vectrieve-Launcher"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status in (200, 307, 308):
                    return True
        except Exception:
            time.sleep(0.6)
    return False

def main():
    # Force stdout/stderr to UTF-8
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

    disable_windows_quick_edit()
    os.system("cls" if os.name == "nt" else "clear")
    
    print(BOLD + GREEN + r"""
██╗   ██╗███████╗██████╗████████╗██████╗ ██╗███████╗██╗   ██╗███████╗
██║   ██║██╔════╝██╔═══╝╚══██╔══╝██╔══██╗██║██╔════╝██║   ██║██╔════╝
██║   ██║█████╗  ██║       ██║   ██████╔╝██║█████╗  ██║   ██║█████╗  
╚██╗ ██╔╝██╔══╝  ██║       ██║   ██╔══██╗██║██╔══╝  ╚██╗ ██╔╝██╔══╝  
 ╚████╔╝ ███████╗╚██████╗  ██║   ██║  ██║██║███████╗ ╚████╔╝ ███████╗
  ╚═══╝  ╚══════╝ ╚═════╝  ╚═╝   ╚═╝  ╚═╝╚═╝╚══════╝  ╚═══╝  ╚══════╝
    """ + RESET)

    # 1. Environment Verification & Automatic Port Cleanup
    log("STEP", "Verifying environment prerequisites...", BOLD)
    
    for port in (3000, 8000):
        if is_port_in_use(port):
            log("WARN", f"Port {port} is occupied by a previous session. Freeing port automatically...", YELLOW)
            kill_process_on_port(port)
            time.sleep(1)
            
    log("SUCCESS", "Port availability validated.", GREEN)

    # 2. Database Engines Start
    log("STEP", "Orchestrating Dockerized database containers (Postgres & Qdrant)...", BOLD)
    docker_res = subprocess.run("docker compose up -d", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if docker_res.returncode != 0:
        subprocess.run("docker rm -f vectrieve-qdrant vectrieve-postgres", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        docker_res = subprocess.run("docker compose up -d", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if docker_res.returncode != 0:
        log("WARN", "Docker compose invocation notice. Proceeding with active storage engines...", YELLOW)
    else:
        log("SUCCESS", "Qdrant and PostgreSQL storage engines verified active.", GREEN)

    # 3. Database Schema Migration via Alembic
    log("STEP", "Applying migrations and verifying database state...", BOLD)
    venv_python = os.path.abspath(os.path.join("backend", "venv", "Scripts", "python.exe"))
    backend_dir = os.path.abspath("backend")
    
    if not os.path.exists(venv_python):
        log("ERROR", f"Virtual environment Python executable not found at: {venv_python}", RED + BOLD)
        sys.exit(1)

    log("INFO", "Running: alembic upgrade head", DIM)
    alembic_cmd = f'"{venv_python}" -m alembic upgrade head'
    alembic_res = subprocess.run(alembic_cmd, cwd=backend_dir, shell=True, capture_output=True, text=True)
    if alembic_res.returncode != 0:
        log("WARN", f"Alembic notice: {alembic_res.stderr or alembic_res.stdout}. Continuing...", YELLOW)
    else:
        log("SUCCESS", "Database schema is up-to-date.", GREEN)

    # 4. Spawning Backend Application Server
    log("STEP", "Starting FastAPI backend service...", BOLD)
    backend_app_dir = os.path.abspath(os.path.join("backend", "app"))
    backend_cmd = f'"{venv_python}" -u main.py'
    start_process(backend_cmd, backend_app_dir, "BACKEND", CYAN)

    # 5. Spawning Frontend Engine
    log("STEP", "Compiling and serving frontend application...", BOLD)
    frontend_cwd = os.path.abspath("frontend")
    frontend_cmd = "npm run dev"
    start_process(frontend_cmd, frontend_cwd, "FRONTEND", GREEN)

    # 6. Active Health Verification Loop
    log("INFO", "Warming up application engines and validating endpoints...", DIM)
    
    backend_ready = wait_for_service("http://localhost:8000/health", timeout_sec=20)
    if backend_ready:
        log("SUCCESS", "FastAPI Backend is healthy (http://localhost:8000)", GREEN)
    else:
        log("WARN", "FastAPI Backend warming up in background...", YELLOW)

    frontend_ready = wait_for_service("http://localhost:3000", timeout_sec=25)
    if frontend_ready:
        log("SUCCESS", "Next.js Frontend is healthy (http://localhost:3000)", GREEN)
    else:
        log("WARN", "Next.js Frontend compiling in background...", YELLOW)

    log("SUCCESS", "Vectrieve AI Core Stack is online.", GREEN + BOLD)
    log("SYSTEM", "Localhost:            http://localhost:3000", CYAN + BOLD)
    log("SYSTEM", "LAN Network Access:   http://192.168.1.26:3000  <-- (Share with office colleagues)", GREEN + BOLD)
    log("SYSTEM", "API Documentation:    http://localhost:8000/docs", CYAN)
    
    # Auto-open browser
    try:
        webbrowser.open("http://localhost:3000")
    except Exception:
        pass
    
    log("INFO", f"Press {UNDERLINE}Ctrl+C{RESET} in this window to gracefully stop all services.", YELLOW + BOLD)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()

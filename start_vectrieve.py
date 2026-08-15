import sys
import os
import subprocess
import threading
import time
import webbrowser
import signal
import socket

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
        return s.connect_ex(('localhost', port)) == 0

def log_header(title):
    print(f"\n{BOLD}{MAGENTA}+--------------------------------------------------------+{RESET}")
    print(f"{BOLD}{MAGENTA}| {title.center(54)} |{RESET}")
    print(f"{BOLD}{MAGENTA}+--------------------------------------------------------+{RESET}\n")

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
    
    print(f"{DIM}[{timestamp}]{RESET} {prefix} {color}{message}{RESET}")

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

def main():
    # Force stdout/stderr to UTF-8 to prevent UnicodeEncodeErrors with emoji/symbols on Windows
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

    # Enable ANSI escape sequences on Windows console
    if os.name == 'nt':
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)

    os.system("cls" if os.name == "nt" else "clear")
    
    print(BOLD + GREEN + r"""
██╗   ██╗███████╗██████╗████████╗██████╗ ██╗███████╗██╗   ██╗███████╗
██║   ██║██╔════╝██╔═══╝╚══██╔══╝██╔══██╗██║██╔════╝██║   ██║██╔════╝
██║   ██║█████╗  ██║       ██║   ██████╔╝██║█████╗  ██║   ██║█████╗  
╚██╗ ██╔╝██╔══╝  ██║       ██║   ██╔══██╗██║██╔══╝  ╚██╗ ██╔╝██╔══╝  
 ╚████╔╝ ███████╗╚██████╗  ██║   ██║  ██║██║███████╗ ╚████╔╝ ███████╗
  ╚═══╝  ╚══════╝ ╚═════╝  ╚═╝   ╚═╝  ╚═╝╚═╝╚══════╝  ╚═══╝  ╚══════╝
    """ + RESET)

    # 1. Environment Verification
    log("STEP", "Verifying environment prerequisites...", BOLD)
    
    # Check Ports
    ports_to_check = {3000: "Next.js Frontend", 8000: "FastAPI Backend", 5432: "PostgreSQL Database", 6333: "Qdrant Vector DB"}
    port_conflicts = []
    for port, name in ports_to_check.items():
        if is_port_in_use(port):
            # For databases, that might mean they are already running, which is fine.
            # But frontend/backend ports must be free.
            if port in (3000, 8000):
                port_conflicts.append((port, name))
    
    if port_conflicts:
        for port, name in port_conflicts:
            log("ERROR", f"Port {port} ({name}) is already in use!", RED + BOLD)
        log("ERROR", "Please free these ports before launching the project.", RED)
        sys.exit(1)
        
    log("SUCCESS", "Port availability validated.", GREEN)

    # 2. Database Engines Start
    log("STEP", "Orchestrating Dockerized database containers...", BOLD)
    docker_res = subprocess.run("docker compose up -d", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if docker_res.returncode != 0:
        # Retry with force cleanup of stale containers if folder was renamed
        subprocess.run("docker rm -f vectrieve-qdrant vectrieve-postgres", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        docker_res = subprocess.run("docker compose up -d", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if docker_res.returncode != 0:
        log("WARN", "Docker compose invocation failed. Attempting to proceed assuming external DB instances are active.", YELLOW)
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
    # Run Alembic upgrade
    alembic_cmd = f'"{venv_python}" -m alembic upgrade head'
    alembic_res = subprocess.run(alembic_cmd, cwd=backend_dir, shell=True)
    if alembic_res.returncode != 0:
        log("ERROR", "Database migration failed! Backend initialization aborted.", RED + BOLD)
        sys.exit(1)
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

    # 6. Optional Proxy Engine (Ngrok)
    try:
        ngrok_check = subprocess.run("where ngrok" if os.name == "nt" else "which ngrok", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ngrok_check.returncode == 0:
            log("INFO", "Ngrok tunnel executable detected. Provisioning public ingress proxy...", MAGENTA)
            start_process("ngrok http 3000", os.getcwd(), "NGROK", MAGENTA)
    except Exception:
        pass

    # Waiting for system readiness
    log("INFO", "Allowing 5 seconds for application engines to warm up...", DIM)
    time.sleep(5)
    
    log("SUCCESS", "Vectrieve AI Core Stack is online.", GREEN + BOLD)
    log("SYSTEM", "Frontend Address:     http://localhost:3000", CYAN)
    log("SYSTEM", "LAN Network Access:   http://192.168.1.26:3000  <-- share this with colleagues", GREEN + BOLD)
    log("SYSTEM", "Backend API docs:     http://localhost:8000/docs", CYAN)
    
    webbrowser.open("http://localhost:3000")
    
    log("INFO", f"{UNDERLINE}Ctrl+C{RESET} triggers graceful teardown of all system components.", BOLD + YELLOW)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()

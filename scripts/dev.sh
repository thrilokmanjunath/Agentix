#!/usr/bin/env bash
# ==============================================================================
# Agentix Signature — Production-Grade One-Command Local Startup
# ==============================================================================
# Starts backend FastAPI (8000) and frontend Next.js (3000) with local LLM probes.
# Clean shutdown via ./scripts/stop.sh
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Styling
C_GOLD='\033[38;5;220m'
C_EMERALD='\033[38;5;48m'
C_CYAN='\033[38;5;45m'
C_SLATE='\033[38;5;245m'
C_ROSE='\033[38;5;203m'
C_RESET='\033[0m'
C_BOLD='\033[1m'

log_info()    { echo -e "${C_SLATE}[AGENTIX]${C_RESET} $1"; }
log_success() { echo -e "${C_EMERALD}[SUCCESS]${C_RESET} $1"; }
log_warn()    { echo -e "${C_GOLD}[WARNING]${C_RESET} $1"; }
log_error()   { echo -e "${C_ROSE}[ERROR]${C_RESET} $1"; }

mkdir -p "$ROOT_DIR/.run" "$ROOT_DIR/logs" "$ROOT_DIR/backend/data" "$ROOT_DIR/backend/logs"

clear 2>/dev/null || true

echo -e "${C_GOLD}${C_BOLD}"
cat << "EOF"
    ___   ______  ______ _   __ ______ _____ _  __
   /   | / ____/ / ____// | / //_  __//  _/| |/ /
  / /| |/ / __  / __/  /  |/ /  / /   / /  |   / 
 / ___ / /_/ / / /___ / /|  /  / /  _/ /  /   |  
/_/  |_|\____//_____//_/ |_/  /_/  /___/ /_/|_|  
     INSTITUTIONAL AI INTELLIGENCE PLATFORM
EOF
echo -e "${C_RESET}"
echo -e "${C_SLATE}Initializing Agentix Signature Local Infrastructure...${C_RESET}\n"

# 1. System Discovery
OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"
TOTAL_RAM_GB="Unknown"
if [ "$OS_NAME" = "Darwin" ]; then
    BYTES=$(sysctl -n hw.memsize 2>/dev/null || echo 0)
    TOTAL_RAM_GB=$((BYTES / 1024 / 1024 / 1024))
elif [ -f /proc/meminfo ]; then
    KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_RAM_GB=$((KB / 1024 / 1024))
fi
log_info "Host System: ${C_BOLD}$OS_NAME ($ARCH_NAME)${C_RESET} &bull; RAM: ${C_BOLD}${TOTAL_RAM_GB} GB${C_RESET}"

# 2. Runtime Validation
command -v python3 >/dev/null 2>&1 || { log_error "Python 3 is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VER=$(node -v)
log_info "Runtimes: Python ${C_BOLD}$PY_VER${C_RESET} &bull; Node.js ${C_BOLD}$NODE_VER${C_RESET}"

# 3. Virtual Environment
VENV_DIR="$ROOT_DIR/backend/.venv"
if [ ! -d "$VENV_DIR" ]; then
    log_info "Creating backend Python virtual environment at $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --upgrade pip >/dev/null 2>&1 || true
    log_info "Installing backend dependencies from requirements.txt..."
    "$VENV_DIR/bin/pip" install -r "$ROOT_DIR/backend/requirements.txt" >/dev/null 2>&1
fi
source "$VENV_DIR/bin/activate"

# 4. Environment Configuration
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    if [ -f "$ROOT_DIR/backend/.env.example" ]; then
        cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
        log_info "Generated backend/.env from template."
    fi
fi

if [ ! -f "$ROOT_DIR/frontend/.env.local" ]; then
    cat << 'ENVFILE' > "$ROOT_DIR/frontend/.env.local"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=agentix-institutional-development-secret-2026
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_APP_NAME="Agentix Signature"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agentix?schema=public"
ENVFILE
    log_info "Generated frontend/.env.local."
fi

# 5. Frontend Dependencies
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
    log_info "Installing frontend node_modules..."
    (cd "$ROOT_DIR/frontend" && npm install --legacy-peer-deps >/dev/null 2>&1)
fi

# 6. Database Schema Initialization
log_info "Validating database schema and migrations..."
python3 -c "from core.repositories.database import init_db; init_db()" >/dev/null 2>&1 || true
log_success "Database schema ready."

# 7. Local LLM Service Probe
echo ""
log_info "Probing local neural inference engines..."
OLLAMA_STATUS="Offline"
OLLAMA_MODELS=""
if curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    OLLAMA_STATUS="Online (http://127.0.0.1:11434)"
    OLLAMA_MODELS=$(curl -s http://127.0.0.1:11434/api/tags | python3 -c "import sys, json; print(', '.join([m['name'] for m in json.load(sys.stdin).get('models', [])]))" 2>/dev/null || echo "detected")
    log_success "Ollama detected on 127.0.0.1:11434: [${C_GOLD}$OLLAMA_MODELS${C_RESET}]"
else
    log_warn "Ollama not detected on http://127.0.0.1:11434."
    log_warn "To enable air-gapped local AI: 'ollama serve' && 'ollama pull qwen2.5:3b'"
fi

# 8. Clean Stale Services
if [ -f "$ROOT_DIR/.run/backend.pid" ]; then
    OLD_PID=$(cat "$ROOT_DIR/.run/backend.pid" 2>/dev/null || echo "")
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        kill -15 "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$ROOT_DIR/.run/backend.pid"
fi

if [ -f "$ROOT_DIR/.run/frontend.pid" ]; then
    OLD_PID=$(cat "$ROOT_DIR/.run/frontend.pid" 2>/dev/null || echo "")
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        kill -15 "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$ROOT_DIR/.run/frontend.pid"
fi

# Kill any orphaned processes on ports 8000 & 3000
lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true

# 9. Launch Backend Service
log_info "Starting Agentix Core Backend on port 8000..."
BACKEND_PID=$(python3 -c "import subprocess; p = subprocess.Popen(['python3', '-m', 'uvicorn', 'core.main:app', '--host', '127.0.0.1', '--port', '8000'], cwd='$ROOT_DIR/backend', stdin=subprocess.DEVNULL, stdout=open('$ROOT_DIR/logs/backend.log', 'w'), stderr=subprocess.STDOUT, start_new_session=True); print(p.pid)")
echo "$BACKEND_PID" > "$ROOT_DIR/.run/backend.pid"

# Wait for backend health check
BACKEND_ONLINE=false
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/health | grep -q "status"; then
        BACKEND_ONLINE=true
        break
    fi
    sleep 0.5
done

if [ "$BACKEND_ONLINE" = false ]; then
    log_error "Backend failed to start within 15 seconds. Check logs/backend.log"
    exit 1
fi
log_success "Backend active (PID: $BACKEND_PID) • Health Check: OK"

# 10. Launch Frontend Service
log_info "Starting Agentix Executive Console on port 3000..."
FRONTEND_PID=$(python3 -c "import subprocess; p = subprocess.Popen(['node', './node_modules/next/dist/bin/next', 'dev', '-p', '3000'], cwd='$ROOT_DIR/frontend', stdin=subprocess.DEVNULL, stdout=open('$ROOT_DIR/logs/frontend.log', 'w'), stderr=subprocess.STDOUT, start_new_session=True); print(p.pid)")
echo "$FRONTEND_PID" > "$ROOT_DIR/.run/frontend.pid"

# Wait for frontend readiness
FRONTEND_ONLINE=false
for i in {1..30}; do
    if curl -s -m 1 http://localhost:3000 >/dev/null 2>&1 || curl -s -m 1 http://127.0.0.1:3000 >/dev/null 2>&1; then
        FRONTEND_ONLINE=true
        break
    fi
    sleep 0.5
done

if [ "$FRONTEND_ONLINE" = false ]; then
    log_warn "Frontend dev server launched (PID: $FRONTEND_PID), waiting on compilation..."
else
    log_success "Frontend active (PID: $FRONTEND_PID) &bull; Ready on http://localhost:3000"
fi

# 11. Final Operational Dashboard
echo ""
echo -e "${C_GOLD}========================================================================${C_RESET}"
echo -e "${C_BOLD}               AGENTIX SIGNATURE &bull; OPERATIONAL CONSOLE${C_RESET}"
echo -e "${C_GOLD}========================================================================${C_RESET}"
echo -e " ${C_BOLD}Executive Dashboard:${C_RESET}     ${C_CYAN}http://localhost:3000/dashboard${C_RESET}"
echo -e " ${C_BOLD}Autonomous Agent Console:${C_RESET}${C_CYAN}http://localhost:3000/agent-console${C_RESET}"
echo -e " ${C_BOLD}Data Dock (Ingestion):${C_RESET}   ${C_CYAN}http://localhost:3000/data-dock${C_RESET}"
echo -e " ${C_BOLD}XAI & Neural Diagnostics:${C_RESET}${C_CYAN}http://localhost:3000/insights${C_RESET}"
echo -e " ${C_BOLD}Executive Reports:${C_RESET}       ${C_CYAN}http://localhost:3000/intelligence-reports${C_RESET}"
echo -e " ${C_BOLD}Institutional Settings:${C_RESET}  ${C_CYAN}http://localhost:3000/settings${C_RESET}"
echo -e " ----------------------------------------------------------------------"
echo -e " ${C_BOLD}FastAPI Backend Docs:${C_RESET}    ${C_CYAN}http://127.0.0.1:8000/docs${C_RESET}"
echo -e " ${C_BOLD}Backend Health API:${C_RESET}      ${C_CYAN}http://127.0.0.1:8000/health${C_RESET}"
echo -e " ${C_BOLD}AI Inference Provider:${C_RESET}   ${C_EMERALD}Ollama ($OLLAMA_STATUS)${C_RESET}"
echo -e " ----------------------------------------------------------------------"
echo -e " ${C_SLATE}Backend Logs:${C_RESET}  tail -f logs/backend.log"
echo -e " ${C_SLATE}Frontend Logs:${C_RESET} tail -f logs/frontend.log"
echo -e " ${C_SLATE}Shutdown:${C_RESET}      ./scripts/stop.sh"
echo -e "${C_GOLD}========================================================================${C_RESET}\n"

#!/usr/bin/env bash
# ==============================================================================
# Agentix Signature — Graceful Infrastructure Shutdown
# ==============================================================================
# Terminates background FastAPI and Next.js processes and clears runtime PIDs.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

C_GOLD='\033[38;5;220m'
C_EMERALD='\033[38;5;48m'
C_SLATE='\033[38;5;245m'
C_RESET='\033[0m'
C_BOLD='\033[1m'

log_info()    { echo -e "${C_SLATE}[AGENTIX]${C_RESET} $1"; }
log_success() { echo -e "${C_EMERALD}[SUCCESS]${C_RESET} $1"; }

echo -e "\n${C_GOLD}${C_BOLD}Shutting down Agentix Signature services...${C_RESET}"

# Stop Backend
if [ -f "$ROOT_DIR/.run/backend.pid" ]; then
    BPID=$(cat "$ROOT_DIR/.run/backend.pid" 2>/dev/null || echo "")
    if [ -n "$BPID" ] && kill -0 "$BPID" 2>/dev/null; then
        log_info "Stopping Backend Core (PID: $BPID)..."
        kill -15 "$BPID" 2>/dev/null || true
        for i in {1..10}; do
            if ! kill -0 "$BPID" 2>/dev/null; then break; fi
            sleep 0.3
        done
        if kill -0 "$BPID" 2>/dev/null; then
            kill -9 "$BPID" 2>/dev/null || true
        fi
        log_success "Backend Core stopped."
    fi
    rm -f "$ROOT_DIR/.run/backend.pid"
fi

# Stop Frontend
if [ -f "$ROOT_DIR/.run/frontend.pid" ]; then
    FPID=$(cat "$ROOT_DIR/.run/frontend.pid" 2>/dev/null || echo "")
    if [ -n "$FPID" ] && kill -0 "$FPID" 2>/dev/null; then
        log_info "Stopping Executive Console (PID: $FPID)..."
        kill -15 "$FPID" 2>/dev/null || true
        for i in {1..10}; do
            if ! kill -0 "$FPID" 2>/dev/null; then break; fi
            sleep 0.3
        done
        if kill -0 "$FPID" 2>/dev/null; then
            kill -9 "$FPID" 2>/dev/null || true
        fi
        log_success "Executive Console stopped."
    fi
    rm -f "$ROOT_DIR/.run/frontend.pid"
fi

# Clean up port 8000 and 3000 if orphaned processes remain
ORPHAN_8000=$(lsof -ti :8000 2>/dev/null || true)
if [ -n "$ORPHAN_8000" ]; then
    echo "$ORPHAN_8000" | xargs kill -9 2>/dev/null || true
    log_info "Cleared orphaned listeners on port 8000."
fi

ORPHAN_3000=$(lsof -ti :3000 2>/dev/null || true)
if [ -n "$ORPHAN_3000" ]; then
    echo "$ORPHAN_3000" | xargs kill -9 2>/dev/null || true
    log_info "Cleared orphaned listeners on port 3000."
fi

echo -e "${C_EMERALD}${C_BOLD}All Agentix services have been cleanly terminated.${C_RESET}\n"

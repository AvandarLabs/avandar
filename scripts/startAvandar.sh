#!/bin/bash

# Summary: Starts the Avandar development environment
#
# Description:
#   This script starts the Avandar development environment by:
#   1. Updating edge function environment variables
#   2. Running vite, supabase functions serve, ngrok, and fastify server
#      concurrently
#
# Usage:
#   ./scripts/startAvandar.sh

set -e  # Exit on any error

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the project root directory
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT="$(realpath "$SCRIPT_DIR/..")"
cd "$PROJECT_ROOT" || exit 1

# Check if .env.development exists
if [ ! -f ".env.development" ]; then
  echo -e "${RED}Error: .env.development file not found in project root${NC}"
  echo -e "${YELLOW}Please run 'pnpm env:reset' to create it${NC}"
  exit 1
fi

# Load REVERSE_PROXY_URL from .env.development
# This reads the value and exports it for use in the ngrok command
if ! REVERSE_PROXY_URL=$(grep "^REVERSE_PROXY_URL=" .env.development | cut -d '=' -f2- | tr -d '"' | tr -d "'"); then
  echo -e "${RED}Error: Failed to read REVERSE_PROXY_URL from .env.development${NC}"
  exit 1
fi

if [ -z "$REVERSE_PROXY_URL" ]; then
  echo -e "${RED}Error: REVERSE_PROXY_URL is not set in .env.development${NC}"
  exit 1
fi

# Serve on the port this worktree owns. `ava supabase switch` pins one per
# switched worktree so several worktrees can run `pnpm dev` side by side.
VITE_PORT="$("$SCRIPT_DIR/utils/get-dev-server-port.sh")"

# Advertise localhost: Google OAuth and Picker treat localhost and 127.0.0.1
# as different origins, and Cloud Console is registered for localhost. Bind
# IPv4 loopback so Node/Playwright (which prefer 127.0.0.1) still connect.
VITE_HOST="127.0.0.1"
VITE_PUBLIC_URL="http://localhost:${VITE_PORT}"

# ngrok-free domains need --hostname, while paid/custom domains still use --url.
REVERSE_PROXY_HOST="${REVERSE_PROXY_URL#http://}"
REVERSE_PROXY_HOST="${REVERSE_PROXY_HOST#https://}"
REVERSE_PROXY_HOST="${REVERSE_PROXY_HOST%%/*}"

if [[ "$REVERSE_PROXY_URL" == *"ngrok-free"* ]]; then
  NGROK_COMMAND="ngrok http --hostname=$REVERSE_PROXY_HOST 54321 --log=stdout"
else
  NGROK_COMMAND="ngrok http --url=$REVERSE_PROXY_URL 54321 --log=stdout"
fi

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Starting Avandar Development Environment${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# Stops processes matching a pattern, but only the ones started from this
# worktree. Another worktree's `pnpm dev` keeps running: matching on the command
# line alone cannot tell the two apart, so the working directory decides.
stop_worktree_processes() {
  local pattern="$1"
  local process_cwd
  for pid in $(pgrep -f "$pattern" 2>/dev/null || true); do
    process_cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1)
    if [ "$process_cwd" = "$PROJECT_ROOT" ]; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

# Stop any prior `pnpm dev` for this worktree so the new one can take over.
# Narrowly targets:
#  - our concurrently orchestrator (matches the exact flags we pass below)
#  - whatever is listening on this worktree's vite port
#  - stray supabase functions serve / ngrok processes from the same script
echo -e "${BLUE}Stopping any prior Avandar dev processes...${NC}"
stop_worktree_processes "concurrently --names vite,functions,ngrok"
vite_pids=$(lsof -ti:"$VITE_PORT" -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$vite_pids" ]; then
  kill $vite_pids 2>/dev/null || true
fi
stop_worktree_processes "supabase functions serve"
stop_worktree_processes "^ngrok http "
sleep 1
echo -e "${GREEN}✓ Cleared prior dev processes${NC}"
echo ""

# Step 1: Update edge function environment variables
echo -e "${BLUE}Step 1: Updating edge function environment variables...${NC}"
if ! pnpm fns:update-env; then
  echo -e "${RED}Error: Failed to update edge function environment variables${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Edge function environment variables updated${NC}"
echo ""

# Step 2: Start development processes concurrently
echo -e "${BLUE}Step 2: Starting development processes...${NC}"
echo -e "${CYAN}  - Vite (frontend dev server) on ${VITE_PUBLIC_URL}${NC}"
echo -e "${CYAN}  - Supabase Functions (edge functions server)${NC}"
echo -e "${CYAN}  - ngrok (reverse proxy tunnel)${NC}"
echo -e "${CYAN}  - fastify server${NC}"
echo ""

# Check if concurrently is available
if ! command -v concurrently &> /dev/null; then
  echo -e "${RED}Error: concurrently is not installed${NC}"
  echo -e "${YELLOW}Please install it with: pnpm add -D concurrently${NC}"
  exit 1
fi

# Check if ngrok is available. Ngrok is only needed for webhooks
# (Supabase edge functions called from third parties). The frontend and
# Supabase functions run fine without it; print a warning and skip the
# tunnel rather than blocking startup.
NGROK_AVAILABLE=true
if ! command -v ngrok &> /dev/null; then
  echo -e "${YELLOW}Warning: ngrok is not installed; skipping reverse-proxy tunnel.${NC}"
  echo -e "${YELLOW}Webhook-driven flows (Supabase edge functions triggered by third parties) will not work locally.${NC}"
  echo -e "${YELLOW}Install ngrok if you need them: https://ngrok.com/download${NC}"
  NGROK_AVAILABLE=false
fi

# Only one agent at a time can serve REVERSE_PROXY_URL, so ngrok fails when
# another worktree already holds the tunnel. That is not a reason to take the
# rest of the dev environment down with it, and --kill-others-on-fail would do
# exactly that, so a failing tunnel reports itself and exits successfully.
NGROK_FALLBACK_MESSAGE="Warning: ngrok exited; the reverse-proxy tunnel is unavailable. Another worktree may already serve $REVERSE_PROXY_URL. Webhook-driven flows will not work here."

# Run all processes concurrently with clean output
if [ "$NGROK_AVAILABLE" = true ]; then
  concurrently \
    --names "vite,functions,ngrok" \
    --prefix-colors "blue,green,yellow" \
    --prefix "{name}" \
    --kill-others-on-fail \
    "vite --host $VITE_HOST --port $VITE_PORT" \
    "pnpm fns:serve" \
    "$NGROK_COMMAND || echo \"$NGROK_FALLBACK_MESSAGE\""
else
  concurrently \
    --names "vite,functions" \
    --prefix-colors "blue,green" \
    --prefix "{name}" \
    --kill-others-on-fail \
    "vite --host $VITE_HOST --port $VITE_PORT" \
    "pnpm fns:serve"
fi

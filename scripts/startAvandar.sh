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
PROJECT_ROOT="$SCRIPT_DIR/.."
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

# Stop any prior `pnpm dev` for this repo so the new one can take over.
# Narrowly targets:
#  - our concurrently orchestrator (matches the exact flags we pass below)
#  - whatever is listening on the vite port (5173)
#  - stray supabase functions serve / ngrok processes from the same script
echo -e "${BLUE}Stopping any prior Avandar dev processes...${NC}"
pkill -f "concurrently --names vite,functions,ngrok" 2>/dev/null || true
vite_pids=$(lsof -ti:5173 -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$vite_pids" ]; then
  kill $vite_pids 2>/dev/null || true
fi
pkill -f "supabase functions serve" 2>/dev/null || true
pkill -f "^ngrok http " 2>/dev/null || true
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
echo -e "${CYAN}  - Vite (frontend dev server)${NC}"
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

# Run all processes concurrently with clean output
if [ "$NGROK_AVAILABLE" = true ]; then
  concurrently \
    --names "vite,functions,ngrok" \
    --prefix-colors "blue,green,yellow" \
    --prefix "{name}" \
    --kill-others-on-fail \
    "vite --host 127.0.0.1 --port 5173" \
    "pnpm fns:serve" \
    "$NGROK_COMMAND"
else
  concurrently \
    --names "vite,functions" \
    --prefix-colors "blue,green" \
    --prefix "{name}" \
    --kill-others-on-fail \
    "vite --host 127.0.0.1 --port 5173" \
    "pnpm fns:serve"
fi

#!/bin/bash

# Summary: Starts the Avandar development environment
#
# Description:
#   This script starts the Avandar development environment by:
#   1. Updating edge function environment variables
#   2. Running vite, supabase functions serve, and ngrok concurrently
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
  echo -e "${YELLOW}Please run 'npm run env:reset' to create it${NC}"
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

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Starting Avandar Development Environment${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# Step 1: Update edge function environment variables
echo -e "${BLUE}Step 1: Updating edge function environment variables...${NC}"
if ! npm run fns:update-env; then
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
echo ""

# Check if concurrently is available
if ! command -v concurrently &> /dev/null; then
  echo -e "${RED}Error: concurrently is not installed${NC}"
  echo -e "${YELLOW}Please install it with: npm run add -D concurrently${NC}"
  exit 1
fi

# Check if ngrok is available
if ! command -v ngrok &> /dev/null; then
  echo -e "${RED}Error: ngrok is not installed${NC}"
  echo -e "${YELLOW}Please install ngrok: https://ngrok.com/download${NC}"
  exit 1
fi

# Run all three processes concurrently with clean output
concurrently \
  --names "vite,functions,ngrok" \
  --prefix-colors "blue,green,yellow" \
  --prefix "{name}" \
  --kill-others-on-fail \
  "vite" \
  "npm run fns:serve" \
  "ngrok http --url=$REVERSE_PROXY_URL 54321 --log=stdout"


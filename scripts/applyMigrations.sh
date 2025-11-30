#!/bin/bash

# Summary: Applies Supabase database migrations.
#
# Usage:
#   ./scripts/lib/applyMigrations.sh [--gen-types]
#
# Description:
#   This script starts the Supabase stack and applies any pending database
#   migrations.
#
# Options:
#   --gen-types   If provided, it will also generate TypeScript types from
#                 the database schema after applying migrations.

# Set the project root directory
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../
cd $PROJECT_ROOT

# Default value for generating types
GEN_TYPES=false

# Function to display usage information
usage() {
  echo "Usage: ./scripts/lib/applyMigrations.sh -- [--gen-types]"
  echo "Applies Supabase database migrations."
  echo "  --gen-types   Generate TypeScript types after applying migrations."
  exit 1
}

# Check for --gen-types option
if [[ "$1" == "--gen-types" ]]; then
  GEN_TYPES=true
elif [[ -n "$1" ]]; then
  echo "Error: Invalid argument '$1'"
  usage
fi

# Apply migrations
echo "Starting Supabase and applying migrations..."
supabase start && supabase migration up

# Generate types if required
if [ "$GEN_TYPES" = true ]; then
  echo "Generating TypeScript types..."
  npm run db:gen-types
fi

echo "Migrations applied successfully."

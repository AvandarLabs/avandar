#!/bin/bash

# Summary: Deletes the most recent Supabase migration and resets the DB.
#
# Usage:
#   ./scripts/downMigrate.sh
#
# Description:
#   This script removes the most recent migration file from
#   supabase/migrations/ and then runs `npm run db:reset` to restart
#   the local database, apply migrations, and reseed data.

# Set the project root directory
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../
cd $PROJECT_ROOT

set -euo pipefail

usage() {
  echo "Usage: ./scripts/downMigrate.sh"
  echo "Deletes the most recent Supabase migration and runs 'npm run db:reset'."
  echo "No arguments are required."
  exit 1
}

# No arguments expected
if [ $# -ne 0 ]; then
  echo "Error: This script does not accept arguments."
  usage
fi

MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: Migrations directory not found at $MIGRATIONS_DIR"
  exit 1
fi

# Find the most recent migration by filename ordering (timestamps prefix files)
LATEST_MIGRATION=$(ls -1 "$MIGRATIONS_DIR" | sort | tail -n 1 || true)

if [ -z "${LATEST_MIGRATION}" ]; then
  echo "No migration files found to delete in $MIGRATIONS_DIR"
else
  echo "Deleting most recent migration: $LATEST_MIGRATION"
  rm -f "$MIGRATIONS_DIR/$LATEST_MIGRATION"
fi

# Reset the database (starts Supabase, applies migrations, seeds data, etc.)
echo "Running npm run db:reset..."
npm run db:reset

echo "Down migration complete." 

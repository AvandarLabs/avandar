#!/bin/bash
# Reset the Supabase database and seed it with custom data if desired
# Requires that you have `supabase` installed globally
#
# This script will reset the entire database (including migrations) and
# then optionally seed the database with custom data. To skip seeding
# (and only reset the database), use the `--no-seed` option.
#
# This script is meant to be run with `yarn db:reset` (from the
# project root directory)

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../../

# Parse command line arguments
SKIP_SEED=false
for arg in "$@"; do
  if [ "$arg" == "--no-seed" ]; then
    SKIP_SEED=true
  fi
done

# Always reset the database with Supabase's --no-seed option
# (we'll handle seeding ourselves)
yarn supabase db reset --no-seed

# Run our custom seed script unless --no-seed was specified
if [ "$SKIP_SEED" = false ]; then
  echo "Seeding database with custom data..."
  yarn vite-script "$SCRIPT_DIR/seedDatabaseScript.ts"
else
  echo "Skipping database seed (--no-seed specified)"
fi
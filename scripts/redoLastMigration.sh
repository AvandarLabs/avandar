#!/bin/bash

# Summary: Redoes the last migration by removing it, creating a new one, and applying it.
#
# Usage:
#   ./scripts/redoLastMigration.sh [migration_name] [--gen-types]
#
# Description:
#   This script removes the most recent migration, creates a new migration with
#   the same or provided name, applies it, and optionally generates TypeScript types.
#
# Arguments:
#   migration_name   Optional. Name for the new migration. If not provided, the
#                    name from the deleted migration will be used.
#   --gen-types      If provided, it will also generate TypeScript types from
#                    the database schema after applying migrations.

# Set the project root directory
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../
cd $PROJECT_ROOT

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
GEN_TYPES=false
MIGRATION_NAME=""

# Function to display usage information
usage() {
  echo "Usage: ./scripts/redoLastMigration.sh [migration_name] [--gen-types]"
  echo "Redoes the last migration by removing it, creating a new one, and applying it."
  echo "  migration_name   Optional. Name for the new migration."
  echo "  --gen-types      Generate TypeScript types after applying migrations."
  exit 1
}

# Parse arguments
for arg in "$@"; do
  if [[ "$arg" == "--gen-types" ]]; then
    GEN_TYPES=true
  elif [[ "$arg" == "--help" ]] || [[ "$arg" == "-h" ]]; then
    usage
  elif [[ "$arg" =~ ^-- ]]; then
    echo -e "${RED}❌ Error: Invalid argument '$arg'${NC}"
    usage
  else
    if [ -z "$MIGRATION_NAME" ]; then
      MIGRATION_NAME="$arg"
    else
      echo -e "${RED}❌ Error: Multiple migration names provided${NC}"
      usage
    fi
  fi
done

MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo -e "${RED}❌ Error: Migrations directory not found at $MIGRATIONS_DIR${NC}"
  exit 1
fi

# Find the most recent migration by filename ordering (timestamps prefix files)
LATEST_MIGRATION=$(ls -1 "$MIGRATIONS_DIR" | sort | tail -n 1 || true)

if [ -z "${LATEST_MIGRATION}" ]; then
  echo -e "${RED}❌ Error: No migration files found in $MIGRATIONS_DIR${NC}"
  exit 1
fi

# Extract migration name from filename (format: timestamp_name.sql)
# Remove the .sql extension and extract everything after the first underscore
EXTRACTED_MIGRATION_NAME=""
if [ -z "$MIGRATION_NAME" ]; then
  EXTRACTED_MIGRATION_NAME=$(echo "$LATEST_MIGRATION" | sed 's/\.sql$//' | sed 's/^[0-9]*_//')
  if [ -z "$EXTRACTED_MIGRATION_NAME" ]; then
    echo -e "${RED}❌ Error: Could not extract migration name from '$LATEST_MIGRATION'${NC}"
    exit 1
  fi
  MIGRATION_NAME="$EXTRACTED_MIGRATION_NAME"
  echo -e "${BLUE}ℹ️  No migration name provided. Using name from latest migration: ${MIGRATION_NAME}${NC}"
else
  echo -e "${BLUE}ℹ️  Using provided migration name: ${MIGRATION_NAME}${NC}"
fi

# Step 1: Remove the last migration
echo -e "${YELLOW}📦 Step 1: Removing the last migration...${NC}"
echo -e "${BLUE}   Deleting: $LATEST_MIGRATION${NC}"
yarn db:down-migration

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error: Failed to remove the last migration${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Successfully removed the last migration${NC}"

# Step 2: Create a new migration
echo -e "${YELLOW}📝 Step 2: Creating new migration with name: ${MIGRATION_NAME}${NC}"
yarn db:new-migration "$MIGRATION_NAME"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error: Failed to create new migration${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Successfully created new migration${NC}"

# Step 3: Apply migrations
echo -e "${YELLOW}🚀 Step 3: Applying migrations...${NC}"
if [ "$GEN_TYPES" = true ]; then
  yarn db:apply-migrations --gen-types
else
  yarn db:apply-migrations
fi

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error: Failed to apply migrations${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Successfully applied migrations${NC}"

# Step 4: Ask about generating types if --gen-types was not passed
if [ "$GEN_TYPES" = false ]; then
  echo -e "${BLUE}❓ Would you like to generate TypeScript types? (y/n)${NC}"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📘 Generating TypeScript types...${NC}"
    yarn db:gen-types
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ Error: Failed to generate TypeScript types${NC}"
      exit 1
    fi
    echo -e "${GREEN}✅ Successfully generated TypeScript types${NC}"
  else
    echo -e "${BLUE}ℹ️  Skipping TypeScript type generation${NC}"
  fi
fi

echo -e "${GREEN}🎉 Migration redo complete!${NC}"


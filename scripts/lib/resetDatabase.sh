#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../../

yarn supabase db reset --no-seed
yarn vite-script scripts/lib/seedDatabaseScript.ts
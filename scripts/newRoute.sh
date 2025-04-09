#!/bin/bash
SCRIPT_DIR="$(dirname "$(realpath "$0")")"

PROJECT_ROOT=$SCRIPT_DIR/..

touch $PROJECT_ROOT/src/routes/$1.tsx

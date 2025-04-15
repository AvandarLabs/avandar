#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../../

usage() {
  echo "Usage:"
  echo "       yarn new:route <route-path>        # Create a route in src/routes/"
  echo "       yarn new:route auth <route-path>   # Create a route in src/routes/_auth/"
  exit 1
}

if [ $# -eq 0 ]; then
  usage
fi

if [ "$1" = "auth" ]; then
  if [ $# -ne 2 ]; then
    usage
  fi
  mkdir -p $PROJECT_ROOT/src/routes/_auth
  touch $PROJECT_ROOT/src/routes/_auth/$2.tsx
else
  touch $PROJECT_ROOT/src/routes/$1.tsx
fi

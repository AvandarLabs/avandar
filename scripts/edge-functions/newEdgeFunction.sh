#!/bin/bash

PROJECT_ROOT=$(yarn --silent util:get-project-root)
cd "$PROJECT_ROOT" || exit

SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

usage() {
  echo "Usage:"
  echo "       yarn new:function <function-name>"
  echo "Creates a new Supabase edge function in the supabase/functions directory"
  echo "Example:"
  echo "       yarn new:function hello-world"
  echo "       # Creates supabase/functions/hello-world/"
  echo "       # And adds functions.hello-world to Supabase config.toml"
  exit 1
}

if [ $# -eq 0 ]; then
  usage
fi

supabase functions new $1
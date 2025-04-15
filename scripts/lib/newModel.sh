#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../../

usage() {
  echo "Usage:"
  echo "       yarn new:model <model-name>   # Create a model in src/models/"
  exit 1
}

if [ $# -ne 1 ]; then
  usage
fi

MODEL_NAME=$1
BASE_PATH=src/models/$1.ts
MODEL_FILE=$PROJECT_ROOT/$BASE_PATH

# Create models directory if it doesn't exist
mkdir -p $PROJECT_ROOT/src/models

# Create the model file with default contents
cat > $MODEL_FILE << EOL
import type { UUID } from "@/lib/types/common";

export type ${MODEL_NAME}Id = UUID<"${MODEL_NAME}">;

export type ${MODEL_NAME} = {
  id: ${MODEL_NAME}Id;
}

EOL

echo "Created new model in $MODEL_FILE"

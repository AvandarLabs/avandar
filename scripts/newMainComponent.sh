#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: yarn new-main-component <ComponentName>"
    echo "Creates a new React component in src/components/<ComponentName>/"
    echo "Example: yarn new-main-component MyNewComponent"
    echo "         Creates src/components/MyNewComponent/MyNewComponent.tsx"
    exit 1
fi

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/..

COMPONENT_PATH="src/components/$1/$1.tsx"
FULL_PATH="$PROJECT_ROOT/$COMPONENT_PATH"

if [ -f "$FULL_PATH" ]; then
    echo "Error: Component already exists at $COMPONENT_PATH"
    exit 1
fi

mkdir -p "$PROJECT_ROOT/src/components/$1"

cat > "$FULL_PATH" << EOL
import { Text } from "@mantine/core";

export function $1(): JSX.Element {
  return <Text>Hello</Text>;
}
EOL

echo "Created new component in $COMPONENT_PATH"
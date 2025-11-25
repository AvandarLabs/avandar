#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/../

usage() {
  echo "Usage:"
  echo "       npm run new:script <scriptname>"
  echo "Creates a new shell script in the scripts/ directory"
  echo "Example:"
  echo "       npm run new:script hello   # Creates scripts/hello.sh"
  exit 1
}

if [ $# -eq 0 ]; then
  usage
fi

BASE_PATH=scripts/$1.sh
NEW_FILE=$PROJECT_ROOT/$BASE_PATH

# delete the script if it already exists
rm -f -- "$NEW_FILE" 2>/dev/null

cat > $NEW_FILE << EOL
#!/bin/bash

SCRIPT_DIR="\$(dirname "\$(realpath "\$0")")"
PROJECT_ROOT=\$SCRIPT_DIR/../

usage() {
  echo "Usage:"
  echo "        [command]"
  exit 1
}

if [ \$# -eq 0 ]; then
  usage
fi

echo "Hello!"
EOL

echo "Created new script in $BASE_PATH"
chmod +x $NEW_FILE
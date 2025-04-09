#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: yarn new-script <scriptname>"
    echo "Creates a new shell script in the scripts/ directory"
    echo "Example: yarn new-script hello"
    echo "         Creates scripts/hello.sh"
    exit 1
fi

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT=$SCRIPT_DIR/..

BASE_PATH=scripts/$1.sh
NEW_FILE=$PROJECT_ROOT/$BASE_PATH

# delete the script if it already exists
rm -f -- "$NEW_FILE" 2>/dev/null

touch $NEW_FILE
echo "#!/bin/bash" >> $NEW_FILE
echo "" >> $NEW_FILE
echo 'SCRIPT_DIR="$(dirname "$(realpath "$0")")"' >> $NEW_FILE
echo "PROJECT_ROOT=\$SCRIPT_DIR/.." >> $NEW_FILE
echo "" >> $NEW_FILE
echo "echo \"Hello!\"" >> $NEW_FILE

echo "Created new script in $BASE_PATH"
chmod +x $NEW_FILE
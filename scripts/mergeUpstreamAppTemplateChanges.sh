#!/bin/bash

# Set the downstream branch to the first argument or default to "main"
DOWNSTREAM_BRANCH=${1:-main}

echo "Attempting to checkout local branch $DOWNSTREAM_BRANCH"

# Checkout the specified downstream branch
git checkout "$DOWNSTREAM_BRANCH"

# Fetch latest changes from upstream/main
git fetch upstream

# Merge upstream/main into the specified downstream branch
echo "Attempting to merge upstream SaaS app template into $DOWNSTREAM_BRANCH"
git merge upstream/main

# Push the merged changes back to the downstream branch in origin
echo "Attempting to push changes back to origin/$DOWNSTREAM_BRANCH"
git push origin "$DOWNSTREAM_BRANCH"

echo "Merged upstream SaaS app template into $DOWNSTREAM_BRANCH and pushed to origin successfully."
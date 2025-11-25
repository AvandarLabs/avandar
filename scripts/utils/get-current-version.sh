#!/bin/bash

# This script gets the current version from the package.json file.
cat package.json | grep --color=auto '"version":'
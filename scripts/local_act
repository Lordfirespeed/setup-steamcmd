#!/bin/bash

# Runs workflows locally using https://github.com/nektos/act

npm install
npm run build

act -P ubuntu-latest=catthehacker/ubuntu:act-latest

"$@"

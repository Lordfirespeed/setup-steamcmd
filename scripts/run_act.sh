#!/bin/bash

# Runs workflows locally using https://github.com/nektos/act

npm install
npm run build

act \
--platform ubuntu-latest=ubuntu-latest \
--platform ubuntu-20.04=node:16-buster-slim
"$@"

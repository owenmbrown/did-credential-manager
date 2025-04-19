#!/bin/bash

# Function to kill all child processes on Ctrl+C
cleanup() {
  echo "Stopping all services..."
  pkill -P $$
  exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT

# Start each service in a subshell
(
  cd ./snap && yarn start
) &

(
  cd ./demo/dmv-app/backend && npm start
) &

(
  cd ./demo/dmv-app/frontend && npm run dev
) &

(
  cd ./demo/bank-app/backend && npm start
) &

(
  cd ./demo/bank-app/frontend && npm run dev
) &

# Wait for all background jobs
wait

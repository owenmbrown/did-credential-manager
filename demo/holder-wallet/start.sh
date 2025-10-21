#!/bin/bash

# Holder Wallet Startup Script
# This script starts the React wallet app for the holder

echo "🚀 Starting DID Holder Wallet..."
echo ""

# Check if holder backend is running
echo "Checking if holder backend is running on port 3002..."
if ! nc -z localhost 3002 2>/dev/null; then
  echo "⚠️  Warning: Holder backend doesn't appear to be running on port 3002"
  echo "   Start it with: cd holder && npm run dev"
  echo ""
fi

# Start the wallet app
echo "Starting wallet app on http://localhost:5173..."
npm run dev


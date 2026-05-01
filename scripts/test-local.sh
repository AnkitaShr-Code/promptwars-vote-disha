#!/bin/bash
set -e

echo "=== VoteDisha Local Test ==="

echo "1. Running shared unit tests..."
cd shared && npx jest --testPathPattern=__tests__ && cd ..

echo "2. Building functions..."
cd functions && npm run build && cd ..

echo "3. Building frontend..."
cd frontend && npm run build && cd ..

echo "=== All checks passed ==="

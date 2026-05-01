#!/bin/bash

# ==============================================================================
# VoteDisha Local Emulator Test Script
# ==============================================================================

set -e

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧹 Cleaning up existing emulator processes...${NC}"
pkill -f firebase || true

echo -e "\n${BLUE}🏗 Building functions...${NC}"
cd functions
npm run build
cd ..

echo -e "\n${BLUE}🚀 Starting Firebase Emulators (Functions + Firestore)...${NC}"
firebase emulators:start --only functions,firestore

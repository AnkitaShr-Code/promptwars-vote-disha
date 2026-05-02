#!/bin/bash

# ==============================================================================
# VoteDisha Production Deployment Script
# ==============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting VoteDisha production deployment...${NC}"

# --- SECTION 1: Pre-flight checks ---
echo -e "\n${BLUE}[1/10] Running pre-flight checks...${NC}"

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: firebase CLI is not installed.${NC}"
    exit 1
fi
echo -e "✓ Firebase CLI: $(firebase --version)"

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    exit 1
fi
echo -e "✓ gcloud CLI: $(gcloud --version | head -n 1)"

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "${RED}Error: Node.js version 20 or higher is required. Current: v$NODE_VERSION${NC}"
    exit 1
fi
echo -e "✓ Node.js: v$NODE_VERSION"

# Check .env
if [ ! -f "functions/.env" ]; then
    echo -e "${YELLOW}Warning: functions/.env not found. Secrets will not be auto-updated.${NC}"
else
    echo -e "✓ Found functions/.env"
fi

# Get active project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
echo -e "${YELLOW}Active GCP Project: ${PROJECT_ID}${NC}"

read -p "Deploy to this project? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Deployment cancelled.${NC}"
    exit 0
fi

# --- SECTION 2: Run tests ---
echo -e "\n${BLUE}[2/10] Running shared logic tests...${NC}"
cd shared
npm install
if ! npm test; then
    echo -e "${RED}Error: Shared tests failed. Aborting deployment.${NC}"
    exit 1
fi
cd ..
echo -e "${GREEN}✓ All tests passed!${NC}"

# --- SECTION 3: Build functions ---
echo -e "\n${BLUE}[3/10] Building Cloud Functions...${NC}"
cd functions
npm install --production=false
if ! npm run build; then
    echo -e "${RED}Error: Functions build failed.${NC}"
    exit 1
fi
cd ..
echo -e "${GREEN}✓ Functions built successfully.${NC}"

# --- SECTION 4: Build frontend ---
echo -e "\n${BLUE}[4/10] Building Frontend...${NC}"

# Update .env.production with correct API URL
echo -e "Updating frontend/.env.production for project: ${PROJECT_ID}"
FUNCTION_URL="https://asia-south1-${PROJECT_ID}.cloudfunctions.net"
echo "VITE_API_BASE_URL=${FUNCTION_URL}" > frontend/.env.production
echo "VITE_API_URL=${FUNCTION_URL}" >> frontend/.env.production

cd frontend
npm install
if ! npm run build; then
    echo -e "${RED}Error: Frontend build failed.${NC}"
    exit 1
fi
cd ..
echo -e "${GREEN}✓ Frontend built successfully.${NC}"

# --- SECTION 5: Set Firebase secrets ---
echo -e "\n${BLUE}[5/10] Syncing secrets to Firebase...${NC}"
SECRET_FILE="functions/.secret.local"
ENV_FILE="functions/.env"

KEYS=("GEMINI_MODEL" "VERTEX_PROJECT_ID" "VERTEX_LOCATION" "FRONTEND_ORIGIN")

for KEY in "${KEYS[@]}"; do
    # Try .secret.local first, then .env
    VALUE=""
    if [ -f "$SECRET_FILE" ]; then
        VALUE=$(grep "^${KEY}=" "$SECRET_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi
    
    if [ -z "$VALUE" ] && [ -f "$ENV_FILE" ]; then
        VALUE=$(grep "^${KEY}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi

    if [ -n "$VALUE" ]; then
        # Automatically override localhost FRONTEND_ORIGIN with production URL
        if [[ "$KEY" == "FRONTEND_ORIGIN" && "$VALUE" == *"localhost"* ]]; then
            PROD_URL="https://${PROJECT_ID}.web.app"
            echo -e "Overriding FRONTEND_ORIGIN from localhost to: $PROD_URL"
            VALUE="$PROD_URL"
        fi
        
        echo -e "Setting secret: $KEY"
        echo "$VALUE" | firebase functions:secrets:set "$KEY" --data-file=-
    else
        if [[ "$KEY" == "GEMINI_API_KEY" ]]; then
            echo -e "${YELLOW}Warning: GEMINI_API_KEY not found. Falling back to Vertex AI Enterprise.${NC}"
        else
            echo -e "${YELLOW}Warning: $KEY not found. Skipping.${NC}"
        fi
    fi
done
echo -e "${GREEN}✓ Secrets synchronized.${NC}"

# --- SECTION 6: Deploy Backend Functions (Cloud Run v2) ---
echo -e "\n${BLUE}[6/10] Deploying Functions to Cloud Run v2...${NC}"
firebase deploy --only functions
echo -e "${GREEN}✓ Functions deployed successfully to Cloud Run.${NC}"

# --- SECTION 7: Deploy Frontend to Cloud Run ---
echo -e "\n${BLUE}[7/10] Deploying Frontend to Cloud Run...${NC}"

# We use Cloud Build to build the Docker image and push to GCR
echo -e "Building frontend container image..."
gcloud builds submit --config cloudbuild.yaml \
    --substitutions=_VITE_API_BASE_URL="${FUNCTION_URL}" \
    .

# Deploy the image to Cloud Run
echo -e "Deploying to Cloud Run service: votedisha-frontend"
gcloud run deploy votedisha-frontend \
    --image gcr.io/${PROJECT_ID}/votedisha-frontend \
    --platform managed \
    --region asia-south1 \
    --allow-unauthenticated

# Get the frontend URL
FRONTEND_CR_URL=$(gcloud run services describe votedisha-frontend --platform managed --region asia-south1 --format='value(status.url)')
echo -e "${GREEN}✓ Frontend deployed to Cloud Run: ${FRONTEND_CR_URL}${NC}"

# --- SECTION 8: Deploy Firebase Hosting (Cloud Run Hosting) ---
echo -e "\n${BLUE}[8/10] Deploying Hosting configuration (Rewriting to Cloud Run)...${NC}"
firebase deploy --only hosting
echo -e "${GREEN}✓ Hosting configured to serve Cloud Run.${NC}"

# --- SECTION 9: Deploy Firestore rules and indexes ---
echo -e "\n${BLUE}[9/10] Deploying Firestore configuration...${NC}"
firebase deploy --only firestore
echo -e "${GREEN}✓ Firestore configuration deployed.${NC}"

# --- SECTION 10: Smoke test ---
echo -e "\n${BLUE}[10/10] Running production smoke test...${NC}"

# Attempt to get the actual Cloud Run URL for the function (v2)
echo "Fetching function URL..."
SMOKE_URL=$(gcloud functions describe resolveState --region asia-south1 --format='value(serviceConfig.uri)' 2>/dev/null || echo "")

if [ -z "$SMOKE_URL" ]; then
    # Fallback to standard Firebase URL format
    SMOKE_URL="https://asia-south1-${PROJECT_ID}.cloudfunctions.net/resolveState"
fi

echo "Testing endpoint: $SMOKE_URL"

# Allow up to 10 seconds for the function to cold start
RESPONSE=$(curl -s -X POST "$SMOKE_URL" \
    -H "Content-Type: application/json" \
    -d '{"state":"Maharashtra","age":25,"isRegistered":false,"preferredLanguage":"en"}' \
    --max-time 15)

if [[ $RESPONSE == *"voterState"* ]]; then
    echo -e "${GREEN}✓ Smoke test passed! Response received valid voter state.${NC}"
else
    echo -e "${YELLOW}⚠ Smoke test failed or returned unexpected response.${NC}"
    echo -e "Response: $RESPONSE"
    echo -e "Check Cloud Function logs at: https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22resolvestate%22"
fi

# --- SECTION 10: Print summary ---
echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}VOTEDISHA DEPLOYMENT COMPLETE!${NC}"
echo -e "✓ Functions deployed (Cloud Run v2)"
echo -e "✓ Frontend deployed (Cloud Run)"
echo -e "✓ Hosting configured (Cloud Run Hosting)"
echo -e "✓ Firestore rules deployed"
echo -e "\nResources:"
echo -e "- Frontend URL (Cloud Run): ${FRONTEND_CR_URL}"
echo -e "- Frontend URL (Static): https://${PROJECT_ID}.web.app"
echo -e "- Functions URL: ${FUNCTION_URL}"
echo -e "- Firebase Console: https://console.firebase.google.com/project/${PROJECT_ID}"
echo -e "${GREEN}==============================================================================${NC}"

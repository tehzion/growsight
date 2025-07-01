#!/bin/bash

# 360 Feedback Platform - Build and Deploy Script
# Builds React app locally and deploys with Docker Compose + Caddy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 360 Feedback Platform - Build & Deploy${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo -e "   Creating .env from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${YELLOW}   Please update .env with your values before continuing${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env.example found${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env

# Build the React app locally
echo -e "${BLUE}📦 Building React app...${NC}"
if ! npm ci; then
    echo -e "${RED}❌ npm ci failed${NC}"
    exit 1
fi

if ! npm run build; then
    echo -e "${RED}❌ npm run build failed${NC}"
    exit 1
fi

# Verify build
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ Build failed - dist/index.html not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p volumes/caddy/{data,config,logs}
mkdir -p volumes/storage
mkdir -p volumes/db/data

# Check if services are already running
if docker compose ps | grep -q "Up"; then
    echo -e "${YELLOW}🔄 Services already running, restarting...${NC}"
    docker compose restart caddy
else
    echo -e "${BLUE}🐳 Starting all services...${NC}"
    docker compose up -d
fi

echo -e "${BLUE}🔍 Waiting for services to start...${NC}"
sleep 15

# Check service health
echo -e "${BLUE}📊 Service Status:${NC}"
docker compose ps

# Database Migration Function
run_migrations() {
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    
    # Wait for database to be ready
    echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
    until docker compose exec -T db pg_isready -U postgres; do
        echo -e "${YELLOW}   Database not ready, waiting...${NC}"
        sleep 2
    done
    
    # Count migration files
    MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l)
    if [ "$MIGRATION_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No migration files found in supabase/migrations/${NC}"
        return
    fi
    
    echo -e "${BLUE}   Found ${MIGRATION_COUNT} migration files${NC}"
    
    # Run each migration in order with retry logic
    for migration_file in supabase/migrations/*.sql; do
        if [ -f "$migration_file" ]; then
            migration_name=$(basename "$migration_file")
            echo -e "${BLUE}   Running: ${migration_name}${NC}"
            
            # Retry migration up to 3 times to handle deadlocks
            retry_count=0
            max_retries=3
            
            while [ $retry_count -lt $max_retries ]; do
                if docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$migration_file" 2>/dev/null; then
                    echo -e "${GREEN}   ✅ ${migration_name} completed${NC}"
                    break
                else
                    retry_count=$((retry_count + 1))
                    if [ $retry_count -lt $max_retries ]; then
                        echo -e "${YELLOW}   ⏳ ${migration_name} failed, retrying... ($retry_count/$max_retries)${NC}"
                        sleep 2
                    else
                        echo -e "${RED}   ❌ ${migration_name} failed after $max_retries attempts${NC}"
                        echo -e "${YELLOW}   Continuing with remaining migrations...${NC}"
                    fi
                fi
            done
        fi
    done
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Optional migration execution
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    run_migrations
else
    echo -e "${YELLOW}💡 To run database migrations, set: ${NC}RUN_MIGRATIONS=true${NC}"
    echo -e "${YELLOW}   Or run manually: ${NC}RUN_MIGRATIONS=true ./build-and-deploy.sh${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""

# Determine URLs based on environment
if [ "${DOMAIN:-localhost}" = "localhost" ]; then
    FRONTEND_URL="https://localhost"
    STUDIO_URL="https://studio.localhost"
    API_URL="https://api.localhost/rest/v1/"
    echo -e "${BLUE}🌐 Development URLs:${NC}"
else
    FRONTEND_URL="https://${DOMAIN}"
    STUDIO_URL="https://studio.${DOMAIN}"
    API_URL="https://api.${DOMAIN}/rest/v1/"
    echo -e "${BLUE}🌐 Production URLs:${NC}"
fi

echo -e "   Frontend:       ${FRONTEND_URL}"
echo -e "   Supabase Studio: ${STUDIO_URL}"
echo -e "   API:            ${API_URL}"
echo ""

echo -e "${BLUE}📊 Useful Commands:${NC}"
echo -e "   View all logs:    ${YELLOW}docker compose logs -f${NC}"
echo -e "   View Caddy logs:  ${YELLOW}docker compose logs -f caddy${NC}"
echo -e "   View Kong logs:   ${YELLOW}docker compose logs -f kong${NC}"
echo -e "   Stop services:    ${YELLOW}docker compose down${NC}"
echo -e "   Rebuild frontend: ${YELLOW}npm run build && docker compose restart caddy${NC}"
echo ""

# Production-specific information
if [ "${DOMAIN:-localhost}" != "localhost" ]; then
    echo -e "${GREEN}🔒 Production deployment detected!${NC}"
    echo -e "   Domain: ${DOMAIN}"
    echo -e "   SSL certificates will be automatically obtained by Caddy"
    echo ""
    echo -e "${YELLOW}⚠️  Production Checklist:${NC}"
    echo -e "   □ DNS points to this server"
    echo -e "   □ Ports 80 and 443 are open"
    echo -e "   □ Domain is set correctly in .env"
    echo -e "   □ Production secrets updated in .env"
    echo -e "   □ Email SMTP configured"
    echo ""
fi

# Health check
echo -e "${BLUE}🏥 Running health check...${NC}"
if curl -k -f -s "${FRONTEND_URL}" > /dev/null; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    echo -e "   Check logs: docker compose logs caddy"
fi
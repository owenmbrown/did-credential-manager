# Setup Guide - DID Credential Manager

## Prerequisites

Before starting, ensure you have the following installed on your computer:

1. **Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Minimum version: Docker 20.10 or higher
   - After installation, verify Docker is running by opening Docker Desktop

2. **Web Browser**
   - Chrome, Firefox, Safari, or Edge (latest version recommended)

3. **Terminal/Command Line Access**
   - Mac: Use Terminal (found in Applications > Utilities)
   - Windows: Use Command Prompt or PowerShell
   - Linux: Use your preferred terminal application

## Setup Steps

### Step 1: Verify Docker Installation

Open your terminal and run:

```bash
docker --version
docker-compose --version
```

You should see version numbers displayed. If you see an error, Docker is not properly installed.

### Step 2: Navigate to Project Directory

In your terminal, navigate to the project folder:

```bash
cd /Users/owenbrown/Documents/did-credential-manager
```

Note: Replace the path above with the actual path where you have the project on your computer.

### Step 3: Start All Services

Run the following command to build and start all services:

```bash
npm run docker
```

Alternative command (if npm is not available):

```bash
docker-compose up --build
```

**What happens now:**
- Docker will download required images (first time only - may take 5-10 minutes)
- Docker will build all application containers
- All services will start automatically
- You will see logs scrolling in your terminal

**Important:** Keep this terminal window open. Closing it will stop all services.

### Step 4: Wait for Services to Start

Wait approximately 60-90 seconds for all services to fully start and become healthy.

You can check if services are ready by opening a new terminal window and running:

```bash
docker-compose ps
```

All services should show "healthy" status.

### Step 5: Verify All Services Are Running

Open the following URLs in your web browser to confirm each service is accessible:

#### Backend Services (APIs)

- Issuer API Health: http://localhost:5001/health
- Verifier API Health: http://localhost:5002/health
- Holder API Health: http://localhost:5003/health

Each should display: `{"status":"ok"}`

#### Web Applications

- Issuer Web Interface: http://localhost:5171
- Verifier Web Interface: http://localhost:5172
- Holder Wallet Interface: http://localhost:5173

Each should load a web page with a user interface.

## Service Overview

### Backend Services (APIs)

These run in the background and handle credential operations:

- **Issuer Service** (Port 5001): Issues verifiable credentials to holders
- **Holder Service** (Port 5003): Stores credentials and creates presentations
- **Verifier Service** (Port 5002): Requests and verifies credential presentations

### Web Applications

These provide user interfaces for interacting with the backend services:

- **Issuer Web** (Port 5171): Interface for creating and issuing credentials
- **Holder Wallet** (Port 5173): Interface for managing and presenting credentials
- **Verifier Web** (Port 5172): Interface for requesting and verifying credentials

## Useful Docker Commands

Run these commands from the project directory in your terminal:

### View Logs

To see what's happening in all services:

```bash
npm run docker:logs
```

Or:

```bash
docker-compose logs -f
```

Press `Ctrl+C` to stop viewing logs (services will continue running).

### Check Service Status

```bash
npm run docker:ps
```

Or:

```bash
docker-compose ps
```

### Stop All Services

```bash
npm run docker:down
```

Or:

```bash
docker-compose down
```

### Restart All Services

```bash
npm run docker:restart
```

Or:

```bash
docker-compose restart
```

### Start Services in Background

If you want to run services in the background (no logs in terminal):

```bash
npm run docker:up
```

Or:

```bash
docker-compose up -d
```

### Clean Up Everything

To completely remove all containers, volumes, and images:

```bash
npm run docker:clean
```

Or:

```bash
docker-compose down -v --rmi all
```

**Warning:** This will delete all stored credentials and data.

## Troubleshooting

### Problem: Docker command not found

**Solution:** Install Docker Desktop from https://www.docker.com/products/docker-desktop

### Problem: Port already in use

**Solution:** 
1. Check if another application is using ports 5001, 5002, 5003, 5171, 5172, or 5173
2. Stop the conflicting application
3. Or edit `docker-compose.yml` to use different ports

### Problem: Services show "unhealthy" status

**Solution:**
1. Wait an additional 30-60 seconds
2. Check logs: `npm run docker:logs`
3. Restart services: `npm run docker:restart`

### Problem: Web interface shows "Cannot connect to backend"

**Solution:**
1. Verify backend health endpoints are responding (Step 5 above)
2. Clear browser cache and refresh the page
3. Check Docker logs for errors: `npm run docker:logs`

### Problem: Changes not reflected after rebuild

**Solution:**
1. Stop services: `npm run docker:down`
2. Rebuild without cache: `docker-compose build --no-cache`
3. Start services: `npm run docker:up`

### Problem: Running out of disk space

**Solution:**
1. Clean up old Docker images: `docker system prune -a`
2. Remove unused volumes: `docker volume prune`

## Next Steps

Once all services are running successfully, proceed to the `END_TO_END_FLOW.md` guide to test the complete credential issuance and verification workflow.

## Support

If you encounter issues not covered in this guide:
1. Check Docker Desktop is running
2. Review logs: `npm run docker:logs`
3. Ensure all prerequisites are installed correctly
4. Try restarting Docker Desktop


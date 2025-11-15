# Network Setup Guide

## Running Backend on Network IP (10.45.107.163:8000)

### Option 1: Using the Python Script (Recommended)

```bash
python run_server.py
```

This will start the server on `0.0.0.0:8000`, making it accessible from any device on the network.

### Option 2: Using uvicorn Directly

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or to bind to a specific IP:

```bash
uvicorn app.main:app --host 10.45.107.163 --port 8000
```

### Option 3: Using Environment Variables

You can override the host and port using environment variables:

```bash
# Windows PowerShell
$env:HOST="0.0.0.0"; $env:PORT="8000"; python run_server.py

# Windows CMD
set HOST=0.0.0.0
set PORT=8000
python run_server.py

# Linux/Mac
export HOST=0.0.0.0
export PORT=8000
python run_server.py
```

### Configuration

The server settings are configured in `app/config.py`:
- `HOST`: Default is `"0.0.0.0"` (binds to all interfaces)
- `PORT`: Default is `8000`

You can override these by setting environment variables:
- `HOST`: Server host (default: "0.0.0.0")
- `PORT`: Server port (default: 8000)

### Accessing the API

Once running, the API will be accessible at:
- `http://10.45.107.163:8000` (from other devices on the network)
- `http://localhost:8000` (from the same machine)
- `http://0.0.0.0:8000` (from the same machine)

### Frontend Configuration

Make sure your frontend `.env` file includes:

```env
VITE_API_URL=http://10.45.107.163:8000
```

Or update `vite.config.ts` proxy target to point to `http://10.45.107.163:8000`.

### Firewall Considerations

If other devices can't connect, make sure:
1. Windows Firewall allows incoming connections on port 8000
2. Your network allows connections between devices
3. The server is actually binding to `0.0.0.0` (not just `127.0.0.1`)

### Testing Network Access

From another device on the network, test with:

```bash
curl http://10.45.107.163:8000/health
```

Or open in a browser: `http://10.45.107.163:8000/health`


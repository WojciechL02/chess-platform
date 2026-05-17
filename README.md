# _Chess.com_-like platform

## Installation:
Fill-in the `./backend/.env` and `./frontend/.env` files.

The analysis service relies on the Stockfish engine binary, so install it before running the backend:
```bash
brew install stockfish     # macOS
# or: apt install stockfish # Debian/Ubuntu
```
Then set `STOCKFISH_PATH` in `./backend/.env` if it isn't on `$PATH`.

### Backend:
```bash
cd backend
uv sync
```
### Frontend:
```bash
   7 cd frontend
   8 npm install
```

## How to run:
### Backend:
Each of these in new terminal:
```bash
cd backend
uv run -- fastapi dev services/api-gateway/app/main.py --port 8000
uv run -- fastapi dev services/users-service/app/main.py --port 8001
uv run -- fastapi dev services/matchmaker/app/main.py --port 8002
uv run -- fastapi dev services/game-service/app/main.py --port 8003
uv run -- fastapi dev services/analysis-service/app/main.py --port 8004
```

### Client-side:
```bash
cd frontend
npm run dev
```


### TODO:
  1. Add Stockfish to Dockerfile
  2. `gcloud run deploy llm-service --concurrency=1 --timeout=300 --max-instances=10 --min-instances=0`
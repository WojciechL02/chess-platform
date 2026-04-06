# _Chess.com_-like platform

## Installation:
Fill-in the `./backend/.env` and `./frontend/.env` files.

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
```

### Client-side:
```bash
cd frontend
npm run dev
```

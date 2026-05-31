from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, match, players, users, game, analysis
from app.rate_limit import init_redis, close_redis, rate_limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await init_redis(app)
    yield
    # shutdown
    await close_redis(app)


app = FastAPI(title="Chess Platform - API Gateway", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_middlewares(request: Request, call_next):
    if not request.url.path.startswith("/auth"):
        await rate_limiter(request)

    try:
        response = await call_next(request)
        return response
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


app.include_router(auth.router)
app.include_router(match.router)
app.include_router(game.router)
app.include_router(players.router)
app.include_router(users.router)
app.include_router(analysis.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import compile, resumes

app = FastAPI(title="ResumeForge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router)
app.include_router(compile.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

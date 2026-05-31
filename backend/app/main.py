# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from .routes import auth, lessons, appointments, analytics, webrtc

app = FastAPI(
    title="EduHeal API",
    description="Backend API for the EduHeal gamified health learning & telemedicine platform.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(webrtc.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the EduHeal API. Go to /docs for interactive API documentation."
    }

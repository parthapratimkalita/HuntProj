from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.core.config import settings
from app.db.session import engine
from app.models import user, property, booking, payment

# Create database tables
user.Base.metadata.create_all(bind=engine)
property.Base.metadata.create_all(bind=engine)
booking.Base.metadata.create_all(bind=engine)
payment.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "https://*.vercel.app", "http://0.0.0.0:5000", "https://localhost:8443", "http://localhost:4173", "http://localhost:8080"],  # Vite's default development server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 

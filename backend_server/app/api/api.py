from fastapi import APIRouter
from app.api.endpoints import users, properties, bookings, payments, wishlists

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(wishlists.router, prefix="/user/wishlists", tags=["wishlists"])
from fastapi import APIRouter
from app.api.v1 import auth

router = APIRouter(prefix="/v1")
router.include_router(auth.router)

# Thêm router mới vào đây khi mở rộng:
# from app.api.v1 import users, products
# router.include_router(users.router)

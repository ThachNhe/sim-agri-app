# FastAPI Template

Base project chuẩn cho team với FastAPI, PostgreSQL, Alembic, JWT Auth.

## 📁 Cấu trúc project

```
fastapi-template/
├── .gitlab/workflows/ci.yml   # GitLab CI/CD pipeline
├── alembic/                   # Database migrations
│   ├── versions/              # Migration files
│   └── seed_data.py           # Seed data dev/staging
├── app/
│   ├── api/v1/                # Endpoints (auth.py, ...)
│   ├── constants/             # Enums, messages
│   ├── core/                  # DB, settings, logger, exceptions
│   ├── dependencies/          # FastAPI dependencies (auth...)
│   ├── middlewares/           # Logging, rate limit
│   ├── models/                # SQLAlchemy ORM models
│   ├── repositories/          # Data access layer
│   ├── schemas/               # Pydantic schemas
│   ├── services/              # Business logic
│   ├── tasks/                 # Background tasks
│   ├── utils/                 # security (JWT, hash)
│   └── main.py                # App factory
├── docs/                      # Tài liệu, ADR
├── scripts/
│   ├── start.sh               # Khởi chạy server + migrate
│   └── seed.sh                # Seed dữ liệu mẫu
├── tests/
│   ├── conftest.py            # Fixtures dùng chung
│   ├── unit/                  # Unit tests (service, repo)
│   └── integration/           # Integration tests (API)
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── pytest.ini
├── requirements.txt
└── server.py
```

## 🚀 Khởi chạy nhanh

### 1. Chuẩn bị môi trường

```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin của bạn
```

### 2. Chạy với Docker (khuyến nghị)

```bash
docker compose up -d
```

### 3. Chạy thủ công

```bash
# Tạo virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Cài packages
pip install -r requirements.txt

# Chạy migration
alembic upgrade head

# Seed dữ liệu mẫu
python alembic/seed_data.py

# Khởi động server
python server.py
```

## 🔑 Auth endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/auth/register` | Đăng ký tài khoản |
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/refresh` | Làm mới access token |
| GET  | `/api/v1/auth/me` | Thông tin cá nhân |
| PUT  | `/api/v1/auth/change-password` | Đổi mật khẩu |

## 🧪 Chạy tests

```bash
pytest
# Hoặc chỉ một nhóm:
pytest tests/unit/
pytest tests/integration/
```

## 🔐 Seed accounts (dev)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin@123 | admin |
| user@example.com | User@123 | user |

## ➕ Thêm feature mới

1. Tạo model trong `app/models/your_model.py`
2. Import vào `app/models/__init__.py`
3. Tạo repository trong `app/repositories/your_repo.py`
4. Tạo service trong `app/services/your_service.py`
5. Tạo schemas trong `app/schemas/your_schema.py`
6. Tạo router trong `app/api/v1/your_router.py`
7. Đăng ký router trong `app/api/v1/__init__.py`
8. Tạo migration: `alembic revision --autogenerate -m "add your_table"`
9. Chạy migration: `alembic upgrade head`
10. Viết tests trong `tests/`

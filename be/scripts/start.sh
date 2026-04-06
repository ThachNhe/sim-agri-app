#!/bin/bash
set -e

echo "⏳ Chạy migration..."
alembic upgrade head

echo "🚀 Khởi động server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

#!/bin/bash
set -e

echo "🌱 Chạy seed data..."
python alembic/seed_data.py
echo "✅ Xong!"

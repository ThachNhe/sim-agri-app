#!/bin/bash
set -e

echo "🌱 Chạy seed data..."
${PYTHON:-python3} alembic/seed_data.py --reset
echo "✅ Xong!"

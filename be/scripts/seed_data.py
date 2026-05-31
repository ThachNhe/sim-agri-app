"""
Compatibility wrapper for the canonical seed script.

Run from the backend root:
    python3 scripts/seed_data.py
    python3 scripts/seed_data.py --reset
"""
from pathlib import Path
import runpy


if __name__ == "__main__":
    seed_script = Path(__file__).resolve().parents[1] / "alembic" / "seed_data.py"
    runpy.run_path(str(seed_script), run_name="__main__")

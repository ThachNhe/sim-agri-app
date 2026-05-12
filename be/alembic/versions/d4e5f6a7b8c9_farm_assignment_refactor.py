"""Refactor: admin manages farms, assign farmers to zones

Revision ID: d4e5f6a7b8c9
Revises: b7c8d9e0f1a2
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Create farmer_zone_assignments junction table ───────────────────────
    op.create_table(
        'farmer_zone_assignments',
        sa.Column('farmer_id', sa.UUID(), nullable=False),
        sa.Column('zone_id', sa.UUID(), nullable=False),
        sa.Column(
            'assigned_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['farmer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['zone_id'], ['growing_zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('farmer_id', 'zone_id'),
    )

    # ── Migrate existing owner_id data into the junction table ─────────────
    op.execute("""
        INSERT INTO farmer_zone_assignments (farmer_id, zone_id)
        SELECT owner_id, id
        FROM growing_zones
        WHERE owner_id IS NOT NULL
    """)

    # ── Drop owner_id FK constraint then the column ────────────────────────
    op.drop_constraint('growing_zones_owner_id_fkey', 'growing_zones', type_='foreignkey')
    op.drop_column('growing_zones', 'owner_id')


def downgrade() -> None:
    # ── Re-add owner_id column (nullable for safety) ───────────────────────
    op.add_column(
        'growing_zones',
        sa.Column('owner_id', sa.UUID(), nullable=True),
    )

    # ── Restore FK constraint ──────────────────────────────────────────────
    op.create_foreign_key(
        'growing_zones_owner_id_fkey',
        'growing_zones',
        'users',
        ['owner_id'],
        ['id'],
        ondelete='CASCADE',
    )

    # ── Restore data: pick first assignment per zone ───────────────────────
    op.execute("""
        UPDATE growing_zones gz
        SET owner_id = (
            SELECT farmer_id
            FROM farmer_zone_assignments fza
            WHERE fza.zone_id = gz.id
            ORDER BY fza.assigned_at
            LIMIT 1
        )
    """)

    # ── Drop junction table ────────────────────────────────────────────────
    op.drop_table('farmer_zone_assignments')

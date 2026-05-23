"""Add sensor metadata and MQTT automation devices

Revision ID: e8f9a0b1c2d3
Revises: d4e5f6a7b8c9
Create Date: 2026-05-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sensors', sa.Column('location', sa.String(length=255), nullable=True))
    op.add_column('sensors', sa.Column('device_address', sa.String(length=255), nullable=True))
    op.add_column(
        'sensors',
        sa.Column('update_interval_seconds', sa.Integer(), server_default='60', nullable=False),
    )

    op.create_table(
        'devices',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=False),
        sa.Column('type', sa.String(length=50), server_default='pump', nullable=False),
        sa.Column('control_mode', sa.String(length=30), server_default='on_off', nullable=False),
        sa.Column('power_watt', sa.Float(), nullable=True),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('linked_sensor_id', sa.UUID(), nullable=True),
        sa.Column('automation_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('command_topic', sa.String(length=255), server_default='', nullable=False),
        sa.Column('state_topic', sa.String(length=255), server_default='', nullable=False),
        sa.Column('qos', sa.Integer(), server_default='1', nullable=False),
        sa.Column('timeout_seconds', sa.Integer(), server_default='10', nullable=False),
        sa.Column('payload_on', sa.String(length=500), server_default='{"cmd":"ON"}', nullable=False),
        sa.Column('payload_off', sa.String(length=500), server_default='{"cmd":"OFF"}', nullable=False),
        sa.Column('current_state', sa.String(length=20), server_default='off', nullable=False),
        sa.Column('current_value', sa.Float(), server_default='0', nullable=False),
        sa.Column('connection_status', sa.String(length=30), server_default='offline', nullable=False),
        sa.Column('last_command', sa.String(length=500), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['linked_sensor_id'], ['sensors.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_devices_owner_id', 'devices', ['owner_id'], unique=False)
    op.create_index('ix_devices_linked_sensor_id', 'devices', ['linked_sensor_id'], unique=False)

    op.add_column(
        'alerts',
        sa.Column('automation_status', sa.String(length=30), server_default='none', nullable=False),
    )
    op.add_column('alerts', sa.Column('automation_action', sa.String(length=500), nullable=True))
    op.add_column('alerts', sa.Column('automation_device_id', sa.UUID(), nullable=True))
    op.add_column('alerts', sa.Column('automation_device_name', sa.String(length=255), nullable=True))
    op.add_column('alerts', sa.Column('automation_command', sa.String(length=255), nullable=True))
    op.create_foreign_key(
        'alerts_automation_device_id_fkey',
        'alerts',
        'devices',
        ['automation_device_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('alerts_automation_device_id_fkey', 'alerts', type_='foreignkey')
    op.drop_column('alerts', 'automation_command')
    op.drop_column('alerts', 'automation_device_name')
    op.drop_column('alerts', 'automation_device_id')
    op.drop_column('alerts', 'automation_action')
    op.drop_column('alerts', 'automation_status')

    op.drop_index('ix_devices_linked_sensor_id', table_name='devices')
    op.drop_index('ix_devices_owner_id', table_name='devices')
    op.drop_table('devices')

    op.drop_column('sensors', 'update_interval_seconds')
    op.drop_column('sensors', 'device_address')
    op.drop_column('sensors', 'location')

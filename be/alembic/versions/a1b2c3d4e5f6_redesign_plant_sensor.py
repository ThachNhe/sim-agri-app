"""Redesign: plant profiles, growing zones, sensors, actuators

Revision ID: a1b2c3d4e5f6
Revises: 4fe3b21a4d41
Create Date: 2026-04-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '4fe3b21a4d41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Drop old tables (order matters for FK) ────────────────────────────
    op.drop_index('ix_sensor_readings_recorded_at', table_name='sensor_readings')
    op.drop_table('sensor_readings')
    op.drop_index('ix_alerts_triggered_at', table_name='alerts')
    op.drop_table('alerts')
    op.drop_table('devices')

    # Drop old enums
    op.execute("DROP TYPE IF EXISTS devicetype")

    # ── New enums ─────────────────────────────────────────────────────────
    op.execute("""
        CREATE TYPE sensortype AS ENUM (
            'temperature', 'humidity', 'soil_moisture',
            'light', 'ph', 'ec', 'co2'
        )
    """)
    op.execute("""
        CREATE TYPE actuatortype AS ENUM (
            'irrigation', 'fertilizer_pump',
            'grow_light', 'ventilation_fan', 'heater'
        )
    """)
    op.execute("""
        CREATE TYPE actuatorstate AS ENUM ('on', 'off')
    """)
    op.execute("""
        CREATE TYPE alerttype AS ENUM ('above_max', 'below_min', 'device_offline')
    """)
    op.execute("""
        CREATE TYPE alertseverity AS ENUM ('low', 'medium', 'high')
    """)

    # ── plant_profiles ────────────────────────────────────────────────────
    op.create_table(
        'plant_profiles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('temp_min', sa.Float(), nullable=False),
        sa.Column('temp_max', sa.Float(), nullable=False),
        sa.Column('humidity_min', sa.Float(), nullable=False),
        sa.Column('humidity_max', sa.Float(), nullable=False),
        sa.Column('soil_moisture_min', sa.Float(), nullable=False),
        sa.Column('soil_moisture_max', sa.Float(), nullable=False),
        sa.Column('light_min', sa.Float(), nullable=True),
        sa.Column('light_max', sa.Float(), nullable=True),
        sa.Column('ph_min', sa.Float(), nullable=True),
        sa.Column('ph_max', sa.Float(), nullable=True),
        sa.Column('ec_min', sa.Float(), nullable=True),
        sa.Column('ec_max', sa.Float(), nullable=True),
        sa.Column('growth_period_days', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    # ── growing_zones ─────────────────────────────────────────────────────
    op.create_table(
        'growing_zones',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('area_sqm', sa.Float(), nullable=True),
        sa.Column('plant_profile_id', sa.UUID(), nullable=True),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('planting_date', sa.Date(), nullable=True),
        sa.Column('expected_harvest_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plant_profile_id'], ['plant_profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── sensors ───────────────────────────────────────────────────────────
    op.create_table(
        'sensors',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('sensor_type', postgresql.ENUM('temperature', 'humidity', 'soil_moisture',
                                              'light', 'ph', 'ec', 'co2', name='sensortype', create_type=False), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=False),
        sa.Column('zone_id', sa.UUID(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['zone_id'], ['growing_zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── actuators ─────────────────────────────────────────────────────────
    op.create_table(
        'actuators',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('actuator_type', postgresql.ENUM('irrigation', 'fertilizer_pump',
                                               'grow_light', 'ventilation_fan', 'heater',
                                               name='actuatortype', create_type=False), nullable=False),
        sa.Column('zone_id', sa.UUID(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('current_state', postgresql.ENUM('on', 'off', name='actuatorstate', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['zone_id'], ['growing_zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── actuator_commands ─────────────────────────────────────────────────
    op.create_table(
        'actuator_commands',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actuator_id', sa.UUID(), nullable=False),
        sa.Column('commanded_by', sa.UUID(), nullable=True),
        sa.Column('command', postgresql.ENUM('on', 'off', name='actuatorstate', create_type=False), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['actuator_id'], ['actuators.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['commanded_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_actuator_commands_executed_at', 'actuator_commands', ['executed_at'])

    # ── sensor_readings (new schema) ──────────────────────────────────────
    op.create_table(
        'sensor_readings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sensor_id', sa.UUID(), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['sensor_id'], ['sensors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sensor_readings_sensor_id', 'sensor_readings', ['sensor_id'])
    op.create_index('ix_sensor_readings_recorded_at', 'sensor_readings', ['recorded_at'])

    # ── alerts (new schema) ───────────────────────────────────────────────
    op.create_table(
        'alerts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('zone_id', sa.UUID(), nullable=False),
        sa.Column('sensor_id', sa.UUID(), nullable=True),
        sa.Column('alert_type', postgresql.ENUM('above_max', 'below_min', 'device_offline', name='alerttype', create_type=False), nullable=False),
        sa.Column('severity', postgresql.ENUM('low', 'medium', 'high', name='alertseverity', create_type=False), nullable=False),
        sa.Column('parameter', postgresql.ENUM('temperature', 'humidity', 'soil_moisture',
                                               'light', 'ph', 'ec', 'co2', name='sensortype', create_type=False), nullable=True),
        sa.Column('actual_value', sa.Float(), nullable=True),
        sa.Column('threshold_value', sa.Float(), nullable=True),
        sa.Column('message', sa.String(length=500), nullable=False),
        sa.Column('recommended_action', sa.String(length=500), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['zone_id'], ['growing_zones.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sensor_id'], ['sensors.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_alerts_triggered_at', 'alerts', ['triggered_at'])


def downgrade() -> None:
    op.drop_index('ix_alerts_triggered_at', table_name='alerts')
    op.drop_table('alerts')
    op.drop_index('ix_sensor_readings_recorded_at', table_name='sensor_readings')
    op.drop_index('ix_sensor_readings_sensor_id', table_name='sensor_readings')
    op.drop_table('sensor_readings')
    op.drop_index('ix_actuator_commands_executed_at', table_name='actuator_commands')
    op.drop_table('actuator_commands')
    op.drop_table('actuators')
    op.drop_table('sensors')
    op.drop_table('growing_zones')
    op.drop_table('plant_profiles')

    op.execute("DROP TYPE IF EXISTS alertseverity")
    op.execute("DROP TYPE IF EXISTS alerttype")
    op.execute("DROP TYPE IF EXISTS actuatorstate")
    op.execute("DROP TYPE IF EXISTS actuatortype")
    op.execute("DROP TYPE IF EXISTS sensortype")

    # Re-create old schema would require full recreation; skip for brevity.

from unittest.mock import MagicMock

from app.constants.enums import AlertType, DeviceAutomationTrigger
from app.tasks.nasa_fetcher import (
    _automation_value_for_device,
    _device_matches_automation_trigger,
)


def test_device_matches_only_configured_automation_direction():
    device = MagicMock()
    device.automation_trigger = DeviceAutomationTrigger.BELOW_MIN.value

    assert _device_matches_automation_trigger(device, AlertType.BELOW_MIN)
    assert not _device_matches_automation_trigger(device, AlertType.ABOVE_MAX)


def test_device_matches_both_directions_by_default():
    device = MagicMock()
    device.automation_trigger = None

    assert _device_matches_automation_trigger(device, AlertType.BELOW_MIN)
    assert _device_matches_automation_trigger(device, AlertType.ABOVE_MAX)


def test_automation_uses_on_command_for_auto_runs():
    state, value, command = _automation_value_for_device("on_off")

    assert state == "on"
    assert value == 1.0
    assert command == "ON"

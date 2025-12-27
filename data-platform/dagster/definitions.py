"""
Dagster Definitions.

Main entry point for the HousingIQ data platform Dagster deployment.
"""

import sys
from pathlib import Path

from dagster import Definitions, load_assets_from_modules

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from . import assets
from .resources import default_resources
from .schedules import schedules
from .sensors import sensors

# Load all assets from the assets module
all_assets = load_assets_from_modules([assets])

defs = Definitions(
    assets=all_assets,
    schedules=schedules,
    sensors=sensors,
    resources=default_resources,
)

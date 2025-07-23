from dataclasses import dataclass
from typing import List, Optional, Dict, Any
import pandas as pd

@dataclass
class SessionInfo:
    year: int
    round_number: int
    session_name: str
    session_type: str
    grand_prix_name: str
    circuit_name: str

@dataclass
class DriverInfo:
    driver_code: str
    driver_name: str
    team_name: str
    team_color: str

@dataclass
class LapData:
    lap_number: int
    lap_time: Optional[float]
    sector_1_time: Optional[float]
    sector_2_time: Optional[float]
    sector_3_time: Optional[float]
    is_personal_best: bool
    compound: Optional[str]
    tyre_life: Optional[int]

@dataclass
class TelemetryData:
    distance: List[float]
    speed: List[float]
    throttle: List[float]
    brake: List[float]
    gear: List[int]
    drs: List[int]
    time: List[float]

@dataclass
class TrackData:
    x_coordinates: List[float]
    y_coordinates: List[float]
    distance_markers: List[float]
    corner_numbers: List[int]
    sector_boundaries: List[float]

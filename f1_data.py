import fastf1
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging
from models import SessionInfo, DriverInfo, LapData, TelemetryData, TrackData
from app import cache

# Enable FastF1 cache
fastf1.Cache.enable_cache('cache')

class F1DataService:
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    @cache.memoize(timeout=3600)
    def get_available_years(self) -> List[int]:
        """Get list of available years"""
        try:
            # FastF1 supports data from 2018 onwards reliably
            current_year = 2025
            return list(range(2018, current_year + 1))
        except Exception as e:
            self.logger.error(f"Error getting available years: {e}")
            return [2024, 2023, 2022, 2021, 2020, 2019, 2018]
    
    @cache.memoize(timeout=3600)
    def get_season_schedule(self, year: int) -> List[Dict]:
        """Get race schedule for a given year"""
        try:
            schedule = fastf1.get_event_schedule(year)
            races = []
            for idx, row in schedule.iterrows():
                races.append({
                    'round_number': row['RoundNumber'],
                    'grand_prix_name': row['EventName'],
                    'circuit_name': row['Location'],
                    'date': row['EventDate'].strftime('%Y-%m-%d') if pd.notna(row['EventDate']) else None
                })
            return races
        except Exception as e:
            self.logger.error(f"Error getting season schedule for {year}: {e}")
            return []
    
    @cache.memoize(timeout=1800)
    def get_session_info(self, year: int, round_number: int) -> Dict[str, SessionInfo]:
        """Get session information for a specific round"""
        try:
            event = fastf1.get_event(year, round_number)
            sessions = {}
            
            session_types = {
                'FP1': 'Practice 1',
                'FP2': 'Practice 2', 
                'FP3': 'Practice 3',
                'Q': 'Qualifying',
                'R': 'Race'
            }
            
            for session_key, session_name in session_types.items():
                try:
                    session = event.get_session(session_key)
                    if session is not None:
                        sessions[session_key] = SessionInfo(
                            year=year,
                            round_number=round_number,
                            session_name=session_name,
                            session_type=session_key,
                            grand_prix_name=event['EventName'],
                            circuit_name=event['Location']
                        )
                except:
                    continue
            
            return sessions
        except Exception as e:
            self.logger.error(f"Error getting session info for {year} round {round_number}: {e}")
            return {}
    
    @cache.memoize(timeout=1800)
    def get_drivers_in_session(self, year: int, round_number: int, session_type: str) -> List[DriverInfo]:
        """Get list of drivers in a specific session"""
        try:
            session = fastf1.get_session(year, round_number, session_type)
            session.load()
            
            drivers = []
            results = session.results
            
            for idx, row in results.iterrows():
                driver_code = row['Abbreviation']
                team_name = row['TeamName']
                
                # Get team color (simplified mapping)
                team_colors = {
                    'Red Bull Racing': '#3671C6',
                    'Ferrari': '#ED1131',
                    'Mercedes': '#6CD3BF',
                    'McLaren': '#F47600',
                    'Alpine': '#2293D1',
                    'AlphaTauri': '#5E8FAA',
                    'Aston Martin': '#358C75',
                    'Williams': '#37003C',
                    'Alfa Romeo': '#C92D4B',
                    'Haas': '#B6BABD'
                }
                
                color = team_colors.get(team_name, '#808080')
                
                drivers.append(DriverInfo(
                    driver_code=driver_code,
                    driver_name=f"{row['FirstName']} {row['LastName']}",
                    team_name=team_name,
                    team_color=color
                ))
            
            return drivers
        except Exception as e:
            self.logger.error(f"Error getting drivers for {year} round {round_number} {session_type}: {e}")
            return []
    
    @cache.memoize(timeout=1800)
    def get_lap_data(self, year: int, round_number: int, session_type: str, driver_codes: List[str]) -> Dict[str, List[LapData]]:
        """Get lap data for specified drivers"""
        try:
            session = fastf1.get_session(year, round_number, session_type)
            session.load()
            
            lap_data = {}
            
            for driver_code in driver_codes:
                try:
                    driver_laps = session.laps.pick_driver(driver_code)
                    laps = []
                    
                    for idx, lap in driver_laps.iterrows():
                        lap_time = lap['LapTime'].total_seconds() if pd.notna(lap['LapTime']) else None
                        
                        laps.append(LapData(
                            lap_number=lap['LapNumber'],
                            lap_time=lap_time,
                            sector_1_time=lap['Sector1Time'].total_seconds() if pd.notna(lap['Sector1Time']) else None,
                            sector_2_time=lap['Sector2Time'].total_seconds() if pd.notna(lap['Sector2Time']) else None,
                            sector_3_time=lap['Sector3Time'].total_seconds() if pd.notna(lap['Sector3Time']) else None,
                            is_personal_best=lap['IsPersonalBest'] if 'IsPersonalBest' in lap else False,
                            compound=lap['Compound'] if 'Compound' in lap else None,
                            tyre_life=lap['TyreLife'] if 'TyreLife' in lap else None
                        ))
                    
                    lap_data[driver_code] = laps
                except Exception as e:
                    self.logger.warning(f"Error getting lap data for driver {driver_code}: {e}")
                    lap_data[driver_code] = []
            
            return lap_data
        except Exception as e:
            self.logger.error(f"Error getting lap data: {e}")
            return {}
    
    @cache.memoize(timeout=1800)
    def get_telemetry_data(self, year: int, round_number: int, session_type: str, driver_code: str, lap_number: int) -> Optional[TelemetryData]:
        """Get telemetry data for a specific lap"""
        try:
            session = fastf1.get_session(year, round_number, session_type)
            session.load()
            
            lap = session.laps.pick_driver(driver_code).pick_lap(lap_number)
            telemetry = lap.get_telemetry()
            
            if telemetry.empty:
                return None
            
            return TelemetryData(
                distance=telemetry['Distance'].tolist(),
                speed=telemetry['Speed'].tolist(),
                throttle=telemetry['Throttle'].tolist(),
                brake=telemetry['Brake'].tolist(),
                gear=telemetry['nGear'].tolist(),
                drs=telemetry['DRS'].tolist() if 'DRS' in telemetry.columns else [0] * len(telemetry),
                time=telemetry['Time'].dt.total_seconds().tolist()
            )
        except Exception as e:
            self.logger.error(f"Error getting telemetry data: {e}")
            return None
    
    @cache.memoize(timeout=3600)
    def get_track_data(self, year: int, round_number: int, session_type: str) -> Optional[TrackData]:
        """Get track layout data"""
        try:
            session = fastf1.get_session(year, round_number, session_type)
            session.load()
            
            # Get a reference lap for track data
            fastest_lap = session.laps.pick_fastest()
            telemetry = fastest_lap.get_telemetry()
            
            if telemetry.empty:
                return None
            
            return TrackData(
                x_coordinates=telemetry['X'].tolist(),
                y_coordinates=telemetry['Y'].tolist(),
                distance_markers=telemetry['Distance'].tolist(),
                corner_numbers=[], # Would need additional processing to identify corners
                sector_boundaries=[] # Would need sector boundary identification
            )
        except Exception as e:
            self.logger.error(f"Error getting track data: {e}")
            return None

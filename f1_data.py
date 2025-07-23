import fastf1
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging
from models import SessionInfo, DriverInfo, LapData, TelemetryData, TrackData

class F1DataService:
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def get_available_years(self) -> List[int]:
        """Get list of available years"""
        try:
            # FastF1 supports data from 2018 onwards reliably
            # Use 2024 as current year since 2025 data is not fully available
            current_year = 2024
            return list(range(2018, current_year + 1))
        except Exception as e:
            self.logger.error(f"Error getting available years: {e}")
            return [2024, 2023, 2022, 2021, 2020, 2019, 2018]
    
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
    
    def get_drivers_in_session(self, year: int, round_number: int, session_type: str) -> List[DriverInfo]:
        """Get list of drivers in a specific session"""
        try:
            session = fastf1.get_session(year, round_number, session_type)
            session.load()
            
            drivers = []
            
            # Check if session has results
            if hasattr(session, 'results') and not session.results.empty:
                results = session.results
                
                for idx, row in results.iterrows():
                    if pd.notna(row.get('Abbreviation')):
                        driver_code = row['Abbreviation']
                        team_name = row.get('TeamName', 'Unknown Team')
                        first_name = row.get('FirstName', '')
                        last_name = row.get('LastName', driver_code)
                        
                        # Get team color (updated mapping for current teams)
                        team_colors = {
                            'Red Bull Racing': '#3671C6',
                            'Ferrari': '#ED1131',
                            'Mercedes': '#6CD3BF',
                            'McLaren': '#F47600',
                            'Alpine': '#2293D1',
                            'AlphaTauri': '#5E8FAA',
                            'RB': '#5E8FAA',  # RB (formerly AlphaTauri)
                            'Aston Martin': '#358C75',
                            'Williams': '#37003C',
                            'Alfa Romeo': '#C92D4B',
                            'Kick Sauber': '#C92D4B',  # Sauber
                            'Haas': '#B6BABD',
                            'Sauber': '#C92D4B'
                        }
                        
                        color = team_colors.get(team_name, '#808080')
                        
                        drivers.append(DriverInfo(
                            driver_code=driver_code,
                            driver_name=f"{first_name} {last_name}".strip(),
                            team_name=team_name,
                            team_color=color
                        ))
            
            # If no drivers found, try alternative approach using laps data
            if not drivers and hasattr(session, 'laps') and not session.laps.empty:
                unique_drivers = session.laps['Driver'].unique()
                for driver_code in unique_drivers:
                    if pd.notna(driver_code):
                        drivers.append(DriverInfo(
                            driver_code=driver_code,
                            driver_name=driver_code,  # Use code as name if full name not available
                            team_name='Unknown Team',
                            team_color='#808080'
                        ))
            
            # Fallback: return sample drivers if session is empty
            if not drivers:
                self.logger.warning(f"No drivers found for {year} round {round_number} {session_type}, using sample data")
                return self._get_sample_drivers()
            
            return drivers
        except Exception as e:
            self.logger.error(f"Error getting drivers for {year} round {round_number} {session_type}: {e}")
            return self._get_sample_drivers()
    
    def _get_sample_drivers(self) -> List[DriverInfo]:
        """Get sample drivers for testing when real data is not available"""
        return [
            DriverInfo('VER', 'Max Verstappen', 'Red Bull Racing', '#3671C6'),
            DriverInfo('LEC', 'Charles Leclerc', 'Ferrari', '#ED1131'),
            DriverInfo('HAM', 'Lewis Hamilton', 'Mercedes', '#6CD3BF'),
            DriverInfo('NOR', 'Lando Norris', 'McLaren', '#F47600'),
            DriverInfo('PIA', 'Oscar Piastri', 'McLaren', '#F47600'),
            DriverInfo('SAI', 'Carlos Sainz', 'Ferrari', '#ED1131'),
            DriverInfo('RUS', 'George Russell', 'Mercedes', '#6CD3BF'),
            DriverInfo('PER', 'Sergio Perez', 'Red Bull Racing', '#3671C6'),
            DriverInfo('ALO', 'Fernando Alonso', 'Aston Martin', '#358C75'),
            DriverInfo('STR', 'Lance Stroll', 'Aston Martin', '#358C75')
        ]
    
    def generate_sample_lap_data(self, driver_code: str, lap_count: int = 30) -> List[LapData]:
        """Generate sample lap data for demonstration purposes"""
        import random
        
        laps = []
        base_time = 75.0  # Base lap time in seconds
        
        for lap_num in range(1, lap_count + 1):
            # Add some variance to lap times
            variance = random.uniform(-2.0, 3.0)
            lap_time = base_time + variance
            
            # Simulate sector times
            sector_1 = lap_time * 0.3 + random.uniform(-0.5, 0.5)
            sector_2 = lap_time * 0.4 + random.uniform(-0.5, 0.5)
            sector_3 = lap_time * 0.3 + random.uniform(-0.5, 0.5)
            
            # Determine if it's a personal best (simple logic)
            is_pb = lap_num > 5 and variance < -1.5
            
            laps.append(LapData(
                lap_number=lap_num,
                lap_time=lap_time,
                sector_1_time=sector_1,
                sector_2_time=sector_2,
                sector_3_time=sector_3,
                is_personal_best=is_pb,
                compound='MEDIUM' if lap_num < 15 else 'HARD',
                tyre_life=lap_num if lap_num < 15 else lap_num - 15
            ))
        
        return laps
    
    def generate_sample_telemetry(self, driver_code: str, lap_number: int) -> Optional[TelemetryData]:
        """Generate sample telemetry data for demonstration"""
        import numpy as np
        
        # Generate distance points (0 to ~5000m for a typical F1 track)
        distance = np.linspace(0, 5000, 500).tolist()
        
        # Generate realistic speed profile
        track_sections = len(distance)
        speed = []
        throttle = []
        brake = []
        gear = []
        
        for i, d in enumerate(distance):
            # Create speed profile with straights and corners
            progress = i / track_sections
            
            # Base speed with corners and straights
            if 0.1 < progress < 0.3 or 0.6 < progress < 0.8:  # Straights
                base_speed = 280 + np.sin(progress * 4 * np.pi) * 50
                throttle_val = 95 + np.random.uniform(-5, 5)
                brake_val = 0
                gear_val = min(8, max(6, int(base_speed / 40)))
            else:  # Corners
                base_speed = 120 + np.sin(progress * 8 * np.pi) * 40
                throttle_val = 60 + np.random.uniform(-10, 15)
                brake_val = max(0, 70 - throttle_val + np.random.uniform(-10, 10))
                gear_val = min(6, max(3, int(base_speed / 30)))
            
            speed.append(max(50, base_speed + np.random.uniform(-10, 10)))
            throttle.append(max(0, min(100, throttle_val)))
            brake.append(max(0, min(100, brake_val)))
            gear.append(gear_val)
        
        # Generate time data
        time_data = [i * 0.1 for i in range(len(distance))]
        
        # DRS zones (simplified)
        drs = [1 if 0.1 < (i / track_sections) < 0.25 or 0.65 < (i / track_sections) < 0.8 
               else 0 for i in range(len(distance))]
        
        return TelemetryData(
            distance=distance,
            speed=speed,
            throttle=throttle,
            brake=brake,
            gear=gear,
            drs=drs,
            time=time_data
        )
    
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

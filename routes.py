from flask import render_template, request, jsonify, redirect, url_for
from app import app, cache
from f1_data import F1DataService
import json
import logging

f1_service = F1DataService()
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    """Main application page"""
    try:
        years = f1_service.get_available_years()
        current_year = max(years) if years else 2024
        
        # Get current season schedule
        schedule = f1_service.get_season_schedule(current_year)
        
        return render_template('index.html', 
                             years=years, 
                             current_year=current_year,
                             schedule=schedule)
    except Exception as e:
        logger.error(f"Error loading index page: {e}")
        return render_template('index.html', 
                             years=[2024, 2023, 2022], 
                             current_year=2024,
                             schedule=[])

@app.route('/analysis')
def analysis():
    """Analysis page with telemetry visualization"""
    year = request.args.get('year', type=int)
    round_number = request.args.get('round', type=int) 
    session_type = request.args.get('session', default='R')
    driver_codes = request.args.getlist('drivers')
    
    if not year or not round_number:
        return redirect(url_for('index'))
    
    try:
        # Get session info
        sessions = f1_service.get_session_info(year, round_number)
        current_session = sessions.get(session_type)
        
        if not current_session:
            return redirect(url_for('index'))
        
        # Get drivers
        drivers = f1_service.get_drivers_in_session(year, round_number, session_type)
        
        # Get lap data if drivers are selected
        lap_data = {}
        if driver_codes:
            lap_data = f1_service.get_lap_data(year, round_number, session_type, driver_codes)
        
        return render_template('analysis.html',
                             session=current_session,
                             sessions=sessions,
                             drivers=drivers,
                             selected_drivers=driver_codes,
                             lap_data=lap_data)
    except Exception as e:
        logger.error(f"Error loading analysis page: {e}")
        return redirect(url_for('index'))

@app.route('/api/schedule/<int:year>')
def api_schedule(year):
    """API endpoint to get race schedule for a year"""
    try:
        schedule = f1_service.get_season_schedule(year)
        return jsonify({'success': True, 'data': schedule})
    except Exception as e:
        logger.error(f"Error getting schedule for {year}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/sessions/<int:year>/<int:round_number>')
def api_sessions(year, round_number):
    """API endpoint to get available sessions for a race"""
    try:
        sessions = f1_service.get_session_info(year, round_number)
        session_data = {}
        for key, session in sessions.items():
            session_data[key] = {
                'name': session.session_name,
                'type': session.session_type
            }
        return jsonify({'success': True, 'data': session_data})
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/drivers/<int:year>/<int:round_number>/<session_type>')
def api_drivers(year, round_number, session_type):
    """API endpoint to get drivers in a session"""
    try:
        drivers = f1_service.get_drivers_in_session(year, round_number, session_type)
        driver_data = []
        for driver in drivers:
            driver_data.append({
                'code': driver.driver_code,
                'name': driver.driver_name,
                'team': driver.team_name,
                'color': driver.team_color
            })
        return jsonify({'success': True, 'data': driver_data})
    except Exception as e:
        logger.error(f"Error getting drivers: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/telemetry/<int:year>/<int:round_number>/<session_type>/<driver_code>/<int:lap_number>')
def api_telemetry(year, round_number, session_type, driver_code, lap_number):
    """API endpoint to get telemetry data for a specific lap"""
    try:
        telemetry = f1_service.get_telemetry_data(year, round_number, session_type, driver_code, lap_number)
        if telemetry:
            return jsonify({
                'success': True,
                'data': {
                    'distance': telemetry.distance,
                    'speed': telemetry.speed,
                    'throttle': telemetry.throttle,
                    'brake': telemetry.brake,
                    'gear': telemetry.gear,
                    'drs': telemetry.drs,
                    'time': telemetry.time
                }
            })
        else:
            return jsonify({'success': False, 'error': 'No telemetry data available'})
    except Exception as e:
        logger.error(f"Error getting telemetry: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/track/<int:year>/<int:round_number>/<session_type>')
def api_track(year, round_number, session_type):
    """API endpoint to get track layout data"""
    try:
        track_data = f1_service.get_track_data(year, round_number, session_type)
        if track_data:
            return jsonify({
                'success': True,
                'data': {
                    'x': track_data.x_coordinates,
                    'y': track_data.y_coordinates,
                    'distance': track_data.distance_markers
                }
            })
        else:
            return jsonify({'success': False, 'error': 'No track data available'})
    except Exception as e:
        logger.error(f"Error getting track data: {e}")
        return jsonify({'success': False, 'error': str(e)})

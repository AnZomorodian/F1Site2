from flask import render_template, request, jsonify, redirect, url_for, Response
from app import app
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
            # If no real data, generate sample data for demonstration
            if not lap_data or all(not laps for laps in lap_data.values()):
                lap_data = {}
                for driver_code in driver_codes:
                    lap_data[driver_code] = f1_service.generate_sample_lap_data(driver_code)
        
        # Format lap times for display
        def format_lap_time(seconds):
            if not seconds or seconds <= 0:
                return None
            minutes = int(seconds // 60)
            remaining_seconds = seconds % 60
            return f"{minutes}:{remaining_seconds:06.3f}"
        
        return render_template('analysis.html',
                             session=current_session,
                             sessions=sessions,
                             drivers=drivers,
                             selected_drivers=driver_codes,
                             lap_data=lap_data,
                             format_lap_time=format_lap_time)
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

@app.route('/api/circuit-layout/<int:year>/<int:round_number>/<session_type>/<driver_code>/<int:lap_number>')
def api_circuit_layout(year, round_number, session_type, driver_code, lap_number):
    """API endpoint to get circuit layout with speed visualization"""
    try:
        circuit_image = f1_service.generate_circuit_layout(year, round_number, session_type, driver_code, lap_number)
        return jsonify({'success': True, 'data': {'image': circuit_image}})
    except Exception as e:
        logger.error(f"Error generating circuit layout: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/lap_data/<int:year>/<int:round_number>/<session_type>')
def api_lap_data(year, round_number, session_type):
    """API endpoint to get lap data for drivers"""
    try:
        driver_codes = request.args.getlist('drivers')
        if not driver_codes:
            return jsonify({'success': False, 'error': 'No drivers specified'})
        
        lap_data = f1_service.get_lap_data(year, round_number, session_type, driver_codes)
        
        # If no real data available, use sample data for demonstration
        if not lap_data or all(not laps for laps in lap_data.values()):
            lap_data = {}
            for driver_code in driver_codes:
                lap_data[driver_code] = f1_service.generate_sample_lap_data(driver_code)
        
        # Format the data for JSON response
        formatted_data = {}
        for driver_code, laps in lap_data.items():
            formatted_laps = []
            for lap in laps:
                formatted_laps.append({
                    'lap_number': lap.lap_number,
                    'lap_time': lap.lap_time,
                    'lap_time_formatted': format_lap_time_api(lap.lap_time),
                    'sector_1_time': lap.sector_1_time,
                    'sector_2_time': lap.sector_2_time,
                    'sector_3_time': lap.sector_3_time,
                    'is_personal_best': lap.is_personal_best,
                    'compound': lap.compound,
                    'tyre_life': lap.tyre_life
                })
            formatted_data[driver_code] = formatted_laps
        
        return jsonify({'success': True, 'data': formatted_data})
    except Exception as e:
        logger.error(f"Error getting lap data: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/telemetry/<int:year>/<int:round_number>/<session_type>/<driver_code>/<int:lap_number>')
def api_telemetry(year, round_number, session_type, driver_code, lap_number):
    """API endpoint to get telemetry data for a specific lap"""
    try:
        telemetry = f1_service.get_telemetry_data(year, round_number, session_type, driver_code, lap_number)
        
        # If no real telemetry data, generate sample data
        if not telemetry:
            telemetry = f1_service.generate_sample_telemetry(driver_code, lap_number)
        
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
        logger.error(f"Error getting telemetry data: {e}")
        return jsonify({'success': False, 'error': str(e)})

def format_lap_time_api(seconds):
    """Format lap time for API responses"""
    if not seconds or seconds <= 0:
        return None
    minutes = int(seconds // 60)
    remaining_seconds = seconds % 60
    return f"{minutes}:{remaining_seconds:06.3f}"



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

# New page routes
@app.route('/about')
def about():
    """About page"""
    return render_template('about.html')

@app.route('/blog')
def blog():
    """Blog page"""
    return render_template('blog.html')

@app.route('/privacy')
def privacy():
    """Privacy policy page"""
    return render_template('privacy.html')

# Enhanced API endpoints for export and comparison features
@app.route('/api/export/<int:year>/<int:round_number>/<session_type>')
def api_export_data(year, round_number, session_type):
    """API endpoint to export analysis data"""
    try:
        driver_codes = request.args.getlist('drivers')
        export_format = request.args.get('format', 'json')
        
        if not driver_codes:
            return jsonify({'success': False, 'error': 'No drivers selected'})
        
        # Get comprehensive data for export
        export_data = f1_service.get_export_data(year, round_number, session_type, driver_codes)
        
        if export_format == 'csv':
            # Generate CSV format
            csv_data = f1_service.format_as_csv(export_data)
            return csv_data, 200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': f'attachment; filename=f1_analysis_{year}_{round_number}_{session_type}.csv'
            }
        else:
            # Return JSON format
            return jsonify({
                'success': True,
                'data': export_data,
                'meta': {
                    'year': year,
                    'round': round_number,
                    'session': session_type,
                    'drivers': driver_codes,
                    'exported_at': f1_service.get_current_timestamp()
                }
            })
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/compare/<int:year>/<int:round_number>/<session_type>')
def api_compare_drivers(year, round_number, session_type):
    """API endpoint for advanced driver comparison"""
    try:
        driver_codes = request.args.getlist('drivers')
        comparison_type = request.args.get('type', 'performance')
        
        if len(driver_codes) < 2:
            return jsonify({'success': False, 'error': 'At least 2 drivers required for comparison'})
        
        comparison_data = f1_service.get_detailed_comparison(year, round_number, session_type, driver_codes, comparison_type)
        
        return jsonify({
            'success': True,
            'data': comparison_data,
            'meta': {
                'drivers': driver_codes,
                'comparison_type': comparison_type,
                'session_info': f1_service.get_session_info(year, round_number).get(session_type)
            }
        })
    except Exception as e:
        logger.error(f"Error in driver comparison: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/insights/<int:year>/<int:round_number>/<session_type>')
def api_performance_insights(year, round_number, session_type):
    """API endpoint for AI-powered performance insights"""
    try:
        driver_codes = request.args.getlist('drivers')
        
        if not driver_codes:
            return jsonify({'success': False, 'error': 'No drivers selected for analysis'})
        
        # Get AI-powered insights
        insights = f1_service.get_ai_performance_insights(year, round_number, session_type, driver_codes)
        
        return jsonify({
            'success': True,
            'data': insights,
            'timestamp': f1_service.get_current_timestamp()
        })
    except Exception as e:
        logger.error(f"Error generating performance insights: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/weather/<int:year>/<int:round_number>/<session_type>')
def api_weather_data(year, round_number, session_type):
    """API endpoint for weather data"""
    try:
        weather_data = f1_service.get_weather_data(year, round_number, session_type)
        return jsonify({
            'success': True,
            'data': weather_data
        })
    except Exception as e:
        logger.error(f"Error getting weather data: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/fuel/<int:year>/<int:round_number>/<session_type>')
def api_fuel_data(year, round_number, session_type):
    """API endpoint for fuel consumption data"""
    try:
        driver_codes = request.args.getlist('drivers')
        fuel_data = f1_service.get_fuel_data(year, round_number, session_type, driver_codes)
        return jsonify({
            'success': True,
            'data': fuel_data
        })
    except Exception as e:
        logger.error(f"Error getting fuel data: {e}")
        return jsonify({'success': False, 'error': str(e)})

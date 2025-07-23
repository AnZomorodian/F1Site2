// F1 Telemetry Analysis - Main Application JavaScript

class F1TelemetryApp {
    constructor() {
        this.selectedDrivers = new Set();
        this.currentSession = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeTooltips();
        this.loadInitialData();
    }

    bindEvents() {
        // Driver selection events
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('driver-checkbox')) {
                this.handleDriverSelection(e.target);
            }
        });

        // Session type change events
        const sessionSelect = document.getElementById('sessionTypeSelect');
        if (sessionSelect) {
            sessionSelect.addEventListener('change', () => {
                this.handleSessionChange();
            });
        }

        // Form submission events
        const sessionForm = document.getElementById('sessionForm');
        if (sessionForm) {
            sessionForm.addEventListener('submit', (e) => {
                this.handleFormSubmission(e);
            });
        }

        // Lap time click events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('lap-time')) {
                this.handleLapTimeClick(e.target);
            }
        });
    }

    initializeTooltips() {
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    loadInitialData() {
        // Load initial data based on current page
        const currentPage = document.body.dataset.page;
        
        if (currentPage === 'index') {
            this.initializeHomePageData();
        } else if (currentPage === 'analysis') {
            this.initializeAnalysisPageData();
        }
    }

    initializeHomePageData() {
        const yearSelect = document.getElementById('yearSelect');
        if (yearSelect) {
            // Load initial schedule
            this.loadScheduleForYear(yearSelect.value);
        }
    }

    initializeAnalysisPageData() {
        // Initialize driver checkboxes
        const checkboxes = document.querySelectorAll('.driver-checkbox');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                this.selectedDrivers.add(checkbox.value);
            }
        });
    }

    async loadScheduleForYear(year) {
        try {
            const response = await fetch(`/api/schedule/${year}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateRoundSelect(data.data);
            } else {
                this.showError('Failed to load schedule: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
            this.showError('Network error while loading schedule');
        }
    }

    updateRoundSelect(races) {
        const roundSelect = document.getElementById('roundSelect');
        if (!roundSelect) return;

        roundSelect.innerHTML = '<option value="">Select a Grand Prix...</option>';
        
        races.forEach(race => {
            const option = document.createElement('option');
            option.value = race.round_number;
            option.textContent = race.grand_prix_name;
            option.dataset.circuit = race.circuit_name;
            option.dataset.date = race.date;
            roundSelect.appendChild(option);
        });
    }

    handleDriverSelection(checkbox) {
        const driverCode = checkbox.value;
        
        if (checkbox.checked) {
            this.selectedDrivers.add(driverCode);
        } else {
            this.selectedDrivers.delete(driverCode);
        }

        // Update UI to show selection
        this.updateDriverSelectionUI();
    }

    updateDriverSelectionUI() {
        const updateButton = document.getElementById('updateAnalysis');
        if (updateButton) {
            const count = this.selectedDrivers.size;
            if (count > 0) {
                updateButton.innerHTML = `<i class="fas fa-sync me-1"></i> Update Analysis (${count} drivers)`;
                updateButton.classList.remove('btn-outline-danger');
                updateButton.classList.add('btn-danger');
            } else {
                updateButton.innerHTML = '<i class="fas fa-sync me-1"></i> Select drivers to analyze';
                updateButton.classList.remove('btn-danger');
                updateButton.classList.add('btn-outline-danger');
            }
        }
    }

    handleSessionChange() {
        // Clear current data when session changes
        this.clearTelemetryData();
        
        // Update available drivers for new session
        const sessionType = document.getElementById('sessionTypeSelect').value;
        if (sessionType) {
            this.loadDriversForSession(sessionType);
        }
    }

    async loadDriversForSession(sessionType) {
        const year = this.getCurrentYear();
        const round = this.getCurrentRound();
        
        if (!year || !round) return;

        try {
            const response = await fetch(`/api/drivers/${year}/${round}/${sessionType}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateDriverSelection(data.data);
            } else {
                this.showError('Failed to load drivers: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading drivers:', error);
            this.showError('Network error while loading drivers');
        }
    }

    updateDriverSelection(drivers) {
        const driverSelection = document.getElementById('driverSelection');
        if (!driverSelection) return;

        driverSelection.innerHTML = '';
        
        drivers.forEach(driver => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input driver-checkbox" type="checkbox" 
                       value="${driver.code}" id="driver_${driver.code}"
                       data-color="${driver.color}">
                <label class="form-check-label" for="driver_${driver.code}">
                    <span class="driver-color-box" style="background-color: ${driver.color}"></span>
                    ${driver.code} - ${driver.name}
                </label>
            `;
            driverSelection.appendChild(div);
        });

        // Clear selected drivers
        this.selectedDrivers.clear();
        this.updateDriverSelectionUI();
    }

    handleFormSubmission(e) {
        const form = e.target;
        const formData = new FormData(form);
        
        // Validate required fields
        const year = formData.get('year');
        const round = formData.get('round');
        const session = formData.get('session');
        
        if (!year || !round || !session) {
            e.preventDefault();
            this.showError('Please select year, round, and session');
            return;
        }

        // Show loading state
        this.showLoading(form);
    }

    async handleLapTimeClick(element) {
        const driver = element.dataset.driver;
        const lap = element.dataset.lap;
        const lapTime = element.dataset.time;
        
        if (!driver || !lap) return;

        // Highlight selected lap time
        this.highlightLapTime(element);
        
        // Load telemetry data
        await this.loadTelemetryData(driver, lap);
    }

    highlightLapTime(element) {
        // Remove previous highlights
        document.querySelectorAll('.lap-time.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add highlight to selected lap time
        element.classList.add('selected');
        
        // Show telemetry section
        const telemetryMessage = document.getElementById('telemetryMessage');
        const telemetryCharts = document.getElementById('telemetryCharts');
        
        if (telemetryMessage) telemetryMessage.style.display = 'none';
        if (telemetryCharts) telemetryCharts.style.display = 'block';
    }

    async loadTelemetryData(driver, lap) {
        const year = this.getCurrentYear();
        const round = this.getCurrentRound();
        const session = this.getCurrentSessionType();
        
        console.log('Loading telemetry data:', { year, round, session, driver, lap });
        
        if (!year || !round || !session) {
            console.error('Missing session data:', { year, round, session });
            this.showError('Missing session information. Please refresh the page.');
            return;
        }
        
        try {
            this.showLoadingSpinner();
            
            const url = `/api/telemetry/${year}/${round}/${session}/${driver}/${lap}`;
            console.log('Fetching telemetry from:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                await this.renderTelemetryCharts(data.data, driver, lap);
            } else {
                this.showError('Failed to load telemetry: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading telemetry:', error);
            this.showError('Network error while loading telemetry');
        } finally {
            this.hideLoadingSpinner();
        }
    }

    clearTelemetryData() {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        
        // Hide telemetry section
        const telemetryMessage = document.getElementById('telemetryMessage');
        const telemetryCharts = document.getElementById('telemetryCharts');
        
        if (telemetryMessage) telemetryMessage.style.display = 'block';
        if (telemetryCharts) telemetryCharts.style.display = 'none';
        
        // Clear lap time highlights
        document.querySelectorAll('.lap-time.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    // Utility methods
    getCurrentYear() {
        // Try multiple ways to get the year
        const sessionData = document.querySelector('[data-session-year]');
        if (sessionData && sessionData.dataset.sessionYear) {
            return sessionData.dataset.sessionYear;
        }
        
        // Fallback: check if it's in the page URL or form
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('year')) {
            return urlParams.get('year');
        }
        
        // Another fallback: check if there's session info in the page
        const sessionInfo = document.querySelector('.session-info');
        if (sessionInfo && sessionInfo.dataset.year) {
            return sessionInfo.dataset.year;
        }
        
        return null;
    }

    getCurrentRound() {
        // Try multiple ways to get the round
        const sessionData = document.querySelector('[data-session-round]');
        if (sessionData && sessionData.dataset.sessionRound) {
            return sessionData.dataset.sessionRound;
        }
        
        // Fallback: check if it's in the page URL or form
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('round')) {
            return urlParams.get('round');
        }
        
        // Another fallback: check if there's session info in the page
        const sessionInfo = document.querySelector('.session-info');
        if (sessionInfo && sessionInfo.dataset.round) {
            return sessionInfo.dataset.round;
        }
        
        return null;
    }

    getCurrentSessionType() {
        const sessionSelect = document.getElementById('sessionTypeSelect');
        if (sessionSelect && sessionSelect.value) {
            return sessionSelect.value;
        }
        
        // Fallback: check URL params
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('session')) {
            return urlParams.get('session');
        }
        
        // Another fallback: check if there's session info in the page
        const sessionInfo = document.querySelector('.session-info');
        if (sessionInfo && sessionInfo.dataset.session) {
            return sessionInfo.dataset.session;
        }
        
        return null;
    }

    showError(message) {
        // Create and show error alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of main content
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(alertDiv, main.firstChild);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    showLoading(element) {
        element.classList.add('loading');
        const button = element.querySelector('button[type="submit"]');
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
            button.disabled = true;
        }
    }

    hideLoading(element) {
        element.classList.remove('loading');
        const button = element.querySelector('button[type="submit"]');
        if (button) {
            button.innerHTML = '<i class="fas fa-chart-line me-2"></i>Analyze Session';
            button.disabled = false;
        }
    }

    showLoadingSpinner() {
        const chartsContainer = document.getElementById('telemetryCharts');
        if (chartsContainer) {
            chartsContainer.classList.add('loading');
        }
    }

    hideLoadingSpinner() {
        const chartsContainer = document.getElementById('telemetryCharts');
        if (chartsContainer) {
            chartsContainer.classList.remove('loading');
        }
    }

    formatLapTime(seconds) {
        if (!seconds || seconds <= 0) return 'N/A';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.f1App = new F1TelemetryApp();
});

// Global utility functions
window.F1Utils = {
    formatLapTime: (seconds) => {
        if (!seconds || seconds <= 0) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
    },
    
    getDriverColor: (driverCode) => {
        const checkbox = document.querySelector(`input[value="${driverCode}"]`);
        return checkbox ? checkbox.dataset.color : '#808080';
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

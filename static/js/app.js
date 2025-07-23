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
        const roundSelect = document.getElementById('roundSelect');
        
        if (yearSelect) {
            // Load initial schedule
            this.loadScheduleForYear(yearSelect.value);
            
            // Add event listener for year changes
            yearSelect.addEventListener('change', () => {
                this.loadScheduleForYear(yearSelect.value);
                roundSelect.value = '';
                this.clearSessions();
            });
        }
        
        if (roundSelect) {
            // Add event listener for round changes
            roundSelect.addEventListener('change', () => {
                if (roundSelect.value && yearSelect.value) {
                    this.loadSessionsForRound(yearSelect.value, roundSelect.value);
                } else {
                    this.clearSessions();
                }
            });
        }
    }

    loadSessionsForRound(year, round) {
        const sessionSelect = document.getElementById('sessionSelect');
        if (!sessionSelect) return;
        
        // Show loading state
        sessionSelect.innerHTML = '<option value="">Loading sessions...</option>';
        sessionSelect.disabled = true;
        
        fetch(`/api/sessions/${year}/${round}`)
            .then(response => response.json())
            .then(sessions => {
                sessionSelect.innerHTML = '<option value="">Select a session...</option>';
                
                sessions.forEach(session => {
                    const option = document.createElement('option');
                    option.value = session.value;
                    option.textContent = session.name;
                    option.disabled = !session.available;
                    
                    if (session.value === 'R' && session.available) {
                        option.selected = true;
                    }
                    
                    sessionSelect.appendChild(option);
                });
                
                sessionSelect.disabled = false;
            })
            .catch(error => {
                console.error('Error loading sessions:', error);
                this.loadDefaultSessions();
            });
    }
    
    loadDefaultSessions() {
        const sessionSelect = document.getElementById('sessionSelect');
        if (!sessionSelect) return;
        
        const defaultSessions = [
            {value: 'FP1', name: 'Practice 1', available: false},
            {value: 'FP2', name: 'Practice 2', available: false},
            {value: 'FP3', name: 'Practice 3', available: false},
            {value: 'Q', name: 'Qualifying', available: false},
            {value: 'R', name: 'Race', available: true}
        ];
        
        sessionSelect.innerHTML = '<option value="">Select a session...</option>';
        
        defaultSessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.value;
            option.textContent = session.name;
            option.disabled = !session.available;
            
            if (session.value === 'R') {
                option.selected = true;
            }
            
            sessionSelect.appendChild(option);
        });
        
        sessionSelect.disabled = false;
    }
    
    clearSessions() {
        const sessionSelect = document.getElementById('sessionSelect');
        if (sessionSelect) {
            sessionSelect.innerHTML = '<option value="">Select a Grand Prix first...</option>';
            sessionSelect.disabled = true;
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

// Custom Insights Engine Functions
function generateCustomInsights() {
    const button = document.getElementById('insightsEngineBtn');
    const content = document.getElementById('customInsightsContent');
    const loading = document.getElementById('insightsLoading');
    
    if (!button || !content) return;
    
    // Show loading animation
    loading.style.display = 'flex';
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Get current session parameters
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const round = urlParams.get('round');
    const session = urlParams.get('session') || 'R';
    
    if (!year || !round) {
        showInsightsError('Session parameters not found');
        return;
    }
    
    // Make API call to custom insights engine
    fetch(`/api/custom-insights/${year}/${round}/${session}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayCustomInsights(data.insights, data.engine);
                button.innerHTML = '<i class="fas fa-brain"></i> Refresh Insights';
            } else {
                showInsightsError(data.error || 'Failed to generate insights');
            }
        })
        .catch(error => {
            console.error('Error generating insights:', error);
            showInsightsError('Network error occurred');
        })
        .finally(() => {
            loading.style.display = 'none';
            button.disabled = false;
        });
}

function displayCustomInsights(insights, engine) {
    const content = document.getElementById('customInsightsContent');
    if (!content) return;
    
    const insightsHtml = `
        <div class="custom-insights-grid">
            ${insights.map(insight => `
                <div class="insight-card">
                    <div class="insight-header">
                        <div class="insight-icon">
                            <i class="fas ${insight.icon}"></i>
                        </div>
                        <h6 class="insight-title">${insight.title}</h6>
                    </div>
                    <div class="insight-content">
                        <p>${insight.content}</p>
                        <div class="insight-data-points mt-3">
                            <strong>Key Data:</strong>
                            <ul class="list-unstyled mt-2">
                                ${insight.data_points.map(point => `<li>• ${point}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="insight-recommendation mt-3">
                            <strong>Recommendation:</strong>
                            <p class="mt-1 text-warning">${insight.recommendation}</p>
                        </div>
                    </div>
                    <div class="insight-rating">
                        <div class="rating-stars">
                            ${Array.from({length: 5}, (_, i) => 
                                `<span class="star ${i < Math.floor(insight.rating) ? 'fas' : 'far'} fa-star"></span>`
                            ).join('')}
                        </div>
                        <span class="rating-text">Confidence: ${insight.rating.toFixed(1)}/5.0</span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="text-center mt-3">
            <small class="text-muted">
                <i class="fas fa-cogs me-1"></i>
                Powered by ${engine}
            </small>
        </div>
    `;
    
    content.innerHTML = insightsHtml;
}

function showInsightsError(message) {
    const content = document.getElementById('customInsightsContent');
    const button = document.getElementById('insightsEngineBtn');
    
    if (content) {
        content.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle text-warning mb-3" style="font-size: 2rem;"></i>
                <p class="text-muted">${message}</p>
                <button class="btn btn-outline-warning btn-sm mt-2" onclick="generateCustomInsights()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
    
    if (button) {
        button.innerHTML = '<i class="fas fa-brain"></i> Generate Insights';
    }
}

// Loading animation helpers for data sections
function hideLoadingAfterDelay() {
    setTimeout(() => {
        const loadingElements = ['weatherLoading', 'fuelLoading', 'metricsLoading'];
        loadingElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }, 2000);
}

// Auto-hide loading animations on page load
document.addEventListener('DOMContentLoaded', function() {
    hideLoadingAfterDelay();
});

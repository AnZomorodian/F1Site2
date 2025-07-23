// F1 Telemetry Charts - Chart.js Integration

class F1TelemetryCharts {
    constructor() {
        this.charts = {};
        this.defaultOptions = this.getDefaultChartOptions();
    }

    getDefaultChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12,
                            family: 'Segoe UI'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(21, 21, 30, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ed1131',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        };
    }

    async renderTelemetryCharts(telemetryData, driver, lap) {
        if (!telemetryData) {
            console.error('No telemetry data provided');
            return;
        }

        // Destroy existing charts
        this.destroyAllCharts();

        // Update lap information header
        this.updateLapHeader(driver, lap, telemetryData);

        // Calculate performance insights
        this.generatePerformanceInsights(telemetryData);

        // Render individual charts
        await this.renderSpeedChart(telemetryData, driver, lap);
        await this.renderThrottleBrakeChart(telemetryData, driver, lap);
        await this.renderGearChart(telemetryData, driver, lap);
        await this.renderTrackMap(telemetryData, driver, lap);
    }

    updateLapHeader(driver, lap, telemetryData) {
        const lapInfoElement = document.getElementById('currentLapInfo');
        const lapDetailsElement = document.getElementById('currentLapDetails');
        const maxSpeedElement = document.getElementById('maxSpeed');
        const avgSpeedElement = document.getElementById('avgSpeed');

        if (lapInfoElement) {
            lapInfoElement.textContent = `${driver} - Lap ${lap}`;
        }

        if (lapDetailsElement) {
            lapDetailsElement.textContent = `Analyzing telemetry data for detailed performance metrics`;
        }

        if (telemetryData.speed && telemetryData.speed.length > 0) {
            const maxSpeed = Math.max(...telemetryData.speed);
            const avgSpeed = telemetryData.speed.reduce((a, b) => a + b, 0) / telemetryData.speed.length;

            if (maxSpeedElement) {
                maxSpeedElement.textContent = `${maxSpeed.toFixed(1)} km/h`;
            }

            if (avgSpeedElement) {
                avgSpeedElement.textContent = `${avgSpeed.toFixed(1)} km/h`;
            }
        }
    }

    generatePerformanceInsights(telemetryData) {
        if (!telemetryData.speed || !telemetryData.throttle || !telemetryData.brake) {
            return;
        }

        // Speed Analysis
        const maxSpeed = Math.max(...telemetryData.speed);
        const avgSpeed = telemetryData.speed.reduce((a, b) => a + b, 0) / telemetryData.speed.length;
        const speedVariance = this.calculateVariance(telemetryData.speed);
        
        let speedInsight = `Peak speed: ${maxSpeed.toFixed(1)} km/h. `;
        if (speedVariance < 500) {
            speedInsight += "Consistent speed profile with minimal variance.";
        } else {
            speedInsight += "High speed variance indicates aggressive driving style.";
        }

        // Braking Analysis
        const brakeApplications = telemetryData.brake.filter(b => b > 10).length;
        const maxBrake = Math.max(...telemetryData.brake);
        const avgThrottle = telemetryData.throttle.reduce((a, b) => a + b, 0) / telemetryData.throttle.length;

        let brakeInsight = `${brakeApplications} significant braking points detected. `;
        if (maxBrake > 80) {
            brakeInsight += "Heavy braking suggests late braking technique.";
        } else {
            brakeInsight += "Smooth braking profile indicates early braking strategy.";
        }

        // Efficiency Analysis
        const throttleEfficiency = avgThrottle / 100;
        const speedEfficiency = avgSpeed / maxSpeed;
        
        let efficiencyInsight = `Throttle efficiency: ${(throttleEfficiency * 100).toFixed(1)}%. `;
        if (speedEfficiency > 0.7) {
            efficiencyInsight += "High speed maintenance throughout the lap.";
        } else {
            efficiencyInsight += "Significant speed variations, room for improvement.";
        }

        // Update insight elements
        this.updateInsightElement('speedInsight', speedInsight);
        this.updateInsightElement('brakeInsight', brakeInsight);
        this.updateInsightElement('efficiencyInsight', efficiencyInsight);
    }

    calculateVariance(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        return data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
    }

    updateInsightElement(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    async renderSpeedChart(data, driver, lap) {
        const ctx = document.getElementById('speedChart');
        if (!ctx) return;

        const driverColor = window.F1Utils.getDriverColor(driver);

        this.charts.speed = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.distance,
                datasets: [{
                    label: `${driver} - Speed (km/h)`,
                    data: data.speed,
                    borderColor: driverColor,
                    backgroundColor: driverColor + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: `Speed Profile - ${driver} Lap ${lap}`,
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    ...this.defaultOptions.scales,
                    x: {
                        ...this.defaultOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Distance (m)',
                            color: '#b0b0b0'
                        }
                    },
                    y: {
                        ...this.defaultOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Speed (km/h)',
                            color: '#b0b0b0'
                        },
                        min: 0
                    }
                }
            }
        });
    }

    async renderThrottleBrakeChart(data, driver, lap) {
        const ctx = document.getElementById('throttleBrakeChart');
        if (!ctx) return;

        this.charts.throttleBrake = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.distance,
                datasets: [
                    {
                        label: 'Throttle %',
                        data: data.throttle,
                        borderColor: '#00ff00',
                        backgroundColor: '#00ff0020',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Brake',
                        data: data.brake,
                        borderColor: '#ff0000',
                        backgroundColor: '#ff000020',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: `Throttle & Brake - ${driver} Lap ${lap}`,
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ...this.defaultOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Distance (m)',
                            color: '#b0b0b0'
                        }
                    },
                    y: {
                        ...this.defaultOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Percentage / Brake Force',
                            color: '#b0b0b0'
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    async renderGearChart(data, driver, lap) {
        const ctx = document.getElementById('gearChart');
        if (!ctx) return;

        const driverColor = window.F1Utils.getDriverColor(driver);

        this.charts.gear = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.distance,
                datasets: [{
                    label: 'Gear',
                    data: data.gear,
                    borderColor: driverColor,
                    backgroundColor: driverColor + '40',
                    borderWidth: 3,
                    fill: false,
                    stepped: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: `Gear Selection - ${driver} Lap ${lap}`,
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ...this.defaultOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Distance (m)',
                            color: '#b0b0b0'
                        }
                    },
                    y: {
                        ...this.defaultOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Gear',
                            color: '#b0b0b0'
                        },
                        min: 1,
                        max: 8,
                        ticks: {
                            ...this.defaultOptions.scales.y.ticks,
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    async renderTrackMap(data, driver, lap) {
        const ctx = document.getElementById('trackMapChart');
        if (!ctx) return;

        // Load track data
        const year = window.f1App?.getCurrentYear();
        const round = window.f1App?.getCurrentRound();
        const session = window.f1App?.getCurrentSessionType();

        if (!year || !round || !session) {
            console.warn('Missing session data for track map');
            return;
        }

        try {
            const response = await fetch(`/api/track/${year}/${round}/${session}`);
            const trackData = await response.json();

            if (trackData.success && trackData.data) {
                this.renderTrackVisualization(ctx, trackData.data, data, driver, lap);
            } else {
                this.renderSpeedVisualization(ctx, data, driver, lap);
            }
        } catch (error) {
            console.error('Error loading track data:', error);
            this.renderSpeedVisualization(ctx, data, driver, lap);
        }
    }

    renderTrackVisualization(ctx, trackData, telemetryData, driver, lap) {
        const driverColor = window.F1Utils.getDriverColor(driver);

        // Create scatter plot with track coordinates colored by speed
        const scatterData = trackData.x.map((x, index) => {
            const y = trackData.y[index];
            const distance = trackData.distance[index];
            
            // Find corresponding speed data
            const speedIndex = telemetryData.distance.findIndex(d => Math.abs(d - distance) < 10);
            const speed = speedIndex >= 0 ? telemetryData.speed[speedIndex] : 0;
            
            return {
                x: x,
                y: y,
                speed: speed
            };
        });

        this.charts.trackMap = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: `Track Position - ${driver} Lap ${lap}`,
                    data: scatterData,
                    backgroundColor: function(context) {
                        const point = context.parsed;
                        const speed = point.speed || 0;
                        const maxSpeed = Math.max(...telemetryData.speed);
                        const intensity = speed / maxSpeed;
                        return `rgba(237, 17, 49, ${0.3 + intensity * 0.7})`;
                    },
                    borderColor: driverColor,
                    borderWidth: 1,
                    pointRadius: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: `Track Map - ${driver} Lap ${lap}`,
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ...this.defaultOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Track X Position',
                            color: '#b0b0b0'
                        }
                    },
                    y: {
                        ...this.defaultOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Track Y Position',
                            color: '#b0b0b0'
                        }
                    }
                },
                aspectRatio: 1
            }
        });
    }

    renderSpeedVisualization(ctx, data, driver, lap) {
        const driverColor = window.F1Utils.getDriverColor(driver);

        // Create a speed vs distance chart as fallback
        this.charts.trackMap = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.distance.filter((_, index) => index % 10 === 0), // Reduced data points
                datasets: [{
                    label: `Speed Distribution - ${driver} Lap ${lap}`,
                    data: data.speed.filter((_, index) => index % 10 === 0),
                    backgroundColor: function(context) {
                        const value = context.parsed.y;
                        const maxValue = Math.max(...data.speed);
                        const intensity = value / maxValue;
                        return `rgba(237, 17, 49, ${0.3 + intensity * 0.7})`;
                    },
                    borderColor: driverColor,
                    borderWidth: 1
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: `Speed Distribution - ${driver} Lap ${lap}`,
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ...this.defaultOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Distance (m)',
                            color: '#b0b0b0'
                        }
                    },
                    y: {
                        ...this.defaultOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Speed (km/h)',
                            color: '#b0b0b0'
                        }
                    }
                }
            }
        });
    }

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    destroyChart(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].destroy();
            delete this.charts[chartName];
        }
    }
}

// Global function for rendering telemetry charts
window.renderTelemetryCharts = function(telemetryData, driver, lap) {
    if (!window.chartManager) {
        window.chartManager = new F1TelemetryCharts();
    }
    
    return window.chartManager.renderTelemetryCharts(telemetryData, driver, lap);
};

// Initialize chart manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chartManager = new F1TelemetryCharts();
});

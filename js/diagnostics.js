// Developer Diagnostics and Debug System
class DiagnosticsManager {
    constructor() {
        this.enabled = false;
        this.logs = [];
        this.maxLogs = 1000;
        this.apiRequests = [];
        this.maxApiRequests = 100;
        this.playerStatus = {
            state: 'idle',
            streamUrl: null,
            bufferingPercent: 0,
            errors: [],
            lastUpdate: Date.now()
        };
        this.systemStats = {
            fps: 0,
            memoryUsage: 0,
            lastUpdate: Date.now()
        };
        this.connectionStatus = {
            portalUrl: null,
            macAddress: null,
            handshakeStatus: 'disconnected',
            tokenStatus: 'none',
            sessionStatus: 'inactive',
            lastApiCall: null,
            lastUpdate: Date.now()
        };
        
        this.loadSettings();
        this.startMonitoring();
        this.setupKeyboardShortcuts();
    }

    // Load diagnostics settings
    loadSettings() {
        try {
            const settings = localStorage.getItem('iptv_diagnostics_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.enabled = parsed.enabled || false;
            }
        } catch (error) {
            console.error('Error loading diagnostics settings:', error);
        }
    }

    // Save diagnostics settings
    saveSettings() {
        try {
            localStorage.setItem('iptv_diagnostics_settings', JSON.stringify({
                enabled: this.enabled
            }));
        } catch (error) {
            console.error('Error saving diagnostics settings:', error);
        }
    }

    // Toggle debug mode
    toggleDebugMode() {
        this.enabled = !this.enabled;
        this.saveSettings();
        this.log('info', `Debug mode ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }

    // Check if debug mode is enabled
    isEnabled() {
        return this.enabled;
    }

    // Add log entry
    log(level, message, data = null) {
        if (!this.enabled && level !== 'error') return;

        const logEntry = {
            timestamp: Date.now(),
            level: level,
            message: message,
            data: data,
            stack: level === 'error' ? new Error().stack : null
        };

        this.logs.push(logEntry);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output for errors and when debug is enabled
        if (this.enabled || level === 'error') {
            console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}]`, message, data || '');
        }
    }

    // Track API request
    trackApiRequest(url, method, headers, params, response, error = null, duration = 0) {
        const request = {
            timestamp: Date.now(),
            url: url,
            method: method,
            headers: headers,
            params: params,
            response: response,
            error: error,
            duration: duration,
            success: !error
        };

        this.apiRequests.push(request);
        
        // Keep only recent requests
        if (this.apiRequests.length > this.maxApiRequests) {
            this.apiRequests = this.apiRequests.slice(-this.maxApiRequests);
        }

        // Update connection status
        this.updateConnectionStatus();

        this.log('info', `API Request: ${method} ${url}`, {
            duration: duration + 'ms',
            success: !error,
            response: response
        });
    }

    // Update player status
    updatePlayerStatus(state, streamUrl = null, bufferingPercent = 0, error = null) {
        this.playerStatus = {
            state: state,
            streamUrl: streamUrl,
            bufferingPercent: bufferingPercent,
            lastUpdate: Date.now()
        };

        if (error) {
            this.playerStatus.errors.push({
                timestamp: Date.now(),
                error: error
            });
            // Keep only recent errors
            if (this.playerStatus.errors.length > 10) {
                this.playerStatus.errors = this.playerStatus.errors.slice(-10);
            }
        }

        this.log('debug', `Player status: ${state}`, {
            streamUrl: streamUrl,
            bufferingPercent: bufferingPercent,
            error: error
        });
    }

    // Update connection status
    updateConnectionStatus() {
        try {
            const session = window.auth ? window.auth.getSession() : null;
            if (session) {
                this.connectionStatus = {
                    portalUrl: session.portalUrl,
                    macAddress: session.macAddress,
                    handshakeStatus: session.token ? 'completed' : 'pending',
                    tokenStatus: session.token ? 'valid' : 'none',
                    sessionStatus: window.auth.isAuthenticated() ? 'active' : 'inactive',
                    lastApiCall: this.apiRequests.length > 0 ? this.apiRequests[this.apiRequests.length - 1].timestamp : null,
                    lastUpdate: Date.now()
                };
            }
        } catch (error) {
            this.log('error', 'Error updating connection status', error);
        }
    }

    // Start system monitoring
    startMonitoring() {
        // Monitor FPS and memory usage
        setInterval(() => {
            this.updateSystemStats();
        }, 1000);

        // Update connection status periodically
        setInterval(() => {
            this.updateConnectionStatus();
        }, 5000);
    }

    // Update system statistics
    updateSystemStats() {
        try {
            // FPS monitoring (simplified)
            this.systemStats.fps = this.measureFPS();
            
            // Memory usage (if available)
            if (performance.memory) {
                this.systemStats.memoryUsage = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                };
            }
            
            this.systemStats.lastUpdate = Date.now();
        } catch (error) {
            this.log('error', 'Error updating system stats', error);
        }
    }

    // Simple FPS measurement
    measureFPS() {
        if (!this.fpsCounter) {
            this.fpsCounter = {
                frames: 0,
                lastTime: performance.now(),
                fps: 0
            };
        }

        this.fpsCounter.frames++;
        const currentTime = performance.now();
        
        if (currentTime - this.fpsCounter.lastTime >= 1000) {
            this.fpsCounter.fps = Math.round(this.fpsCounter.frames * 1000 / (currentTime - this.fpsCounter.lastTime));
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = currentTime;
        }

        return this.fpsCounter.fps;
    }

    // Setup keyboard shortcuts for diagnostics panel
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Info button or Ctrl+D to open diagnostics
            if (e.key === 'Info' || (e.ctrlKey && e.key === 'd')) {
                e.preventDefault();
                this.showDiagnosticsPanel();
            }
        });
    }

    // Show diagnostics panel
    showDiagnosticsPanel() {
        if (document.getElementById('diagnosticsPanel')) {
            return; // Panel already open
        }

        this.createDiagnosticsPanel();
    }

    // Create and display diagnostics panel
    createDiagnosticsPanel() {
        const panel = document.createElement('div');
        panel.id = 'diagnosticsPanel';
        panel.className = 'diagnostics-panel';
        panel.innerHTML = this.getDiagnosticsPanelHTML();

        document.body.appendChild(panel);

        // Setup event handlers
        this.setupPanelEventHandlers(panel);

        // Start auto-refresh
        this.startPanelRefresh(panel);
    }

    // Get diagnostics panel HTML
    getDiagnosticsPanelHTML() {
        return `
            <div class="diagnostics-header">
                <h3>🔧 Developer Diagnostics</h3>
                <div class="diagnostics-controls">
                    <label>
                        <input type="checkbox" id="debugToggle" ${this.enabled ? 'checked' : ''}>
                        Debug Mode
                    </label>
                    <button id="clearLogs">Clear Logs</button>
                    <button id="closeDiagnostics">✕</button>
                </div>
            </div>
            <div class="diagnostics-tabs">
                <button class="tab-btn active" data-tab="connection">Connection</button>
                <button class="tab-btn" data-tab="api">API Requests</button>
                <button class="tab-btn" data-tab="player">Player</button>
                <button class="tab-btn" data-tab="system">System</button>
                <button class="tab-btn" data-tab="logs">Logs</button>
            </div>
            <div class="diagnostics-content">
                <div id="connectionTab" class="tab-content active"></div>
                <div id="apiTab" class="tab-content"></div>
                <div id="playerTab" class="tab-content"></div>
                <div id="systemTab" class="tab-content"></div>
                <div id="logsTab" class="tab-content"></div>
            </div>
        `;
    }

    // Setup panel event handlers
    setupPanelEventHandlers(panel) {
        // Close button
        panel.querySelector('#closeDiagnostics').addEventListener('click', () => {
            this.closeDiagnosticsPanel();
        });

        // Debug toggle
        panel.querySelector('#debugToggle').addEventListener('change', (e) => {
            this.toggleDebugMode();
        });

        // Clear logs
        panel.querySelector('#clearLogs').addEventListener('click', () => {
            this.clearLogs();
            this.refreshPanelContent();
        });

        // Tab switching
        panel.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('diagnosticsPanel')) {
                this.closeDiagnosticsPanel();
            }
        });
    }

    // Start auto-refresh for panel
    startPanelRefresh(panel) {
        panel.refreshInterval = setInterval(() => {
            if (document.getElementById('diagnosticsPanel')) {
                this.refreshPanelContent();
            } else {
                clearInterval(panel.refreshInterval);
            }
        }, 1000);
    }

    // Switch tabs
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');

        this.refreshPanelContent();
    }

    // Refresh panel content
    refreshPanelContent() {
        const panel = document.getElementById('diagnosticsPanel');
        if (!panel) return;

        // Update connection tab
        const connectionTab = panel.querySelector('#connectionTab');
        if (connectionTab.classList.contains('active')) {
            connectionTab.innerHTML = this.getConnectionTabContent();
        }

        // Update API tab
        const apiTab = panel.querySelector('#apiTab');
        if (apiTab.classList.contains('active')) {
            apiTab.innerHTML = this.getApiTabContent();
        }

        // Update player tab
        const playerTab = panel.querySelector('#playerTab');
        if (playerTab.classList.contains('active')) {
            playerTab.innerHTML = this.getPlayerTabContent();
        }

        // Update system tab
        const systemTab = panel.querySelector('#systemTab');
        if (systemTab.classList.contains('active')) {
            systemTab.innerHTML = this.getSystemTabContent();
        }

        // Update logs tab
        const logsTab = panel.querySelector('#logsTab');
        if (logsTab.classList.contains('active')) {
            logsTab.innerHTML = this.getLogsTabContent();
        }
    }

    // Get connection tab content
    getConnectionTabContent() {
        const status = this.connectionStatus;
        const recentErrors = this.logs.filter(log => log.level === 'error').slice(-3);
        
        return `
            <div class="status-grid">
                <div class="status-item">
                    <label>Portal URL:</label>
                    <span>${status.portalUrl || 'Not connected'}</span>
                </div>
                <div class="status-item">
                    <label>MAC Address:</label>
                    <span>${status.macAddress || 'Not set'}</span>
                </div>
                <div class="status-item">
                    <label>Handshake:</label>
                    <span class="status-${status.handshakeStatus}">${status.handshakeStatus}</span>
                </div>
                <div class="status-item">
                    <label>Token:</label>
                    <span class="status-${status.tokenStatus}">${status.tokenStatus}</span>
                </div>
                <div class="status-item">
                    <label>Session:</label>
                    <span class="status-${status.sessionStatus}">${status.sessionStatus}</span>
                </div>
                <div class="status-item">
                    <label>Last API Call:</label>
                    <span>${status.lastApiCall ? new Date(status.lastApiCall).toLocaleTimeString() : 'None'}</span>
                </div>
            </div>
            ${recentErrors.length > 0 ? `
                <div class="connection-troubleshooting">
                    <h4>🔍 Connection Issues:</h4>
                    ${recentErrors.map(error => `
                        <div class="error-analysis">
                            <strong>${new Date(error.timestamp).toLocaleTimeString()}:</strong> ${error.message}
                            ${error.data && error.data.error ? `<br><em>Details: ${error.data.error}</em>` : ''}
                        </div>
                    `).join('')}
                    <div class="troubleshooting-tips">
                        <h5>💡 Troubleshooting Tips:</h5>
                        <ul>
                            <li><strong>CORS/Failed to fetch:</strong> Portal doesn't allow browser connections. Use desktop app or check portal settings.</li>
                            <li><strong>DNS errors:</strong> Check internet connection and portal URL spelling.</li>
                            <li><strong>Connection refused:</strong> Portal server may be down or blocking connections.</li>
                            <li><strong>Timeout:</strong> Portal server is slow or unreachable. Try again later.</li>
                        </ul>
                    </div>
                </div>
            ` : ''}
        `;
    }

    // Get API tab content
    getApiTabContent() {
        const recentRequests = this.apiRequests.slice(-10).reverse();
        return `
            <div class="api-requests">
                ${recentRequests.map(req => `
                    <div class="api-request ${req.success ? 'success' : 'error'}">
                        <div class="api-request-header">
                            <span class="method">${req.method}</span>
                            <span class="url">${req.url}</span>
                            <span class="duration">${req.duration}ms</span>
                            <span class="timestamp">${new Date(req.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div class="api-request-details">
                            <details>
                                <summary>Request Details</summary>
                                <pre>${JSON.stringify({
                                    headers: req.headers,
                                    params: req.params
                                }, null, 2)}</pre>
                            </details>
                            <details>
                                <summary>Response</summary>
                                <pre>${JSON.stringify(req.response, null, 2)}</pre>
                            </details>
                            ${req.error ? `
                                <details>
                                    <summary>Error</summary>
                                    <pre>${JSON.stringify(req.error, null, 2)}</pre>
                                </details>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Get player tab content
    getPlayerTabContent() {
        const status = this.playerStatus;
        return `
            <div class="status-grid">
                <div class="status-item">
                    <label>State:</label>
                    <span class="status-${status.state}">${status.state}</span>
                </div>
                <div class="status-item">
                    <label>Stream URL:</label>
                    <span class="url">${status.streamUrl || 'None'}</span>
                </div>
                <div class="status-item">
                    <label>Buffering:</label>
                    <span>${status.bufferingPercent}%</span>
                </div>
                <div class="status-item">
                    <label>Last Update:</label>
                    <span>${new Date(status.lastUpdate).toLocaleTimeString()}</span>
                </div>
            </div>
            ${status.errors.length > 0 ? `
                <div class="player-errors">
                    <h4>Recent Errors:</h4>
                    ${status.errors.slice(-5).map(err => `
                        <div class="error-item">
                            <span class="timestamp">${new Date(err.timestamp).toLocaleTimeString()}</span>
                            <span class="error">${err.error}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    // Get system tab content
    getSystemTabContent() {
        const stats = this.systemStats;
        return `
            <div class="status-grid">
                <div class="status-item">
                    <label>FPS:</label>
                    <span>${stats.fps}</span>
                </div>
                ${stats.memoryUsage ? `
                    <div class="status-item">
                        <label>Memory Used:</label>
                        <span>${stats.memoryUsage.used} MB</span>
                    </div>
                    <div class="status-item">
                        <label>Memory Total:</label>
                        <span>${stats.memoryUsage.total} MB</span>
                    </div>
                    <div class="status-item">
                        <label>Memory Limit:</label>
                        <span>${stats.memoryUsage.limit} MB</span>
                    </div>
                ` : `
                    <div class="status-item">
                        <label>Memory:</label>
                        <span>Not available</span>
                    </div>
                `}
                <div class="status-item">
                    <label>User Agent:</label>
                    <span class="small">${navigator.userAgent}</span>
                </div>
                <div class="status-item">
                    <label>Screen:</label>
                    <span>${screen.width}x${screen.height}</span>
                </div>
            </div>
        `;
    }

    // Get logs tab content
    getLogsTabContent() {
        const recentLogs = this.logs.slice(-50).reverse();
        return `
            <div class="logs-container">
                ${recentLogs.map(log => `
                    <div class="log-entry log-${log.level}">
                        <span class="timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span class="level">${log.level.toUpperCase()}</span>
                        <span class="message">${log.message}</span>
                        ${log.data ? `
                            <details class="log-data">
                                <summary>Details</summary>
                                <pre>${JSON.stringify(log.data, null, 2)}</pre>
                            </details>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Close diagnostics panel
    closeDiagnosticsPanel() {
        const panel = document.getElementById('diagnosticsPanel');
        if (panel) {
            if (panel.refreshInterval) {
                clearInterval(panel.refreshInterval);
            }
            panel.remove();
        }
    }

    // Clear logs
    clearLogs() {
        this.logs = [];
        this.apiRequests = [];
        this.log('info', 'Logs cleared');
    }
}

// Create global diagnostics manager instance
window.diagnostics = new DiagnosticsManager();
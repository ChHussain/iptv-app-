// Settings page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Protect the page - redirect to login if not authenticated
    if (!window.auth.protectPage()) {
        return;
    }

    // Initialize page elements
    const backBtn = document.getElementById('backBtn');
    const currentPortalUrl = document.getElementById('currentPortalUrl');
    const currentMacAddress = document.getElementById('currentMacAddress');
    const connectionStatus = document.getElementById('connectionStatus');
    const autoplayCheckbox = document.getElementById('autoplay');
    const volumeSlider = document.getElementById('volume');
    const volumeValue = document.getElementById('volumeValue');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const testResult = document.getElementById('testResult');

    // Initialize page
    initializeSettings();

    // Back button handler
    backBtn.addEventListener('click', function() {
        window.location.href = 'home.html';
    });

    // Volume slider handler
    volumeSlider.addEventListener('input', function() {
        const volume = this.value;
        volumeValue.textContent = volume + '%';
        savePlayerSetting('volume', volume / 100);
    });

    // Autoplay checkbox handler
    autoplayCheckbox.addEventListener('change', function() {
        savePlayerSetting('autoplay', this.checked);
    });

    // Test connection button handler
    testConnectionBtn.addEventListener('click', testConnection);

    // Clear cache button handler
    clearCacheBtn.addEventListener('click', clearCache);

    // Logout button handler
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout? This will clear your session and return you to the login page.')) {
            window.auth.logout();
        }
    });

    function initializeSettings() {
        const session = window.auth.getSession();
        if (!session) {
            return;
        }

        // Display connection information
        try {
            const portalUrl = new URL(session.portalUrl);
            currentPortalUrl.textContent = portalUrl.origin;
        } catch (error) {
            currentPortalUrl.textContent = session.portalUrl;
        }
        
        currentMacAddress.textContent = session.macAddress;

        // Display device information
        displayDeviceInformation(session);

        // Check connection status
        checkConnectionStatus();

        // Load player settings
        loadPlayerSettings();
    }

    async function displayDeviceInformation(session) {
        try {
            // Get device info from session or re-detect
            let deviceInfo = session.deviceInfo;
            if (!deviceInfo && window.deviceManager) {
                deviceInfo = await window.deviceManager.getDeviceInfo();
            }

            if (deviceInfo) {
                document.getElementById('devicePlatform').textContent = deviceInfo.platform.toUpperCase();
                document.getElementById('screenInfo').textContent = deviceInfo.screenResolution || 'Unknown';
                
                // Determine device type
                let deviceType = 'Unknown';
                let macSource = 'Unknown';
                
                switch (deviceInfo.platform) {
                    case 'webos':
                        deviceType = 'LG WebOS Smart TV';
                        macSource = 'WebOS System API';
                        break;
                    case 'tizen':
                        deviceType = 'Samsung Tizen Smart TV';
                        macSource = 'Tizen System API';
                        break;
                    case 'androidtv':
                        deviceType = 'Android TV';
                        macSource = 'Android TV API';
                        break;
                    case 'mag':
                        deviceType = 'MAG STB';
                        macSource = 'STB Hardware';
                        break;
                    case 'browser':
                        deviceType = 'Web Browser';
                        macSource = 'Generated Fingerprint';
                        break;
                    default:
                        deviceType = 'Generic Device';
                        macSource = 'Device Fingerprint';
                }

                // Check if MAC seems suspicious
                if (window.deviceManager && window.deviceManager.isMACAddressSuspicious(session.macAddress)) {
                    macSource += ' (Possibly Virtual)';
                    document.getElementById('macSource').style.color = '#ffc107';
                } else if (deviceInfo.platform === 'browser') {
                    macSource += ' (Browser-based)';
                    document.getElementById('macSource').style.color = '#17a2b8';
                }

                document.getElementById('deviceType').textContent = deviceType;
                document.getElementById('macSource').textContent = macSource;
            }
        } catch (error) {
            console.error('Error displaying device information:', error);
        }
    }

    async function checkConnectionStatus() {
        try {
            connectionStatus.textContent = 'Checking...';
            connectionStatus.style.color = '#ffc107';

            const result = await window.api.testConnection();
            
            if (result.success) {
                connectionStatus.textContent = 'Connected';
                connectionStatus.style.color = '#28a745';
            } else {
                connectionStatus.textContent = 'Disconnected';
                connectionStatus.style.color = '#dc3545';
            }
        } catch (error) {
            console.error('Error checking connection:', error);
            connectionStatus.textContent = 'Error';
            connectionStatus.style.color = '#dc3545';
        }
    }

    function loadPlayerSettings() {
        try {
            // Load autoplay setting
            const autoplaySetting = localStorage.getItem('iptv_player_autoplay');
            if (autoplaySetting !== null) {
                autoplayCheckbox.checked = autoplaySetting === 'true';
            }

            // Load volume setting
            const volumeSetting = localStorage.getItem('iptv_player_volume');
            if (volumeSetting !== null) {
                const volume = Math.round(parseFloat(volumeSetting) * 100);
                volumeSlider.value = volume;
                volumeValue.textContent = volume + '%';
            }
        } catch (error) {
            console.error('Error loading player settings:', error);
        }
    }

    function savePlayerSetting(setting, value) {
        try {
            localStorage.setItem(`iptv_player_${setting}`, value);
        } catch (error) {
            console.error('Error saving player setting:', error);
        }
    }

    async function testConnection() {
        testConnectionBtn.disabled = true;
        testConnectionBtn.textContent = 'Testing...';
        
        try {
            showTestResult('Running comprehensive connection test...', 'info');
            
            const result = await window.api.testConnection();
            
            if (result.success) {
                // Update connection status
                connectionStatus.textContent = 'Connected';
                connectionStatus.style.color = '#28a745';

                let resultMessage = '✅ Connection test successful!<br><br>';
                
                // Show portal analysis
                if (result.analysis) {
                    const analysis = result.analysis;
                    resultMessage += `<strong>Portal Analysis:</strong><br>`;
                    resultMessage += `Confidence: ${analysis.confidence}%<br>`;
                    resultMessage += `Status: ${analysis.isReal ? 'Real IPTV Portal' : 'Possibly Demo/Fake Portal'}<br><br>`;
                    
                    if (analysis.indicators.length > 0) {
                        resultMessage += `<strong>Positive Indicators:</strong><br>`;
                        analysis.indicators.forEach(indicator => {
                            resultMessage += `• ${indicator}<br>`;
                        });
                        resultMessage += '<br>';
                    }
                    
                    if (analysis.issues.length > 0) {
                        resultMessage += `<strong>Issues Detected:</strong><br>`;
                        analysis.issues.forEach(issue => {
                            resultMessage += `• ${issue}<br>`;
                        });
                        resultMessage += '<br>';
                    }
                }

                // Show profile info if available
                if (result.profile) {
                    resultMessage += '<strong>Profile Information:</strong><br>';
                    if (result.profile.name) {
                        resultMessage += `Name: ${result.profile.name}<br>`;
                    }
                    if (result.profile.tariff_plan) {
                        resultMessage += `Plan: ${result.profile.tariff_plan}<br>`;
                    }
                    if (result.profile.status) {
                        resultMessage += `Status: ${result.profile.status}<br>`;
                    }
                    resultMessage += '<br>';
                }

                // Show content availability
                if (result.channels) {
                    const channelCount = result.channels.data ? result.channels.data.length : 0;
                    resultMessage += `Channels Available: ${channelCount}<br>`;
                }
                
                if (result.movies) {
                    const movieCount = result.movies.data ? result.movies.data.length : 0;
                    resultMessage += `Movies Available: ${movieCount}<br>`;
                }

                const testType = result.analysis && result.analysis.isReal ? 'success' : 'warning';
                showTestResult(resultMessage, testType);
                
            } else {
                showTestResult('❌ Connection test failed: ' + result.error, 'error');
                connectionStatus.textContent = 'Disconnected';
                connectionStatus.style.color = '#dc3545';
            }
        } catch (error) {
            console.error('Test connection error:', error);
            showTestResult('❌ Connection test failed: ' + error.message, 'error');
            connectionStatus.textContent = 'Error';
            connectionStatus.style.color = '#dc3545';
        } finally {
            testConnectionBtn.disabled = false;
            testConnectionBtn.textContent = 'Test Connection';
        }
    }

    function clearCache() {
        if (confirm('Are you sure you want to clear the cache? This will remove saved preferences and temporary data.')) {
            try {
                // Clear only IPTV-related cache, not the session
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('iptv_') && key !== 'iptv_session') {
                        keysToRemove.push(key);
                    }
                }

                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                });

                showTestResult('Cache cleared successfully!', 'success');
                
                // Reload settings to reflect changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Error clearing cache:', error);
                showTestResult('Error clearing cache: ' + error.message, 'error');
            }
        }
    }

    function showTestResult(message, type) {
        testResult.innerHTML = message;
        testResult.className = `test-result ${type}`;
        testResult.style.display = 'block';

        // Auto-hide after 10 seconds for long messages
        setTimeout(() => {
            testResult.style.display = 'none';
        }, 10000);
    }

    // Refresh connection status every 30 seconds
    setInterval(checkConnectionStatus, 30000);
});
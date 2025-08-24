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
    const themeSelect = document.getElementById('theme');
    const debugModeCheckbox = document.getElementById('debugMode');
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

    // Theme selector handler
    themeSelect.addEventListener('change', function() {
        if (window.themeManager) {
            window.themeManager.setTheme(this.value);
        }
    });

    // Debug mode checkbox handler
    debugModeCheckbox.addEventListener('change', function() {
        if (window.diagnostics) {
            window.diagnostics.enabled = this.checked;
            window.diagnostics.saveSettings();
            if (this.checked) {
                window.diagnostics.log('info', 'Debug mode enabled from settings');
            }
        }
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

        // Check connection status
        checkConnectionStatus();

        // Load player settings
        loadPlayerSettings();
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

            // Load theme setting
            if (window.themeManager) {
                themeSelect.value = window.themeManager.getCurrentTheme();
            }

            // Load debug mode setting
            if (window.diagnostics) {
                debugModeCheckbox.checked = window.diagnostics.isEnabled();
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
            const result = await window.api.testConnection();
            
            if (result.success) {
                showTestResult('Connection test successful!', 'success');
                
                // Update connection status
                connectionStatus.textContent = 'Connected';
                connectionStatus.style.color = '#28a745';

                // Show profile info if available
                if (result.profile) {
                    let profileInfo = 'Profile information:<br>';
                    if (result.profile.name) {
                        profileInfo += `Name: ${result.profile.name}<br>`;
                    }
                    if (result.profile.tariff_plan) {
                        profileInfo += `Plan: ${result.profile.tariff_plan}<br>`;
                    }
                    if (result.profile.status) {
                        profileInfo += `Status: ${result.profile.status}<br>`;
                    }
                    showTestResult('Connection test successful!<br>' + profileInfo, 'success');
                }
            } else {
                showTestResult('Connection test failed: ' + result.error, 'error');
                connectionStatus.textContent = 'Disconnected';
                connectionStatus.style.color = '#dc3545';
            }
        } catch (error) {
            console.error('Test connection error:', error);
            showTestResult('Connection test failed: ' + error.message, 'error');
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

        // Auto-hide after 5 seconds
        setTimeout(() => {
            testResult.style.display = 'none';
        }, 5000);
    }

    // Refresh connection status every 30 seconds
    setInterval(checkConnectionStatus, 30000);
});
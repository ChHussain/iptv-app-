// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const portalUrlInput = document.getElementById('portalUrl');
    const macAddressInput = document.getElementById('macAddress');
    const loginBtn = document.getElementById('loginBtn');
    const detectMacBtn = document.getElementById('detectMacBtn');
    const manualMacBtn = document.getElementById('manualMacBtn');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const loginError = document.getElementById('loginError');
    const loginLoading = document.getElementById('loginLoading');
    const connectionTest = document.getElementById('connectionTest');
    const deviceDetection = document.getElementById('deviceDetection');
    const devicePlatform = document.getElementById('devicePlatform');
    const detectedMac = document.getElementById('detectedMac');
    const deviceStatus = document.getElementById('deviceStatus');

    let isManualMode = false;
    let detectedDeviceInfo = null;

    // Check if already logged in
    if (window.auth.isAuthenticated()) {
        window.location.href = 'home.html';
        return;
    }

    // Load saved values
    loadSavedValues();

    // Initialize device detection
    initializeDeviceDetection();

    // Form submission handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const portalUrl = portalUrlInput.value.trim();
        const macAddress = macAddressInput.value.trim();

        // Validate inputs
        if (!portalUrl || !macAddress) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidMacAddress(macAddress)) {
            showError('Please enter a valid MAC address (format: 00:1a:79:xx:xx:xx)');
            return;
        }

        if (!isValidUrl(portalUrl)) {
            showError('Please enter a valid portal URL');
            return;
        }

        // Show loading state
        showLoading(true, 'Connecting to IPTV server...');
        hideError();

        try {
            // Attempt login
            const result = await window.auth.login(portalUrl, macAddress);

            if (result.success) {
                // Save values for next time
                saveValues(portalUrl, macAddress);
                
                // Show success and redirect
                showLoading(false);
                showConnectionResult('Connected successfully! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1500);
            } else {
                showError(result.error || 'Login failed. Please check your portal URL and MAC address.');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Connection failed. Please check your internet connection and try again.');
        } finally {
            showLoading(false);
        }
    });

    // Detect MAC button handler
    detectMacBtn.addEventListener('click', async function() {
        await detectDeviceMacAddress();
    });

    // Manual MAC button handler
    manualMacBtn.addEventListener('click', function() {
        toggleManualMode();
    });

    // Test connection button handler
    testConnectionBtn.addEventListener('click', async function() {
        await testConnection();
    });

    // Auto-format MAC address input (only in manual mode)
    macAddressInput.addEventListener('input', function(e) {
        if (isManualMode) {
            let value = e.target.value.replace(/[^0-9a-fA-F]/g, '');
            let formatted = '';
            
            for (let i = 0; i < value.length && i < 12; i++) {
                if (i > 0 && i % 2 === 0) {
                    formatted += ':';
                }
                formatted += value[i];
            }
            
            e.target.value = formatted;
            validateForm();
        }
    });

    // Portal URL input handler
    portalUrlInput.addEventListener('blur', function(e) {
        let url = e.target.value.trim();
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            e.target.value = 'http://' + url;
        }
        validateForm();
    });

    // Portal URL input handler for enabling test button
    portalUrlInput.addEventListener('input', function() {
        validateForm();
    });

    async function initializeDeviceDetection() {
        showLoading(true, 'Detecting device...');
        
        try {
            // Initialize device manager and detect device info
            const deviceInfo = await window.deviceManager.getDeviceInfo();
            detectedDeviceInfo = deviceInfo;
            
            // Display device information
            displayDeviceInfo(deviceInfo);
            
            // Set detected MAC address
            if (deviceInfo.macAddress) {
                macAddressInput.value = deviceInfo.macAddress;
                macAddressInput.placeholder = 'MAC address detected automatically';
                
                // Check if MAC seems suspicious
                if (window.deviceManager.isMACAddressSuspicious(deviceInfo.macAddress)) {
                    showDeviceWarning('Detected MAC address may not be from physical device. Consider using manual entry for real hardware.');
                }
            } else {
                showError('Could not detect device MAC address. Please enter manually.');
                toggleManualMode();
            }

            // Validate device compatibility
            const compatibility = window.deviceManager.validateDeviceCompatibility();
            if (!compatibility.compatible) {
                showDeviceWarning('Device compatibility issues detected: ' + compatibility.issues.join(', '));
            }
            
        } catch (error) {
            console.error('Device detection error:', error);
            showError('Device detection failed. Switching to manual mode.');
            toggleManualMode();
        } finally {
            showLoading(false);
            validateForm();
        }
    }

    async function detectDeviceMacAddress() {
        showLoading(true, 'Detecting MAC address...');
        
        try {
            const macAddress = await window.deviceManager.getDeviceMacAddress();
            
            if (macAddress) {
                macAddressInput.value = macAddress;
                detectedMac.textContent = macAddress;
                
                if (window.deviceManager.isMACAddressSuspicious(macAddress)) {
                    showDeviceWarning('Detected MAC address may be generated or from virtual device.');
                } else {
                    hideError();
                    showConnectionResult('MAC address detected successfully!', 'success');
                }
                
                validateForm();
            } else {
                throw new Error('No MAC address detected');
            }
            
        } catch (error) {
            console.error('MAC detection error:', error);
            showError('MAC address detection failed. Please enter manually.');
            toggleManualMode();
        } finally {
            showLoading(false);
        }
    }

    function displayDeviceInfo(deviceInfo) {
        devicePlatform.textContent = deviceInfo.platform.toUpperCase();
        detectedMac.textContent = deviceInfo.macAddress || 'Not detected';
        
        let status = 'Unknown';
        if (deviceInfo.macAddress) {
            if (window.deviceManager.isMACAddressSuspicious(deviceInfo.macAddress)) {
                status = '⚠️ Possibly Virtual/Generated';
                deviceStatus.style.color = '#ffc107';
            } else {
                status = '✅ Physical Device Detected';
                deviceStatus.style.color = '#28a745';
            }
        } else {
            status = '❌ MAC Not Detected';
            deviceStatus.style.color = '#dc3545';
        }
        
        deviceStatus.textContent = status;
        deviceDetection.style.display = 'block';
    }

    function toggleManualMode() {
        isManualMode = !isManualMode;
        
        if (isManualMode) {
            macAddressInput.readOnly = false;
            macAddressInput.placeholder = '00:1a:79:xx:xx:xx';
            macAddressInput.value = '';
            manualMacBtn.textContent = '🤖 Auto';
            manualMacBtn.title = 'Switch to automatic detection';
            detectMacBtn.style.display = 'none';
        } else {
            macAddressInput.readOnly = true;
            macAddressInput.placeholder = 'Detecting device MAC...';
            manualMacBtn.textContent = '✏️ Manual';
            manualMacBtn.title = 'Switch to manual entry';
            detectMacBtn.style.display = 'inline-block';
            detectDeviceMacAddress();
        }
        
        manualMacBtn.style.display = 'inline-block';
        validateForm();
    }

    async function testConnection() {
        const portalUrl = portalUrlInput.value.trim();
        const macAddress = macAddressInput.value.trim();

        if (!portalUrl) {
            showError('Please enter portal URL first');
            return;
        }

        if (!macAddress) {
            showError('Please detect or enter MAC address first');
            return;
        }

        testConnectionBtn.disabled = true;
        testConnectionBtn.textContent = 'Testing...';
        showLoading(true, 'Testing connection to IPTV server...');

        try {
            // Create temporary auth session for testing
            const normalizedUrl = window.auth.normalizePortalUrl(portalUrl);
            const handshakeData = await window.auth.performHandshake(normalizedUrl, macAddress);
            
            if (handshakeData && handshakeData.token) {
                showConnectionResult('✅ Connection test successful! Server is reachable and accepting connections.', 'success');
                
                // Enable login button
                loginBtn.disabled = false;
                
                // Try to get some basic info
                try {
                    const headers = {
                        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                        'X-User-Agent': 'Model: MAG250; Link: WiFi',
                        'Authorization': `Bearer ${handshakeData.token}`,
                        'Cookie': `mac=${macAddress}; stb_lang=en; timezone=Europe/Kiev;`
                    };
                    
                    const profileUrl = `${normalizedUrl}profile`;
                    const profileResponse = await fetch(profileUrl, { headers, mode: 'cors' });
                    
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        if (profileData.js) {
                            showConnectionResult('✅ Connection test successful! Portal is responding with valid data.', 'success');
                        }
                    }
                } catch (profileError) {
                    console.log('Profile test failed, but handshake succeeded:', profileError);
                }
                
            } else {
                throw new Error('Invalid response from portal');
            }
            
        } catch (error) {
            console.error('Connection test error:', error);
            let errorMessage = 'Connection test failed: ';
            
            if (error.message.includes('CORS')) {
                errorMessage += 'CORS policy prevents browser access. This may work on actual Smart TV device.';
            } else if (error.message.includes('404')) {
                errorMessage += 'Portal endpoint not found. Please check the URL.';
            } else if (error.message.includes('403') || error.message.includes('401')) {
                errorMessage += 'Access denied. Please check MAC address and portal settings.';
            } else {
                errorMessage += error.message;
            }
            
            showConnectionResult('❌ ' + errorMessage, 'error');
        } finally {
            showLoading(false);
            testConnectionBtn.disabled = false;
            testConnectionBtn.textContent = 'Test Connection';
        }
    }

    function validateForm() {
        const hasPortal = portalUrlInput.value.trim().length > 0;
        const hasMac = macAddressInput.value.trim().length > 0;
        const hasValidMac = isValidMacAddress(macAddressInput.value.trim());
        
        loginBtn.disabled = !(hasPortal && hasMac && hasValidMac);
        
        if (hasPortal && hasMac) {
            testConnectionBtn.style.display = 'inline-block';
        } else {
            testConnectionBtn.style.display = 'none';
        }
    }

    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
        connectionTest.style.display = 'none';
    }

    function hideError() {
        loginError.style.display = 'none';
    }

    function showDeviceWarning(message) {
        // Show warning in a less alarming way
        connectionTest.innerHTML = '⚠️ ' + message;
        connectionTest.className = 'test-result warning';
        connectionTest.style.display = 'block';
    }

    function showConnectionResult(message, type) {
        connectionTest.innerHTML = message;
        connectionTest.className = `test-result ${type}`;
        connectionTest.style.display = 'block';
        
        if (type === 'success') {
            hideError();
        }
    }

    function showLoading(show, message = 'Connecting...') {
        if (show) {
            loginLoading.textContent = message;
            loginLoading.style.display = 'block';
            loginBtn.disabled = true;
        } else {
            loginLoading.style.display = 'none';
            validateForm(); // Re-validate to restore button state
        }
    }

    function isValidMacAddress(mac) {
        const macRegex = /^([0-9a-fA-F]{2}[:]){5}([0-9a-fA-F]{2})$/;
        return macRegex.test(mac);
    }

    function isValidUrl(url) {
        try {
            new URL(url.startsWith('http') ? url : 'http://' + url);
            return true;
        } catch {
            return false;
        }
    }

    function saveValues(portalUrl, macAddress) {
        try {
            localStorage.setItem('iptv_last_portal', portalUrl);
            // Only save MAC if it's manually entered, not auto-detected
            if (isManualMode) {
                localStorage.setItem('iptv_last_mac', macAddress);
            }
        } catch (error) {
            console.error('Error saving values:', error);
        }
    }

    function loadSavedValues() {
        try {
            const savedPortal = localStorage.getItem('iptv_last_portal');
            if (savedPortal) {
                portalUrlInput.value = savedPortal;
            }

            // Only load saved MAC if we're in manual mode or detection failed
            const savedMac = localStorage.getItem('iptv_last_mac');
            if (savedMac && isManualMode) {
                macAddressInput.value = savedMac;
            }
        } catch (error) {
            console.error('Error loading saved values:', error);
        }
    }
});
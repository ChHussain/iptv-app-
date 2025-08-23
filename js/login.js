// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const portalUrlInput = document.getElementById('portalUrl');
    const macAddressInput = document.getElementById('macAddress');
    const generateMacBtn = document.getElementById('generateMacBtn');
    const generateVuMacBtn = document.getElementById('generateVuMacBtn');
    const savedPortalsDiv = document.getElementById('savedPortals');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const loginLoading = document.getElementById('loginLoading');
    const debugInfo = document.getElementById('debugInfo');
    const debugLog = document.getElementById('debugLog');
    const debugToggleBtn = document.getElementById('debugToggleBtn');

    // Check if already logged in
    if (window.auth.isAuthenticated()) {
        window.location.href = 'home.html';
        return;
    }

    // Set up debug callback for authentication
    window.auth.setDebugCallback(logDebug);
    
    // Debug toggle button handler
    debugToggleBtn.addEventListener('click', function() {
        const isVisible = debugInfo.style.display !== 'none';
        showDebugInfo(!isVisible);
        debugToggleBtn.textContent = isVisible ? 'Show Debug Info' : 'Hide Debug Info';
    });

    // Load saved values and portals
    loadSavedValues();
    loadSavedPortals();

    // Generate MAC button handler
    generateMacBtn.addEventListener('click', function() {
        const generatedMAC = window.auth.generateVirtualMAC();
        macAddressInput.value = generatedMAC;
        showSuccess('MAC address generated');
    });

    // Generate VU+ specific MAC button handler
    generateVuMacBtn.addEventListener('click', function() {
        // Generate a VU+ specific MAC with known prefixes
        const vuPrefixes = ['00:1b:c5', '00:0f:ea', '00:50:c2'];
        const chars = '0123456789abcdef';
        const prefix = vuPrefixes[Math.floor(Math.random() * vuPrefixes.length)];
        
        let mac = prefix + ':';
        for (let i = 0; i < 6; i++) {
            if (i > 0 && i % 2 === 0) {
                mac += ':';
            }
            mac += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        macAddressInput.value = mac;
        showSuccess('VU+ compatible MAC address generated');
        logDebug(`Generated VU+ MAC with prefix ${prefix}`);
    });

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

        // Use auth class validation for better MAC validation
        if (!window.auth.validateMAC(macAddress)) {
            showError('Please enter a valid MAC address (format: 00:1a:79:xx:xx:xx)');
            return;
        }

        if (!isValidUrl(portalUrl)) {
            showError('Please enter a valid portal URL');
            return;
        }

        // Show loading state
        showLoading(true);
        hideError();
        
        // Only show debug if it's already visible
        const debugAlreadyVisible = debugInfo.style.display !== 'none';
        if (debugAlreadyVisible) {
            clearDebugLog();
        }
        
        logDebug('Starting authentication process...');

        try {
            // Attempt login
            console.log('Attempting login with:', { portalUrl, macAddress });
            logDebug(`Portal URL: ${portalUrl}`);
            logDebug(`MAC Address: ${macAddress}`);
            
            const result = await window.auth.login(portalUrl, macAddress);

            if (result.success) {
                // Save values for next time
                saveValues(portalUrl, macAddress);
                
                // Show success message briefly before redirect
                logDebug('✓ Login successful! Redirecting...');
                showSuccess('Login successful! Redirecting...');
                
                // Hide debug info on success
                setTimeout(() => {
                    showDebugInfo(false);
                }, 2000);
                
                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } else {
                const errorMsg = result.error || 'Login failed. Please check your portal URL and MAC address.';
                console.error('Login failed:', result);
                logDebug(`✗ Login failed: ${errorMsg}`);
                showError(errorMsg);
            }
        } catch (error) {
            console.error('Login error:', error);
            let errorMsg = 'Connection failed. Please check your internet connection and try again.';
            
            // Provide more specific error messages
            if (error.message.includes('CORS')) {
                errorMsg = 'Portal access blocked by browser security. Try using a different portal URL or contact your provider.';
            } else if (error.message.includes('fetch')) {
                errorMsg = 'Cannot connect to portal. Please check the portal URL and your internet connection.';
            } else if (error.message.includes('token')) {
                errorMsg = 'Authentication failed. Please verify your MAC address and portal URL.';
            }
            
            logDebug(`✗ Connection error: ${errorMsg}`);
            showError(errorMsg);
        } finally {
            showLoading(false);
        }
    });

    // Auto-format MAC address input
    macAddressInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^0-9a-fA-F]/g, '');
        let formatted = '';
        
        for (let i = 0; i < value.length && i < 12; i++) {
            if (i > 0 && i % 2 === 0) {
                formatted += ':';
            }
            formatted += value[i];
        }
        
        e.target.value = formatted;
    });

    // Portal URL input handler
    portalUrlInput.addEventListener('blur', function(e) {
        let url = e.target.value.trim();
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            e.target.value = 'http://' + url;
        }
    });

    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }

    function hideError() {
        loginError.style.display = 'none';
    }

    function showLoading(show) {
        if (show) {
            loginLoading.style.display = 'block';
            loginBtn.disabled = true;
            loginBtn.textContent = 'Connecting...';
        } else {
            loginLoading.style.display = 'none';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Connect';
        }
    }

    function showSuccess(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
        loginError.style.backgroundColor = '#4CAF50';
        loginError.style.color = 'white';
        loginError.style.border = '1px solid #45a049';
        
        // Reset styles after a few seconds
        setTimeout(() => {
            loginError.style.backgroundColor = '';
            loginError.style.color = '';
            loginError.style.border = '';
        }, 3000);
    }

    function showDebugInfo(show) {
        if (debugInfo) {
            debugInfo.style.display = show ? 'block' : 'none';
        }
    }

    function clearDebugLog() {
        if (debugLog) {
            debugLog.innerHTML = '';
        }
    }

    function logDebug(message) {
        if (debugLog) {
            const timestamp = new Date().toLocaleTimeString();
            debugLog.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        console.log('[DEBUG]', message);
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
            localStorage.setItem('iptv_last_mac', macAddress);
        } catch (error) {
            console.error('Error saving values:', error);
        }
    }

    function loadSavedValues() {
        try {
            const savedPortal = localStorage.getItem('iptv_last_portal');
            const savedMac = localStorage.getItem('iptv_last_mac');

            if (savedPortal) {
                portalUrlInput.value = savedPortal;
            }

            if (savedMac) {
                macAddressInput.value = savedMac;
            }
        } catch (error) {
            console.error('Error loading saved values:', error);
        }
    }

    function loadSavedPortals() {
        const portals = window.auth.getPortals();
        savedPortalsDiv.innerHTML = '';

        if (portals.length === 0) {
            savedPortalsDiv.innerHTML = '<p class="no-portals">No saved portals</p>';
            return;
        }

        portals.forEach((portal, index) => {
            const portalElement = document.createElement('div');
            portalElement.className = 'saved-portal focusable';
            portalElement.innerHTML = `
                <div class="portal-info">
                    <div class="portal-name">${portal.name}</div>
                    <div class="portal-mac">MAC: ${portal.macAddress}</div>
                </div>
                <div class="portal-actions">
                    <button class="btn-use" data-index="${index}">Use</button>
                    <button class="btn-delete" data-index="${index}">Delete</button>
                </div>
            `;
            savedPortalsDiv.appendChild(portalElement);
        });

        // Add event listeners for portal actions
        savedPortalsDiv.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-use')) {
                const index = parseInt(e.target.dataset.index);
                const portal = portals[index];
                portalUrlInput.value = portal.url;
                macAddressInput.value = portal.macAddress;
            } else if (e.target.classList.contains('btn-delete')) {
                const index = parseInt(e.target.dataset.index);
                const portal = portals[index];
                if (confirm(`Delete portal ${portal.name}?`)) {
                    window.auth.removePortal(portal.url);
                    loadSavedPortals();
                }
            }
        });
    }
});
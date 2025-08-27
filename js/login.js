// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const portalUrlInput = document.getElementById('portalUrl');
    const macAddressInput = document.getElementById('macAddress');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const loginLoading = document.getElementById('loginLoading');

    // Check if already logged in
    if (window.auth.isAuthenticated()) {
        window.location.href = 'home.html';
        return;
    }

    // Check internet connectivity on page load
    checkInitialConnectivity();

    // Load saved values
    loadSavedValues();

    // Add Generate MAC button
    addGenerateMACButton();
    
    // Add Portal URL suggestions
    addPortalUrlSuggestions();

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
        showLoading(true);
        hideError();

        try {
            // Attempt login
            const result = await window.auth.login(portalUrl, macAddress);

            if (result.success) {
                // Save values for next time
                saveValues(portalUrl, macAddress);
                
                // Redirect to home page
                window.location.href = 'home.html';
            } else {
                showError(result.error || 'Login failed. Please check your portal URL and MAC address.');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle specific internet connectivity error
            if (error.message === 'INTERNET_REQUIRED') {
                showError('This app requires an internet connection to work. Please check your network connection and try again.');
            } else {
                showError('Connection failed. Please check your internet connection and try again.');
            }
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

    // Listen for online/offline events
    window.addEventListener('online', function() {
        hideError();
        loginBtn.disabled = false;
        console.log('Internet connection restored');
    });

    window.addEventListener('offline', function() {
        showError('Internet connection lost. This app requires an internet connection to work.');
        loginBtn.disabled = true;
        console.log('Internet connection lost');
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
            } else {
                // Default to provider MAC for easy testing with specified credentials
                const providerMAC = window.macGenerator.getProviderMAC();
                macAddressInput.value = providerMAC;
                macAddressInput.placeholder = `Provider MAC: ${providerMAC}`;
            }
        } catch (error) {
            console.error('Error loading saved values:', error);
        }
    }

    // Check internet connectivity on page load
    async function checkInitialConnectivity() {
        if (!navigator.onLine) {
            showError('No internet connection detected. This app requires an internet connection to work.');
            loginBtn.disabled = true;
            return;
        }

        // Perform a more thorough connectivity check
        try {
            const isOnline = await window.auth.checkInternetConnectivity();
            if (!isOnline) {
                showError('Unable to connect to the internet. This app requires an internet connection to work.');
                loginBtn.disabled = true;
            }
        } catch (error) {
            // If connectivity check fails, we'll let the user try anyway
            // as the error might be temporary or due to specific network configurations
            console.warn('Initial connectivity check failed:', error);
        }
    }

    // Add Generate MAC button functionality
    function addGenerateMACButton() {
        const macGroup = macAddressInput.parentNode;
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        
        // Generate Virtual MAC button
        const generateVirtualBtn = document.createElement('button');
        generateVirtualBtn.type = 'button';
        generateVirtualBtn.textContent = 'Use Virtual MAC';
        generateVirtualBtn.style.flex = '1';
        generateVirtualBtn.style.fontSize = '14px';
        generateVirtualBtn.style.padding = '8px';
        generateVirtualBtn.addEventListener('click', function() {
            const virtualMAC = window.macGenerator.getVirtualMAC();
            macAddressInput.value = virtualMAC;
            showSuccess('Virtual MAC address generated and applied');
        });
        
        // Generate Provider MAC button
        const generateProviderBtn = document.createElement('button');
        generateProviderBtn.type = 'button';
        generateProviderBtn.textContent = 'Use Provider MAC';
        generateProviderBtn.style.flex = '1';
        generateProviderBtn.style.fontSize = '14px';
        generateProviderBtn.style.padding = '8px';
        generateProviderBtn.style.backgroundColor = '#4CAF50';
        generateProviderBtn.style.color = 'white';
        generateProviderBtn.addEventListener('click', function() {
            const providerMAC = window.macGenerator.getProviderMAC();
            macAddressInput.value = providerMAC;
            showSuccess('Provider-supplied MAC address applied (VU IPTV compatible)');
        });
        
        // Generate Random MAC button
        const generateRandomBtn = document.createElement('button');
        generateRandomBtn.type = 'button';
        generateRandomBtn.textContent = 'Generate Random';
        generateRandomBtn.style.flex = '1';
        generateRandomBtn.style.fontSize = '14px';
        generateRandomBtn.style.padding = '8px';
        generateRandomBtn.addEventListener('click', function() {
            const randomMAC = window.macGenerator.generateMAC();
            macAddressInput.value = randomMAC;
            showSuccess('Random MAC address generated');
        });
        
        // Show Suggestions button
        const showSuggestionsBtn = document.createElement('button');
        showSuggestionsBtn.type = 'button';
        showSuggestionsBtn.textContent = 'Show Suggestions';
        showSuggestionsBtn.style.flex = '1';
        showSuggestionsBtn.style.fontSize = '14px';
        showSuggestionsBtn.style.padding = '8px';
        showSuggestionsBtn.addEventListener('click', showMACsuggestions);
        
        buttonContainer.appendChild(generateProviderBtn);
        buttonContainer.appendChild(generateVirtualBtn);
        buttonContainer.appendChild(generateRandomBtn);
        buttonContainer.appendChild(showSuggestionsBtn);
        
        macGroup.appendChild(buttonContainer);
    }

    // Add Portal URL suggestions
    function addPortalUrlSuggestions() {
        const portalGroup = portalUrlInput.parentNode;
        
        // Create button container for portal suggestions
        const portalButtonContainer = document.createElement('div');
        portalButtonContainer.style.marginTop = '10px';
        portalButtonContainer.style.display = 'flex';
        portalButtonContainer.style.gap = '5px';
        portalButtonContainer.style.flexWrap = 'wrap';
        
        // Verified portal URLs (from the problem statement)
        const verifiedPortals = [
            { url: 'http://play.b4u.live', name: 'B4U Live' },
            { url: 'http://glotv.me', name: 'GloTV' },
            { url: 'http://play.suntv.biz', name: 'SunTV' }
        ];
        
        // Create buttons for each verified portal
        verifiedPortals.forEach(portal => {
            const portalBtn = document.createElement('button');
            portalBtn.type = 'button';
            portalBtn.textContent = portal.name;
            portalBtn.style.flex = '1';
            portalBtn.style.fontSize = '12px';
            portalBtn.style.padding = '6px';
            portalBtn.style.backgroundColor = '#2196F3';
            portalBtn.style.color = 'white';
            portalBtn.style.border = 'none';
            portalBtn.style.borderRadius = '3px';
            portalBtn.style.cursor = 'pointer';
            portalBtn.addEventListener('click', function() {
                portalUrlInput.value = portal.url;
                showSuccess(`Portal URL set to ${portal.name} (${portal.url})`);
            });
            
            portalButtonContainer.appendChild(portalBtn);
        });
        
        // Add label for portal suggestions
        const portalLabel = document.createElement('div');
        portalLabel.textContent = 'Verified Portal URLs:';
        portalLabel.style.fontSize = '12px';
        portalLabel.style.color = '#666';
        portalLabel.style.marginTop = '10px';
        portalLabel.style.marginBottom = '5px';
        
        portalGroup.appendChild(portalLabel);
        portalGroup.appendChild(portalButtonContainer);

        // Add demo mode button
        const demoModeContainer = document.createElement('div');
        demoModeContainer.style.marginTop = '15px';
        demoModeContainer.style.textAlign = 'center';
        
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.textContent = '🎭 Try Demo Mode';
        demoBtn.style.padding = '10px 20px';
        demoBtn.style.backgroundColor = '#FF9800';
        demoBtn.style.color = 'white';
        demoBtn.style.border = 'none';
        demoBtn.style.borderRadius = '5px';
        demoBtn.style.cursor = 'pointer';
        demoBtn.style.fontSize = '14px';
        demoBtn.style.fontWeight = 'bold';
        demoBtn.addEventListener('click', function() {
            if (confirm('Open Demo Mode?\n\nThis will demonstrate how the app works with the specified MAC address (AA:7A:10:57:C1:00) and portal compatibility, showing channel lists and Smart STB behavior without needing real portal access.')) {
                window.location.href = 'demo-mode.html';
            }
        });
        
        const demoLabel = document.createElement('div');
        demoLabel.textContent = 'Experience Smart STB functionality with simulated content';
        demoLabel.style.fontSize = '11px';
        demoLabel.style.color = '#666';
        demoLabel.style.marginBottom = '8px';
        
        demoModeContainer.appendChild(demoLabel);
        demoModeContainer.appendChild(demoBtn);
        
        portalGroup.appendChild(demoModeContainer);
    }

    // Show MAC address suggestions
    function showMACsuggestions() {
        const suggestions = window.macGenerator.getSuggestedMACs();
        
        // Create modal or simple selection interface
        let suggestionText = 'Suggested MAC addresses:\\n\\n';
        suggestions.forEach((suggestion, index) => {
            suggestionText += `${index + 1}. ${suggestion.mac} (${suggestion.description})\\n`;
        });
        suggestionText += '\\nClick on a button above to generate a MAC address, or enter your own.';
        
        alert(suggestionText);
    }

    // Show success message
    function showSuccess(message) {
        // Temporarily show success in the error div with different styling
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.style.backgroundColor = '#4CAF50';
        errorDiv.style.color = 'white';
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.style.backgroundColor = '';
            errorDiv.style.color = '';
        }, 3000);
    }
});
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

    // Load saved values
    loadSavedValues();

    // Add Generate MAC button
    addGenerateMACButton();

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
            showError('Connection failed. Please check your internet connection and try again.');
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
                // If no saved MAC, suggest virtual MAC
                const virtualMAC = window.macGenerator.getVirtualMAC();
                macAddressInput.placeholder = `Suggested: ${virtualMAC}`;
            }
        } catch (error) {
            console.error('Error loading saved values:', error);
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
        
        buttonContainer.appendChild(generateVirtualBtn);
        buttonContainer.appendChild(generateRandomBtn);
        buttonContainer.appendChild(showSuggestionsBtn);
        
        macGroup.appendChild(buttonContainer);
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
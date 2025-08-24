// Test Authentication with Improved Error Handling
// This script tests the authentication flow to ensure proper error reporting

class AuthenticationTester {
    constructor() {
        this.testMAC = 'AA:7A:10:57:C1:00';
        this.testPortals = [
            'http://play.b4u.live',
            'http://glotv.me',
            'http://play.suntv.biz'
        ];
    }

    // Test error handling for different scenarios
    async testErrorHandling() {
        console.log('🧪 Testing Authentication Error Handling...\n');

        // Test 1: Invalid Portal URL
        console.log('Test 1: Invalid Portal URL');
        try {
            const result = await this.simulatePortalResponse({
                error: 'Portal not found'
            });
            console.log('❌ Should have thrown error');
        } catch (error) {
            console.log(`✅ Correctly caught error: ${error.message}`);
        }

        // Test 2: API not enabled error
        console.log('\nTest 2: API not enabled error');
        try {
            const result = await this.simulatePortalResponse({
                js: {
                    msg: 'API not enabled'
                }
            });
            console.log('❌ Should have thrown error');
        } catch (error) {
            console.log(`✅ Correctly caught error: ${error.message}`);
        }

        // Test 3: Successful authentication
        console.log('\nTest 3: Successful authentication');
        try {
            const result = await this.simulatePortalResponse({
                js: {
                    token: 'test_token_123',
                    token_expire: Math.floor(Date.now() / 1000) + 3600,
                    profile: { id: 1, name: 'test_user' }
                }
            });
            console.log(`✅ Successfully authenticated: Token=${result.token.substring(0, 10)}...`);
        } catch (error) {
            console.log(`❌ Unexpected error: ${error.message}`);
        }

        // Test 4: Missing token
        console.log('\nTest 4: Missing token response');
        try {
            const result = await this.simulatePortalResponse({
                status: 'ok',
                message: 'Response without token'
            });
            console.log('❌ Should have thrown error');
        } catch (error) {
            console.log(`✅ Correctly caught error: ${error.message}`);
        }

        console.log('\n🎯 Error handling tests completed!');
    }

    // Simulate portal response for testing
    async simulatePortalResponse(mockData) {
        // Simulate the error handling logic from auth.js
        
        // Check for portal-specific error messages first
        if (mockData.js && mockData.js.msg) {
            throw new Error(`Portal Error: ${mockData.js.msg}`);
        }
        
        // Check for generic error in response
        if (mockData.error) {
            throw new Error(`Portal Error: ${mockData.error}`);
        }
        
        // Check for message field
        if (mockData.msg) {
            throw new Error(`Portal Error: ${mockData.msg}`);
        }
        
        if (mockData.js && mockData.js.token) {
            return {
                token: mockData.js.token,
                token_expire: mockData.js.token_expire,
                profile: mockData.js.profile || {}
            };
        } else {
            // Provide more detailed error information
            throw new Error('No token received from portal. Response: ' + JSON.stringify(mockData));
        }
    }

    // Test the handshake URL construction
    testHandshakeURLConstruction() {
        console.log('\n🔧 Testing Handshake URL Construction...\n');

        const baseUrl = 'http://example.com/';
        const mac = this.testMAC;
        
        // Simulate the URL construction from performStandardHandshake
        const url = new URL(baseUrl + 'stalker_portal/server/load.php');
        url.searchParams.set('type', 'stb');
        url.searchParams.set('action', 'handshake');
        url.searchParams.set('mac', mac);
        url.searchParams.set('stb_lang', 'en');
        url.searchParams.set('timezone', 'Europe/Kiev');
        
        console.log('✅ Constructed URL:', url.toString());
        console.log('✅ Parameters:');
        for (const [key, value] of url.searchParams) {
            console.log(`   ${key}: ${value}`);
        }
    }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async function() {
        const tester = new AuthenticationTester();
        await tester.testErrorHandling();
        tester.testHandshakeURLConstruction();
    });
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationTester;
}
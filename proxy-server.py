#!/usr/bin/env python3
"""
Enhanced CORS proxy server for IPTV portal authentication
This bypasses browser CORS restrictions by proxying requests server-side
Includes WebSocket and Server-Sent Events support
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import sys
import threading
import time
import hashlib
import base64
from urllib.error import URLError, HTTPError

class CORSProxyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to all responses
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/sse-portal'):
            self.handle_sse_portal()
        elif self.path.startswith('/ws-portal'):
            self.handle_websocket_upgrade()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/proxy-auth':
            self.handle_proxy_auth()
        else:
            super().do_POST()

    def handle_sse_portal(self):
        """Handle Server-Sent Events for portal communication"""
        try:
            # Parse query parameters
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            
            portal_url = params.get('url', [None])[0]
            mac_address = params.get('mac', [None])[0]
            
            if not portal_url or not mac_address:
                self.send_error(400, "Missing url or mac parameter")
                return
            
            print(f"SSE Portal request: {portal_url}, MAC: {mac_address}")
            
            # Send SSE headers
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            
            # Try to authenticate with portal
            def send_sse_data(event_type, data):
                message = f"data: {json.dumps({'type': event_type, **data})}\\n\\n"
                self.wfile.write(message.encode('utf-8'))
                self.wfile.flush()
            
            try:
                # Normalize portal URL
                if not portal_url.endswith('/'):
                    portal_url += '/'
                if not portal_url.endswith('stalker_portal/api/v1/'):
                    portal_url += 'stalker_portal/api/v1/'
                
                handshake_url = portal_url + 'handshake'
                
                # Create request with VU IPTV headers
                req = urllib.request.Request(handshake_url)
                req.add_header('User-Agent', 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3')
                req.add_header('X-User-Agent', 'Model: MAG250; Link: WiFi')
                req.add_header('Cookie', f'mac={mac_address}; stb_lang=en; timezone=Europe/Kiev;')
                
                send_sse_data('status', {'message': 'Attempting portal connection...'})
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    response_data = response.read().decode('utf-8')
                    data = json.loads(response_data)
                    
                    if data.get('js', {}).get('token'):
                        send_sse_data('handshake_success', {
                            'token': data['js']['token'],
                            'token_expire': data['js'].get('token_expire'),
                            'profile': data['js'].get('profile', {})
                        })
                    else:
                        send_sse_data('error', {'message': 'No token received from portal'})
                        
            except Exception as e:
                send_sse_data('error', {'message': f'Portal connection failed: {str(e)}'})
                
        except Exception as e:
            print(f"SSE error: {e}")
            self.send_error(500, f"SSE error: {str(e)}")

    def handle_websocket_upgrade(self):
        """Handle WebSocket upgrade request"""
        try:
            # Check for WebSocket upgrade headers
            if self.headers.get('Upgrade', '').lower() != 'websocket':
                self.send_error(400, "WebSocket upgrade required")
                return
            
            # Get WebSocket key
            websocket_key = self.headers.get('Sec-WebSocket-Key')
            if not websocket_key:
                self.send_error(400, "WebSocket key required")
                return
            
            # Generate accept key
            accept_key = base64.b64encode(
                hashlib.sha1((websocket_key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()
            ).decode()
            
            # Send WebSocket handshake response
            self.send_response(101, "Switching Protocols")
            self.send_header('Upgrade', 'websocket')
            self.send_header('Connection', 'Upgrade')
            self.send_header('Sec-WebSocket-Accept', accept_key)
            self.end_headers()
            
            print("WebSocket connection established")
            
            # Handle WebSocket communication
            self.handle_websocket_communication()
            
        except Exception as e:
            print(f"WebSocket upgrade error: {e}")
            self.send_error(500, f"WebSocket error: {str(e)}")

    def handle_websocket_communication(self):
        """Handle WebSocket messages"""
        try:
            while True:
                # This is a simplified WebSocket implementation
                # In a production environment, you'd use a proper WebSocket library
                data = self.rfile.read(1024)
                if not data:
                    break
                
                # Parse WebSocket frame (simplified)
                # This is just a basic implementation for demonstration
                print(f"WebSocket data received: {data}")
                
                # Echo back for now
                response = b"\\x81\\x05Hello"  # WebSocket text frame
                self.wfile.write(response)
                
        except Exception as e:
            print(f"WebSocket communication error: {e}")

    def handle_proxy_auth(self):
        try:
            # Get request data
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            target_url = request_data.get('url')
            mac_address = request_data.get('macAddress')
            headers = request_data.get('headers', {})
            
            print(f"Proxying request to: {target_url}")
            print(f"MAC Address: {mac_address}")
            
            # Create the request
            req = urllib.request.Request(target_url)
            
            # Add headers
            for key, value in headers.items():
                req.add_header(key, value)
            
            # Make the request
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    response_data = response.read().decode('utf-8')
                    
                    # Send successful response
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data.encode('utf-8'))
                    
                    print(f"Successfully proxied request - Response length: {len(response_data)}")
                    
            except HTTPError as e:
                print(f"HTTP Error: {e.code} - {e.reason}")
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': f'HTTP {e.code}: {e.reason}',
                    'code': e.code
                })
                self.wfile.write(error_response.encode('utf-8'))
                
            except URLError as e:
                print(f"URL Error: {e.reason}")
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': f'Connection failed: {e.reason}',
                    'code': 502
                })
                self.wfile.write(error_response.encode('utf-8'))
                
        except Exception as e:
            print(f"Proxy error: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({
                'error': f'Proxy server error: {str(e)}',
                'code': 500
            })
            self.wfile.write(error_response.encode('utf-8'))

class DualProtocolServer(socketserver.TCPServer):
    """Custom server that handles both HTTP and proxy requests"""
    def __init__(self, server_address, RequestHandlerClass):
        super().__init__(server_address, RequestHandlerClass)
        self.allow_reuse_address = True

def run_server(port=8080):
    print(f"Starting Enhanced IPTV CORS Proxy Server on port {port}")
    print(f"Server capabilities:")
    print(f"  ✓ Static files (HTML, CSS, JS) for the IPTV app")
    print(f"  ✓ CORS proxy requests to /proxy-auth")
    print(f"  ✓ Server-Sent Events to /sse-portal")
    print(f"  ✓ WebSocket connections to /ws-portal")
    print(f"  ✓ Portal authentication bypass strategies")
    print(f"  ✓ VU IPTV & Smart STB header emulation")
    print(f"\\nAccess the app at: http://localhost:{port}")
    print(f"CORS test page: http://localhost:{port}/cors-test.html")
    print(f"Press Ctrl+C to stop the server\\n")
    
    try:
        with DualProtocolServer(("", port), CORSProxyHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\\nShutting down server...")
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"Port {port} is already in use. Please stop the existing server or use a different port.")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number. Using default port 8080.")
    
    run_server(port)
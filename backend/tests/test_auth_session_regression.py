"""
Agentix - Auth.js Session & Authentication Lifecycle Regression Tests
Validates the complete authentication cycle, zero ClientFetchError,
CORS loopback consistency, protected route middleware, and session persistence.
"""

import os
import sys
import pytest
import requests
from playwright.sync_api import sync_playwright

BASE_URLS = ["http://localhost:3000", "http://127.0.0.1:3000"]

def test_api_endpoints_directly():
    print("\n--- Test Suite 1: Direct HTTP Endpoint Verification ---")
    for base in BASE_URLS:
        print(f"\nTesting direct endpoints on {base}:")
        
        # 1. CSRF Token Endpoint
        session = requests.Session()
        csrf_res = session.get(f"{base}/api/auth/csrf")
        assert csrf_res.status_code == 200, f"Failed CSRF endpoint on {base}: {csrf_res.status_code}"
        csrf_json = csrf_res.json()
        assert "csrfToken" in csrf_json, "Missing csrfToken in response"
        csrf_token = csrf_json["csrfToken"]
        print(f"  ✓ CSRF endpoint operational on {base} (Token length: {len(csrf_token)})")
        
        # 2. Providers Endpoint
        prov_res = session.get(f"{base}/api/auth/providers")
        assert prov_res.status_code == 200, f"Failed providers endpoint on {base}: {prov_res.status_code}"
        prov_json = prov_res.json()
        assert "credentials" in prov_json, "Missing credentials provider"
        print(f"  ✓ Providers endpoint operational on {base} (Configured: credentials)")
        
        # 3. Session Endpoint (Unauthenticated)
        sess_res = session.get(f"{base}/api/auth/session")
        assert sess_res.status_code == 200, f"Failed session endpoint on {base}: {sess_res.status_code}"
        sess_body = sess_res.text.strip()
        assert sess_body in ["null", "{}"], f"Unauthenticated session returned unexpected data: {sess_body}"
        print(f"  ✓ Session endpoint returns null cleanly for unauthenticated requests on {base}")
        
        # 4. Signout Endpoint
        signout_res = session.post(
            f"{base}/api/auth/signout",
            headers={"Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1"},
            data={"csrfToken": csrf_token, "callbackUrl": f"{base}/login"}
        )
        assert signout_res.status_code == 200, f"Failed signout on {base}: {signout_res.status_code}"
        print(f"  ✓ Signout endpoint operational on {base}")

@pytest.fixture
def base_url():
    return os.environ.get("BASE_URL", "http://localhost:3000")

def test_browser_full_lifecycle(base_url):
    print(f"\n--- Test Suite 2: Full Browser Lifecycle on {base_url} ---")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True
        )
        context = browser.new_context()
        page = context.new_page()
        
        captured_client_fetch_errors = []
        captured_page_errors = []
        
        def on_console(msg):
            text = msg.text
            if "ClientFetchError" in text or "errors.authjs.dev#autherror" in text:
                captured_client_fetch_errors.append(text)
                
        page.on("console", on_console)
        page.on("pageerror", lambda err: captured_page_errors.append(str(err)))
        
        # 1. Unauthenticated Route Protection
        print("  1. Testing unauthenticated route gating on /dashboard...")
        page.goto(f"{base_url}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(1000)
        assert "/login" in page.url, f"Expected redirect to /login, got {page.url}"
        print("     ✓ Middleware redirected unauthenticated user to login.")
        
        # 2. Invalid Credentials Handling
        print("  2. Testing invalid credential submission...")
        page.fill("input#email", "unauthorized@agentix.com")
        page.fill("input#password", "invalidpassword")
        page.click("button[type=\"submit\"]")
        page.wait_for_timeout(2000)
        assert "Invalid credentials" in page.content(), "Missing invalid credentials error banner"
        print("     ✓ Invalid credentials cleanly surfaced without uncaught fetch error.")
        
        # 3. Valid Institutional Login
        print("  3. Testing valid credential login...")
        page.fill("input#email", "admin@agentix.com")
        page.fill("input#password", "admin123")
        page.click("button[type=\"submit\"]")
        page.wait_for_timeout(3000)
        assert f"{base_url}/dashboard" in page.url, f"Failed redirect to /dashboard: {page.url}"
        print(f"     ✓ Authenticated redirect succeeded -> {page.url}")
        
        # 4. Session Persistence Across Hard Reload
        print("  4. Testing session persistence on reload...")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(1000)
        assert f"{base_url}/dashboard" in page.url, f"Lost session after reload: {page.url}"
        print("     ✓ Session preserved in cookie jar after page reload.")
        
        # 5. Account Details in Header
        print("  5. Verifying user details in profile dropdown...")
        page.click("button[aria-label=\"User Account Menu\"]")
        page.wait_for_timeout(500)
        assert page.locator("text=\"Enterprise Admin\"").first.is_visible(), "Enterprise Admin missing"
        assert page.locator("text=\"admin@agentix.com\"").first.is_visible(), "admin@agentix.com missing"
        print("     ✓ Profile dropdown displays authenticated user claims.")
        
        # 6. Profile Page Access
        print("  6. Navigating to /profile page...")
        page.goto(f"{base_url}/profile", wait_until="networkidle")
        page.wait_for_timeout(1000)
        assert f"{base_url}/profile" in page.url, f"Failed loading profile page: {page.url}"
        assert page.locator("text=\"Active Session\"").first.is_visible(), "Active Session badge missing"
        print("     ✓ Profile page loaded with active session badge.")
        
        # 7. Clean Logout
        print("  7. Executing signout from profile page...")
        page.click("text=\"Sign Out of Session\"")
        page.wait_for_timeout(3000)
        assert f"{base_url}/login" in page.url, f"Expected redirect to login after signout: {page.url}"
        print("     ✓ Session terminated cleanly and redirected to login.")
        
        # 8. Post-Logout Protected Route Defense
        print("  8. Testing post-logout navigation to /dashboard...")
        page.goto(f"{base_url}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(1000)
        assert f"{base_url}/login" in page.url, f"Bypassed protection after logout: {page.url}"
        print("     ✓ Post-logout protected route access denied.")
        
        # 9. Verify Zero ClientFetchError
        assert len(captured_client_fetch_errors) == 0, f"Detected ClientFetchError: {captured_client_fetch_errors}"
        assert len(captured_page_errors) == 0, f"Detected Page Errors: {captured_page_errors}"
        print("     ✓ ZERO ClientFetchErrors detected during full lifecycle.")
        
        browser.close()

if __name__ == "__main__":
    print("=================================================================")
    print("AGENTIX AUTH.JS REGRESSION TEST SUITE")
    print("=================================================================")
    test_api_endpoints_directly()
    for base in BASE_URLS:
        test_browser_full_lifecycle(base)
    print("\n=================================================================")
    print("ALL REGRESSION TESTS PASSED WITH ZERO ERRORS")
    print("=================================================================")

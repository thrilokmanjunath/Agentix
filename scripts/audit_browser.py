import os
import time
from playwright.sync_api import sync_playwright

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "laptop": {"width": 1280, "height": 800},
    "tablet": {"width": 768, "height": 1024},
    "mobile": {"width": 390, "height": 844},
}

BASE_URL = "http://localhost:3000"

def run_audit():
    os.makedirs("audit_screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        print("[1] Auditing Landing Page...")
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        page.screenshot(path="audit_screenshots/01_landing_desktop_light.png", full_page=True)

        # Toggle dark mode on landing
        theme_btn = page.locator('button[aria-label="Toggle theme"]').first
        if theme_btn.is_visible():
            theme_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path="audit_screenshots/01_landing_desktop_dark.png", full_page=True)
            theme_btn.click() # toggle back
            page.wait_for_timeout(300)

        print("[2] Auditing Login Page...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        page.screenshot(path="audit_screenshots/02_login_desktop_light.png")

        # Test invalid login error handling
        page.fill('input[name="email"]', 'wrong@agentix.com')
        page.fill('input[name="password"]', 'badpass')
        page.click('button:has-text("Sign In to Console")')
        page.wait_for_timeout(2000)
        print("URL after invalid login:", page.url)
        page.screenshot(path="audit_screenshots/02_login_invalid_error.png")

        # Test valid login
        print("[3] Performing Valid Login...")
        page.fill('input[name="email"]', 'admin@agentix.com')
        page.fill('input[name="password"]', 'admin123')
        page.click('button:has-text("Sign In to Console")')
        page.wait_for_timeout(3000)
        print("URL after valid login:", page.url)

        # Save dashboard
        print("[4] Auditing Dashboard...")
        page.screenshot(path="audit_screenshots/03_dashboard_desktop_light.png", full_page=True)

        # Toggle dark mode
        theme_btn = page.locator('button[aria-label="Toggle theme"]').first
        if theme_btn.is_visible():
            theme_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path="audit_screenshots/03_dashboard_desktop_dark.png", full_page=True)
            theme_btn.click()
            page.wait_for_timeout(300)

        # Test Agent Console
        print("[5] Auditing Agent Console...")
        page.goto(f"{BASE_URL}/agent-console", wait_until="networkidle")
        page.screenshot(path="audit_screenshots/04_agent_console_desktop_light.png")

        # Check console errors
        print(f"\nCollected {len(console_errors)} console errors:")
        for err in console_errors[:10]:
            print("  ", err)

        browser.close()

if __name__ == "__main__":
    run_audit()

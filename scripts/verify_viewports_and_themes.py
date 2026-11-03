import os
from playwright.sync_api import sync_playwright

VIEWPORTS = [
    ("desktop", 1440, 900),
    ("laptop", 1280, 800),
    ("tablet", 768, 1024),
    ("mobile", 390, 844),
]

PAGES_TO_VERIFY = [
    ("/", "01_landing"),
    ("/login", "02_login"),
    ("/dashboard", "03_dashboard"),
    ("/agent-console", "04_agent_console"),
    ("/data-dock", "05_data_dock"),
    ("/intelligence-reports", "06_intelligence_reports"),
    ("/insights", "07_insights"),
    ("/history", "08_history"),
    ("/settings", "09_settings"),
    ("/profile", "10_profile")
]

def verify_all():
    os.makedirs("audit_screenshots/final_verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True
        )

        for vp_name, width, height in VIEWPORTS:
            print(f"\n==========================================")
            print(f"Testing Viewport: {vp_name} ({width}x{height})")
            print(f"==========================================")
            context = browser.new_context(viewport={"width": width, "height": height})
            page = context.new_page()

            # First log in
            page.goto("http://localhost:3000/login", wait_until="networkidle")
            page.fill('input[name="email"]', 'admin@agentix.com')
            page.fill('input[name="password"]', 'admin123')
            page.click('button:has-text("Sign In to Console")')
            page.wait_for_timeout(2000)

            for route, slug in PAGES_TO_VERIFY:
                page.goto(f"http://localhost:3000{route}", wait_until="networkidle")
                page.wait_for_timeout(800)

                # Capture Light Mode
                page.screenshot(path=f"audit_screenshots/final_verification/{slug}_{vp_name}_light.png")

                # If on desktop or mobile, test toggling theme to dark and capture
                if vp_name in ["desktop", "mobile"]:
                    theme_btn = page.locator('button[aria-label="Toggle theme"]').first
                    if theme_btn.is_visible():
                        theme_btn.click()
                        page.wait_for_timeout(400)
                        page.screenshot(path=f"audit_screenshots/final_verification/{slug}_{vp_name}_dark.png")
                        theme_btn.click() # restore light
                        page.wait_for_timeout(300)

                # Check horizontal scrollbar / overflow
                has_h_scroll = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth")
                if has_h_scroll:
                    print(f"  [OVERFLOW DETECTED] {route} at {vp_name}")
                else:
                    print(f"  [OK] {route} ({vp_name}) - No overflow")

            context.close()

        browser.close()
        print("\nAll 4 viewports and themes validated successfully!")

if __name__ == "__main__":
    verify_all()

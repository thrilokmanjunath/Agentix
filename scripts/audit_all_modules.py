import os
from playwright.sync_api import sync_playwright

ROUTES = [
    ("/dashboard", "03_dashboard"),
    ("/agent-console", "04_agent_console"),
    ("/data-dock", "05_data_dock"),
    ("/intelligence-reports", "06_intelligence_reports"),
    ("/knowledge-graph", "07_knowledge_graph"),
    ("/insights", "08_insights"),
    ("/history", "09_history"),
    ("/settings", "10_settings"),
    ("/profile", "11_profile")
]

VIEWPORTS = [
    ("desktop", 1440, 900),
    ("laptop", 1280, 800),
    ("tablet", 768, 1024),
    ("mobile", 390, 844)
]

def audit_all():
    os.makedirs("audit_screenshots/modules", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Login
        page.goto("http://localhost:3000/login", wait_until="networkidle")
        page.fill('input[name="email"]', 'admin@agentix.com')
        page.fill('input[name="password"]', 'admin123')
        page.click('button:has-text("Sign In to Console")')
        page.wait_for_timeout(2000)

        for route, name in ROUTES:
            print(f"Auditing route: {route}...")
            page.goto(f"http://localhost:3000{route}", wait_until="networkidle")
            page.wait_for_timeout(1000)

            # Screenshot Desktop Light
            page.screenshot(path=f"audit_screenshots/modules/{name}_desktop_light.png")

            # Check overflow elements
            overflowing = page.evaluate("""() => {
                const elements = document.querySelectorAll('*');
                let bad = [];
                for (const el of elements) {
                    if (el.scrollWidth > el.clientWidth && el.clientWidth > 0 && !['HTML', 'BODY'].includes(el.tagName)) {
                        const style = window.getComputedStyle(el);
                        if (style.overflowX !== 'auto' && style.overflowX !== 'scroll') {
                            bad.push({
                                tag: el.tagName,
                                className: el.className.slice(0, 50),
                                scrollWidth: el.scrollWidth,
                                clientWidth: el.clientWidth
                            });
                        }
                    }
                }
                return bad.slice(0, 5);
            }""")
            if overflowing:
                print(f"  [WARN] Overflowing elements on {route}:", overflowing)

        # Audit Mobile Viewport for Dashboard and Agent Console
        page.set_viewport_size({"width": 390, "height": 844})
        for route, name in [("/dashboard", "03_dashboard"), ("/agent-console", "04_agent_console")]:
            page.goto(f"http://localhost:3000{route}", wait_until="networkidle")
            page.screenshot(path=f"audit_screenshots/modules/{name}_mobile_light.png")

        browser.close()
        print("Audit of all modules completed.")

if __name__ == "__main__":
    audit_all()

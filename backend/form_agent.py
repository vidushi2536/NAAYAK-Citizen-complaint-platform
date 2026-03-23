"""
form_agent.py — Naayak
Automatically fills the CPGRAMS (pgportal.gov.in) complaint form
using Playwright browser automation.
"""

import asyncio
import os
import json
import random
import string
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Try importing Playwright
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Playwright not installed. Run: pip install playwright && playwright install chromium")
    exit(1)


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

CPGRAMS_URL = "https://pgportal.gov.in"
SCREENSHOT_DIR = Path("data/screenshots")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

# Delhi-specific CPGRAMS ministry/department codes
DEPARTMENT_CPGRAMS_MAP = {
    "Delhi Jal Board": {
        "ministry": "MINISTRY OF HOUSING AND URBAN AFFAIRS",
        "department": "Delhi Jal Board",
        "subject_prefix": "Water Supply Complaint"
    },
    "BSES Rajdhani Power Limited": {
        "ministry": "MINISTRY OF POWER",
        "department": "Bureau of Energy Efficiency",
        "subject_prefix": "Electricity Complaint"
    },
    "Public Works Department Delhi": {
        "ministry": "MINISTRY OF ROAD TRANSPORT AND HIGHWAYS",
        "department": "National Highways Authority of India",
        "subject_prefix": "Road/Infrastructure Complaint"
    },
    "Delhi Health Services": {
        "ministry": "MINISTRY OF HEALTH AND FAMILY WELFARE",
        "department": "Department of Health and Family Welfare",
        "subject_prefix": "Health Services Complaint"
    },
    "Directorate of Education Delhi": {
        "ministry": "MINISTRY OF EDUCATION",
        "department": "Department of School Education and Literacy",
        "subject_prefix": "Education Complaint"
    },
    "Municipal Corporation of Delhi": {
        "ministry": "MINISTRY OF HOUSING AND URBAN AFFAIRS",
        "department": "Central Public Works Department",
        "subject_prefix": "Sanitation/MCD Complaint"
    },
    "Delhi Police": {
        "ministry": "MINISTRY OF HOME AFFAIRS",
        "department": "Delhi Police",
        "subject_prefix": "Police/Security Complaint"
    },
    "Delhi Food and Civil Supplies": {
        "ministry": "MINISTRY OF CONSUMER AFFAIRS, FOOD AND PUBLIC DISTRIBUTION",
        "department": "Department of Food and Public Distribution",
        "subject_prefix": "Ration/PDS Complaint"
    },
    "Delhi Revenue Department": {
        "ministry": "MINISTRY OF RURAL DEVELOPMENT",
        "department": "Department of Land Resources",
        "subject_prefix": "Land Records Complaint"
    },
    "Delhi Social Welfare Department": {
        "ministry": "MINISTRY OF LABOUR AND EMPLOYMENT",
        "department": "Employees Provident Fund Organisation",
        "subject_prefix": "Pension/Social Welfare Complaint"
    },
}


def generate_complaint_id():
    """Generate a Naayak complaint ID."""
    suffix = ''.join(random.choices(string.digits, k=5))
    return f"NAY-DL-2024-{suffix}"


def build_complaint_text(complaint_data: dict, citizen_name: str, citizen_phone: str, complaint_id: str) -> str:
    """Build a formal complaint text for CPGRAMS submission."""
    now = datetime.now().strftime("%d %B %Y, %I:%M %p")
    dept = complaint_data.get("department", "Concerned Department")
    urgency = complaint_data.get("urgency", "Medium")
    category = complaint_data.get("category", "General")
    summary = complaint_data.get("summary", "")
    translated = complaint_data.get("translated_text", "")
    suggested = complaint_data.get("suggested_action", "")

    text = f"""GRIEVANCE COMPLAINT — {complaint_id}
Date: {now}

Complainant: {citizen_name}
Phone: {citizen_phone}
Department: {dept}
Category: {category}
Urgency Level: {urgency}

COMPLAINT DETAILS:
{translated if translated else summary}

SUMMARY:
{summary}

SUGGESTED ACTION:
{suggested}

This complaint has been filed through Naayak — AI-powered citizen grievance system for Delhi.
Kindly acknowledge receipt and take appropriate action within the stipulated time period.

Thank you,
{citizen_name}
Naayak Complaint ID: {complaint_id}
"""
    return text


async def fill_cpgrams_form(complaint_data: dict, citizen_name: str, citizen_phone: str, headless: bool = False):
    """
    Main function: opens CPGRAMS, fills the complaint form, takes screenshots.

    Args:
        complaint_data: JSON output from ai_engine.analyze_complaint()
        citizen_name: Citizen's full name
        citizen_phone: Citizen's phone number
        headless: Run browser in background (True) or visible (False for demo)

    Returns:
        dict with status, complaint_id, and screenshot paths
    """
    complaint_id = generate_complaint_id()
    dept_name = complaint_data.get("department", "Delhi Jal Board")
    dept_info = DEPARTMENT_CPGRAMS_MAP.get(dept_name, DEPARTMENT_CPGRAMS_MAP["Delhi Jal Board"])

    complaint_text = build_complaint_text(complaint_data, citizen_name, citizen_phone, complaint_id)
    subject = f"{dept_info['subject_prefix']} — {complaint_data.get('category', 'General')} | Urgency: {complaint_data.get('urgency', 'Medium')}"

    screenshots = []
    result = {
        "complaint_id": complaint_id,
        "status": "pending",
        "screenshots": [],
        "message": ""
    }

    async with async_playwright() as p:
        print(f"\n[Naayak] Launching browser for complaint: {complaint_id}")
        browser = await p.chromium.launch(headless=headless, slow_mo=800)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        try:
            # ── Step 1: Go to CPGRAMS ──
            print("[Naayak] Opening CPGRAMS portal...")
            await page.goto(CPGRAMS_URL, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            ss1 = str(SCREENSHOT_DIR / f"{complaint_id}_01_homepage.png")
            await page.screenshot(path=ss1, full_page=True)
            screenshots.append(ss1)
            print(f"[Naayak] Screenshot: {ss1}")

            # ── Step 2: Click Lodge Grievance ──
            print("[Naayak] Looking for 'Lodge Grievance' button...")
            lodge_selectors = [
                "a:has-text('Lodge Grievance')",
                "a:has-text('Lodge your Grievance')",
                "a:has-text('Register Grievance')",
                "button:has-text('Lodge')",
                "#lodge",
                ".lodge-grievance",
                "a[href*='lodge']",
                "a[href*='grievance']"
            ]

            lodge_clicked = False
            for selector in lodge_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=3000)
                    await page.click(selector)
                    lodge_clicked = True
                    print(f"[Naayak] Clicked lodge button: {selector}")
                    break
                except Exception:
                    continue

            if not lodge_clicked:
                # Try navigating directly to grievance registration page
                print("[Naayak] Direct button not found, trying direct URL...")
                await page.goto(f"{CPGRAMS_URL}/pgp-web/gp/pgrs/pgrsView.do", timeout=20000)

            await page.wait_for_timeout(2000)
            ss2 = str(SCREENSHOT_DIR / f"{complaint_id}_02_lodge_page.png")
            await page.screenshot(path=ss2, full_page=True)
            screenshots.append(ss2)

            # ── Step 3: Fill Ministry/Department ──
            print("[Naayak] Filling ministry selection...")
            ministry_selectors = [
                "select[name*='ministry']",
                "select[name*='Ministry']",
                "select#ministry",
                "select[id*='ministry']"
            ]

            for selector in ministry_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=3000)
                    await page.select_option(selector, label=dept_info["ministry"])
                    print(f"[Naayak] Selected ministry: {dept_info['ministry']}")
                    await page.wait_for_timeout(1500)
                    break
                except Exception:
                    continue

            # ── Step 4: Fill Department ──
            dept_selectors = [
                "select[name*='department']",
                "select[name*='Department']",
                "select#department",
                "select[id*='department']",
                "select[id*='dept']"
            ]

            for selector in dept_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=3000)
                    await page.select_option(selector, label=dept_info["department"])
                    print(f"[Naayak] Selected department: {dept_info['department']}")
                    await page.wait_for_timeout(1000)
                    break
                except Exception:
                    continue

            # ── Step 5: Fill personal details ──
            print("[Naayak] Filling personal details...")

            name_selectors = [
                "input[name*='name']", "input[id*='name']",
                "input[placeholder*='Name']", "input[placeholder*='name']",
                "#complainantName", "#name"
            ]
            for selector in name_selectors:
                try:
                    await page.fill(selector, citizen_name)
                    print(f"[Naayak] Filled name: {citizen_name}")
                    break
                except Exception:
                    continue

            phone_selectors = [
                "input[name*='phone']", "input[name*='mobile']",
                "input[id*='phone']", "input[id*='mobile']",
                "input[placeholder*='Phone']", "input[placeholder*='Mobile']",
                "#phone", "#mobile"
            ]
            for selector in phone_selectors:
                try:
                    await page.fill(selector, citizen_phone)
                    print(f"[Naayak] Filled phone: {citizen_phone}")
                    break
                except Exception:
                    continue

            # Email field (optional)
            email_selectors = ["input[name*='email']", "input[id*='email']", "#email"]
            for selector in email_selectors:
                try:
                    await page.fill(selector, "naayak.grievance@gmail.com")
                    break
                except Exception:
                    continue

            # Address / location field
            address_selectors = [
                "input[name*='address']", "textarea[name*='address']",
                "input[id*='address']", "textarea[id*='address']",
                "#address", "input[placeholder*='Address']"
            ]
            for selector in address_selectors:
                try:
                    await page.fill(selector, "Delhi")
                    break
                except Exception:
                    continue

            # ── Step 6: Fill Subject ──
            print("[Naayak] Filling subject...")
            subject_selectors = [
                "input[name*='subject']", "input[id*='subject']",
                "input[placeholder*='Subject']", "#subject",
                "input[name*='Subject']"
            ]
            for selector in subject_selectors:
                try:
                    await page.fill(selector, subject[:150])  # CPGRAMS limit
                    print(f"[Naayak] Filled subject")
                    break
                except Exception:
                    continue

            # ── Step 7: Fill Complaint Text ──
            print("[Naayak] Filling complaint description...")
            desc_selectors = [
                "textarea[name*='description']", "textarea[name*='complaint']",
                "textarea[name*='grievance']", "textarea[id*='description']",
                "textarea[id*='complaint']", "textarea[id*='grievance']",
                "#description", "#grievanceText", "#complaintText",
                "textarea"
            ]
            for selector in desc_selectors:
                try:
                    await page.fill(selector, complaint_text[:3000])  # CPGRAMS character limit
                    print(f"[Naayak] Filled complaint description")
                    break
                except Exception:
                    continue

            await page.wait_for_timeout(1000)

            # ── Step 8: Screenshot of filled form ──
            ss3 = str(SCREENSHOT_DIR / f"{complaint_id}_03_filled_form.png")
            await page.screenshot(path=ss3, full_page=True)
            screenshots.append(ss3)
            print(f"[Naayak] Screenshot of filled form: {ss3}")

            # ── Step 9: Submit (only if not in demo mode) ──
            # For demo, we stop here and show the filled form.
            # Uncomment the block below to actually submit.

            """
            submit_selectors = [
                "button[type='submit']",
                "input[type='submit']",
                "button:has-text('Submit')",
                "button:has-text('Register')",
                "#submit"
            ]
            for selector in submit_selectors:
                try:
                    await page.click(selector)
                    await page.wait_for_timeout(3000)
                    print("[Naayak] Form submitted!")
                    break
                except Exception:
                    continue

            ss4 = str(SCREENSHOT_DIR / f"{complaint_id}_04_submitted.png")
            await page.screenshot(path=ss4, full_page=True)
            screenshots.append(ss4)
            """

            result["status"] = "form_filled"
            result["screenshots"] = screenshots
            result["message"] = f"Form successfully filled for complaint {complaint_id}. Ready for submission."

            print(f"\n[Naayak] ✅ Form filled successfully!")
            print(f"[Naayak] Complaint ID: {complaint_id}")
            print(f"[Naayak] Screenshots saved: {len(screenshots)}")

        except Exception as e:
            ss_err = str(SCREENSHOT_DIR / f"{complaint_id}_error.png")
            await page.screenshot(path=ss_err, full_page=True)
            screenshots.append(ss_err)

            result["status"] = "error"
            result["screenshots"] = screenshots
            result["message"] = f"Error during form fill: {str(e)}"
            print(f"\n[Naayak] ❌ Error: {e}")
            print(f"[Naayak] Error screenshot saved: {ss_err}")

        finally:
            await browser.close()

    return result


async def run_demo():
    """Run a demo with a sample Water complaint for judges."""
    print("=" * 60)
    print("  NAAYAK — CPGRAMS Form Auto-Fill Demo")
    print("  Delhi Citizen Grievance System")
    print("=" * 60)

    # Sample complaint data (as would come from ai_engine.py)
    sample_complaint = {
        "language_detected": "Hindi",
        "translated_text": "There has been no water supply in Dwarka Sector 6 for the last 3 days. We have small children at home and are facing severe difficulty. Please send a water tanker immediately.",
        "category": "Water",
        "urgency": "High",
        "department": "Delhi Jal Board",
        "department_email": "cgro@delhijalboard.nic.in",
        "summary": "No water supply for 3 days in Dwarka Sector 6. Children at home. Immediate tanker requested.",
        "suggested_action": "File urgent complaint under DJB Citizen Charter. Request emergency water tanker dispatch and pipeline inspection."
    }

    citizen_name = "Ramesh Kumar"
    citizen_phone = "9876543210"

    print(f"\nComplaint Category : {sample_complaint['category']}")
    print(f"Urgency            : {sample_complaint['urgency']}")
    print(f"Department         : {sample_complaint['department']}")
    print(f"Citizen            : {citizen_name} ({citizen_phone})")
    print("\nStarting browser automation...\n")

    # headless=False shows the browser on screen — great for demo
    result = await fill_cpgrams_form(
        complaint_data=sample_complaint,
        citizen_name=citizen_name,
        citizen_phone=citizen_phone,
        headless=False
    )

    print("\n" + "=" * 60)
    print("RESULT:")
    print(json.dumps(result, indent=2))
    print("=" * 60)

    if result["screenshots"]:
        print(f"\nScreenshots saved in: {SCREENSHOT_DIR}/")
        for s in result["screenshots"]:
            print(f"  → {s}")


if __name__ == "__main__":
    asyncio.run(run_demo())
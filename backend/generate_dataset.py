import requests
import json
import csv
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

CATEGORIES = [
    "Water", "Electricity", "Roads", "Health", "Education",
    "Sanitation", "Police", "Ration", "Land", "Pension"
]

LANGUAGES = ["Hindi", "English", "Punjabi", "Urdu", "Bhojpuri", "Maithili"]

LOCALITIES = [
    "Dwarka Sector 6", "Dwarka Sector 12", "Rohini Sector 14", "Rohini Sector 22",
    "Okhla Phase 1", "Okhla Phase 2", "Karol Bagh", "Lajpat Nagar",
    "Janakpuri", "Pitampura", "Saket", "Vasant Kunj", "Mayur Vihar Phase 1",
    "Mayur Vihar Phase 3", "Uttam Nagar", "Najafgarh", "Shahdara",
    "Mustafabad", "Seelampur", "Badarpur", "Mehrauli", "Malviya Nagar",
    "Govindpuri", "Tughlakabad", "Sangam Vihar"
]

DEPARTMENT_MAP = {
    "Water":       {"department": "Delhi Jal Board",                       "email": "cgro@delhijalboard.nic.in"},
    "Electricity": {"department": "BSES Rajdhani Power Limited",            "email": "customercare@bsesdelhi.com"},
    "Roads":       {"department": "Public Works Department Delhi",          "email": "pwd-delhi@nic.in"},
    "Health":      {"department": "Delhi Health Services",                  "email": "dghs@delhi.gov.in"},
    "Education":   {"department": "Directorate of Education Delhi",         "email": "doe@delhi.gov.in"},
    "Sanitation":  {"department": "Municipal Corporation of Delhi",         "email": "mcdonline@nic.in"},
    "Police":      {"department": "Delhi Police",                           "email": "cp@delhipolice.gov.in"},
    "Ration":      {"department": "Delhi Food and Civil Supplies Dept",     "email": "dfsc@nic.in"},
    "Land":        {"department": "Delhi Revenue Department",               "email": "revenue@delhi.gov.in"},
    "Pension":     {"department": "Delhi Social Welfare Department",        "email": "dsw@delhi.gov.in"}
}

URGENCY_LEVELS = ["High", "Medium", "Low"]


def call_gemini(prompt: str) -> str:
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    response = requests.post(
        GEMINI_URL,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30
    )
    data = response.json()
    if "candidates" not in data:
        raise Exception(f"Gemini error: {data}")
    return data["candidates"][0]["content"]["parts"][0]["text"]


def generate_batch(category: str, language: str, locality: str, count: int = 5) -> list:
    prompt = f"""
Generate {count} realistic citizen grievance complaints for Delhi, India.

Requirements:
- Category: {category}
- Language: {language}
- Locality: {locality}, Delhi
- Write complaints exactly as a real Delhi citizen would write them — informal, natural language
- Mix of High, Medium, and Low urgency
- Each complaint should be 1-3 sentences long
- Use local Delhi slang and references where appropriate
- For Hindi: use Devanagari script or Hinglish
- For Punjabi: use natural Punjabi as spoken in Delhi
- For Urdu: use Urdu script or Roman Urdu
- For Bhojpuri: use Bhojpuri as spoken by UP/Bihar migrants in Delhi
- For Maithili: use Maithili as spoken in Delhi
- For English: use simple Indian English

Return ONLY a valid JSON array with exactly {count} objects. No explanation, no markdown, no backticks:
[
  {{
    "complaint_text": "the complaint in {language}",
    "language": "{language}",
    "category": "{category}",
    "urgency": "High or Medium or Low",
    "department": "{DEPARTMENT_MAP[category]['department']}",
    "expected_email": "{DEPARTMENT_MAP[category]['email']}"
  }}
]
"""

    try:
        raw = call_gemini(prompt).strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        result = json.loads(raw)
        return result
    except Exception as e:
        print(f"Error generating batch for {category}/{language}/{locality}: {e}")
        return []


def generate_full_dataset(output_file: str = "data/synthetic_complaints.csv", target: int = 300):
    Path("data").mkdir(exist_ok=True)

    all_complaints = []
    total_generated = 0

    print(f"Generating {target} Delhi-specific complaints using gemini-2.0-flash...\n")

    for category in CATEGORIES:
        if total_generated >= target:
            break
        for language in LANGUAGES:
            if total_generated >= target:
                break

            locality = LOCALITIES[total_generated % len(LOCALITIES)]
            print(f"Generating: {category} | {language} | {locality}")

            batch = generate_batch(category, language, locality, count=5)

            for item in batch:
                item["complaint_text"] = item.get("complaint_text", "").strip()
                item["language"] = language
                item["category"] = category
                item["urgency"] = item.get("urgency", "Medium")
                item["department"] = DEPARTMENT_MAP[category]["department"]
                item["expected_email"] = DEPARTMENT_MAP[category]["email"]
                all_complaints.append(item)
                total_generated += 1

            print(f"Total so far: {total_generated}")
            time.sleep(2)

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["complaint_text", "language", "category", "urgency", "department", "expected_email"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for complaint in all_complaints[:target]:
            writer.writerow({k: complaint.get(k, "") for k in fieldnames})

    print(f"\nDataset saved to {output_file}")
    print(f"Total complaints generated: {min(total_generated, target)}")

    print(f"\nBreakdown by category:")
    for category in CATEGORIES:
        count = sum(1 for c in all_complaints if c.get("category") == category)
        print(f"  {category}: {count}")

    print(f"\nBreakdown by language:")
    for language in LANGUAGES:
        count = sum(1 for c in all_complaints if c.get("language") == language)
        print(f"  {language}: {count}")

    print(f"\nBreakdown by urgency:")
    for urgency in URGENCY_LEVELS:
        count = sum(1 for c in all_complaints if c.get("urgency") == urgency)
        print(f"  {urgency}: {count}")


if __name__ == "__main__":
    generate_full_dataset()
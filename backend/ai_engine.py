import json
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_client = None

def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def call_gemini(prompt: str) -> str:
    client = get_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text


def load_knowledge_base():
    try:
        with open("data/knowledge_base.txt", "r", encoding="utf-8") as f:
            return f.read()[:3000]
    except FileNotFoundError:
        return ""


def load_ministries():
    with open("ministries.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["departments"]


def analyze_complaint(complaint_text: str, language: str = "Hindi") -> dict:
    knowledge_base = load_knowledge_base()
    ministries = load_ministries()

    department_list = "\n".join(
        [f"- {d['category']}: {d['department']} ({d['email']})" for d in ministries]
    )

    rag_context = ""
    if knowledge_base:
        rag_context = f"""
Use the following Delhi government policy context to give a better suggested action:
---
{knowledge_base}
---
"""

    prompt = f"""
You are Naayak, an AI grievance assistant for Delhi citizens.
A citizen has submitted a complaint in {language}.

{rag_context}

Available Delhi government departments:
{department_list}

Citizen complaint:
"{complaint_text}"

Your job:
1. Detect the language of the complaint
2. Translate it to English if it is not already in English
3. Identify the correct category from: Water, Electricity, Roads, Health, Education, Sanitation, Police, Ration, Land, Pension
4. Detect urgency level: High (life threatening, no water or electricity for 3 or more days, medical emergency, crime), Medium (inconvenience, delays, billing issues), Low (general queries, documentation)
5. Route to the correct Delhi department from the list above
6. Write a one line summary of the complaint in English
7. Suggest a specific action the citizen can take referencing actual Delhi government schemes or policies if applicable

Return ONLY a valid JSON object with exactly these fields and nothing else. No explanation, no markdown, no backticks:

{{
  "language_detected": "the language the complaint was written in",
  "translated_text": "English translation of the complaint",
  "category": "one of the 10 categories",
  "urgency": "High or Medium or Low",
  "department": "full Delhi department name",
  "department_email": "official email of that department",
  "summary": "one line summary in English",
  "suggested_action": "specific action with reference to Delhi government scheme or policy"
}}
"""

    raw = call_gemini(prompt).strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    return json.loads(raw)


def generate_email(complaint_data: dict, citizen_name: str, citizen_phone: str, complaint_id: str) -> str:
    prompt = f"""
You are Naayak, an AI grievance assistant for Delhi citizens.
Write a formal official grievance letter in English to be sent to a Delhi government department.

Complaint details:
- Citizen Name: {citizen_name}
- Citizen Phone: {citizen_phone}
- Complaint ID: {complaint_id}
- Category: {complaint_data.get('category')}
- Urgency: {complaint_data.get('urgency')}
- Department: {complaint_data.get('department')}
- Summary: {complaint_data.get('summary')}
- Original Complaint: {complaint_data.get('translated_text')}
- Suggested Action: {complaint_data.get('suggested_action')}

Write a formal grievance letter that:
1. Has a proper subject line
2. Addresses the department head formally
3. States the complaint clearly and factually
4. Mentions the urgency level
5. Requests specific action with a timeline
6. Is signed by the citizen
7. Sounds like an official RTI or grievance letter, not a casual email
8. Is between 150 and 250 words

Return only the email body text. No extra explanation.
"""
    return call_gemini(prompt).strip()


def detect_language_only(text: str) -> str:
    prompt = f"""
Detect the language of this text and return only the language name in English.
Text: "{text}"
Return only one word like: Hindi, English, Punjabi, Urdu, Bhojpuri, Maithili
"""
    return call_gemini(prompt).strip()


if __name__ == "__main__":
    print("Testing Naayak AI Engine...\n")

    test_complaints = [
        {
            "text": "Dwarka sector 6 mein 3 din se paani nahi aa raha hai, ghar mein pine ka paani bhi khatam ho gaya",
            "language": "Hindi"
        },
        {
            "text": "Rohini sector 14 ch sadak te bahut vadde khade ne, gadiyan kharab ho rahi ne",
            "language": "Punjabi"
        },
        {
            "text": "Okhla mein kal se bijli nahi hai, ghar mein budhay mareezon ko bahut takleef ho rahi hai",
            "language": "Urdu"
        }
    ]

    for i, complaint in enumerate(test_complaints):
        print(f"Test {i+1}: {complaint['language']} complaint")
        print(f"Input: {complaint['text']}")
        try:
            result = analyze_complaint(complaint["text"], complaint["language"])
            print(f"Output: {json.dumps(result, indent=2, ensure_ascii=False)}")

            email = generate_email(
                result,
                citizen_name="Test Citizen",
                citizen_phone="9999999999",
                complaint_id=f"NAY-DL-2024-0000{i+1}"
            )
            print(f"Generated Email:\n{email}")
        except Exception as e:
            print(f"Error: {e}")
        print("-" * 60)
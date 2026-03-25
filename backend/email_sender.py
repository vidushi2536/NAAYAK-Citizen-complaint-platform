import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")
BCC_EMAIL = os.getenv("GMAIL_USER")


def send_grievance_email(
    complaint_data: dict,
    citizen_name: str,
    citizen_phone: str,
    complaint_id: str,
    email_body: str
) -> dict:

    to_email = complaint_data.get("department_email")
    department = complaint_data.get("department")
    category = complaint_data.get("category")
    urgency = complaint_data.get("urgency")
    summary = complaint_data.get("summary")

    urgency_prefix = ""
    if urgency == "High":
        urgency_prefix = "[URGENT] "

    subject = f"{urgency_prefix}Grievance Complaint - {category} - {complaint_id}"

    msg = MIMEMultipart("alternative")
    msg["From"] = f"Naayak Grievance Portal <{GMAIL_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Bcc"] = BCC_EMAIL

    plain_text = f"""
{email_body}

---
This complaint was filed via Naayak - AI Grievance Redressal System
Complaint ID: {complaint_id}
Filed on: {datetime.now().strftime("%d %B %Y at %I:%M %p")}
Citizen Name: {citizen_name}
Citizen Phone: {citizen_phone}
Category: {category}
Urgency: {urgency}
Department: {department}
Summary: {summary}

For any queries contact: {GMAIL_USER}
"""

    html_text = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

  <div style="background: #1D9E75; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="color: white; margin: 0;">Naayak Grievance Portal</h2>
    <p style="color: #d0f0e8; margin: 4px 0 0;">AI-Powered Citizen Grievance Redressal — Delhi</p>
  </div>

  <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">

    <div style="background: {'#fdecea' if urgency == 'High' else '#fff8e1' if urgency == 'Medium' else '#e8f5e9'}; 
                border-left: 4px solid {'#E8593C' if urgency == 'High' else '#EF9F27' if urgency == 'Medium' else '#1D9E75'};
                padding: 10px 14px; border-radius: 4px; margin-bottom: 20px;">
      <strong>Urgency Level: {urgency}</strong> — {summary}
    </div>

    <div style="white-space: pre-line; line-height: 1.7; color: #333;">
{email_body}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

    <table style="width: 100%; font-size: 13px; color: #555;">
      <tr>
        <td style="padding: 4px 0;"><strong>Complaint ID</strong></td>
        <td style="padding: 4px 0;">{complaint_id}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Filed on</strong></td>
        <td style="padding: 4px 0;">{datetime.now().strftime("%d %B %Y at %I:%M %p")}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Citizen Name</strong></td>
        <td style="padding: 4px 0;">{citizen_name}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Citizen Phone</strong></td>
        <td style="padding: 4px 0;">{citizen_phone}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Category</strong></td>
        <td style="padding: 4px 0;">{category}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Urgency</strong></td>
        <td style="padding: 4px 0;">{urgency}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Department</strong></td>
        <td style="padding: 4px 0;">{department}</td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This complaint was filed via Naayak — AI Grievance Redressal System for Delhi Citizens.<br>
      For queries: {GMAIL_USER}
    </p>

  </div>
</body>
</html>
"""

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_text, "html"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        all_recipients = [to_email, BCC_EMAIL]
        server.sendmail(GMAIL_USER, all_recipients, msg.as_string())
        server.quit()

        print(f"Email sent successfully to {to_email}")
        return {
            "success": True,
            "message": f"Grievance email sent to {department} at {to_email}",
            "complaint_id": complaint_id,
            "sent_to": to_email,
            "sent_at": datetime.now().strftime("%d %B %Y at %I:%M %p")
        }

    except smtplib.SMTPAuthenticationError:
        print("Gmail authentication failed. Check your App Password in .env")
        return {
            "success": False,
            "message": "Gmail authentication failed. Check your App Password.",
            "complaint_id": complaint_id
        }


def send_bulk_grievance_email(
    complaint_data: dict,
    citizen_name: str,
    citizen_phone: str,
    complaint_id: str,
    email_body: str,
    bulk_count: int,
    location: str
) -> dict:

    to_email = complaint_data.get("department_email")
    department = complaint_data.get("department")
    category = complaint_data.get("category")
    urgency = complaint_data.get("urgency")
    summary = complaint_data.get("summary")

    urgency_prefix = ""
    if urgency == "High":
        urgency_prefix = "[URGENT] "

    subject = f"{urgency_prefix}Bulk Grievance Complaint - {category} - {complaint_id}"

    msg = MIMEMultipart("alternative")
    msg["From"] = f"Naayak Grievance Portal <{GMAIL_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Bcc"] = BCC_EMAIL

    plain_text = f"""
Bulk grievance on behalf of {bulk_count} citizens in {location} area.

{email_body}

---
This bulk complaint was filed via Naayak - AI Grievance Redressal System
Complaint ID: {complaint_id}
Filed on: {datetime.now().strftime("%d %B %Y at %I:%M %p")}
Latest Citizen Name: {citizen_name}
Latest Citizen Phone: {citizen_phone}
Category: {category}
Urgency: {urgency}
Department: {department}
Summary: {summary}
Total Citizens: {bulk_count}

For any queries contact: {GMAIL_USER}
"""

    html_text = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

  <div style="background: #1D9E75; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="color: white; margin: 0;">Naayak Grievance Portal</h2>
    <p style="color: #d0f0e8; margin: 4px 0 0;">AI-Powered Citizen Grievance Redressal — Delhi</p>
  </div>

  <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">

    <div style="background: #ff5722; color: white; padding: 12px; border-radius: 4px; margin-bottom: 20px; text-align: center;">
      <strong>BULK GRIEVANCE</strong> — {bulk_count} citizens in {location} have reported this issue
    </div>

    <div style="background: {'#fdecea' if urgency == 'High' else '#fff8e1' if urgency == 'Medium' else '#e8f5e9'}; 
                border-left: 4px solid {'#E8593C' if urgency == 'High' else '#EF9F27' if urgency == 'Medium' else '#1D9E75'};
                padding: 10px 14px; border-radius: 4px; margin-bottom: 20px;">
      <strong>Urgency Level: {urgency}</strong> — {summary}
    </div>

    <div style="white-space: pre-line; line-height: 1.7; color: #333;">
{email_body}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

    <table style="width: 100%; font-size: 13px; color: #555;">
      <tr>
        <td style="padding: 4px 0;"><strong>Complaint ID</strong></td>
        <td style="padding: 4px 0;">{complaint_id}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Filed on</strong></td>
        <td style="padding: 4px 0;">{datetime.now().strftime("%d %B %Y at %I:%M %p")}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Latest Citizen Name</strong></td>
        <td style="padding: 4px 0;">{citizen_name}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Latest Citizen Phone</strong></td>
        <td style="padding: 4px 0;">{citizen_phone}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Category</strong></td>
        <td style="padding: 4px 0;">{category}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Urgency</strong></td>
        <td style="padding: 4px 0;">{urgency}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Department</strong></td>
        <td style="padding: 4px 0;">{department}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Total Citizens</strong></td>
        <td style="padding: 4px 0;">{bulk_count}</td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This bulk complaint was filed via Naayak — AI Grievance Redressal System for Delhi Citizens.<br>
      For queries: {GMAIL_USER}
    </p>

  </div>
</body>
</html>
"""

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_text, "html"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        all_recipients = [to_email, BCC_EMAIL]
        server.sendmail(GMAIL_USER, all_recipients, msg.as_string())
        server.quit()

        print(f"Bulk email sent successfully to {to_email}")
        return {
            "success": True,
            "message": f"Bulk grievance email sent to {department} at {to_email}",
            "complaint_id": complaint_id,
            "sent_to": to_email,
            "sent_at": datetime.now().strftime("%d %B %Y at %I:%M %p"),
            "bulk_count": bulk_count
        }

    except smtplib.SMTPAuthenticationError:
        print("Gmail authentication failed. Check your App Password in .env")
        return {
            "success": False,
            "message": "Gmail authentication failed. Check your App Password.",
            "complaint_id": complaint_id
        }

    except smtplib.SMTPException as e:
        print(f"SMTP error: {e}")
        return {
            "success": False,
            "message": f"Email sending failed: {str(e)}",
            "complaint_id": complaint_id
        }

    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            "success": False,
            "message": f"Unexpected error: {str(e)}",
            "complaint_id": complaint_id
        }


if __name__ == "__main__":
    print("Testing email sender...\n")

    test_complaint_data = {
        "language_detected": "Hindi",
        "translated_text": "There has been no water supply in Dwarka sector 6 for 3 days. Drinking water has also run out at home.",
        "category": "Water",
        "urgency": "High",
        "department": "Delhi Jal Board",
        "department_email": GMAIL_USER,
        "summary": "No water supply for 3 days in Dwarka sector 6",
        "suggested_action": "File urgent complaint under DJB citizen charter section 4 for restoration within 24 hours"
    }

    test_email_body = """
Subject: Urgent Grievance - No Water Supply for 3 Days - Dwarka Sector 6

To,
The Chief Grievance Redressal Officer,
Delhi Jal Board,
Varunalaya Phase II, Karol Bagh, New Delhi - 110055

Sir/Madam,

I am writing to bring to your urgent attention the complete absence of water supply in Dwarka Sector 6, New Delhi for the past three consecutive days. This situation has caused severe hardship to the residents, particularly the elderly and children, as even drinking water has been exhausted.

As per the Delhi Jal Board Citizen Charter, water supply disruptions exceeding 24 hours must be addressed on a priority basis. I request your office to take immediate action to restore water supply and provide an explanation for this prolonged disruption.

I request that this matter be treated as HIGH URGENCY and resolved within 24 hours of receiving this complaint. I expect a written acknowledgment and update on the action taken.

Thanking you,
Ramesh Kumar
Phone: 9876543210
Complaint ID: NAY-DL-2024-00001
Date: 23 March 2024
"""

    result = send_grievance_email(
        complaint_data=test_complaint_data,
        citizen_name="Ramesh Kumar",
        citizen_phone="9876543210",
        complaint_id="NAY-DL-2024-00001",
        email_body=test_email_body
    )

    print(f"Result: {result}")
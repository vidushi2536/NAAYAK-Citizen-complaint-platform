from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import random
import string
from datetime import datetime
from ai_engine import analyze_complaint, generate_email
from email_sender import send_grievance_email, send_bulk_grievance_email
from duplicate_checker import check_duplicate

app = FastAPI(title="Naayak API", description="AI Grievance Redressal System for Delhi Citizens")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

otp_store = {}
complaint_store = {}


class ComplaintRequest(BaseModel):
    text: str
    language: str = "Hindi"
    citizen_name: Optional[str] = "Citizen"
    citizen_phone: Optional[str] = ""
    location: Optional[str] = ""


class EmailRequest(BaseModel):
    complaint_data: dict
    citizen_name: str
    citizen_phone: str
    complaint_id: str
    email_body: str


class OTPRequest(BaseModel):
    phone: str
    otp: str


class SendOTPRequest(BaseModel):
    phone: str


class RTIRequest(BaseModel):
    complaint: str
    department: str
    urgency: str
    rti_notice: Optional[str] = ""
    complaint_id: Optional[str] = ""


def generate_complaint_id():
    digits = ''.join(random.choices(string.digits, k=5))
    return f"NAY-DL-{datetime.now().year}-{digits}"


def compute_resolution_probability(category: str, urgency: str) -> int:
    base_rates = {
        "Water": 62, "Electricity": 71, "Roads": 48,
        "Health": 65, "Education": 58, "Sanitation": 44,
        "Police": 55, "Ration": 60, "Land": 38, "Pension": 52, "General": 50,
    }
    rate = base_rates.get(category, 50)
    if urgency == "High":
        rate = min(rate + 8, 95)
    elif urgency == "Low":
        rate = max(rate - 10, 10)
    rate += random.randint(-5, 5)
    return max(10, min(95, rate))


def compute_escalation_risk(resolution_probability: int, urgency: str) -> str:
    if urgency == "High" and resolution_probability < 55:
        return "High"
    if urgency == "High" or resolution_probability < 50:
        return "Medium"
    return "Low"


def generate_rti_notice(complaint_data: dict, citizen_name: str, complaint_id: str) -> str:
    dept = complaint_data.get("department", "Concerned Department")
    category = complaint_data.get("category", "General")
    summary = complaint_data.get("summary", "")
    response_days = complaint_data.get("response_days", 7)
    now = datetime.now().strftime("%d %B %Y")
    return f"""RTI APPLICATION UNDER THE RIGHT TO INFORMATION ACT, 2005

Date: {now}
Application ID: {complaint_id}

To,
The Public Information Officer,
{dept}

Subject: RTI Application regarding {category} complaint — {summary}

Sir/Madam,

I, {citizen_name}, a citizen of India, hereby request the following information under Section 6(1) of the Right to Information Act, 2005:

1. The current status of complaint ID {complaint_id} filed regarding: {summary}
2. The name and designation of the officer responsible for handling this complaint
3. Timeline of action taken or proposed to be taken on this matter
4. Reasons for any delay in resolution beyond the mandated {response_days} working days
5. Copy of any internal correspondence or orders issued in connection with this complaint

I am enclosing the prescribed application fee of Rs. 10/- (Ten Rupees Only) in the form of Indian Postal Order / Cash.

If the information requested is not provided within 30 days from the date of receipt of this application, I reserve the right to file a first appeal before the First Appellate Authority as provided under Section 19(1) of the RTI Act, 2005.

Yours faithfully,
{citizen_name}
Naayak Complaint Reference: {complaint_id}
Date: {now}
"""


@app.get("/")
def root():
    return {"message": "Naayak API is running", "version": "1.0", "city": "Delhi", "status": "active"}


@app.post("/send-otp")
def send_otp(request: SendOTPRequest):
    otp_store[request.phone] = "123456"
    return {"success": True, "message": f"OTP sent to {request.phone}", "dev_note": "OTP is 123456 for demo"}


@app.post("/verify-otp")
def verify_otp(request: OTPRequest):
    stored_otp = otp_store.get(request.phone, "123456")
    if request.otp == stored_otp:
        return {"success": True, "verified": True, "message": "Phone number verified successfully"}
    raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")


@app.post("/analyze")
def analyze(request: ComplaintRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Complaint text cannot be empty")
    try:
        result = analyze_complaint(request.text, request.language)

        category = result.get("category", "General")
        urgency = result.get("urgency", "Medium")
        resolution_probability = compute_resolution_probability(category, urgency)
        escalation_risk = compute_escalation_risk(resolution_probability, urgency)
        result["resolution_probability"] = resolution_probability
        result["escalation_risk"] = escalation_risk

        duplicate_id = check_duplicate(request.text, request.location, complaint_store)
        if duplicate_id:
            complaint_store[duplicate_id]["bulk_count"] += 1
            bulk_count = complaint_store[duplicate_id]["bulk_count"]
            stored = complaint_store[duplicate_id]
            original_summary = stored["analysis"].get("summary", "")
            if "citizens" not in original_summary.lower():
                stored["analysis"]["summary"] = f"{bulk_count} citizens reported: {original_summary}"
            return {
                "success": True,
                "complaint_id": duplicate_id,
                "analysis": stored["analysis"],
                "email_body": stored["email_body"],
                "filed_at": stored["filed_at"],
                "bulk_count": bulk_count,
                "bulk_citizens": bulk_count
            }

        complaint_id = generate_complaint_id()
        result["rti_notice"] = generate_rti_notice(result, request.citizen_name, complaint_id)

        email_body = generate_email(
            complaint_data=result,
            citizen_name=request.citizen_name,
            citizen_phone=request.citizen_phone,
            complaint_id=complaint_id
        )

        complaint_store[complaint_id] = {
            "complaint_id": complaint_id,
            "citizen_name": request.citizen_name,
            "citizen_phone": request.citizen_phone,
            "original_text": request.text,
            "language": request.language,
            "location": request.location,
            "analysis": result,
            "email_body": email_body,
            "status": "Pending",
            "filed_at": datetime.now().strftime("%d %B %Y at %I:%M %p"),
            "bulk_count": 1
        }

        return {
            "success": True,
            "complaint_id": complaint_id,
            "analysis": result,
            "email_body": email_body,
            "filed_at": complaint_store[complaint_id]["filed_at"],
            "bulk_count": 1,
            "bulk_citizens": 1
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


@app.post("/send-email")
def send_email(request: EmailRequest):
    try:
        if request.complaint_id in complaint_store:
            data = complaint_store[request.complaint_id]
            bulk_count = data.get("bulk_count", 1)
            if bulk_count > 1:
                result = send_bulk_grievance_email(
                    complaint_data=request.complaint_data,
                    citizen_name=request.citizen_name,
                    citizen_phone=request.citizen_phone,
                    complaint_id=request.complaint_id,
                    email_body=request.email_body,
                    bulk_count=bulk_count,
                    location=data.get("location", "")
                )
            else:
                result = send_grievance_email(
                    complaint_data=request.complaint_data,
                    citizen_name=request.citizen_name,
                    citizen_phone=request.citizen_phone,
                    complaint_id=request.complaint_id,
                    email_body=request.email_body
                )
        else:
            result = send_grievance_email(
                complaint_data=request.complaint_data,
                citizen_name=request.citizen_name,
                citizen_phone=request.citizen_phone,
                complaint_id=request.complaint_id,
                email_body=request.email_body
            )

        if request.complaint_id in complaint_store:
            complaint_store[request.complaint_id]["status"] = "Filed"
            complaint_store[request.complaint_id]["email_sent_at"] = datetime.now().strftime("%d %B %Y at %I:%M %p")

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email sending failed: {str(e)}")


@app.post("/send-rti")
def send_rti(request: RTIRequest):
    """Send RTI notice — best-effort, never raises to the client."""
    try:
        complaint_data = {
            "department": request.department,
            "department_email": "rti@naayak.gov.in",
            "category": "RTI",
            "urgency": request.urgency,
            "summary": f"RTI Notice for complaint {request.complaint_id or 'N/A'}"
        }
        rti_body = request.rti_notice or f"RTI Notice regarding {request.department}"
        result = send_grievance_email(
            complaint_data=complaint_data,
            citizen_name="Citizen",
            citizen_phone="",
            complaint_id=request.complaint_id or generate_complaint_id(),
            email_body=rti_body
        )
        return {"success": result.get("success", False), "message": "RTI notice sent" if result.get("success") else "RTI send failed", "detail": result}
    except Exception as e:
        return {"success": False, "message": f"RTI send failed: {str(e)}"}


@app.get("/track/{complaint_id}")
def track_complaint(complaint_id: str):
    if complaint_id in complaint_store:
        complaint = complaint_store[complaint_id]
        return {
            "success": True,
            "complaint_id": complaint_id,
            "status": complaint["status"],
            "category": complaint["analysis"].get("category"),
            "urgency": complaint["analysis"].get("urgency"),
            "department": complaint["analysis"].get("department"),
            "summary": complaint["analysis"].get("summary"),
            "filed_at": complaint["filed_at"],
            "email_sent_at": complaint.get("email_sent_at", "Not sent yet")
        }
    return {
        "success": False,
        "complaint_id": complaint_id,
        "status": "Not found",
        "message": "Complaint ID not found. It may have been filed in a previous session."
    }


@app.get("/complaints")
def get_all_complaints():
    complaints = []
    for complaint_id, data in complaint_store.items():
        analysis = data.get("analysis", {})
        complaints.append({
            "complaint_id": complaint_id,
            "citizen_name": data["citizen_name"],
            "summary": analysis.get("summary", "No summary available"),
            "category": analysis.get("category", "General"),
            "urgency": analysis.get("urgency", "Low"),
            "department": analysis.get("department", "Municipal Corporation"),
            "email": analysis.get("department_email", "municipal@gov.in"),
            "department_email": analysis.get("department_email", "municipal@gov.in"),
            "status": data["status"],
            "filed_at": data["filed_at"],
            "location": data.get("location", ""),
            "original_text": data["original_text"],
            "bulk_count": data.get("bulk_count", 1),
            # Full objects so the bulk re-hydration flow works in script.js
            "analysis": analysis,
            "email_body": data.get("email_body", "")
        })
    urgency_order = {"High": 0, "Medium": 1, "Low": 2}
    complaints.sort(key=lambda x: urgency_order.get(x["urgency"], 3))
    return {"success": True, "total": len(complaints), "complaints": complaints}


@app.patch("/complaints/{complaint_id}/status")
def update_status(complaint_id: str, status: str):
    if complaint_id not in complaint_store:
        raise HTTPException(status_code=404, detail="Complaint not found")
    valid_statuses = ["Pending", "In Progress", "Resolved"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    complaint_store[complaint_id]["status"] = status
    return {"success": True, "complaint_id": complaint_id, "status": status, "updated_at": datetime.now().strftime("%d %B %Y at %I:%M %p")}


@app.patch("/complaints/{complaint_id}/bulk")
def increment_bulk(complaint_id: str):
    if complaint_id not in complaint_store:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint_store[complaint_id]["bulk_count"] = complaint_store[complaint_id].get("bulk_count", 1) + 1
    bulk_count = complaint_store[complaint_id]["bulk_count"]
    original_summary = complaint_store[complaint_id]["analysis"].get("summary", "")
    if "citizens" not in original_summary.lower():
        complaint_store[complaint_id]["analysis"]["summary"] = f"{bulk_count} citizens reported: {original_summary}"
    return {"success": True, "complaint_id": complaint_id, "bulk_count": bulk_count, "updated_summary": complaint_store[complaint_id]["analysis"]["summary"]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
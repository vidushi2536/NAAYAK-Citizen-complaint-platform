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
duplicate_store = {}


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


def generate_complaint_id():
    digits = ''.join(random.choices(string.digits, k=5))
    return f"NAY-DL-{datetime.now().year}-{digits}"


@app.get("/")
def root():
    return {
        "message": "Naayak API is running",
        "version": "1.0",
        "city": "Delhi",
        "status": "active"
    }


@app.post("/send-otp")
def send_otp(request: SendOTPRequest):
    otp = "123456"
    otp_store[request.phone] = otp
    print(f"OTP for {request.phone}: {otp}")
    return {
        "success": True,
        "message": f"OTP sent to {request.phone}",
        "dev_note": "OTP is hardcoded as 123456 for demo"
    }


@app.post("/verify-otp")
def verify_otp(request: OTPRequest):
    stored_otp = otp_store.get(request.phone, "123456")
    if request.otp == stored_otp:
        return {
            "success": True,
            "verified": True,
            "message": "Phone number verified successfully"
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")


@app.post("/analyze")
def analyze(request: ComplaintRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Complaint text cannot be empty")

    try:
        result = analyze_complaint(request.text, request.language)

        duplicate_id = check_duplicate(request.text, request.location, complaint_store)
        if duplicate_id:
            complaint_store[duplicate_id]["bulk_count"] += 1
            bulk_count = complaint_store[duplicate_id]["bulk_count"]
            original_summary = complaint_store[duplicate_id]["analysis"].get("summary", "")
            if "citizens" not in original_summary.lower():
                complaint_store[duplicate_id]["analysis"]["summary"] = f"{bulk_count} citizens reported: {original_summary}"
            return {
                "success": True,
                "complaint_id": duplicate_id,
                "analysis": complaint_store[duplicate_id]["analysis"],
                "email_body": complaint_store[duplicate_id]["email_body"],
                "filed_at": complaint_store[duplicate_id]["filed_at"],
                "bulk_count": bulk_count,
                "bulk_citizens": bulk_count
            }

        complaint_id = generate_complaint_id()

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
            complaint_data = complaint_store[request.complaint_id]
            bulk_count = complaint_data.get("bulk_count", 1)
            location = complaint_data.get("location", "")
            if bulk_count > 1:
                result = send_bulk_grievance_email(
                    complaint_data=request.complaint_data,
                    citizen_name=request.citizen_name,
                    citizen_phone=request.citizen_phone,
                    complaint_id=request.complaint_id,
                    email_body=request.email_body,
                    bulk_count=bulk_count,
                    location=location
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
            # Fallback to normal if not in store
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
    else:
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
        complaints.append({
            "complaint_id": complaint_id,
            "citizen_name": data["citizen_name"],
            "summary": data["analysis"].get("summary"),
            "category": data["analysis"].get("category"),
            "urgency": data["analysis"].get("urgency"),
            "department": data["analysis"].get("department"),
            "email": data["analysis"].get("department_email", "municipal@gov.in"),
            "status": data["status"],
            "filed_at": data["filed_at"],
            "location": data.get("location", ""),
            "original_text": data["original_text"],
            "bulk_count": data.get("bulk_count", 1)
        })
    complaints.sort(key=lambda x: (
        0 if x["urgency"] == "High" else 1 if x["urgency"] == "Medium" else 2
    ))
    return {
        "success": True,
        "total": len(complaints),
        "complaints": complaints
    }


@app.patch("/complaints/{complaint_id}/status")
def update_status(complaint_id: str, status: str):
    if complaint_id not in complaint_store:
        raise HTTPException(status_code=404, detail="Complaint not found")
    valid_statuses = ["Pending", "In Progress", "Resolved"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    complaint_store[complaint_id]["status"] = status
    return {
        "success": True,
        "complaint_id": complaint_id,
        "status": status,
        "updated_at": datetime.now().strftime("%d %B %Y at %I:%M %p")
    }


@app.patch("/complaints/{complaint_id}/bulk")
def increment_bulk(complaint_id: str):
    if complaint_id not in complaint_store:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint_store[complaint_id]["bulk_count"] = complaint_store[complaint_id].get("bulk_count", 1) + 1
    # Update summary to reflect bulk
    original_summary = complaint_store[complaint_id]["analysis"].get("summary", "")
    if "citizens" not in original_summary.lower():
        complaint_store[complaint_id]["analysis"]["summary"] = f"{complaint_store[complaint_id]['bulk_count']} citizens reported: {original_summary}"
    return {
        "success": True,
        "complaint_id": complaint_id,
        "bulk_count": complaint_store[complaint_id]["bulk_count"],
        "updated_summary": complaint_store[complaint_id]["analysis"]["summary"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
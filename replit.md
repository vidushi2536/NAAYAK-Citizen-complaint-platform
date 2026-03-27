# Naayak - AI Grievance Redressal System

A civic tech platform for Delhi citizens to file and track government complaints.

## Architecture

- **Frontend**: Static HTML/CSS/JS served from `frontend/` on port 5000
- **Backend**: FastAPI (Python) served from `backend/` on port 8000

## Stack

- Frontend: Vanilla HTML, CSS, JavaScript (no build step)
- Backend: FastAPI + Uvicorn, Python 3.12
- AI: Google Gemini API via `google-genai` library
- Email: SMTP via Gmail (smtplib)

## Workflows

- `Start application` — Python static file server for frontend on port 5000 (webview)
- `Backend API` — FastAPI backend on port 8000 (console)

## Key Files

- `frontend/index.html` — Role selection login page
- `frontend/citizen.html` — Citizen complaint filing interface
- `frontend/adhikari.html` — Department officer dashboard
- `frontend/admin.html` — Admin control panel
- `frontend/dashboard.html` — Complaint dashboard
- `frontend/script.js` — Shared JS logic (API calls, UI logic)
- `frontend/server.py` — Simple static file server for dev
- `backend/main.py` — FastAPI routes and complaint store
- `backend/ai_engine.py` — Gemini API calls for complaint analysis
- `backend/email_sender.py` — SMTP email sending
- `backend/duplicate_checker.py` — Complaint deduplication logic
- `backend/ministries.json` — Delhi department name/email mapping
- `backend/data/knowledge_base.txt` — RAG context for AI

## Environment Variables Required

- `GEMINI_API_KEY` — Google Gemini API key
- `GMAIL_USER` — Gmail address for sending emails
- `GMAIL_PASSWORD` — Gmail app password

## Notes

- Complaint data is stored in-memory (`complaint_store` dict in main.py). Not persisted across restarts.
- Frontend API URL in `script.js` points to `http://localhost:8000`
- Deployment uses `vm` mode because backend holds in-memory state

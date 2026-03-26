const API_URL = "https://naayak--parnikadesk.replit.app";
const DEMO_OTP = "123456";
const TICKET_YEAR = "2024";
const ADHIKARI_CREDENTIALS = {
    email: "roads.officer@gov.in",
    password: "adhikari123",
    department: "Roads Department"
};
const ADMIN_CREDENTIALS = {
    email: "admin@naayak.gov.in",
    password: "admin123"
};

let latestComplaint = null;
let categoryChart = null;
let statusChart = null;
let dashboardState = {
    complaints: [],
    filteredComplaints: [],
    source: "dummy",
    role: "admin",
    officerDepartment: ADHIKARI_CREDENTIALS.department
};

const dummyComplaints = [
    { ticketId: "NAY-2024-00001", summary: "Overflowing roadside garbage near the main market entrance.", category: "Sanitation", urgency: "High", department: "Sanitation Department", status: "Pending" },
    { ticketId: "NAY-2024-00002", summary: "Large pothole slowing buses near the central depot.", category: "Road & Infrastructure", urgency: "High", department: "Roads Department", status: "In Progress" },
    { ticketId: "NAY-2024-00003", summary: "Open drainage water collecting outside Sector 9 homes.", category: "Water & Drainage", urgency: "Medium", department: "Water Department", status: "Resolved" },
    { ticketId: "NAY-2024-00004", summary: "Frequent power cuts affecting the community health center.", category: "Electricity", urgency: "High", department: "Electricity Board", status: "Pending" },
    { ticketId: "NAY-2024-00005", summary: "Broken streetlights reported near the girls hostel lane.", category: "Public Safety", urgency: "Medium", department: "Municipal Corporation", status: "In Progress" },
    { ticketId: "NAY-2024-00006", summary: "Uncollected debris left after road repair in Ward 7.", category: "Road & Infrastructure", urgency: "Low", department: "Roads Department", status: "Pending" },
    { ticketId: "NAY-2024-00007", summary: "Water supply disrupted across apartments in Sector 5.", category: "Water & Drainage", urgency: "High", department: "Water Department", status: "Resolved" },
    { ticketId: "NAY-2024-00008", summary: "Garbage piling up outside the bus stand for three days.", category: "Sanitation", urgency: "Medium", department: "Sanitation Department", status: "In Progress" },
    { ticketId: "NAY-2024-00009", summary: "Transformer sparking sounds reported near Ward 12 junction.", category: "Electricity", urgency: "Low", department: "Electricity Board", status: "Pending" },
    { ticketId: "NAY-2024-00010", summary: "Damaged footpath near primary school creating safety risk.", category: "Public Safety", urgency: "Medium", department: "Municipal Corporation", status: "Resolved" }
];

function buildComplaintSummary(complaintText) {
    const normalizedText = complaintText.replace(/\s+/g, " ").trim();
    if (normalizedText.length <= 82) {
        return normalizedText;
    }

    return `${normalizedText.slice(0, 79).trim()}...`;
}

function buildDraftEmail(details) {
    return [
        "To,",
        details.department,
        details.email,
        "",
        `Subject: Citizen complaint regarding ${details.category.toLowerCase()}`,
        "",
        "Dear Sir/Madam,",
        "",
        "A citizen complaint has been submitted through the Naayak platform.",
        "",
        `Urgency: ${details.urgency}`,
        `Department: ${details.department}`,
        details.location ? `Location: ${details.location}` : "",
        "",
        "Complaint details:",
        details.complaintText,
        "",
        "Kindly review the matter and take necessary action at the earliest.",
        "",
        "Regards,",
        "Naayak Complaint System"
    ].filter(Boolean).join("\n");
}

function getRandomUrgency() {
    const urgencyLevels = ["High", "Medium", "Low"];
    return urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)];
}

function getUrgencyBadgeClass(urgency) {
    if (urgency === "High") return "status-pill-red";
    if (urgency === "Medium") return "status-pill-yellow";
    return "status-pill-green";
}

function getUrgencyRowClass(urgency) {
    if (urgency === "High") return "urgency-row-high";
    if (urgency === "Medium") return "urgency-row-medium";
    return "urgency-row-low";
}

function getDashboardUrgencyBadgeClass(urgency) {
    if (urgency === "High") return "urgency-high";
    if (urgency === "Medium") return "urgency-medium";
    return "urgency-low";
}

function normalizeResolutionProbability(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return 50;
    }
    return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function getResolutionBarColor(probability) {
    if (probability > 65) return "#1D9E75";
    if (probability >= 40) return "#EF9F27";
    return "#E8593C";
}

function getEscalationRiskBadgeClass(risk) {
    if (risk === "High") return "badge badge-red";
    if (risk === "Medium") return "badge badge-yellow";
    return "badge badge-green";
}

function getEscalationRiskBannerConfig(risk) {
    if (risk === "High") {
        return {
            message: "This department has a poor resolution record. RTI notice prepared automatically.",
            backgroundColor: "#FDE7E3",
            textColor: "#A63C26",
            borderColor: "#E8593C"
        };
    }
    if (risk === "Medium") {
        return {
            message: "Moderate resolution performance. Monitoring recommended.",
            backgroundColor: "#FEF3D7",
            textColor: "#8A5A06",
            borderColor: "#EF9F27"
        };
    }
    return {
        message: "This department has a good resolution record. We will monitor your complaint.",
        backgroundColor: "#E4F5EE",
        textColor: "#176B53",
        borderColor: "#1D9E75"
    };
}

function ensurePredictionBanner() {
    const predictionCard = document.getElementById("predictionCard");
    if (!predictionCard || !predictionCard.parentElement) return null;

    let bannerEl = document.getElementById("predictionBanner");
    if (!bannerEl) {
        bannerEl = document.createElement("div");
        bannerEl.id = "predictionBanner";
        bannerEl.className = "result-tile";
        bannerEl.style.padding = "14px 16px";
        bannerEl.style.borderLeft = "4px solid transparent";
        bannerEl.style.fontWeight = "600";
        bannerEl.style.marginTop = "12px";
        predictionCard.insertAdjacentElement("afterend", bannerEl);
    }

    return bannerEl;
}

function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getRecognitionLanguage() {
    const languageField = document.getElementById("language");
    if (!languageField) return "en-IN";
    return languageField.value === "Hindi" ? "hi-IN" : "en-IN";
}

async function fetchComplaints() {
    try {
        const response = await fetch(API_URL + "/complaints");
        if (!response.ok) {
            throw new Error(`Failed to fetch complaints: ${response.status}`);
        }
        const data = await response.json();
        return data.complaints || [];
    } catch (error) {
        console.error("Error fetching complaints:", error);
        return [];
    }
}

function isWithinLast7Days(filedAt) {
    if (!filedAt) return false;
    const now = new Date();
    const complaintDate = new Date(filedAt);
    const diffTime = Math.abs(now - complaintDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}

function areComplaintsSimilar(text1, text2) {
    const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const t1 = normalize(text1);
    const t2 = normalize(text2);
    
    // Simple similarity: check if they share significant common words
    const words1 = new Set(t1.split(/\s+/));
    const words2 = new Set(t2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.size / union.size;
    return similarity > 0.3; // 30% similarity threshold
}

function findSimilarComplaint(complaints, newComplaintText, location) {
    return complaints.find(complaint => 
        complaint.location === location && 
        isWithinLast7Days(complaint.filed_at) && 
        areComplaintsSimilar(complaint.original_text, newComplaintText)
    );
}

function getCurrentPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith("/citizen.html")) return "citizen";
    if (path.endsWith("/adhikari.html")) return "adhikari";
    if (path.endsWith("/admin.html")) return "admin";
    return "index";
}

function showScreen(screenId) {
    const screenIds = ["citizenLogin", "adhikariLogin", "adminLogin", "complaintScreen", "loadingScreen", "resultScreen", "confirmationScreen"];
    screenIds.forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.classList.toggle("hidden", id !== screenId);
        element.classList.toggle("active-screen", id === screenId);
    });
}

function selectRole(role) {
    const roles = ["citizen", "adhikari", "admin"];
    roles.forEach((item) => {
        const button = document.getElementById(`${item}RoleBtn`);
        const panel = document.getElementById(`${item}Login`);
        if (button) {
            button.classList.toggle("active-role", item === role);
        }
        if (panel) {
            panel.classList.toggle("hidden", item !== role);
            panel.classList.toggle("active-screen", item === role);
        }
    });
}

function sendCitizenOTP() {
    const phone = document.getElementById("citizenPhone");
    const otpBox = document.getElementById("citizenOtpBox");
    if (!phone || !otpBox) return;

    if (!/^\d{10}$/.test(phone.value.trim())) {
        alert("Enter a valid 10 digit mobile number.");
        phone.focus();
        return;
    }

    otpBox.classList.remove("hidden");
    alert("OTP sent successfully. Use 123456 for this demo.");
}

function loginCitizen() {
    const otpField = document.getElementById("citizenOtp");
    if (!otpField) return;

    if (otpField.value.trim() !== DEMO_OTP) {
        alert("Incorrect OTP. Please use 123456.");
        otpField.focus();
        return;
    }

    window.location.href = "citizen.html";
}

function loginAdhikari() {
    const emailField = document.getElementById("adhikariEmail");
    const passwordField = document.getElementById("adhikariPassword");
    if (!emailField || !passwordField) return;

    if (emailField.value.trim().toLowerCase() !== ADHIKARI_CREDENTIALS.email || passwordField.value !== ADHIKARI_CREDENTIALS.password) {
        alert("Invalid adhikari demo credentials.");
        return;
    }

    window.location.href = "adhikari.html";
}

function loginAdmin() {
    const emailField = document.getElementById("adminEmail");
    const passwordField = document.getElementById("adminPassword");
    if (!emailField || !passwordField) return;

    if (emailField.value.trim().toLowerCase() !== ADMIN_CREDENTIALS.email || passwordField.value !== ADMIN_CREDENTIALS.password) {
        alert("Invalid admin demo credentials.");
        return;
    }

    window.location.href = "admin.html";
}

function startVoiceMock() {
    const complaintText = document.getElementById("complaintText");
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
    if (!complaintText) return;

    if (!SpeechRecognitionConstructor) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = getRecognitionLanguage();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        alert("Listening... Please speak your complaint clearly.");
    };

    recognition.onresult = (event) => {
        complaintText.value = event.results[0][0].transcript.trim();
        complaintText.focus();
    };

    recognition.onerror = () => {
        alert("Could not capture speech. Please try again.");
    };

    recognition.start();
}

function getMockAiResponse(complaintText, selectedCategory, location) {
    const normalizedComplaint = complaintText.toLowerCase();
    let department = "Municipal Corporation";
    let email = "municipal@gov.in";
    let category = selectedCategory || "Public Safety";

    if (normalizedComplaint.includes("road") || normalizedComplaint.includes("pothole")) {
        department = "Roads Department";
        email = "roads@gov.in";
        category = "Road & Infrastructure";
    } else if (normalizedComplaint.includes("water") || normalizedComplaint.includes("drainage")) {
        department = "Water Department";
        email = "water@gov.in";
        category = "Water & Drainage";
    } else if (normalizedComplaint.includes("electricity") || normalizedComplaint.includes("power")) {
        department = "Electricity Board";
        email = "electricity@gov.in";
        category = "Electricity";
    } else if (normalizedComplaint.includes("garbage") || normalizedComplaint.includes("sanitation")) {
        department = "Sanitation Department";
        email = "sanitation@gov.in";
        category = "Sanitation";
    }

    const urgency = getRandomUrgency();
    const draft = buildDraftEmail({
        complaintText,
        category,
        urgency,
        department,
        email,
        location
    });

    return { 
        category, 
        urgency, 
        department, 
        email, 
        draft, 
        summary: buildComplaintSummary(complaintText),
        complaintId: generateTicketId(),
        filedAt: "",
        bulk_count: 1,
        resolutionProbability: 50,
        escalationRisk: "Medium",
        rtiNotice: "RTI notice text will appear here from the API."
    };
}

async function analyzeComplaint(complaintText, context = {}) {
    try {
        const response = await fetch(API_URL + "/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                text: complaintText,
                language: context.language || "English",
                citizen_name: context.citizenName || "Citizen",
                citizen_phone: context.citizenPhone || "",
                location: context.location || ""
            })
        });

        if (!response.ok) {
            throw new Error(`Analyze request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result || typeof result !== "object") {
            throw new Error("Analyze response is invalid");
        }

        const analysis = result.analysis || {};
        const urgency = ["High", "Medium", "Low"].includes(analysis.urgency) ? analysis.urgency : getRandomUrgency();
        const department = analysis.department || "Municipal Corporation";
        const email = analysis.department_email || "municipal@gov.in";
        const category = analysis.category || context.selectedCategory || "Public Safety";
        const draft = result.email_body || buildDraftEmail({
            complaintText,
            category,
            urgency,
            department,
            email,
            location: context.location
        });

        return {
            complaintId: result.complaint_id || generateTicketId(),
            category,
            urgency,
            department,
            email,
            draft,
            summary: analysis.summary || buildComplaintSummary(complaintText),
            filedAt: result.filed_at || "",
            bulk_count: 1,
            resolutionProbability: normalizeResolutionProbability(analysis.resolution_probability),
            escalationRisk: ["High", "Medium", "Low"].includes(analysis.escalation_risk) ? analysis.escalation_risk : "Medium",
            rtiNotice: analysis.rti_notice || "RTI notice text will appear here from the API."
        };
    } catch (error) {
        return getMockAiResponse(complaintText, context.selectedCategory, context.location);
    }
}

function updateResultScreen(response) {
    const urgencyEl = document.getElementById("urgency");
    const departmentEl = document.getElementById("department");
    const emailEl = document.getElementById("email");
    const ticketIdEl = document.getElementById("ticketId");
    const aiSummaryEl = document.getElementById("aiSummary");
    const draftEmailEl = document.getElementById("draftEmail");
    const bulkBanner = document.getElementById("bulkBanner");
    const sendButton = document.getElementById("sendButton");
    const predictionBarEl = document.querySelector("#predictionCard .progress-bar");
    const predictionPercentageEl = document.getElementById("predictionPercentage");
    const resolutionMessageEl = document.getElementById("resolutionMessage");
    const escalationRiskEl = document.getElementById("escalationRisk");
    const rtiNoticeTextEl = document.getElementById("rtiNoticeText");
    const predictionBannerEl = ensurePredictionBanner();

    const resolutionProbability = normalizeResolutionProbability(response.resolutionProbability);
    const escalationRisk = ["High", "Medium", "Low"].includes(response.escalationRisk) ? response.escalationRisk : "Medium";
    const rtiNotice = response.rtiNotice || "RTI notice text will appear here from the API.";

    if (urgencyEl) {
        urgencyEl.textContent = response.urgency;
        urgencyEl.className = `status-pill ${getUrgencyBadgeClass(response.urgency)}`;
    }
    if (departmentEl) {
        departmentEl.textContent = response.department;
    }
    if (emailEl) {
        emailEl.textContent = response.email;
    }
    if (ticketIdEl) {
        ticketIdEl.textContent = response.complaintId || "Generated after send";
    }
    if (aiSummaryEl) {
        const bulkText = response.bulk_count > 1 ? ` This is now a bulk complaint with ${response.bulk_count} citizens reporting the same issue.` : "";
        aiSummaryEl.textContent = `AI matched this complaint to ${response.department}, marked it ${response.urgency.toLowerCase()} priority, and prepared a draft for ${response.category.toLowerCase()} handling.${bulkText}`;
    }
    if (draftEmailEl) {
        draftEmailEl.value = response.draft;
    }
    if (predictionBarEl) {
        predictionBarEl.style.width = `${resolutionProbability}%`;
        predictionBarEl.style.backgroundColor = getResolutionBarColor(resolutionProbability);
    }
    if (predictionPercentageEl) {
        predictionPercentageEl.textContent = `Probability: ${resolutionProbability}%`;
    }
    if (resolutionMessageEl) {
        resolutionMessageEl.textContent = `This department resolves only ${resolutionProbability}% of complaints on time`;
    }
    if (escalationRiskEl) {
        escalationRiskEl.textContent = `Escalation Risk: ${escalationRisk}`;
        escalationRiskEl.className = getEscalationRiskBadgeClass(escalationRisk);
    }
    if (rtiNoticeTextEl) {
        rtiNoticeTextEl.value = rtiNotice;
    }
    if (predictionBannerEl) {
        const bannerConfig = getEscalationRiskBannerConfig(escalationRisk);
        predictionBannerEl.textContent = bannerConfig.message;
        predictionBannerEl.style.backgroundColor = bannerConfig.backgroundColor;
        predictionBannerEl.style.color = bannerConfig.textColor;
        predictionBannerEl.style.borderLeftColor = bannerConfig.borderColor;
    }
    if (bulkBanner) {
        if (response.bulk_count > 1) {
            bulkBanner.classList.remove("hidden");
            bulkBanner.innerHTML = `<strong>Bulk Complaint!</strong> ${response.bulk_count} citizens have reported this issue in your area`;
        } else {
            bulkBanner.classList.add("hidden");
        }
    }
    if (sendButton) {
        if (response.bulk_count > 1) {
            sendButton.textContent = "Add to Bulk Grievance";
        } else {
            sendButton.textContent = "Send and Generate Ticket";
        }
    }
}

async function submitComplaint() {
    const complaintTextField = document.getElementById("complaintText");
    const categoryField = document.getElementById("complaintCategory");
    const locationField = document.getElementById("location");
    const languageField = document.getElementById("language");
    if (!complaintTextField || !categoryField || !locationField || !languageField) return;

    const complaintText = complaintTextField.value.trim();
    const selectedCategory = categoryField.value;
    const location = locationField.value.trim();
    const language = languageField.value;

    if (!complaintText) {
        alert("Please enter complaint details before submitting.");
        complaintTextField.focus();
        return;
    }

    // Check for similar complaints
    const complaints = await fetchComplaints();
    const similarComplaint = findSimilarComplaint(complaints, complaintText, location);

    let response;
    if (similarComplaint) {
        // Increment bulk count for existing complaint
        try {
            const bulkResponse = await fetch(`${API_URL}/complaints/${similarComplaint.complaint_id}/bulk`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (!bulkResponse.ok) {
                throw new Error(`Bulk update failed: ${bulkResponse.status}`);
            }
            const bulkData = await bulkResponse.json();
            // Get updated complaint data
            const updatedComplaints = await fetchComplaints();
            const updatedComplaint = updatedComplaints.find(c => c.complaint_id === similarComplaint.complaint_id);
            response = {
                complaintId: updatedComplaint.complaint_id,
                category: updatedComplaint.category,
                urgency: updatedComplaint.urgency,
                department: updatedComplaint.department,
                email: updatedComplaint.analysis?.department_email || "municipal@gov.in",
                draft: updatedComplaint.email_body || "",
                summary: updatedComplaint.summary,
                filedAt: updatedComplaint.filed_at,
                bulk_count: updatedComplaint.bulk_count,
                resolutionProbability: normalizeResolutionProbability(updatedComplaint.analysis?.resolution_probability),
                escalationRisk: ["High", "Medium", "Low"].includes(updatedComplaint.analysis?.escalation_risk) ? updatedComplaint.analysis.escalation_risk : "Medium",
                rtiNotice: updatedComplaint.analysis?.rti_notice || "RTI notice text will appear here from the API."
            };
        } catch (error) {
            console.error("Error updating bulk complaint:", error);
            alert("Failed to update bulk complaint. Proceeding with new filing.");
            // Fall back to new filing
        }
    }

    if (!response) {
        showScreen("loadingScreen");
        const loadingStart = Date.now();
        response = await analyzeComplaint(complaintText, {
            selectedCategory,
            location,
            language,
            citizenName: "Citizen",
            citizenPhone: ""
        });
        const remainingDelay = Math.max(0, 1500 - (Date.now() - loadingStart));
        setTimeout(() => showScreen("resultScreen"), remainingDelay);
    } else {
        showScreen("resultScreen");
    }

    latestComplaint = {
        complaintText,
        location,
        language,
        selectedCategory,
        response
    };

    updateResultScreen(response);
}

function generateTicketId() {
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `NAY-${TICKET_YEAR}-${randomNumber}`;
}

function showTrackingPanel() {
    const panel = document.getElementById("trackingPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function sendRtiNotice() {
    if (!latestComplaint || !latestComplaint.response) {
        alert("Please submit a complaint first.");
        return;
    }

    try {
        const response = await fetch(API_URL + "/send-rti", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                complaint: latestComplaint.complaintText,
                department: latestComplaint.response.department,
                urgency: latestComplaint.response.urgency,
                rti_notice: latestComplaint.response.rtiNotice || ""
            })
        });

        if (!response.ok) {
            throw new Error(`RTI request failed with status ${response.status}`);
        }

        alert("RTI Notice sent successfully");
    } catch (error) {
        console.error("Error sending RTI notice:", error);
    }
}

function bindRtiNoticeButton() {
    const rtiButton = document.querySelector("button[style*='#f97316']");
    if (!rtiButton || rtiButton.dataset.bound === "true") return;

    rtiButton.addEventListener("click", sendRtiNotice);
    rtiButton.dataset.bound = "true";
}

async function sendEmail(data = null) {
    const payload = data || latestComplaint;
    if (!payload) {
        alert("Please submit a complaint first.");
        return;
    }

    const ticketId = payload.response.complaintId || generateTicketId();
    latestComplaint = {
        ...payload,
        ticketId
    };

    try {
        await fetch(API_URL + "/send-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                complaint_data: {
                    category: latestComplaint.response.category,
                    urgency: latestComplaint.response.urgency,
                    department: latestComplaint.response.department,
                    department_email: latestComplaint.response.email,
                    summary: latestComplaint.response.summary || buildComplaintSummary(latestComplaint.complaintText),
                    translated_text: latestComplaint.complaintText
                },
                citizen_name: "Citizen",
                citizen_phone: "",
                complaint_id: ticketId,
                email_body: latestComplaint.response.draft
            })
        });
    } catch (error) {
        // Keep the citizen flow working even if backend email delivery is unavailable.
    }

    const ticketIdEl = document.getElementById("ticketId");
    const trackingTicketEl = document.getElementById("trackingTicketId");
    const trackingStatusEl = document.getElementById("trackingStatus");
    const trackingSummaryEl = document.getElementById("trackingSummary");

    if (ticketIdEl) {
        ticketIdEl.textContent = ticketId;
    }
    if (trackingTicketEl) {
        trackingTicketEl.textContent = ticketId;
    }
    if (trackingStatusEl) {
        trackingStatusEl.textContent = "Pending";
        trackingStatusEl.className = "status-pill status-pill-yellow";
    }
    if (trackingSummaryEl) {
        trackingSummaryEl.textContent = `Ticket ${ticketId} has been generated and forwarded to ${latestComplaint.response.department}.`;
    }

    ensureConfirmationScreen();
    const confirmationTicket = document.getElementById("confirmationTicketId");
    const confirmationEmail = document.getElementById("confirmationEmail");
    if (confirmationTicket) {
        confirmationTicket.textContent = ticketId;
    }
    if (confirmationEmail) {
        confirmationEmail.textContent = latestComplaint.response.email;
    }

    showScreen("confirmationScreen");
}

function resetComplaintForm() {
    ["location", "complaintText"].forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = "";
        }
    });

    const categoryField = document.getElementById("complaintCategory");
    const languageField = document.getElementById("language");
    const trackingPanel = document.getElementById("trackingPanel");
    if (categoryField) categoryField.selectedIndex = 0;
    if (languageField) languageField.selectedIndex = 0;
    if (trackingPanel) trackingPanel.classList.add("hidden");

    latestComplaint = null;
    showScreen("complaintScreen");
}

function goToDashboard() {
    window.location.href = "adhikari.html";
}

function ensureConfirmationScreen() {
    let confirmationScreen = document.getElementById("confirmationScreen");
    if (confirmationScreen) return;

    const mobileFrame = document.querySelector(".mobile-frame");
    if (!mobileFrame) return;

    confirmationScreen = document.createElement("section");
    confirmationScreen.id = "confirmationScreen";
    confirmationScreen.className = "card section-card screen-panel hidden";
    confirmationScreen.innerHTML = `
        <div class="section-head">
            <div>
                <p class="section-kicker">Ticket Generated</p>
                <h2>Complaint ready for follow-up</h2>
            </div>
            <span class="section-tag">Step 4</span>
        </div>
        <div class="result-grid">
            <article class="result-tile">
                <span class="result-label">Ticket ID</span>
                <strong id="confirmationTicketId">NAY-2024-00000</strong>
            </article>
            <article class="result-tile">
                <span class="result-label">Forwarded to</span>
                <strong id="confirmationEmail">municipal@gov.in</strong>
            </article>
        </div>
        <div class="insight-panel">
            <h3>What happens next</h3>
            <p>Your complaint has been filed. You can track the ticket now or return to submit another issue.</p>
        </div>
        <div class="action-stack">
            <button type="button" class="btn btn-primary" onclick="showTrackingPanel()">Track Complaint</button>
            <button type="button" class="btn btn-secondary" onclick="resetComplaintForm()">File Another Complaint</button>
        </div>
    `;

    mobileFrame.appendChild(confirmationScreen);
}

function getFilteredComplaints() {
    const page = getCurrentPage();
    const filterSelect = document.getElementById("departmentFilter");
    let complaints = [...dashboardState.complaints];

    if (page === "adhikari") {
        complaints = complaints.filter((complaint) => complaint.department === dashboardState.officerDepartment);
    }

    if (filterSelect && filterSelect.value !== "All") {
        complaints = complaints.filter((complaint) => complaint.department === filterSelect.value);
    }

    return complaints;
}

function populateDepartmentFilter() {
    const filterSelect = document.getElementById("departmentFilter");
    if (!filterSelect) return;

    const currentValue = filterSelect.value || "All";
    let sourceComplaints = [...dashboardState.complaints];
    if (getCurrentPage() === "adhikari") {
        sourceComplaints = sourceComplaints.filter((complaint) => complaint.department === dashboardState.officerDepartment);
    }

    const departments = ["All", ...new Set(sourceComplaints.map((complaint) => complaint.department))];
    filterSelect.innerHTML = departments.map((department) => {
        const label = department === "All" ? "All Departments" : department;
        return `<option value="${department}">${label}</option>`;
    }).join("");
    filterSelect.value = departments.includes(currentValue) ? currentValue : "All";
}

function updateStatsCards() {
    const complaints = dashboardState.filteredComplaints;
    const totalEl = document.getElementById("totalComplaintsStat");
    const highEl = document.getElementById("highUrgencyStat");
    const inProgressEl = document.getElementById("inProgressStat");
    const resolvedEl = document.getElementById("resolvedStat");
    const pendingEl = document.getElementById("pendingStat");

    if (totalEl) totalEl.textContent = String(complaints.length);
    if (highEl) highEl.textContent = String(complaints.filter((complaint) => complaint.urgency === "High").length);
    if (inProgressEl) inProgressEl.textContent = String(complaints.filter((complaint) => complaint.status === "In Progress").length);
    if (resolvedEl) resolvedEl.textContent = String(complaints.filter((complaint) => complaint.status === "Resolved").length);
    if (pendingEl) pendingEl.textContent = String(complaints.filter((complaint) => complaint.status === "Pending").length);

    const officerLabel = document.getElementById("officerDepartmentLabel");
    if (officerLabel) {
        officerLabel.textContent = dashboardState.officerDepartment;
    }
}

function updateComplaintStatus(ticketId, nextStatus) {
    dashboardState.complaints = dashboardState.complaints.map((complaint) => {
        if (complaint.ticketId === ticketId) {
            return {
                ...complaint,
                status: nextStatus
            };
        }
        return complaint;
    });
    syncDashboardView();

    fetch(`${API_URL}/complaints/${encodeURIComponent(ticketId)}/status?status=${encodeURIComponent(nextStatus)}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        }
    }).catch(() => {
        // Keep local UI updates even if backend status sync fails.
    });
}

function bindStatusDropdowns() {
    document.querySelectorAll(".status-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const ticketId = event.target.getAttribute("data-ticket-id");
            updateComplaintStatus(ticketId, event.target.value);
        });
    });
}

function renderOfficerTable() {
    const tableBody = document.getElementById("officerTableBody");
    const tableCount = document.getElementById("tableCount");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    const complaints = dashboardState.filteredComplaints;

    if (!complaints.length) {
        tableBody.innerHTML = `<tr><td colspan="4" class="muted-cell">No complaints available for the selected department.</td></tr>`;
        if (tableCount) tableCount.textContent = "0 complaints";
        return;
    }

    complaints.forEach((complaint) => {
        const row = document.createElement("tr");
        row.className = getUrgencyRowClass(complaint.urgency);
        row.innerHTML = `
            <td class="ticket-code">${complaint.ticketId}</td>
            <td class="summary-cell">${complaint.summary}</td>
            <td><span class="urgency-badge ${getDashboardUrgencyBadgeClass(complaint.urgency)}">${complaint.urgency}</span></td>
            <td>
                <select class="status-select" data-ticket-id="${complaint.ticketId}">
                    <option value="Pending"${complaint.status === "Pending" ? " selected" : ""}>Pending</option>
                    <option value="In Progress"${complaint.status === "In Progress" ? " selected" : ""}>In Progress</option>
                    <option value="Resolved"${complaint.status === "Resolved" ? " selected" : ""}>Resolved</option>
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (tableCount) tableCount.textContent = `${complaints.length} complaints`;
    bindStatusDropdowns();
}

function renderAdminTable() {
    const tableBody = document.getElementById("adminTableBody");
    const tableCount = document.getElementById("tableCount");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    const complaints = dashboardState.filteredComplaints;

    complaints.forEach((complaint) => {
        const row = document.createElement("tr");
        row.className = getUrgencyRowClass(complaint.urgency);
        if (complaint.bulk_count > 10) {
            row.classList.add("hotspot-row");
        }
        row.innerHTML = `
            <td class="ticket-code">${complaint.ticketId}</td>
            <td class="summary-cell">${complaint.summary}</td>
            <td>${complaint.category}</td>
            <td><span class="urgency-badge ${getDashboardUrgencyBadgeClass(complaint.urgency)}">${complaint.urgency}</span></td>
            <td><span class="department-badge">${complaint.department}</span></td>
            <td>${complaint.status}</td>
            <td>${complaint.bulk_count || 1}</td>
        `;
        tableBody.appendChild(row);
    });

    if (tableCount) tableCount.textContent = `${complaints.length} complaints`;
}

function renderDashboardTables() {
    if (document.getElementById("officerTableBody")) {
        renderOfficerTable();
    }
    if (document.getElementById("adminTableBody")) {
        renderAdminTable();
    }
}

function renderCategoryChart() {
    if (typeof Chart === "undefined") return;
    const chartCanvas = document.getElementById("complaintCategoryBarChart");
    if (!chartCanvas) return;

    const countsByCategory = dashboardState.filteredComplaints.reduce((accumulator, complaint) => {
        accumulator[complaint.category] = (accumulator[complaint.category] || 0) + 1;
        return accumulator;
    }, {});

    const labels = Object.keys(countsByCategory);
    const values = Object.values(countsByCategory);

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: labels.length ? labels : ["No complaints"],
            datasets: [{
                label: "Complaints",
                data: values.length ? values : [0],
                backgroundColor: ["#1D9E75", "#EF9F27", "#E8593C", "rgba(29, 158, 117, 0.55)", "rgba(239, 159, 39, 0.55)"],
                borderRadius: 12,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function syncDashboardView() {
    dashboardState.filteredComplaints = getFilteredComplaints();
    updateStatsCards();
    renderDashboardTables();
    renderCategoryChart();
}

async function loadDashboard() {
    try {
        const response = await fetch(API_URL + "/complaints", {
            method: "GET",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!payload || !Array.isArray(payload.complaints)) {
            throw new Error("Complaints response is not an array");
        }

        dashboardState.complaints = payload.complaints.map((complaint) => ({
            ticketId: complaint.complaint_id,
            summary: complaint.summary || "No summary available",
            category: complaint.category || "General",
            urgency: complaint.urgency || "Low",
            department: complaint.department || "Municipal Corporation",
            status: complaint.status || "Pending"
        }));
        dashboardState.source = "api";
    } catch (error) {
        dashboardState.complaints = dummyComplaints.map((complaint) => ({ ...complaint }));
        dashboardState.source = "dummy";
    }

    populateDepartmentFilter();
    syncDashboardView();
}

function initDashboardPage(role) {
    dashboardState.role = role;
    const filterSelect = document.getElementById("departmentFilter");
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            syncDashboardView();
        });
    }

    loadDashboard();
}

function initIndexPage() {
    selectRole("citizen");
}

function initCitizenPage() {
    showScreen("complaintScreen");
    bindRtiNoticeButton();
}

document.addEventListener("DOMContentLoaded", () => {
    const page = getCurrentPage();

    if (page === "index") {
        initIndexPage();
        return;
    }

    if (page === "citizen") {
        initCitizenPage();
        return;
    }

    if (page === "adhikari") {
        initDashboardPage("adhikari");
        return;
    }

    if (page === "admin") {
        initDashboardPage("admin");
    }
});

const API_URL = "https://naayak--parnikadesk.replit.app";
const DEMO_OTP = "123456";
const TICKET_YEAR = new Date().getFullYear().toString();
const ADHIKARI_CREDENTIALS = {
    email: "roads.officer@gov.in",
    password: "adhikari123",
    department: "Public Works Department Delhi"   // matches real API department name
};
const ADMIN_CREDENTIALS = {
    email: "admin@naayak.gov.in",
    password: "admin123"
};
const DEPARTMENT_RESPONSE_DAYS = {
    "Delhi Jal Board": 7,
    "BSES Rajdhani Power Limited": 5,
    "Public Works Department Delhi": 10,
    "Delhi Health Services": 5,
    "Municipal Corporation of Delhi": 7,
    "Delhi Police": 3,
    "Delhi Food and Civil Supplies Department": 7,
    "Delhi Revenue Department": 15,
    "Delhi Social Welfare Department": 10,
    "Chief Minister Helpline Delhi": 7
};

let latestComplaint = null;
let categoryChart = null;
let dashboardState = {
    complaints: [],
    filteredComplaints: [],
    source: "dummy",
    role: "admin",
    officerDepartment: ADHIKARI_CREDENTIALS.department
};

// Dummy data uses real department names from ministries.json so filter works when API is offline
const dummyComplaints = [
    { ticketId: "NAY-2024-00001", summary: "Overflowing roadside garbage near the main market entrance.", category: "Sanitation", urgency: "High", department: "Municipal Corporation of Delhi", email: "mcdonline@nic.in", status: "Pending", bulk_count: 1 },
    { ticketId: "NAY-2024-00002", summary: "Large pothole slowing buses near the central depot.", category: "Roads", urgency: "High", department: "Public Works Department Delhi", email: "pwd-delhi@nic.in", status: "In Progress", bulk_count: 3 },
    { ticketId: "NAY-2024-00003", summary: "Open drainage water collecting outside Sector 9 homes.", category: "Water", urgency: "Medium", department: "Delhi Jal Board", email: "cgro@delhijalboard.nic.in", status: "Resolved", bulk_count: 1 },
    { ticketId: "NAY-2024-00004", summary: "Frequent power cuts affecting the community health center.", category: "Electricity", urgency: "High", department: "BSES Rajdhani Power Limited", email: "customercare@bsesdelhi.com", status: "Pending", bulk_count: 7 },
    { ticketId: "NAY-2024-00005", summary: "Broken streetlights reported near the girls hostel lane.", category: "Roads", urgency: "Medium", department: "Public Works Department Delhi", email: "pwd-delhi@nic.in", status: "In Progress", bulk_count: 2 },
    { ticketId: "NAY-2024-00006", summary: "Uncollected debris left after road repair in Ward 7.", category: "Roads", urgency: "Low", department: "Public Works Department Delhi", email: "pwd-delhi@nic.in", status: "Pending", bulk_count: 1 },
    { ticketId: "NAY-2024-00007", summary: "Water supply disrupted across apartments in Sector 5.", category: "Water", urgency: "High", department: "Delhi Jal Board", email: "cgro@delhijalboard.nic.in", status: "Resolved", bulk_count: 12 },
    { ticketId: "NAY-2024-00008", summary: "Garbage piling up outside the bus stand for three days.", category: "Sanitation", urgency: "Medium", department: "Municipal Corporation of Delhi", email: "mcdonline@nic.in", status: "In Progress", bulk_count: 4 },
    { ticketId: "NAY-2024-00009", summary: "Transformer sparking sounds reported near Ward 12 junction.", category: "Electricity", urgency: "Low", department: "BSES Rajdhani Power Limited", email: "customercare@bsesdelhi.com", status: "Pending", bulk_count: 1 },
    { ticketId: "NAY-2024-00010", summary: "Damaged footpath near primary school creating safety risk.", category: "Roads", urgency: "Medium", department: "Public Works Department Delhi", email: "pwd-delhi@nic.in", status: "Resolved", bulk_count: 2 }
];

// ─── Utility helpers ───────────────────────────────────────────────────────────

function buildComplaintSummary(complaintText) {
    const t = complaintText.replace(/\s+/g, " ").trim();
    return t.length <= 82 ? t : `${t.slice(0, 79).trim()}...`;
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
    return ["High", "Medium", "Low"][Math.floor(Math.random() * 3)];
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
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 50;
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
    if (risk === "High") return { message: "This department has a poor resolution record. RTI notice prepared automatically.", backgroundColor: "#FDE7E3", textColor: "#A63C26", borderColor: "#E8593C" };
    if (risk === "Medium") return { message: "Moderate resolution performance. Monitoring recommended.", backgroundColor: "#FEF3D7", textColor: "#8A5A06", borderColor: "#EF9F27" };
    return { message: "This department has a good resolution record. We will monitor your complaint.", backgroundColor: "#E4F5EE", textColor: "#176B53", borderColor: "#1D9E75" };
}

function ensurePredictionBanner() {
    const predictionCard = document.getElementById("predictionCard");
    if (!predictionCard || !predictionCard.parentElement) return null;
    let bannerEl = document.getElementById("predictionBanner");
    if (!bannerEl) {
        bannerEl = document.createElement("div");
        bannerEl.id = "predictionBanner";
        bannerEl.className = "result-tile";
        bannerEl.style.cssText = "padding:14px 16px;border-left:4px solid transparent;font-weight:600;margin-top:12px;";
        predictionCard.insertAdjacentElement("afterend", bannerEl);
    }
    return bannerEl;
}

function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getRecognitionLanguage() {
    const langField = document.getElementById("language");
    if (!langField) return "en-IN";
    const map = { Hindi: "hi-IN", Tamil: "ta-IN", Telugu: "te-IN", Bengali: "bn-IN", Marathi: "mr-IN" };
    return map[langField.value] || "en-IN";
}

function generateTicketId() {
    return `NAY-${TICKET_YEAR}-${Math.floor(10000 + Math.random() * 90000)}`;
}

function getToastStack() {
    let stack = document.getElementById("toastStack");
    if (!stack) {
        stack = document.createElement("div");
        stack.id = "toastStack";
        stack.className = "toast-stack";
        document.body.appendChild(stack);
    }
    return stack;
}

function showToast(message, type = "success", title = "") {
    const stack = getToastStack();
    const toast = document.createElement("div");
    const safeType = ["success", "warning", "error"].includes(type) ? type : "success";
    toast.className = `toast toast-${safeType}`;
    toast.innerHTML = `
        ${title ? `<strong>${title}</strong>` : ""}
        <p>${message}</p>
    `;
    stack.appendChild(toast);
    window.setTimeout(() => {
        toast.remove();
        if (!stack.children.length) stack.remove();
    }, 3000);
}

function formatDisplayDate(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return "Today";
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

function addWorkingDays(dateValue, days) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return new Date();
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) added += 1;
    }
    return date;
}

function getExpectedResponseDate(response) {
    const responseDays = DEPARTMENT_RESPONSE_DAYS[response.department] || 7;
    return {
        responseDays,
        expectedDate: addWorkingDays(response.filedAt, responseDays)
    };
}

function updateCitizenProgress(step) {
    document.querySelectorAll(".flow-step").forEach((item, index) => {
        const stepNumber = index + 1;
        item.classList.remove("is-complete", "is-current");
        if (stepNumber < step) item.classList.add("is-complete");
        if (stepNumber === step) item.classList.add("is-current");
    });
}

function updateTrackingTimeline(response, currentStatus = "Pending") {
    const steps = Array.from(document.querySelectorAll("#trackingTimeline .timeline-step"));
    if (!steps.length) return;
    const statusOrder = ["Filed", "Pending", "In Progress", "Resolved"];
    const activeStatus = statusOrder.includes(currentStatus) ? currentStatus : "Pending";
    const activeIndex = statusOrder.indexOf(activeStatus);
    const filedDateEl = document.getElementById("timelineFiledDate");
    const pendingTextEl = document.getElementById("timelinePendingText");
    const trackingStatusEl = document.getElementById("trackingStatus");
    const trackingSummaryEl = document.getElementById("trackingSummary");

    steps.forEach((step, index) => {
        const marker = step.querySelector(".timeline-marker");
        step.classList.remove("is-done", "is-current");
        if (index < activeIndex) {
            step.classList.add("is-done");
            if (marker) marker.innerHTML = "&check;";
        } else if (index === activeIndex) {
            step.classList.add("is-current");
            if (marker) marker.innerHTML = index === 0 ? "&check;" : String(index + 1);
        } else if (marker) {
            marker.textContent = String(index + 1);
        }
    });

    if (filedDateEl) filedDateEl.textContent = `Filed on ${formatDisplayDate(response.filedAt)}`;

    if (pendingTextEl) {
        const { responseDays, expectedDate } = getExpectedResponseDate(response);
        pendingTextEl.textContent = `Expected response by ${formatDisplayDate(expectedDate)} (${responseDays} working days)`;
    }

    if (trackingStatusEl) {
        trackingStatusEl.textContent = activeStatus;
        trackingStatusEl.className = `status-pill ${activeStatus === "Resolved" ? "status-pill-green" : "status-pill-yellow"}`;
    }

    if (trackingSummaryEl) {
        if (activeStatus === "Resolved") {
            trackingSummaryEl.textContent = `Ticket ${response.complaintId || "NAY"} has been marked resolved by ${response.department}.`;
        } else if (activeStatus === "In Progress") {
            trackingSummaryEl.textContent = `${response.department} has started action on your complaint and the field team is working on it.`;
        } else {
            const { expectedDate } = getExpectedResponseDate(response);
            trackingSummaryEl.textContent = `Your complaint is pending department acknowledgment. Expected response by ${formatDisplayDate(expectedDate)}.`;
        }
    }
}

function bindCategoryChips() {
    const categoryInput = document.getElementById("complaintCategory");
    const chips = document.querySelectorAll(".category-chip");
    if (!categoryInput || !chips.length) return;
    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            categoryInput.value = chip.dataset.category || "";
            chips.forEach((item) => {
                const active = item === chip;
                item.classList.toggle("active-chip", active);
                item.setAttribute("aria-pressed", String(active));
            });
        });
    });
}

async function copyText(text, successMessage) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage, "success", "Copied");
    } catch (error) {
        console.warn("Clipboard copy failed:", error);
        showToast("Could not copy that value on this browser.", "warning", "Copy unavailable");
    }
}

function bindCopyActions() {
    const copyButton = document.getElementById("copyEmailButton");
    if (!copyButton || copyButton.dataset.bound === "true") return;
    copyButton.addEventListener("click", () => {
        const target = document.getElementById(copyButton.dataset.copyTarget || "");
        if (!target) return;
        copyText(target.textContent.trim(), "Department email copied to clipboard.");
    });
    copyButton.dataset.bound = "true";
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchComplaints() {
    try {
        const response = await fetch(API_URL + "/complaints");
        if (!response.ok) throw new Error(`${response.status}`);
        const data = await response.json();
        return data.complaints || [];
    } catch (error) {
        console.warn("fetchComplaints failed:", error);
        return [];
    }
}

// ─── Duplicate / bulk helpers ─────────────────────────────────────────────────

function isWithinLast7Days(filedAt) {
    if (!filedAt) return false;
    const now = new Date();
    // API returns "DD Month YYYY at HH:MM AM/PM" — try parsing
    const d = new Date(filedAt);
    if (isNaN(d.getTime())) return false;
    return Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24)) <= 7;
}

function areComplaintsSimilar(text1, text2) {
    const normalize = (t) => t.toLowerCase().replace(/[^\w\s]/g, "").trim();
    const words1 = new Set(normalize(text1).split(/\s+/));
    const words2 = new Set(normalize(text2).split(/\s+/));
    const intersection = [...words1].filter(x => words2.has(x)).length;
    const union = new Set([...words1, ...words2]).size;
    return union > 0 && (intersection / union) > 0.3;
}

function findSimilarComplaint(complaints, newText, location) {
    return complaints.find(c =>
        c.location === location &&
        isWithinLast7Days(c.filed_at) &&
        areComplaintsSimilar(c.original_text || "", newText)
    );
}

// ─── Page routing ─────────────────────────────────────────────────────────────

function getCurrentPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith("/citizen.html")) return "citizen";
    if (path.endsWith("/adhikari.html")) return "adhikari";
    if (path.endsWith("/admin.html")) return "admin";
    return "index";
}

// ─── Screen management ────────────────────────────────────────────────────────

function showScreen(screenId) {
    const ALL = ["citizenLogin", "adhikariLogin", "adminLogin", "complaintScreen", "loadingScreen", "resultScreen", "confirmationScreen"];
    ALL.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle("hidden", id !== screenId);
        el.classList.toggle("active-screen", id === screenId);
    });
}

function selectRole(role) {
    ["citizen", "adhikari", "admin"].forEach((item) => {
        const btn = document.getElementById(`${item}RoleBtn`);
        const panel = document.getElementById(`${item}Login`);
        if (btn) btn.classList.toggle("active-role", item === role);
        if (panel) {
            panel.classList.toggle("hidden", item !== role);
            panel.classList.toggle("active-screen", item === role);
        }
    });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function sendCitizenOTP() {
    const phone = document.getElementById("citizenPhone");
    const otpBox = document.getElementById("citizenOtpBox");
    if (!phone || !otpBox) return;
    if (!/^\d{10}$/.test(phone.value.trim())) {
        showToast("Enter a valid 10 digit mobile number.", "error", "Check mobile number");
        phone.focus();
        return;
    }
    otpBox.classList.remove("hidden");
    showToast("OTP sent successfully. Use 123456 for this demo.", "success", "OTP sent");
}

function loginCitizen() {
    const otpField = document.getElementById("citizenOtp");
    if (!otpField) return;
    if (otpField.value.trim() !== DEMO_OTP) {
        showToast("Incorrect OTP. Please use 123456.", "error", "Verification failed");
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
        showToast("Invalid adhikari demo credentials.", "error", "Login failed");
        return;
    }
    window.location.href = "adhikari.html";
}

function loginAdmin() {
    const emailField = document.getElementById("adminEmail");
    const passwordField = document.getElementById("adminPassword");
    if (!emailField || !passwordField) return;
    if (emailField.value.trim().toLowerCase() !== ADMIN_CREDENTIALS.email || passwordField.value !== ADMIN_CREDENTIALS.password) {
        showToast("Invalid admin demo credentials.", "error", "Login failed");
        return;
    }
    window.location.href = "admin.html";
}

// ─── Voice input ──────────────────────────────────────────────────────────────

function startVoiceMock() {
    const complaintText = document.getElementById("complaintText");
    const SRConstructor = getSpeechRecognitionConstructor();
    if (!complaintText) return;
    if (!SRConstructor) {
        showToast("Speech recognition is not supported in this browser.", "warning", "Voice unavailable");
        return;
    }
    const recognition = new SRConstructor();
    recognition.lang = getRecognitionLanguage();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => showToast("Please speak your complaint clearly.", "warning", "Listening");
    recognition.onresult = (event) => {
        complaintText.value = event.results[0][0].transcript.trim();
        complaintText.focus();
    };
    recognition.onerror = () => showToast("Could not capture speech. Please try again.", "error", "Voice input failed");
    recognition.start();
}

// ─── AI / mock fallback ───────────────────────────────────────────────────────

function getMockAiResponse(complaintText, selectedCategory, location) {
    const t = complaintText.toLowerCase();
    let department = "Municipal Corporation of Delhi";
    let email = "mcdonline@nic.in";
    let category = selectedCategory || "Sanitation";

    if (t.includes("road") || t.includes("pothole") || t.includes("sadak")) {
        department = "Public Works Department Delhi"; email = "pwd-delhi@nic.in"; category = "Roads";
    } else if (t.includes("water") || t.includes("drainage") || t.includes("paani")) {
        department = "Delhi Jal Board"; email = "cgro@delhijalboard.nic.in"; category = "Water";
    } else if (t.includes("electricity") || t.includes("power") || t.includes("bijli")) {
        department = "BSES Rajdhani Power Limited"; email = "customercare@bsesdelhi.com"; category = "Electricity";
    } else if (t.includes("garbage") || t.includes("sanitation") || t.includes("kuda")) {
        department = "Municipal Corporation of Delhi"; email = "mcdonline@nic.in"; category = "Sanitation";
    } else if (t.includes("police") || t.includes("crime") || t.includes("theft")) {
        department = "Delhi Police"; email = "cp@delhipolice.gov.in"; category = "Police";
    } else if (t.includes("health") || t.includes("hospital") || t.includes("doctor")) {
        department = "Delhi Health Services"; email = "dghs@delhi.gov.in"; category = "Health";
    }

    const urgency = getRandomUrgency();
    const resolutionProbability = normalizeResolutionProbability(Math.floor(35 + Math.random() * 50));
    const escalationRisk = resolutionProbability < 45 ? "High" : resolutionProbability < 65 ? "Medium" : "Low";
    const draft = buildDraftEmail({ complaintText, category, urgency, department, email, location });

    return {
        category, urgency, department, email, draft,
        summary: buildComplaintSummary(complaintText),
        complaintId: generateTicketId(),
        filedAt: "",
        bulk_count: 1,
        resolutionProbability,
        escalationRisk,
        rtiNotice: "RTI notice text will appear here from the API."
    };
}

async function analyzeComplaint(complaintText, context = {}) {
    try {
        const response = await fetch(API_URL + "/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                text: complaintText,
                language: context.language || "English",
                citizen_name: context.citizenName || "Citizen",
                citizen_phone: context.citizenPhone || "",
                location: context.location || ""
            })
        });

        if (!response.ok) throw new Error(`${response.status}`);

        const result = await response.json();
        if (!result || typeof result !== "object") throw new Error("Invalid response");

        const analysis = result.analysis || {};
        const urgency = ["High", "Medium", "Low"].includes(analysis.urgency) ? analysis.urgency : getRandomUrgency();
        const department = analysis.department || "Municipal Corporation of Delhi";
        const email = analysis.department_email || "mcdonline@nic.in";
        const category = analysis.category || context.selectedCategory || "Sanitation";
        const draft = result.email_body || buildDraftEmail({ complaintText, category, urgency, department, email, location: context.location });

        return {
            complaintId: result.complaint_id || generateTicketId(),
            category, urgency, department, email, draft,
            summary: analysis.summary || buildComplaintSummary(complaintText),
            filedAt: result.filed_at || "",
            bulk_count: result.bulk_count || 1,
            resolutionProbability: normalizeResolutionProbability(analysis.resolution_probability),
            escalationRisk: ["High", "Medium", "Low"].includes(analysis.escalation_risk) ? analysis.escalation_risk : "Medium",
            rtiNotice: analysis.rti_notice || "RTI notice text will appear here from the API."
        };
    } catch (error) {
        console.warn("analyzeComplaint API failed, using mock:", error);
        return getMockAiResponse(complaintText, context.selectedCategory, context.location);
    }
}

// ─── Result screen ────────────────────────────────────────────────────────────

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
    const copyEmailButton = document.getElementById("copyEmailButton");
    const predictionBannerEl = ensurePredictionBanner();

    const resolutionProbability = normalizeResolutionProbability(response.resolutionProbability);
    const escalationRisk = ["High", "Medium", "Low"].includes(response.escalationRisk) ? response.escalationRisk : "Medium";
    const rtiNotice = response.rtiNotice || "RTI notice text will appear here from the API.";

    if (urgencyEl) { urgencyEl.textContent = response.urgency; urgencyEl.className = `status-pill ${getUrgencyBadgeClass(response.urgency)}`; }
    if (departmentEl) departmentEl.textContent = response.department;
    if (emailEl) emailEl.textContent = response.email;
    if (copyEmailButton) copyEmailButton.textContent = response.email;
    if (ticketIdEl) ticketIdEl.textContent = response.complaintId || "Generated after send";
    if (aiSummaryEl) {
        const bulkText = response.bulk_count > 1 ? ` This is now a bulk complaint with ${response.bulk_count} citizens reporting the same issue.` : "";
        aiSummaryEl.textContent = `AI matched this complaint to ${response.department}, marked it ${response.urgency.toLowerCase()} priority, and prepared a draft for ${response.category.toLowerCase()} handling.${bulkText}`;
    }
    if (draftEmailEl) draftEmailEl.value = response.draft;
    if (predictionBarEl) { predictionBarEl.style.width = `${resolutionProbability}%`; predictionBarEl.style.backgroundColor = getResolutionBarColor(resolutionProbability); }
    if (predictionPercentageEl) predictionPercentageEl.textContent = `Probability: ${resolutionProbability}%`;
    if (resolutionMessageEl) resolutionMessageEl.textContent = `This department resolves ${resolutionProbability}% of complaints on time`;
    if (escalationRiskEl) { escalationRiskEl.textContent = `Escalation Risk: ${escalationRisk}`; escalationRiskEl.className = getEscalationRiskBadgeClass(escalationRisk); }
    if (rtiNoticeTextEl) rtiNoticeTextEl.value = rtiNotice;
    if (predictionBannerEl) {
        const cfg = getEscalationRiskBannerConfig(escalationRisk);
        predictionBannerEl.textContent = cfg.message;
        Object.assign(predictionBannerEl.style, { backgroundColor: cfg.backgroundColor, color: cfg.textColor, borderLeftColor: cfg.borderColor });
    }
    if (bulkBanner) {
        if (response.bulk_count > 1) {
            bulkBanner.classList.remove("hidden");
            bulkBanner.innerHTML = `<strong>Bulk grievance nearby</strong> ${response.bulk_count} citizens have reported this near you. Your complaint will be added to a bulk grievance for stronger impact.`;
        } else {
            bulkBanner.classList.add("hidden");
        }
    }
    if (sendButton) sendButton.textContent = response.bulk_count > 1 ? "Add to Bulk Grievance" : "Send and Generate Ticket";
    updateCitizenProgress(3);
    updateTrackingTimeline(response, "Pending");
}

// ─── Complaint submission ─────────────────────────────────────────────────────

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
        showToast("Please enter complaint details before submitting.", "error", "Complaint details missing");
        complaintTextField.focus();
        return;
    }

    // Show loading immediately before any async work
    showScreen("loadingScreen");
    const loadingStart = Date.now();

    let response = null;

    // Check for similar existing complaints (best-effort)
    try {
        const complaints = await fetchComplaints();
        const similarComplaint = findSimilarComplaint(complaints, complaintText, location);

        if (similarComplaint) {
            const bulkRes = await fetch(`${API_URL}/complaints/${encodeURIComponent(similarComplaint.complaint_id)}/bulk`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            });
            if (bulkRes.ok) {
                // Re-fetch to get fresh data
                const freshComplaints = await fetchComplaints();
                const fresh = freshComplaints.find(c => c.complaint_id === similarComplaint.complaint_id);
                if (fresh) {
                    const analysis = fresh.analysis || {};
                    response = {
                        complaintId: fresh.complaint_id,
                        category: fresh.category,
                        urgency: fresh.urgency,
                        department: fresh.department,
                        email: fresh.email || fresh.department_email || "municipal@gov.in",
                        draft: fresh.email_body || buildDraftEmail({ complaintText, category: fresh.category, urgency: fresh.urgency, department: fresh.department, email: fresh.email || "municipal@gov.in", location }),
                        summary: fresh.summary,
                        filedAt: fresh.filed_at,
                        bulk_count: fresh.bulk_count,
                        resolutionProbability: normalizeResolutionProbability(analysis.resolution_probability),
                        escalationRisk: ["High", "Medium", "Low"].includes(analysis.escalation_risk) ? analysis.escalation_risk : "Medium",
                        rtiNotice: analysis.rti_notice || "RTI notice text will appear here from the API."
                    };
                }
            }
        }
    } catch (err) {
        console.warn("Duplicate check failed, proceeding with new filing:", err);
    }

    if (!response) {
        response = await analyzeComplaint(complaintText, { selectedCategory, location, language, citizenName: "Citizen", citizenPhone: "" });
    }

    latestComplaint = { complaintText, location, language, selectedCategory, response };
    updateResultScreen(response);

    // Ensure minimum 1.5s loading time for UX
    const remaining = Math.max(0, 1500 - (Date.now() - loadingStart));
    setTimeout(() => showScreen("resultScreen"), remaining);
}

// ─── Email send ───────────────────────────────────────────────────────────────

async function sendEmail(data = null) {
    const payload = data || latestComplaint;
    if (!payload) {
        showToast("Please submit a complaint first.", "warning", "No complaint found");
        return;
    }

    const ticketId = payload.response.complaintId || generateTicketId();
    latestComplaint = { ...payload, ticketId };

    try {
        await fetch(API_URL + "/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        console.warn("Send email failed (non-blocking):", error);
    }

    // Update tracking panel
    const ticketIdEl = document.getElementById("ticketId");
    const trackingTicketEl = document.getElementById("trackingTicketId");
    const trackingStatusEl = document.getElementById("trackingStatus");
    const trackingSummaryEl = document.getElementById("trackingSummary");

    if (ticketIdEl) ticketIdEl.textContent = ticketId;
    if (trackingTicketEl) trackingTicketEl.textContent = ticketId;
    if (trackingStatusEl) { trackingStatusEl.textContent = "Pending"; trackingStatusEl.className = "status-pill status-pill-yellow"; }
    if (trackingSummaryEl) trackingSummaryEl.textContent = `Ticket ${ticketId} has been generated and forwarded to ${latestComplaint.response.department}.`;
    updateCitizenProgress(4);
    updateTrackingTimeline({ ...latestComplaint.response, complaintId: ticketId }, "Pending");

    ensureConfirmationScreen();
    const confirmationTicket = document.getElementById("confirmationTicketId");
    const confirmationEmail = document.getElementById("confirmationEmail");
    if (confirmationTicket) confirmationTicket.textContent = ticketId;
    if (confirmationEmail) confirmationEmail.textContent = latestComplaint.response.email;
    showToast("Complaint filed successfully. You can track the ticket now.", "success", "Ticket generated");

    showScreen("confirmationScreen");
}

// ─── RTI ──────────────────────────────────────────────────────────────────────

async function sendRtiNotice() {
    if (!latestComplaint || !latestComplaint.response) {
        showToast("Please submit a complaint first.", "warning", "No complaint found");
        return;
    }
    try {
        const response = await fetch(API_URL + "/send-rti", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                complaint: latestComplaint.complaintText,
                department: latestComplaint.response.department,
                urgency: latestComplaint.response.urgency,
                rti_notice: latestComplaint.response.rtiNotice || "",
                complaint_id: latestComplaint.response.complaintId || ""
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast(`RTI Notice sent successfully to ${latestComplaint.response.department}.`, "success", "RTI sent");
        } else {
            showToast("RTI Notice queued. It will be sent when the backend is available.", "warning", "RTI queued");
        }
    } catch (error) {
        console.warn("RTI send failed:", error);
        showToast("RTI Notice could not be sent at this time. Please try again.", "error", "RTI failed");
    }
}

function bindRtiNoticeButton() {
    const rtiButton = document.querySelector("button[style*='#f97316'], details button.btn");
    if (!rtiButton || rtiButton.dataset.bound === "true") return;
    rtiButton.addEventListener("click", sendRtiNotice);
    rtiButton.dataset.bound = "true";
}

// ─── Tracking & confirmation ──────────────────────────────────────────────────

function showTrackingPanel() {
    const panel = document.getElementById("trackingPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetComplaintForm() {
    ["location", "complaintText"].forEach((id) => {
        const f = document.getElementById(id);
        if (f) f.value = "";
    });
    const categoryField = document.getElementById("complaintCategory");
    const languageField = document.getElementById("language");
    const trackingPanel = document.getElementById("trackingPanel");
    if (categoryField) categoryField.value = "Roads";
    if (languageField) languageField.selectedIndex = 0;
    if (trackingPanel) trackingPanel.classList.add("hidden");
    document.querySelectorAll(".category-chip").forEach((chip, index) => {
        const active = index === 0;
        chip.classList.toggle("active-chip", active);
        chip.setAttribute("aria-pressed", String(active));
    });
    latestComplaint = null;
    updateCitizenProgress(2);
    showScreen("complaintScreen");
}

function goToDashboard() {
    window.location.href = "adhikari.html";
}

function ensureConfirmationScreen() {
    if (document.getElementById("confirmationScreen")) return;
    const mobileFrame = document.querySelector(".mobile-frame");
    if (!mobileFrame) return;
    const confirmationScreen = document.createElement("section");
    confirmationScreen.id = "confirmationScreen";
    confirmationScreen.className = "card section-card screen-panel hidden";
    confirmationScreen.innerHTML = `
        <div class="section-head">
            <div><p class="section-kicker">Ticket Generated</p><h2>Complaint ready for follow-up</h2></div>
            <span class="section-tag">Step 4</span>
        </div>
        <div class="result-grid">
            <article class="result-tile"><span class="result-label">Ticket ID</span><strong id="confirmationTicketId">NAY-${TICKET_YEAR}-00000</strong></article>
            <article class="result-tile"><span class="result-label">Forwarded to</span><strong id="confirmationEmail">municipal@gov.in</strong></article>
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

// ─── Dashboard: filtering & stats ────────────────────────────────────────────

function getFilteredComplaints() {
    const page = getCurrentPage();
    const filterSelect = document.getElementById("departmentFilter");
    let complaints = [...dashboardState.complaints];

    if (page === "adhikari") {
        complaints = complaints.filter(c => c.department === dashboardState.officerDepartment);
    }

    if (filterSelect && filterSelect.value !== "All") {
        complaints = complaints.filter(c => c.department === filterSelect.value);
    }

    return complaints;
}

function populateDepartmentFilter() {
    const filterSelect = document.getElementById("departmentFilter");
    if (!filterSelect) return;

    const currentValue = filterSelect.value || "All";
    let source = [...dashboardState.complaints];
    if (getCurrentPage() === "adhikari") {
        source = source.filter(c => c.department === dashboardState.officerDepartment);
    }

    const departments = ["All", ...new Set(source.map(c => c.department))];
    filterSelect.innerHTML = departments.map(d => `<option value="${d}">${d === "All" ? "All Departments" : d}</option>`).join("");
    filterSelect.value = departments.includes(currentValue) ? currentValue : "All";
}

function updateStatsCards() {
    const complaints = dashboardState.filteredComplaints;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
    set("totalComplaintsStat", complaints.length);
    set("highUrgencyStat", complaints.filter(c => c.urgency === "High").length);
    set("inProgressStat", complaints.filter(c => c.status === "In Progress").length);
    set("resolvedStat", complaints.filter(c => c.status === "Resolved").length);
    set("pendingStat", complaints.filter(c => c.status === "Pending").length);
    const officerLabel = document.getElementById("officerDepartmentLabel");
    if (officerLabel) officerLabel.textContent = dashboardState.officerDepartment;
}

// ─── Dashboard: status updates ────────────────────────────────────────────────

function updateComplaintStatus(ticketId, nextStatus) {
    // Optimistic local update
    dashboardState.complaints = dashboardState.complaints.map(c =>
        c.ticketId === ticketId ? { ...c, status: nextStatus } : c
    );
    syncDashboardView();

    // Sync to backend (best-effort)
    fetch(`${API_URL}/complaints/${encodeURIComponent(ticketId)}/status?status=${encodeURIComponent(nextStatus)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
    }).catch(() => { /* local update already applied */ });
}

function bindStatusDropdowns() {
    document.querySelectorAll(".status-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const ticketId = event.target.getAttribute("data-ticket-id");
            updateComplaintStatus(ticketId, event.target.value);
        });
    });
}

// ─── Dashboard: table rendering ───────────────────────────────────────────────

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

    complaints.forEach((c) => {
        const row = document.createElement("tr");
        row.className = getUrgencyRowClass(c.urgency);
        row.innerHTML = `
            <td class="ticket-code">${c.ticketId}</td>
            <td class="summary-cell">${c.summary}</td>
            <td><span class="urgency-badge ${getDashboardUrgencyBadgeClass(c.urgency)}">${c.urgency}</span></td>
            <td>
                <select class="status-select" data-ticket-id="${c.ticketId}">
                    <option value="Pending"${c.status === "Pending" ? " selected" : ""}>Pending</option>
                    <option value="In Progress"${c.status === "In Progress" ? " selected" : ""}>In Progress</option>
                    <option value="Resolved"${c.status === "Resolved" ? " selected" : ""}>Resolved</option>
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

    complaints.forEach((c) => {
        const row = document.createElement("tr");
        row.className = getUrgencyRowClass(c.urgency);
        if ((c.bulk_count || 1) > 10) row.classList.add("hotspot-row");
        row.innerHTML = `
            <td class="ticket-code">${c.ticketId}</td>
            <td class="summary-cell">${c.summary}</td>
            <td>${c.category}</td>
            <td><span class="urgency-badge ${getDashboardUrgencyBadgeClass(c.urgency)}">${c.urgency}</span></td>
            <td><span class="department-badge">${c.department}</span></td>
            <td>${c.status}</td>
            <td>${c.bulk_count || 1}</td>
        `;
        tableBody.appendChild(row);
    });

    if (tableCount) tableCount.textContent = `${complaints.length} complaints`;
}

function renderDashboardTables() {
    if (document.getElementById("officerTableBody")) renderOfficerTable();
    if (document.getElementById("adminTableBody")) renderAdminTable();
}

function renderCategoryChart() {
    if (typeof Chart === "undefined") return;
    const chartCanvas = document.getElementById("complaintCategoryBarChart");
    if (!chartCanvas) return;

    const counts = dashboardState.filteredComplaints.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
    }, {});

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: labels.length ? labels : ["No complaints"],
            datasets: [{
                label: "Complaints",
                data: values.length ? values : [0],
                backgroundColor: ["#1D9E75", "#EF9F27", "#E8593C", "rgba(29,158,117,0.55)", "rgba(239,159,39,0.55)", "#2196F3", "#9C27B0", "#FF5722", "#795548", "#607D8B"],
                borderRadius: 12,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
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

// ─── Dashboard: data loading ───────────────────────────────────────────────────

async function loadDashboard() {
    try {
        const response = await fetch(API_URL + "/complaints", {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) throw new Error(`${response.status}`);

        const payload = await response.json();
        if (!payload || !Array.isArray(payload.complaints)) throw new Error("Invalid payload");

        dashboardState.complaints = payload.complaints.map((c) => ({
            ticketId: c.complaint_id,
            summary: c.summary || "No summary available",
            category: c.category || "General",
            urgency: c.urgency || "Low",
            department: c.department || "Municipal Corporation of Delhi",
            email: c.email || c.department_email || "municipal@gov.in",
            status: c.status || "Pending",
            bulk_count: c.bulk_count || 1,
            // Keep raw fields for bulk re-hydration
            location: c.location || "",
            original_text: c.original_text || "",
            filed_at: c.filed_at || "",
            analysis: c.analysis || {},
            email_body: c.email_body || ""
        }));
        dashboardState.source = "api";
    } catch (error) {
        console.warn("Dashboard load from API failed, using dummy data:", error);
        dashboardState.complaints = dummyComplaints.map(c => ({ ...c }));
        dashboardState.source = "dummy";
    }

    populateDepartmentFilter();
    syncDashboardView();
}

// ─── Page init ────────────────────────────────────────────────────────────────

function initDashboardPage(role) {
    dashboardState.role = role;
    const filterSelect = document.getElementById("departmentFilter");
    if (filterSelect) filterSelect.addEventListener("change", () => syncDashboardView());
    loadDashboard();
}

function initIndexPage() {
    selectRole("citizen");
}

function initCitizenPage() {
    showScreen("complaintScreen");
    updateCitizenProgress(2);
    bindCategoryChips();
    bindCopyActions();
    bindRtiNoticeButton();
}

document.addEventListener("DOMContentLoaded", () => {
    const page = getCurrentPage();
    if (page === "index") { initIndexPage(); return; }
    if (page === "citizen") { initCitizenPage(); return; }
    if (page === "adhikari") { initDashboardPage("adhikari"); return; }
    if (page === "admin") { initDashboardPage("admin"); }
});

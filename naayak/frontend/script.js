const DEMO_OTP = "123456";
const STORAGE_KEYS = {
    complaints: "naayak-demo-complaints",
    ticketCounter: "naayak-demo-ticket-counter"
};
const TICKET_YEAR = "2024";

let latestComplaint = null;
let complaintsChart = null;

const seededComplaints = [
    {
        ticketId: "NAY-2024-00001",
        summary: "Overflowing roadside garbage near the main market entrance.",
        category: "Sanitation",
        urgency: "High",
        department: "Sanitation Department",
        status: "Pending",
        date: "2026-03-18"
    },
    {
        ticketId: "NAY-2024-00002",
        summary: "Large pothole slowing buses near the central depot.",
        category: "Road & Infrastructure",
        urgency: "High",
        department: "Roads Department",
        status: "In Progress",
        date: "2026-03-18"
    },
    {
        ticketId: "NAY-2024-00003",
        summary: "Open drainage water collecting outside Sector 9 homes.",
        category: "Water & Drainage",
        urgency: "Medium",
        department: "Water Department",
        status: "Resolved",
        date: "2026-03-19"
    },
    {
        ticketId: "NAY-2024-00004",
        summary: "Frequent power cuts affecting the community health center.",
        category: "Electricity",
        urgency: "High",
        department: "Electricity Board",
        status: "Pending",
        date: "2026-03-20"
    },
    {
        ticketId: "NAY-2024-00005",
        summary: "Broken divider and unsafe turn reported near Ward 12 junction.",
        category: "Public Safety",
        urgency: "Low",
        department: "Municipal Corporation",
        status: "In Progress",
        date: "2026-03-21"
    }
];

function initializeDemoData() {
    if (!window.localStorage.getItem(STORAGE_KEYS.complaints)) {
        saveComplaints(seededComplaints);
    }

    if (!window.localStorage.getItem(STORAGE_KEYS.ticketCounter)) {
        window.localStorage.setItem(STORAGE_KEYS.ticketCounter, String(seededComplaints.length));
    }
}

function loadComplaints() {
    const storedComplaints = window.localStorage.getItem(STORAGE_KEYS.complaints);

    if (!storedComplaints) {
        return [];
    }

    try {
        const complaints = JSON.parse(storedComplaints);
        return Array.isArray(complaints) ? complaints : [];
    } catch (error) {
        return [];
    }
}

function saveComplaints(complaints) {
    window.localStorage.setItem(STORAGE_KEYS.complaints, JSON.stringify(complaints));
}

function getTicketCounter() {
    const currentCounter = Number(window.localStorage.getItem(STORAGE_KEYS.ticketCounter) || "0");
    return Number.isFinite(currentCounter) ? currentCounter : 0;
}

function setTicketCounter(counter) {
    window.localStorage.setItem(STORAGE_KEYS.ticketCounter, String(counter));
}

function generateTicketId() {
    const nextCounter = getTicketCounter() + 1;
    setTicketCounter(nextCounter);
    return `NAY-${TICKET_YEAR}-${String(nextCounter).padStart(5, "0")}`;
}

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
        "A citizen complaint has been submitted through the Naayak offline demo platform.",
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

function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getRecognitionLanguage() {
    const languageField = document.getElementById("language");
    if (!languageField) return "en-IN";

    return languageField.value === "Hindi" ? "hi-IN" : "en-IN";
}

function showScreen(screenId) {
    const screenIds = ["otpScreen", "complaintScreen", "loadingScreen", "resultScreen", "confirmationScreen"];

    screenIds.forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.classList.toggle("hidden", id !== screenId);
        element.classList.toggle("active-screen", id === screenId);
    });
}

function sendOTP() {
    const phone = document.getElementById("phone");
    const otpBox = document.getElementById("otpBox");

    if (!phone || !otpBox) return;

    if (!/^\d{10}$/.test(phone.value.trim())) {
        alert("Enter a valid 10 digit mobile number.");
        phone.focus();
        return;
    }

    otpBox.classList.remove("hidden");
    alert("OTP sent successfully. Use 123456 for this demo.");
}

function verifyOTP() {
    const otp = document.getElementById("otp");

    if (!otp) return;

    if (otp.value.trim() !== DEMO_OTP) {
        alert("Incorrect OTP. Please use 123456.");
        otp.focus();
        return;
    }

    showScreen("complaintScreen");
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
        const transcript = event.results[0][0].transcript.trim();
        complaintText.value = transcript;
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
    } else if (normalizedComplaint.includes("water") || normalizedComplaint.includes("drainage") || normalizedComplaint.includes("drain")) {
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

    const urgency = "High";
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
        draft
    };
}

function submitComplaint() {
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

    latestComplaint = {
        complaintText,
        location,
        language,
        selectedCategory,
        response: getMockAiResponse(complaintText, selectedCategory, location)
    };

    const urgencyEl = document.getElementById("urgency");
    const departmentEl = document.getElementById("department");
    const emailEl = document.getElementById("email");
    const ticketIdEl = document.getElementById("ticketId");
    const aiSummaryEl = document.getElementById("aiSummary");
    const draftEmailEl = document.getElementById("draftEmail");

    if (urgencyEl) {
        urgencyEl.textContent = latestComplaint.response.urgency;
        urgencyEl.className = `status-pill ${getUrgencyBadgeClass(latestComplaint.response.urgency)}`;
    }

    if (departmentEl) {
        departmentEl.textContent = latestComplaint.response.department;
    }

    if (emailEl) {
        emailEl.textContent = latestComplaint.response.email;
    }

    if (ticketIdEl) {
        ticketIdEl.textContent = "Generated after send";
    }

    if (aiSummaryEl) {
        aiSummaryEl.textContent = `AI matched this complaint to ${latestComplaint.response.department}, marked it ${latestComplaint.response.urgency.toLowerCase()} priority, and prepared a draft for ${latestComplaint.response.category.toLowerCase()} handling.`;
    }

    if (draftEmailEl) {
        draftEmailEl.value = latestComplaint.response.draft;
    }

    ensureResultActions();
    showScreen("loadingScreen");

    window.setTimeout(() => {
        showScreen("resultScreen");
    }, 1500);
}

function createComplaintRecord() {
    if (!latestComplaint) {
        return null;
    }

    const draftEmailField = document.getElementById("draftEmail");

    return {
        ticketId: generateTicketId(),
        summary: buildComplaintSummary(latestComplaint.complaintText),
        category: latestComplaint.response.category,
        urgency: latestComplaint.response.urgency,
        department: latestComplaint.response.department,
        status: "Pending",
        date: new Date().toISOString().split("T")[0],
        complaintText: latestComplaint.complaintText,
        location: latestComplaint.location,
        language: latestComplaint.language,
        draftEmail: draftEmailField ? draftEmailField.value.trim() : latestComplaint.response.draft
    };
}

function storeComplaint(complaintRecord) {
    const complaints = loadComplaints();
    complaints.unshift(complaintRecord);
    saveComplaints(complaints);
}

function sendEmail() {
    if (!latestComplaint) {
        alert("Please submit a complaint first.");
        return;
    }

    const complaintRecord = createComplaintRecord();
    if (!complaintRecord) return;

    latestComplaint.ticketId = complaintRecord.ticketId;
    storeComplaint(complaintRecord);

    const ticketIdEl = document.getElementById("ticketId");
    if (ticketIdEl) {
        ticketIdEl.textContent = complaintRecord.ticketId;
    }

    ensureConfirmationScreen();

    const confirmationTicket = document.getElementById("confirmationTicketId");
    const confirmationEmail = document.getElementById("confirmationEmail");

    if (confirmationTicket) {
        confirmationTicket.textContent = complaintRecord.ticketId;
    }

    if (confirmationEmail) {
        confirmationEmail.textContent = latestComplaint.response.email;
    }

    showScreen("confirmationScreen");
}

function resetComplaintForm() {
    const fieldIds = ["location", "complaintText", "otp"];
    fieldIds.forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = "";
        }
    });

    const phoneField = document.getElementById("phone");
    if (phoneField) {
        phoneField.value = "";
    }

    const categoryField = document.getElementById("complaintCategory");
    if (categoryField) {
        categoryField.selectedIndex = 0;
    }

    const languageField = document.getElementById("language");
    if (languageField) {
        languageField.selectedIndex = 0;
    }

    const otpBox = document.getElementById("otpBox");
    if (otpBox) {
        otpBox.classList.add("hidden");
    }

    latestComplaint = null;
    showScreen("otpScreen");
}

function goToDashboard() {
    window.location.href = "dashboard.html";
}

function ensureResultActions() {
    const actionStack = document.querySelector("#resultScreen .action-stack");
    if (!actionStack) return;

    let trackButton = document.getElementById("trackComplaintButton");
    if (!trackButton) {
        trackButton = document.createElement("button");
        trackButton.id = "trackComplaintButton";
        trackButton.type = "button";
        trackButton.className = "btn btn-secondary";
        trackButton.textContent = "Track Complaint";
        trackButton.addEventListener("click", goToDashboard);
        actionStack.appendChild(trackButton);
    }
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
                <h2>Complaint saved in offline demo</h2>
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
            <p>Your complaint is stored locally, appears on the dashboard immediately, and any status updates will stay saved in this browser.</p>
        </div>
        <div class="action-stack">
            <button type="button" class="btn btn-primary" onclick="goToDashboard()">Track Complaint</button>
            <button type="button" class="btn btn-secondary" onclick="resetComplaintForm()">File Another Complaint</button>
        </div>
    `;

    mobileFrame.appendChild(confirmationScreen);
}

function populateDepartmentFilter() {
    const filterSelect = document.getElementById("departmentFilter");
    if (!filterSelect) return;

    const complaints = loadComplaints();
    const departments = ["All Departments", ...new Set(complaints.map((complaint) => complaint.department))];

    filterSelect.innerHTML = departments.map((department, index) => {
        const value = index === 0 ? "All" : department;
        return `<option value="${value}">${department}</option>`;
    }).join("");
}

function getFilteredComplaints() {
    const complaints = loadComplaints();
    const filterSelect = document.getElementById("departmentFilter");

    if (!filterSelect || filterSelect.value === "All") {
        return complaints;
    }

    return complaints.filter((complaint) => complaint.department === filterSelect.value);
}

function updateComplaintStatus(ticketId, nextStatus) {
    const complaints = loadComplaints().map((complaint) => {
        if (complaint.ticketId === ticketId) {
            return {
                ...complaint,
                status: nextStatus
            };
        }

        return complaint;
    });

    saveComplaints(complaints);
}

function bindStatusDropdowns() {
    const statusSelects = document.querySelectorAll(".status-select");
    statusSelects.forEach((select) => {
        select.addEventListener("change", (event) => {
            const ticketId = event.target.getAttribute("data-ticket-id");
            updateComplaintStatus(ticketId, event.target.value);
            renderComplaintsTable();
            renderComplaintCategoryChart();
        });
    });
}

function renderComplaintsTable() {
    const tableBody = document.getElementById("complaintsTableBody");
    const tableCount = document.getElementById("tableCount");
    if (!tableBody) return;

    const complaints = getFilteredComplaints();
    tableBody.innerHTML = "";

    if (!complaints.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="muted-cell">No complaints available for the selected department.</td>
            </tr>
        `;

        if (tableCount) {
            tableCount.textContent = "0 complaints";
        }

        return;
    }

    complaints.forEach((complaint) => {
        const row = document.createElement("tr");
        row.className = getUrgencyRowClass(complaint.urgency);

        row.innerHTML = `
            <td class="ticket-code">${complaint.ticketId}</td>
            <td class="summary-cell">${complaint.summary}</td>
            <td>${complaint.category}</td>
            <td><span class="urgency-badge ${getDashboardUrgencyBadgeClass(complaint.urgency)}">${complaint.urgency}</span></td>
            <td>${complaint.department}</td>
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

    if (tableCount) {
        tableCount.textContent = `${complaints.length} complaints`;
    }

    bindStatusDropdowns();
}

function renderComplaintCategoryChart() {
    if (typeof Chart === "undefined") return;

    const chartCanvas = document.getElementById("complaintCategoryBarChart");
    if (!chartCanvas) return;

    const complaints = getFilteredComplaints();
    const countsByCategory = complaints.reduce((accumulator, complaint) => {
        accumulator[complaint.category] = (accumulator[complaint.category] || 0) + 1;
        return accumulator;
    }, {});

    const labels = Object.keys(countsByCategory);
    const values = Object.values(countsByCategory);

    if (complaintsChart) {
        complaintsChart.destroy();
    }

    complaintsChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: labels.length ? labels : ["No complaints"],
            datasets: [{
                label: "Complaints",
                data: values.length ? values : [0],
                backgroundColor: ["#1D9E75", "#EF9F27", "#E8593C", "rgba(29, 158, 117, 0.55)", "rgba(21, 34, 41, 0.5)"],
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

function initDashboardPage() {
    const filterSelect = document.getElementById("departmentFilter");
    if (!filterSelect) return;

    populateDepartmentFilter();
    renderComplaintsTable();
    renderComplaintCategoryChart();

    filterSelect.addEventListener("change", () => {
        renderComplaintsTable();
        renderComplaintCategoryChart();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeDemoData();
    ensureResultActions();
    initDashboardPage();
});

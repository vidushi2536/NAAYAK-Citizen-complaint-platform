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

function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getRecognitionLanguage() {
    const languageField = document.getElementById("language");
    if (!languageField) return "en-IN";
    return languageField.value === "Hindi" ? "hi-IN" : "en-IN";
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

    return { category, urgency, department, email, draft };
}

async function analyzeComplaint(complaintText, selectedCategory, location, language) {
    try {
        const response = await fetch("/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                complaintText,
                category: selectedCategory,
                location,
                language
            })
        });

        if (!response.ok) {
            throw new Error(`Analyze request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result || typeof result !== "object") {
            throw new Error("Analyze response is invalid");
        }

        const urgency = ["High", "Medium", "Low"].includes(result.urgency) ? result.urgency : getRandomUrgency();
        const department = result.department || "Municipal Corporation";
        const email = result.email || "municipal@gov.in";
        const category = result.category || selectedCategory || "Public Safety";
        const draft = result.draft || buildDraftEmail({
            complaintText,
            category,
            urgency,
            department,
            email,
            location
        });

        return { category, urgency, department, email, draft };
    } catch (error) {
        return getMockAiResponse(complaintText, selectedCategory, location);
    }
}

function updateResultScreen(response) {
    const urgencyEl = document.getElementById("urgency");
    const departmentEl = document.getElementById("department");
    const emailEl = document.getElementById("email");
    const ticketIdEl = document.getElementById("ticketId");
    const aiSummaryEl = document.getElementById("aiSummary");
    const draftEmailEl = document.getElementById("draftEmail");

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
        ticketIdEl.textContent = "Generated after send";
    }
    if (aiSummaryEl) {
        aiSummaryEl.textContent = `AI matched this complaint to ${response.department}, marked it ${response.urgency.toLowerCase()} priority, and prepared a draft for ${response.category.toLowerCase()} handling.`;
    }
    if (draftEmailEl) {
        draftEmailEl.value = response.draft;
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

    showScreen("loadingScreen");
    const loadingStart = Date.now();
    const response = await analyzeComplaint(complaintText, selectedCategory, location, language);
    const remainingDelay = Math.max(0, 1500 - (Date.now() - loadingStart));

    latestComplaint = {
        complaintText,
        location,
        language,
        selectedCategory,
        response
    };

    updateResultScreen(response);

    window.setTimeout(() => {
        showScreen("resultScreen");
    }, remainingDelay);
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

function sendEmail() {
    if (!latestComplaint) {
        alert("Please submit a complaint first.");
        return;
    }

    const ticketId = generateTicketId();
    latestComplaint.ticketId = ticketId;

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
        row.innerHTML = `
            <td class="ticket-code">${complaint.ticketId}</td>
            <td class="summary-cell">${complaint.summary}</td>
            <td>${complaint.category}</td>
            <td><span class="urgency-badge ${getDashboardUrgencyBadgeClass(complaint.urgency)}">${complaint.urgency}</span></td>
            <td><span class="department-badge">${complaint.department}</span></td>
            <td>${complaint.status}</td>
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
        const response = await fetch("/complaints", {
            method: "GET",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const complaints = await response.json();
        if (!Array.isArray(complaints)) {
            throw new Error("Complaints response is not an array");
        }

        dashboardState.complaints = complaints;
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

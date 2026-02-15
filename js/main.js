function cfResolveApiBase() {
    const override = (localStorage.getItem("cfApiBaseOverride") || "").trim();
    if (override) {
        return override.replace(/\/+$/, "");
    }

    const host = window.location.hostname;
    const isLocal =
        window.location.protocol === "file:" ||
        host === "localhost" ||
        host === "127.0.0.1";
    return isLocal ? "http://127.0.0.1:5000" : "https://build-seed.onrender.com";
}

const CF_API_BASE = cfResolveApiBase();
const cfStudentBookingState = {
    allBookings: [],
    visibleBookings: []
};
const cfFoodReviewState = {
    summaryWeek: "",
    hostels: []
};
const cfCommuteState = {
    entries: []
};
const cfCurrentAffairsState = {
    items: [],
    byId: {}
};
const cfAdminState = {
    bookingsCount: 0,
    bookingAlertsCount: 0,
    commuteAlertsCount: 0,
    currentAffairsCount: 0
};
const cfAcademicState = {
    step: 1,
    results: [],
    savedIds: []
};
const cfNoteState = {
    items: []
};

const cfAcademicResources = [
    {
        id: "ac-1",
        branch: "CSE",
        semester: "1",
        subject: "Programming Fundamentals",
        type: "notes",
        title: "C Programming Unit Notes",
        summary: "Structured notes on loops, arrays, functions, and pointers.",
        url: "#"
    },
    {
        id: "ac-2",
        branch: "CSE",
        semester: "1",
        subject: "Programming Fundamentals",
        type: "paper",
        title: "Previous Year Intro Programming Papers",
        summary: "Curated question papers with pattern highlights.",
        url: "#"
    },
    {
        id: "ac-3",
        branch: "CSE",
        semester: "1",
        subject: "Engineering Mathematics I",
        type: "notes",
        title: "Mathematics I Quick Revision Sheets",
        summary: "Short formula notes for calculus and linear algebra.",
        url: "#"
    },
    {
        id: "ac-4",
        branch: "CSE",
        semester: "2",
        subject: "Data Structures",
        type: "notes",
        title: "Data Structures Crash Notes",
        summary: "Stacks, queues, linked lists, trees, and complexity basics.",
        url: "#"
    },
    {
        id: "ac-5",
        branch: "CSE",
        semester: "2",
        subject: "Data Structures",
        type: "video",
        title: "Data Structures Practice Sessions",
        summary: "Recorded problem-solving sessions for exams.",
        url: "#"
    },
    {
        id: "ac-6",
        branch: "CSE",
        semester: "3",
        subject: "Database Systems",
        type: "notes",
        title: "DBMS Complete Class Notes",
        summary: "ER modeling, SQL, normalization, and transactions.",
        url: "#"
    },
    {
        id: "ac-7",
        branch: "CSE",
        semester: "3",
        subject: "Database Systems",
        type: "paper",
        title: "DBMS Midterm and Endterm Papers",
        summary: "Topic-sorted paper bank for DBMS.",
        url: "#"
    },
    {
        id: "ac-8",
        branch: "ECE",
        semester: "1",
        subject: "Basic Electronics",
        type: "notes",
        title: "Basic Electronics Classroom Notes",
        summary: "Diodes, transistors, biasing, and practical observations.",
        url: "#"
    },
    {
        id: "ac-9",
        branch: "ECE",
        semester: "1",
        subject: "Basic Electronics",
        type: "syllabus",
        title: "ECE Semester 1 Subject Syllabus",
        summary: "Official course outcomes and evaluation pattern.",
        url: "#"
    },
    {
        id: "ac-10",
        branch: "ECE",
        semester: "2",
        subject: "Signals and Systems",
        type: "notes",
        title: "Signals and Systems Master Notes",
        summary: "LTI systems, transforms, and solved examples.",
        url: "#"
    },
    {
        id: "ac-11",
        branch: "ECE",
        semester: "2",
        subject: "Signals and Systems",
        type: "video",
        title: "Signals Visualization Lectures",
        summary: "Animated explanations for key transform concepts.",
        url: "#"
    },
    {
        id: "ac-12",
        branch: "ECE",
        semester: "3",
        subject: "Analog Circuits",
        type: "paper",
        title: "Analog Circuits PYQ Collection",
        summary: "Previous-year questions grouped by unit.",
        url: "#"
    },
    {
        id: "ac-13",
        branch: "ME",
        semester: "1",
        subject: "Engineering Mechanics",
        type: "notes",
        title: "Engineering Mechanics Notes",
        summary: "Force systems, equilibrium, and friction fundamentals.",
        url: "#"
    },
    {
        id: "ac-14",
        branch: "ME",
        semester: "2",
        subject: "Thermodynamics",
        type: "notes",
        title: "Thermodynamics Concept Notes",
        summary: "Laws of thermodynamics and process analyses.",
        url: "#"
    },
    {
        id: "ac-15",
        branch: "ME",
        semester: "2",
        subject: "Thermodynamics",
        type: "paper",
        title: "Thermo Exam Archive",
        summary: "Past papers and repeated question trends.",
        url: "#"
    },
    {
        id: "ac-16",
        branch: "CE",
        semester: "1",
        subject: "Engineering Drawing",
        type: "notes",
        title: "Engineering Drawing Sheet Guide",
        summary: "Projection methods and drafting practice notes.",
        url: "#"
    },
    {
        id: "ac-17",
        branch: "CE",
        semester: "2",
        subject: "Surveying",
        type: "notes",
        title: "Surveying Field Manual Notes",
        summary: "Levelling, theodolite, and practical methods.",
        url: "#"
    },
    {
        id: "ac-18",
        branch: "CE",
        semester: "3",
        subject: "Structural Analysis",
        type: "video",
        title: "Structural Analysis Tutorial Playlist",
        summary: "Beam and truss analysis walkthrough sessions.",
        url: "#"
    }
];

function cfEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cfUpdateAdminStats() {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
    };
    setText("cf-admin-stat-bookings", cfAdminState.bookingsCount);
    setText("cf-admin-stat-booking-alerts", cfAdminState.bookingAlertsCount);
    setText("cf-admin-stat-commute-alerts", cfAdminState.commuteAlertsCount);
    setText("cf-admin-stat-affairs", cfAdminState.currentAffairsCount);
}

function cfLoadNotes() {
    try {
        const saved = JSON.parse(localStorage.getItem("cfPersonalNotes") || "[]");
        cfNoteState.items = Array.isArray(saved) ? saved : [];
    } catch (error) {
        cfNoteState.items = [];
    }
}

function cfSaveNotes() {
    localStorage.setItem("cfPersonalNotes", JSON.stringify(cfNoteState.items));
}

function cfRenderNotes() {
    const list = document.getElementById("cf-note-list");
    if (!list) return;

    list.innerHTML = "";
    if (!cfNoteState.items.length) {
        list.innerHTML = "<p class='cf-empty-message'>No reminders yet.</p>";
        return;
    }

    cfNoteState.items.forEach((item) => {
        const row = document.createElement("article");
        row.className = "cf-note-item";
        row.dataset.noteId = String(item.id ?? "");
        row.innerHTML = `
            <div class="cf-note-head">
                <h4>${cfEscapeHtml(item.title)}</h4>
                <button type="button" class="cf-note-delete">Delete</button>
            </div>
            <p>${cfEscapeHtml(item.text)}</p>
            <span>${cfEscapeHtml(item.created_at)}</span>
        `;
        list.appendChild(row);
    });
}

function cfDeleteNote(id) {
    cfNoteState.items = cfNoteState.items.filter((item) => item.id !== id);
    cfSaveNotes();
    cfRenderNotes();
}

function cfInitActionDelegates() {
    if (document.body?.dataset.cfDelegatesBound === "1") return;
    if (document.body) {
        document.body.dataset.cfDelegatesBound = "1";
    }

    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const noteDeleteBtn = target.closest(".cf-note-delete");
        if (noteDeleteBtn) {
            const noteId = noteDeleteBtn.closest(".cf-note-item")?.dataset.noteId;
            if (noteId) cfDeleteNote(noteId);
            return;
        }

        const bookingArrivalBtn = target.closest("#cf-booking-list-container .cf-arrival-btn");
        if (bookingArrivalBtn) {
            const bookingId = bookingArrivalBtn.closest(".cf-booking-item")?.dataset.bookingId;
            if (bookingId) cfMarkBookingArrived(bookingId);
            return;
        }

        const commuteArrivalBtn = target.closest("#cf-commute-list-container .cf-arrival-btn");
        if (commuteArrivalBtn) {
            const commuteId = commuteArrivalBtn.closest(".cf-booking-item")?.dataset.commuteId;
            if (commuteId) cfMarkCommuteArrived(commuteId);
            return;
        }

        const saveResourceBtn = target.closest(".cf-academic-save-btn");
        if (saveResourceBtn) {
            const resourceId = saveResourceBtn.closest(".cf-academic-result-card")?.dataset.resourceId;
            if (resourceId) cfToggleAcademicBookmark(resourceId);
            return;
        }

        const currentAffairActionBtn = target.closest("#cf-admin-current-affairs-container button[data-action]");
        if (currentAffairActionBtn) {
            const affairId = currentAffairActionBtn.closest(".cf-current-affair-item")?.dataset.affairId;
            const action = currentAffairActionBtn.getAttribute("data-action");
            if (!affairId) return;
            if (action === "edit") {
                cfEditCurrentAffair(affairId);
            } else if (action === "delete") {
                cfDeleteCurrentAffair(affairId);
            }
            return;
        }

        const adminBookingActionBtn = target.closest("#cf-admin-booking-container button[data-action]");
        if (adminBookingActionBtn) {
            const bookingId = adminBookingActionBtn.closest(".cf-booking-item")?.dataset.bookingId;
            const action = adminBookingActionBtn.getAttribute("data-action");
            if (!bookingId) return;
            if (action === "approve") {
                cfApproveBooking(bookingId);
            } else if (action === "reject") {
                cfRejectBooking(bookingId);
            }
        }
    });
}

function cfInitNoteBoard() {
    const form = document.getElementById("cf-note-form");
    if (!form) return;

    cfLoadNotes();
    cfRenderNotes();

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const titleEl = document.getElementById("cf-note-title");
        const textEl = document.getElementById("cf-note-text");
        const title = (titleEl?.value || "").trim();
        const text = (textEl?.value || "").trim();
        if (!title || !text) return;

        const note = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title,
            text,
            created_at: new Date().toLocaleString()
        };
        cfNoteState.items = [note, ...cfNoteState.items].slice(0, 40);
        cfSaveNotes();
        cfRenderNotes();
        form.reset();
    });
}

function cfGetAuthHeaders() {
    const token = localStorage.getItem("cfFirebaseIdToken");
    if (!token) {
        window.location.href = "index.html";
        return null;
    }
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

async function cfHandleApiResponse(response) {
    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (response.status === 401) {
        localStorage.removeItem("cfFirebaseIdToken");
        window.location.href = "index.html";
        throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
        throw new Error(data.message || data.error || "Request failed");
    }

    return data;
}

async function cfCreateBooking(event) {
    event.preventDefault();

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    const payload = {
        room: document.getElementById("cf-input-room").value.trim(),
        date: document.getElementById("cf-input-date").value,
        start_time: document.getElementById("cf-input-start-time").value,
        end_time: document.getElementById("cf-input-end-time").value,
        expected_arrival_time: document.getElementById("cf-input-expected-arrival").value,
        purpose: document.getElementById("cf-input-purpose").value.trim()
    };

    if (payload.start_time >= payload.end_time) {
        alert("End time must be greater than start time.");
        return;
    }
    if (payload.expected_arrival_time < payload.start_time || payload.expected_arrival_time > payload.end_time) {
        alert("Expected arrival time must be between start and end time.");
        return;
    }

    try {
        const response = await fetch(`${CF_API_BASE}/api/create-booking`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        const data = await cfHandleApiResponse(response);
        alert(data.message || "Booking submitted");
        event.target.reset();
        await cfFetchStudentBookings();
    } catch (error) {
        alert(error.message || "Unable to submit booking");
    }
}

function cfGetBookingTimestamp(booking) {
    if (!booking?.date || !booking?.start_time) return 0;
    const dateTime = `${booking.date}T${booking.start_time}`;
    const timestamp = new Date(dateTime).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function cfGetBookingDurationLabel(startTime, endTime) {
    const [startHour = 0, startMinute = 0] = (startTime || "").split(":").map(Number);
    const [endHour = 0, endMinute = 0] = (endTime || "").split(":").map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    const durationMinutes = Math.max(0, endTotal - startTotal);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (!hours) return `${minutes}m`;
    if (!minutes) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

function cfRenderStudentBookingList(bookings) {
    const container = document.getElementById("cf-booking-list-container");
    if (!container) return;

    container.innerHTML = "";
    if (!bookings.length) {
        container.innerHTML = "<p class='cf-empty-message'>No bookings match your filters.</p>";
        return;
    }

    bookings.forEach((booking) => {
        const item = document.createElement("div");
        item.className = "cf-booking-item";
        item.dataset.status = (booking.status || "").toLowerCase();
        item.dataset.bookingId = String(booking.id ?? "");
        const canMarkArrival = (booking.status || "").toLowerCase() !== "rejected" && !booking.has_arrived;
        item.innerHTML = `
            <p><strong>Room:</strong> ${cfEscapeHtml(booking.room)}</p>
            <p><strong>Date:</strong> ${cfEscapeHtml(booking.date)}</p>
            <p><strong>Time:</strong> ${cfEscapeHtml(booking.start_time)} - ${cfEscapeHtml(booking.end_time)} (${cfEscapeHtml(cfGetBookingDurationLabel(booking.start_time, booking.end_time))})</p>
            <p><strong>Expected Arrival:</strong> ${cfEscapeHtml(booking.expected_arrival_time || "Not set")}</p>
            <p><strong>Purpose:</strong> ${cfEscapeHtml(booking.purpose)}</p>
            <p><strong>Status:</strong> ${cfEscapeHtml(booking.status)}</p>
            <p><strong>Arrival:</strong> ${booking.has_arrived ? "Arrived" : "Not Marked"}</p>
            ${booking.safety_alert_message ? `<p class="cf-arrival-alert">${cfEscapeHtml(booking.safety_alert_message)}</p>` : ""}
            ${
                canMarkArrival
                    ? '<button type="button" class="cf-arrival-btn">Mark Arrived</button>'
                    : ""
            }
        `;
        container.appendChild(item);
    });
}

async function cfMarkBookingArrived(id) {
    const headers = cfGetAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${CF_API_BASE}/api/mark-arrived`, {
            method: "POST",
            headers,
            body: JSON.stringify({ id })
        });
        const data = await cfHandleApiResponse(response);
        alert(data.message || "Arrival marked");
        await cfFetchStudentBookings();
    } catch (error) {
        alert(error.message || "Unable to mark arrival");
    }
}

function cfUpdateStudentSummary(bookings) {
    const summaryEls = {
        total: document.getElementById("cf-summary-total"),
        pending: document.getElementById("cf-summary-pending"),
        approved: document.getElementById("cf-summary-approved"),
        rejected: document.getElementById("cf-summary-rejected")
    };

    if (!summaryEls.total) return;

    const counts = {
        total: bookings.length,
        pending: 0,
        approved: 0,
        rejected: 0
    };

    bookings.forEach((booking) => {
        const key = (booking.status || "").toLowerCase();
        if (key === "pending" || key === "approved" || key === "rejected") {
            counts[key] += 1;
        }
    });

    summaryEls.total.textContent = counts.total;
    summaryEls.pending.textContent = counts.pending;
    summaryEls.approved.textContent = counts.approved;
    summaryEls.rejected.textContent = counts.rejected;
}

function cfApplyStudentBookingTools() {
    const search = document.getElementById("cf-booking-search")?.value.trim().toLowerCase() || "";
    const statusFilter = document.getElementById("cf-booking-status-filter")?.value || "all";
    const sortBy = document.getElementById("cf-booking-sort")?.value || "newest";

    const filtered = cfStudentBookingState.allBookings.filter((booking) => {
        const bookingStatus = (booking.status || "").toLowerCase();
        const room = (booking.room || "").toLowerCase();
        const purpose = (booking.purpose || "").toLowerCase();
        const matchesStatus = statusFilter === "all" || bookingStatus === statusFilter;
        const matchesSearch = !search || room.includes(search) || purpose.includes(search);
        return matchesStatus && matchesSearch;
    });

    filtered.sort((a, b) => {
        if (sortBy === "oldest") {
            return cfGetBookingTimestamp(a) - cfGetBookingTimestamp(b);
        }
        return cfGetBookingTimestamp(b) - cfGetBookingTimestamp(a);
    });

    cfStudentBookingState.visibleBookings = filtered;
    cfRenderStudentBookingList(filtered);
}

function cfDownloadStudentBookingsCsv() {
    const rows = cfStudentBookingState.visibleBookings;
    if (!rows.length) {
        alert("No visible bookings to export.");
        return;
    }

    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = ["Room", "Date", "Start Time", "End Time", "Duration", "Purpose", "Status"];
    const dataRows = rows.map((booking) => ([
        booking.room,
        booking.date,
        booking.start_time,
        booking.end_time,
        cfGetBookingDurationLabel(booking.start_time, booking.end_time),
        booking.purpose,
        booking.status
    ]));

    const csv = [header, ...dataRows]
        .map((row) => row.map(escapeCell).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campusflow-bookings.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function cfGetCurrentIsoWeek() {
    const date = new Date();
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = (utcDate.getUTCDay() + 6) % 7;
    utcDate.setUTCDate(utcDate.getUTCDate() - day + 3);

    const firstThursday = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 4));
    const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
    const week = 1 + Math.round(
        ((utcDate.getTime() - firstThursday.getTime()) / 86400000 - 3 + firstThursdayDay) / 7
    );

    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function cfBuildRatingBar(label, value) {
    const safeValue = Number(value) || 0;
    const widthPercent = Math.max(0, Math.min(100, (safeValue / 5) * 100));
    return `
        <div class="cf-food-metric">
            <span>${cfEscapeHtml(label)}</span>
            <div class="cf-food-meter">
                <div class="cf-food-meter-fill" style="width:${widthPercent}%"></div>
            </div>
            <strong>${safeValue.toFixed(1)}</strong>
        </div>
    `;
}

function cfRenderFoodSummary() {
    const container = document.getElementById("cf-food-summary-container");
    if (!container) return;

    container.innerHTML = "";
    if (!cfFoodReviewState.hostels.length) {
        container.innerHTML = "<p class='cf-empty-message'>No food reviews found for this week.</p>";
        return;
    }

    cfFoodReviewState.hostels.forEach((hostel) => {
        const card = document.createElement("article");
        card.className = "cf-food-summary-item";
        const reviewCount = Number(hostel.review_count) || 0;
        const comments = (hostel.sample_comments || [])
            .map((comment) => `<li>${cfEscapeHtml(comment)}</li>`)
            .join("");

        card.innerHTML = `
            <div class="cf-food-summary-header">
                <h4>${cfEscapeHtml(hostel.hostel)}</h4>
                <span>${reviewCount} review${reviewCount === 1 ? "" : "s"}</span>
            </div>
            ${cfBuildRatingBar("Overall", hostel.avg_overall)}
            ${cfBuildRatingBar("Taste", hostel.avg_taste)}
            ${cfBuildRatingBar("Hygiene", hostel.avg_hygiene)}
            ${cfBuildRatingBar("Variety", hostel.avg_variety)}
            ${
                comments
                    ? `<div class="cf-food-comments"><p>Recent feedback</p><ul>${comments}</ul></div>`
                    : ""
            }
        `;
        container.appendChild(card);
    });
}

async function cfFetchFoodReviewSummary() {
    const headers = cfGetAuthHeaders();
    if (!headers) return;

    const weekInput = document.getElementById("cf-food-summary-week");
    const week = weekInput?.value || cfGetCurrentIsoWeek();
    const container = document.getElementById("cf-food-summary-container");
    if (!container) return;

    container.innerHTML = "<p class='cf-empty-message'>Loading weekly food insights...</p>";

    try {
        const response = await fetch(`${CF_API_BASE}/api/get-food-review-summary?week=${encodeURIComponent(week)}`, {
            method: "GET",
            headers
        });
        const data = await cfHandleApiResponse(response);
        cfFoodReviewState.summaryWeek = data.week || week;
        cfFoodReviewState.hostels = data.hostels || [];
        cfRenderFoodSummary();
    } catch (error) {
        container.innerHTML = `<p class='cf-empty-message'>${cfEscapeHtml(error.message || "Unable to load food review summary.")}</p>`;
    }
}

async function cfSubmitFoodReview(event) {
    event.preventDefault();

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    const payload = {
        hostel: document.getElementById("cf-food-hostel")?.value || "",
        week: document.getElementById("cf-food-review-week")?.value || "",
        taste_rating: Number(document.getElementById("cf-food-rating-taste")?.value || 0),
        hygiene_rating: Number(document.getElementById("cf-food-rating-hygiene")?.value || 0),
        variety_rating: Number(document.getElementById("cf-food-rating-variety")?.value || 0),
        comment: (document.getElementById("cf-food-comment")?.value || "").trim()
    };

    try {
        const response = await fetch(`${CF_API_BASE}/api/submit-food-review`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        const data = await cfHandleApiResponse(response);
        alert(data.message || "Food review submitted");
        document.getElementById("cf-food-comment").value = "";

        const summaryWeekInput = document.getElementById("cf-food-summary-week");
        if (summaryWeekInput) summaryWeekInput.value = payload.week;
        await cfFetchFoodReviewSummary();
    } catch (error) {
        alert(error.message || "Unable to submit food review");
    }
}

function cfRenderCommuteEntries(entries) {
    const container = document.getElementById("cf-commute-list-container");
    if (!container) return;

    container.innerHTML = "";
    if (!entries.length) {
        container.innerHTML = "<p class='cf-empty-message'>No commute entries yet.</p>";
        return;
    }

    entries.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "cf-booking-item";
        item.dataset.commuteId = String(entry.id ?? "");
        const canMarkArrival = !entry.has_arrived;
        item.innerHTML = `
            <p><strong>Date:</strong> ${cfEscapeHtml(entry.date)}</p>
            <p><strong>Expected Arrival:</strong> ${cfEscapeHtml(entry.expected_arrival_time)}</p>
            <p><strong>Travel Mode:</strong> ${cfEscapeHtml(entry.travel_mode || "Not specified")}</p>
            <p><strong>Notes:</strong> ${cfEscapeHtml(entry.notes || "-")}</p>
            <p><strong>Arrival:</strong> ${entry.has_arrived ? "Arrived" : "Not Marked"}</p>
            ${entry.alert_message ? `<p class="cf-arrival-alert">${cfEscapeHtml(entry.alert_message)}</p>` : ""}
            ${canMarkArrival ? '<button type="button" class="cf-arrival-btn">Mark Arrived</button>' : ""}
        `;
        container.appendChild(item);
    });
}

async function cfFetchCommuteEntries() {
    const container = document.getElementById("cf-commute-list-container");
    if (!container) return;

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${CF_API_BASE}/api/get-commute-entries`, {
            method: "GET",
            headers
        });
        const data = await cfHandleApiResponse(response);
        cfCommuteState.entries = data.entries || [];
        cfRenderCommuteEntries(cfCommuteState.entries);
    } catch (error) {
        container.innerHTML = `<p class='cf-empty-message'>${cfEscapeHtml(error.message || "Unable to load commute entries.")}</p>`;
    }
}

async function cfSubmitCommuteEta(event) {
    event.preventDefault();

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    const payload = {
        date: document.getElementById("cf-commute-date")?.value || "",
        expected_arrival_time: document.getElementById("cf-commute-eta")?.value || "",
        travel_mode: document.getElementById("cf-commute-mode")?.value || "",
        notes: (document.getElementById("cf-commute-notes")?.value || "").trim()
    };

    try {
        const response = await fetch(`${CF_API_BASE}/api/submit-commute-eta`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        const data = await cfHandleApiResponse(response);
        alert(data.message || "Commute ETA submitted");
        await cfFetchCommuteEntries();
    } catch (error) {
        alert(error.message || "Unable to submit commute ETA");
    }
}

function cfGetAcademicBranches() {
    return [...new Set(cfAcademicResources.map((item) => item.branch))].sort();
}

function cfGetAcademicSubjects(branch, semester) {
    return [
        ...new Set(
            cfAcademicResources
                .filter((item) => item.branch === branch && item.semester === semester)
                .map((item) => item.subject)
        )
    ].sort();
}

function cfSetAcademicStep(step) {
    cfAcademicState.step = step;
    document.querySelectorAll("[data-step-indicator]").forEach((el) => {
        const indicatorStep = Number(el.getAttribute("data-step-indicator"));
        el.classList.toggle("active", indicatorStep === step);
        el.classList.toggle("completed", indicatorStep < step);
    });
    document.querySelectorAll("[data-step-panel]").forEach((el) => {
        const panelStep = Number(el.getAttribute("data-step-panel"));
        el.classList.toggle("active", panelStep === step);
    });
}

function cfRenderAcademicResults(results) {
    const container = document.getElementById("cf-ac-results");
    if (!container) return;

    container.innerHTML = "";
    if (!results.length) {
        container.innerHTML = "<p class='cf-empty-message'>No resources found. Try another subject or keyword.</p>";
        return;
    }

    results.forEach((item) => {
        const isSaved = cfAcademicState.savedIds.includes(item.id);
        const card = document.createElement("article");
        card.className = "cf-academic-result-card";
        card.dataset.resourceId = String(item.id ?? "");
        card.innerHTML = `
            <div class="cf-academic-result-top">
                <h4>${cfEscapeHtml(item.title)}</h4>
                <span>${cfEscapeHtml(item.type)}</span>
            </div>
            <p>${cfEscapeHtml(item.summary)}</p>
            <p class="cf-academic-result-meta">
                ${cfEscapeHtml(item.branch)} | Sem ${cfEscapeHtml(item.semester)} | ${cfEscapeHtml(item.subject)}
            </p>
            <div class="cf-academic-result-actions">
                <a href="${cfEscapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open</a>
                <button type="button" class="cf-academic-save-btn">${isSaved ? "Saved" : "Save"}</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function cfRenderAcademicSaved() {
    const container = document.getElementById("cf-ac-saved-list");
    if (!container) return;

    const saved = cfAcademicResources.filter((item) => cfAcademicState.savedIds.includes(item.id));
    container.innerHTML = "";
    if (!saved.length) {
        container.innerHTML = "<p class='cf-empty-message'>No saved resources yet.</p>";
        return;
    }

    saved.forEach((item) => {
        const row = document.createElement("div");
        row.className = "cf-academic-saved-item";
        row.innerHTML = `
            <p><strong>${cfEscapeHtml(item.title)}</strong> (${cfEscapeHtml(item.type)})</p>
            <p class="cf-academic-result-meta">${cfEscapeHtml(item.subject)} | ${cfEscapeHtml(item.branch)} Sem ${cfEscapeHtml(item.semester)}</p>
        `;
        container.appendChild(row);
    });
}

function cfToggleAcademicBookmark(id) {
    if (cfAcademicState.savedIds.includes(id)) {
        cfAcademicState.savedIds = cfAcademicState.savedIds.filter((itemId) => itemId !== id);
    } else {
        cfAcademicState.savedIds = [...cfAcademicState.savedIds, id];
    }

    localStorage.setItem("cfAcademicSavedResources", JSON.stringify(cfAcademicState.savedIds));
    cfRenderAcademicResults(cfAcademicState.results);
    cfRenderAcademicSaved();
}

function cfRunAcademicSearch() {
    const branch = document.getElementById("cf-ac-branch")?.value || "";
    const semester = document.getElementById("cf-ac-semester")?.value || "";
    const subject = document.getElementById("cf-ac-subject")?.value || "";
    const query = (document.getElementById("cf-ac-query")?.value || "").trim().toLowerCase();
    const type = document.getElementById("cf-ac-type")?.value || "all";

    const results = cfAcademicResources.filter((item) => {
        const matchesCore =
            item.branch === branch &&
            item.semester === semester &&
            item.subject === subject;
        const matchesType = type === "all" || item.type === type;
        const haystack = `${item.title} ${item.summary} ${item.subject}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        return matchesCore && matchesType && matchesQuery;
    });

    cfAcademicState.results = results;
    cfRenderAcademicResults(results);
}

function cfInitAcademicDiscovery() {
    const page = document.getElementById("cf-academic-page");
    if (!page) return;

    const branchSelect = document.getElementById("cf-ac-branch");
    const semesterSelect = document.getElementById("cf-ac-semester");
    const subjectSelect = document.getElementById("cf-ac-subject");
    if (!branchSelect || !semesterSelect || !subjectSelect) return;

    const branches = cfGetAcademicBranches();
    branchSelect.innerHTML = "<option value=''>Select Branch</option>" +
        branches.map((branch) => `<option value="${cfEscapeHtml(branch)}">${cfEscapeHtml(branch)}</option>`).join("");
    subjectSelect.innerHTML = "<option value=''>Select Subject</option>";

    try {
        const saved = JSON.parse(localStorage.getItem("cfAcademicSavedResources") || "[]");
        if (Array.isArray(saved)) {
            cfAcademicState.savedIds = saved;
        }
    } catch (error) {
        cfAcademicState.savedIds = [];
    }
    cfRenderAcademicSaved();

    const updateSubjects = () => {
        const branch = branchSelect.value;
        const semester = semesterSelect.value;
        const subjects = cfGetAcademicSubjects(branch, semester);
        subjectSelect.innerHTML = "<option value=''>Select Subject</option>" +
            subjects.map((subject) => `<option value="${cfEscapeHtml(subject)}">${cfEscapeHtml(subject)}</option>`).join("");
    };

    branchSelect.addEventListener("change", updateSubjects);
    semesterSelect.addEventListener("change", updateSubjects);

    document.getElementById("cf-ac-step1-next")?.addEventListener("click", () => {
        if (!branchSelect.value || !semesterSelect.value) {
            alert("Please select branch and semester first.");
            return;
        }
        updateSubjects();
        cfSetAcademicStep(2);
    });
    document.getElementById("cf-ac-step2-back")?.addEventListener("click", () => cfSetAcademicStep(1));
    document.getElementById("cf-ac-step2-next")?.addEventListener("click", () => {
        if (!subjectSelect.value) {
            alert("Please select a subject.");
            return;
        }
        cfSetAcademicStep(3);
    });
    document.getElementById("cf-ac-step3-back")?.addEventListener("click", () => cfSetAcademicStep(2));
    document.getElementById("cf-ac-run-search")?.addEventListener("click", cfRunAcademicSearch);

    cfSetAcademicStep(1);
}

function cfRenderStudentCurrentAffairs(items) {
    const container = document.getElementById("cf-student-current-affairs");
    if (!container) return;

    container.innerHTML = "";
    if (!items.length) {
        container.innerHTML = "<p class='cf-empty-message'>No updates published yet.</p>";
        return;
    }

    items.slice(0, 8).forEach((item) => {
        const row = document.createElement("article");
        row.className = "cf-current-affair-student-item";
        row.innerHTML = `
            <h4>${cfEscapeHtml(item.title)}</h4>
            <p>${cfEscapeHtml(item.content)}</p>
            <p class="cf-current-affair-student-meta">
                <strong>Date:</strong> ${cfEscapeHtml(item.event_date)}
                ${item.category ? ` | <strong>Category:</strong> ${cfEscapeHtml(item.category)}` : ""}
            </p>
        `;
        container.appendChild(row);
    });
}

function cfRenderAdminCurrentAffairs(items) {
    const container = document.getElementById("cf-admin-current-affairs-container");
    if (!container) return;

    container.innerHTML = "";
    if (!items.length) {
        container.innerHTML = "<p class='cf-empty-message'>No current affairs added yet.</p>";
        return;
    }

    items.forEach((item) => {
        const row = document.createElement("article");
        row.className = "cf-current-affair-item";
        row.dataset.affairId = String(item.id ?? "");
        row.innerHTML = `
            <p class="cf-current-affair-meta">
                <strong>${cfEscapeHtml(item.event_date)}</strong>
                ${item.category ? ` | ${cfEscapeHtml(item.category)}` : ""}
            </p>
            <p><strong>${cfEscapeHtml(item.title)}</strong></p>
            <p>${cfEscapeHtml(item.content)}</p>
            <div class="cf-current-affair-actions">
                <button type="button" class="cf-admin-action approve" data-action="edit">Edit</button>
                <button type="button" class="cf-admin-action reject" data-action="delete">Delete</button>
            </div>
        `;
        container.appendChild(row);
    });
}

async function cfFetchCurrentAffairs() {
    const headers = cfGetAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${CF_API_BASE}/api/current-affairs`, {
            method: "GET",
            headers
        });
        const data = await cfHandleApiResponse(response);
        const items = data.items || [];
        cfCurrentAffairsState.items = items;
        cfCurrentAffairsState.byId = Object.fromEntries(items.map((item) => [item.id, item]));
        cfAdminState.currentAffairsCount = items.length;
        cfUpdateAdminStats();
        cfRenderStudentCurrentAffairs(items);
        cfRenderAdminCurrentAffairs(items);
    } catch (error) {
        const studentContainer = document.getElementById("cf-student-current-affairs");
        if (studentContainer) {
            studentContainer.innerHTML = `<p class='cf-empty-message'>${cfEscapeHtml(error.message || "Unable to load current affairs.")}</p>`;
        }
        const adminContainer = document.getElementById("cf-admin-current-affairs-container");
        if (adminContainer) {
            adminContainer.innerHTML = `<p class='cf-empty-message'>${cfEscapeHtml(error.message || "Unable to load current affairs.")}</p>`;
        }
    }
}

function cfResetCurrentAffairForm() {
    const form = document.getElementById("cf-current-affair-form");
    if (!form) return;

    form.reset();
    document.getElementById("cf-current-affair-id").value = "";
    document.getElementById("cf-current-affair-submit-btn").textContent = "Publish Update";
    document.getElementById("cf-current-affair-cancel-btn").style.display = "none";
}

function cfEditCurrentAffair(id) {
    const item = cfCurrentAffairsState.byId[id];
    if (!item) return;

    document.getElementById("cf-current-affair-id").value = item.id;
    document.getElementById("cf-current-affair-title").value = item.title || "";
    document.getElementById("cf-current-affair-date").value = item.event_date || "";
    document.getElementById("cf-current-affair-category").value = item.category || "";
    document.getElementById("cf-current-affair-content").value = item.content || "";
    document.getElementById("cf-current-affair-submit-btn").textContent = "Update Affair";
    document.getElementById("cf-current-affair-cancel-btn").style.display = "inline-block";
}

async function cfDeleteCurrentAffair(id) {
    const headers = cfGetAuthHeaders();
    if (!headers) return;

    if (!confirm("Delete this current affair update?")) return;

    try {
        const response = await fetch(`${CF_API_BASE}/api/admin/current-affairs/${id}`, {
            method: "DELETE",
            headers
        });
        await cfHandleApiResponse(response);
        await cfFetchCurrentAffairs();
        cfResetCurrentAffairForm();
    } catch (error) {
        alert(error.message || "Unable to delete current affair");
    }
}

async function cfSubmitCurrentAffair(event) {
    event.preventDefault();

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    const id = document.getElementById("cf-current-affair-id").value;
    const payload = {
        title: (document.getElementById("cf-current-affair-title").value || "").trim(),
        event_date: document.getElementById("cf-current-affair-date").value,
        category: (document.getElementById("cf-current-affair-category").value || "").trim(),
        content: (document.getElementById("cf-current-affair-content").value || "").trim()
    };

    try {
        const response = await fetch(
            id ? `${CF_API_BASE}/api/admin/current-affairs/${id}` : `${CF_API_BASE}/api/admin/current-affairs`,
            {
                method: id ? "PUT" : "POST",
                headers,
                body: JSON.stringify(payload)
            }
        );
        const data = await cfHandleApiResponse(response);
        alert(data.message || "Current affair saved");
        cfResetCurrentAffairForm();
        await cfFetchCurrentAffairs();
    } catch (error) {
        alert(error.message || "Unable to save current affair");
    }
}

async function cfMarkCommuteArrived(id) {
    const headers = cfGetAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${CF_API_BASE}/api/mark-commute-arrived`, {
            method: "POST",
            headers,
            body: JSON.stringify({ id })
        });
        const data = await cfHandleApiResponse(response);
        alert(data.message || "Commute arrival marked");
        await cfFetchCommuteEntries();
    } catch (error) {
        alert(error.message || "Unable to mark commute arrival");
    }
}

async function cfFetchStudentBookings() {
    const container = document.getElementById("cf-booking-list-container");
    if (!container) return;

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${CF_API_BASE}/api/get-bookings`, {
            method: "GET",
            headers
        });
        const data = await cfHandleApiResponse(response);
        cfStudentBookingState.allBookings = data.bookings || [];
        cfUpdateStudentSummary(cfStudentBookingState.allBookings);
        cfApplyStudentBookingTools();
    } catch (error) {
        container.innerHTML = `<p class='cf-empty-message'>${cfEscapeHtml(error.message || "Unable to load bookings.")}</p>`;
    }
}

async function cfFetchAdminBookings() {
    const container = document.getElementById("cf-admin-booking-container");
    if (!container) return;

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(`${CF_API_BASE}/api/get-all-bookings`, {
            method: "GET",
            headers
        });
        const data = await cfHandleApiResponse(response);
        const bookings = data.bookings || [];
        const alerts = data.safety_alerts || [];
        cfAdminState.bookingsCount = bookings.length;
        cfAdminState.bookingAlertsCount = alerts.length;
        cfUpdateAdminStats();
        const alertContainer = document.getElementById("cf-admin-alert-container");

        if (alertContainer) {
            alertContainer.innerHTML = "";
            if (!alerts.length) {
                alertContainer.innerHTML = "<p class='cf-empty-message'>No pending safety alerts.</p>";
            } else {
                alerts.forEach((alertItem) => {
                    const alertRow = document.createElement("div");
                    alertRow.className = "cf-safety-alert-item";
                    alertRow.innerHTML = `
                        <p><strong>Student:</strong> ${cfEscapeHtml(alertItem.user)}</p>
                        <p><strong>Room:</strong> ${cfEscapeHtml(alertItem.room)} | <strong>Date:</strong> ${cfEscapeHtml(alertItem.date)} | <strong>Expected Arrival:</strong> ${cfEscapeHtml(alertItem.expected_arrival_time)}</p>
                        <p><strong>Alert:</strong> ${cfEscapeHtml(alertItem.message)}</p>
                    `;
                    alertContainer.appendChild(alertRow);
                });
            }
        }

        container.innerHTML = "";
        if (!bookings.length) {
            container.innerHTML = "<p class='cf-empty-message'>No bookings found.</p>";
            return;
        }

        bookings.forEach((booking) => {
            const row = document.createElement("div");
            row.className = "cf-booking-item";
            row.dataset.status = (booking.status || "").toLowerCase();
            row.dataset.bookingId = String(booking.id ?? "");
            if (booking.safety_alert) {
                row.classList.add("cf-booking-alert");
            }
            const bookingStatus = (booking.status || "").toLowerCase();
            let actionButtons = [];
            if (bookingStatus === "pending") {
                actionButtons = ["approve", "reject"];
            } else if (bookingStatus === "approved") {
                actionButtons = ["reject"];
            } else if (bookingStatus === "rejected") {
                actionButtons = ["approve"];
            }
            const actionButtonsHtml = actionButtons
                .map((action) => `<button type="button" class="cf-admin-action ${action}" data-action="${action}">${action === "approve" ? "Approve" : "Reject"}</button>`)
                .join("");
            row.innerHTML = `
                <p><strong>Room:</strong> ${cfEscapeHtml(booking.room)} | <strong>Date:</strong> ${cfEscapeHtml(booking.date)} | <strong>Time:</strong> ${cfEscapeHtml(booking.start_time)} - ${cfEscapeHtml(booking.end_time)}</p>
                <p><strong>User:</strong> ${cfEscapeHtml(booking.user)} | <strong>Purpose:</strong> ${cfEscapeHtml(booking.purpose)} | <strong>Status:</strong> ${cfEscapeHtml(booking.status)}</p>
                <p><strong>Expected Arrival:</strong> ${cfEscapeHtml(booking.expected_arrival_time || "Not set")} | <strong>Arrival:</strong> ${booking.has_arrived ? "Arrived" : "Not Marked"}</p>
                ${booking.safety_alert ? `<p class="cf-admin-alert-inline">${cfEscapeHtml(booking.safety_alert_message)}</p>` : ""}
                ${actionButtonsHtml}
            `;
            container.appendChild(row);
        });
    } catch (error) {
        container.innerHTML = `<p class='cf-empty-message'>${cfEscapeHtml(error.message || "Unable to load admin bookings.")}</p>`;
    }
}

async function cfFetchAdminCommuteAlerts() {
    const alertContainer = document.getElementById("cf-admin-commute-alert-container");
    if (!alertContainer) return;

    const headers = cfGetAuthHeaders();
    if (!headers) return;

    alertContainer.innerHTML = "<p class='cf-empty-message'>Loading commute alerts...</p>";

    try {
        const response = await fetch(`${CF_API_BASE}/api/get-admin-commute-alerts`, {
            method: "GET",
            headers
        });
        const data = await cfHandleApiResponse(response);
        const alerts = data.alerts || [];
        cfAdminState.commuteAlertsCount = alerts.length;
        cfUpdateAdminStats();

        alertContainer.innerHTML = "";
        if (!alerts.length) {
            alertContainer.innerHTML = "<p class='cf-empty-message'>No pending commute alerts.</p>";
            return;
        }

        alerts.forEach((entry) => {
            const row = document.createElement("div");
            row.className = "cf-safety-alert-item";
            row.innerHTML = `
                <p><strong>Student:</strong> ${cfEscapeHtml(entry.user)}</p>
                <p><strong>Date:</strong> ${cfEscapeHtml(entry.date)} | <strong>ETA:</strong> ${cfEscapeHtml(entry.expected_arrival_time)}</p>
                <p><strong>Mode:</strong> ${cfEscapeHtml(entry.travel_mode || "Not specified")}</p>
                <p><strong>Alert:</strong> ${cfEscapeHtml(entry.alert_message)}</p>
            `;
            alertContainer.appendChild(row);
        });
    } catch (error) {
        alertContainer.innerHTML = `<p class='cf-empty-message'>${cfEscapeHtml(error.message || "Unable to load commute alerts.")}</p>`;
    }
}

async function cfUpdateBookingStatus(id, endpoint) {
    const headers = cfGetAuthHeaders();
    if (!headers) return;

    const response = await fetch(`${CF_API_BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id })
    });
    await cfHandleApiResponse(response);
    await Promise.all([cfFetchAdminBookings(), cfFetchAdminCommuteAlerts()]);
}

async function cfApproveBooking(id) {
    try {
        await cfUpdateBookingStatus(id, "/api/approve");
    } catch (error) {
        alert(error.message || "Unable to approve booking");
    }
}

async function cfRejectBooking(id) {
    try {
        await cfUpdateBookingStatus(id, "/api/reject");
    } catch (error) {
        alert(error.message || "Unable to reject booking");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cfInitActionDelegates();

    const token = localStorage.getItem("cfFirebaseIdToken");
    const isProtectedPage =
        !!document.getElementById("cf-booking-form") ||
        !!document.getElementById("cf-food-review-form") ||
        !!document.getElementById("cf-commute-form") ||
        !!document.getElementById("cf-academic-page") ||
        !!document.getElementById("cf-note-form") ||
        !!document.getElementById("cf-admin-booking-container") ||
        !!document.getElementById("cf-student-home") ||
        !!document.getElementById("cf-room-booking-page") ||
        !!document.getElementById("cf-food-review-page") ||
        !!document.getElementById("cf-commute-page");
    if (isProtectedPage && !token) {
        window.location.href = "index.html";
        return;
    }

    const bookingForm = document.getElementById("cf-booking-form");
    if (bookingForm) {
        bookingForm.addEventListener("submit", cfCreateBooking);
        document.getElementById("cf-booking-search")?.addEventListener("input", cfApplyStudentBookingTools);
        document.getElementById("cf-booking-status-filter")?.addEventListener("change", cfApplyStudentBookingTools);
        document.getElementById("cf-booking-sort")?.addEventListener("change", cfApplyStudentBookingTools);
        document.getElementById("cf-export-bookings-btn")?.addEventListener("click", cfDownloadStudentBookingsCsv);
        cfFetchStudentBookings();
    }

    const foodReviewForm = document.getElementById("cf-food-review-form");
    if (foodReviewForm) {
        const currentWeek = cfGetCurrentIsoWeek();
        const reviewWeekInput = document.getElementById("cf-food-review-week");
        const summaryWeekInput = document.getElementById("cf-food-summary-week");

        if (reviewWeekInput) reviewWeekInput.value = currentWeek;
        if (summaryWeekInput) summaryWeekInput.value = currentWeek;

        foodReviewForm.addEventListener("submit", cfSubmitFoodReview);
        document.getElementById("cf-food-refresh-btn")?.addEventListener("click", cfFetchFoodReviewSummary);
        cfFetchFoodReviewSummary();
    }

    const commuteForm = document.getElementById("cf-commute-form");
    if (commuteForm) {
        const dateInput = document.getElementById("cf-commute-date");
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split("T")[0];
        }
        commuteForm.addEventListener("submit", cfSubmitCommuteEta);
        cfFetchCommuteEntries();
    }

    cfInitAcademicDiscovery();

    if (document.getElementById("cf-admin-booking-container")) {
        Promise.all([cfFetchAdminBookings(), cfFetchAdminCommuteAlerts(), cfFetchCurrentAffairs()]);
        document.getElementById("cf-admin-refresh-btn")?.addEventListener("click", () => {
            Promise.all([cfFetchAdminBookings(), cfFetchAdminCommuteAlerts(), cfFetchCurrentAffairs()]);
        });
    }

    if (document.getElementById("cf-student-current-affairs")) {
        cfFetchCurrentAffairs();
    }

    cfInitNoteBoard();

    const currentAffairForm = document.getElementById("cf-current-affair-form");
    if (currentAffairForm) {
        currentAffairForm.addEventListener("submit", cfSubmitCurrentAffair);
        document.getElementById("cf-current-affair-cancel-btn")?.addEventListener("click", cfResetCurrentAffairForm);
        if (!document.getElementById("cf-admin-booking-container")) {
            cfFetchCurrentAffairs();
        }
    }
});

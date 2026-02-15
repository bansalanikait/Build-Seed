const CF_API_BASE = "http://127.0.0.1:5000";
const cfStudentBookingState = {
    allBookings: [],
    visibleBookings: []
};

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
        purpose: document.getElementById("cf-input-purpose").value.trim()
    };

    if (payload.start_time >= payload.end_time) {
        alert("End time must be greater than start time.");
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
        item.innerHTML = `
            <p><strong>Room:</strong> ${booking.room}</p>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time} (${cfGetBookingDurationLabel(booking.start_time, booking.end_time)})</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
        `;
        container.appendChild(item);
    });
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
        container.innerHTML = `<p class='cf-empty-message'>${error.message}</p>`;
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

        container.innerHTML = "";
        if (!bookings.length) {
            container.innerHTML = "<p class='cf-empty-message'>No bookings found.</p>";
            return;
        }

        bookings.forEach((booking) => {
            const row = document.createElement("div");
            row.className = "cf-booking-item";
            row.dataset.status = (booking.status || "").toLowerCase();
            row.innerHTML = `
                <p><strong>Room:</strong> ${booking.room} | <strong>Date:</strong> ${booking.date} | <strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                <p><strong>User:</strong> ${booking.user} | <strong>Purpose:</strong> ${booking.purpose} | <strong>Status:</strong> ${booking.status}</p>
                <button class="cf-admin-action approve" onclick="cfApproveBooking('${booking.id}')">Approve</button>
                <button class="cf-admin-action reject" onclick="cfRejectBooking('${booking.id}')">Reject</button>
            `;
            container.appendChild(row);
        });
    } catch (error) {
        container.innerHTML = `<p class='cf-empty-message'>${error.message}</p>`;
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
    await cfFetchAdminBookings();
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
    const token = localStorage.getItem("cfFirebaseIdToken");
    const isDashboardPage = !!document.getElementById("cf-booking-form") || !!document.getElementById("cf-admin-booking-container");
    if (isDashboardPage && !token) {
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

    if (document.getElementById("cf-admin-booking-container")) {
        cfFetchAdminBookings();
    }
});

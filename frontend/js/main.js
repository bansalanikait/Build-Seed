const CF_API_BASE = "http://127.0.0.1:5000";

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
        await cfFetchStudentBookings();
    } catch (error) {
        alert(error.message || "Unable to submit booking");
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
        const bookings = data.bookings || [];

        container.innerHTML = "";
        if (!bookings.length) {
            container.innerHTML = "<p class='cf-empty-message'>No bookings yet.</p>";
            return;
        }

        bookings.forEach((booking) => {
            const item = document.createElement("div");
            item.className = "cf-booking-item";
            item.dataset.status = (booking.status || "").toLowerCase();
            item.innerHTML = `
                <p><strong>Room:</strong> ${booking.room}</p>
                <p><strong>Date:</strong> ${booking.date}</p>
                <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                <p><strong>Purpose:</strong> ${booking.purpose}</p>
                <p><strong>Status:</strong> ${booking.status}</p>
            `;
            container.appendChild(item);
        });
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
        cfFetchStudentBookings();
    }

    if (document.getElementById("cf-admin-booking-container")) {
        cfFetchAdminBookings();
    }
});

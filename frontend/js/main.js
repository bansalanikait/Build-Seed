// STUDENT BOOKING

const cfElBookingForm = document.getElementById("cf-booking-form");

if (cfElBookingForm) {
    cfElBookingForm.addEventListener("submit", async function (cfEventBooking) {
        cfEventBooking.preventDefault();

        const cfRoomValue = document.getElementById("cf-input-room").value;
        const cfDateValue = document.getElementById("cf-input-date").value;
        const cfStartTimeValue = document.getElementById("cf-input-start-time").value;
        const cfEndTimeValue = document.getElementById("cf-input-end-time").value;

        try {
            const cfBookingResponse = await fetch("http://127.0.0.1:5000/api/create-booking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cfRoomNumber: cfRoomValue,
                    cfBookingDate: cfDateValue,
                    cfBookingStartTime: cfStartTimeValue,
                    cfBookingEndTime: cfEndTimeValue
                })
            });

            const cfBookingResponseData = await cfBookingResponse.json();

            if (cfBookingResponseData.cfBookingStatus === "created") {
                alert("Booking Submitted!");
                cfFetchStudentBookings();
            } else {
                alert("Conflict Detected!");
            }

        } catch (cfBookingError) {
            console.error("Booking Error:", cfBookingError);
        }
    });
}


// FETCH STUDENT BOOKINGS
async function cfFetchStudentBookings() {
    try {
        const cfFetchResponse = await fetch("http://127.0.0.1:5000/api/get-bookings");
        const cfFetchResponseData = await cfFetchResponse.json();

        const cfElBookingContainer = document.getElementById("cf-booking-list-container");

        if (cfElBookingContainer) {
            cfElBookingContainer.innerHTML = "";

            cfFetchResponseData.cfBookingList.forEach(function (cfSingleBookingItem) {
                const cfBookingDiv = document.createElement("div");
                cfBookingDiv.innerHTML = `
                    <p>
                        Room: ${cfSingleBookingItem.cfRoomNumber} |
                        Date: ${cfSingleBookingItem.cfBookingDate} |
                        Status: ${cfSingleBookingItem.cfBookingStatus}
                    </p>
                `;
                cfElBookingContainer.appendChild(cfBookingDiv);
            });
        }

    } catch (cfFetchError) {
        console.error("Fetch Error:", cfFetchError);
    }
}


// ADMIN FETCH
async function cfFetchAdminBookings() {
    try {
        const cfAdminResponse = await fetch("http://127.0.0.1:5000/api/get-all-bookings");
        const cfAdminData = await cfAdminResponse.json();

        const cfElAdminContainer = document.getElementById("cf-admin-booking-container");

        if (cfElAdminContainer) {
            cfElAdminContainer.innerHTML = "";

            cfAdminData.cfBookingList.forEach(function (cfAdminBookingItem) {
                const cfAdminDiv = document.createElement("div");
                cfAdminDiv.innerHTML = `
                    <p>
                        Room: ${cfAdminBookingItem.cfRoomNumber} |
                        Date: ${cfAdminBookingItem.cfBookingDate} |
                        Status: ${cfAdminBookingItem.cfBookingStatus}
                        <button onclick="cfApproveBooking(${cfAdminBookingItem.cfBookingId})">Approve</button>
                        <button onclick="cfRejectBooking(${cfAdminBookingItem.cfBookingId})">Reject</button>
                    </p>
                `;
                cfElAdminContainer.appendChild(cfAdminDiv);
            });
        }

    } catch (cfAdminError) {
        console.error("Admin Fetch Error:", cfAdminError);
    }
}


// APPROVE
async function cfApproveBooking(cfBookingIdValue) {
    await fetch(`http://127.0.0.1:5000/api/approve/${cfBookingIdValue}`);
    cfFetchAdminBookings();
}


// REJECT
async function cfRejectBooking(cfBookingIdValue) {
    await fetch(`http://127.0.0.1:5000/api/reject/${cfBookingIdValue}`);
    cfFetchAdminBookings();
}


// AUTO LOAD
document.addEventListener("DOMContentLoaded", function () {
    cfFetchStudentBookings();
    cfFetchAdminBookings();
});


// ===============================
// DARK / LIGHT MODE TOGGLE
// ===============================

function cfToggleTheme() {
    const body = document.body;
    const toggleBtn = document.querySelector(".cf-theme-toggle");

    body.classList.toggle("cf-dark");

    if (body.classList.contains("cf-dark")) {
        localStorage.setItem("cf-theme", "dark");
        if (toggleBtn) toggleBtn.innerText = "☀️ Light Mode";
    } else {
        localStorage.setItem("cf-theme", "light");
        if (toggleBtn) toggleBtn.innerText = "🌙 Dark Mode";
    }
}

// ===============================
// LOAD SAVED THEME ON PAGE LOAD
// ===============================
(function () {
    const savedTheme = localStorage.getItem("cf-theme");
    const toggleBtn = document.querySelector(".cf-theme-toggle");

    if (savedTheme === "dark") {
        document.body.classList.add("cf-dark");
        if (toggleBtn) toggleBtn.innerText = "☀️ Light Mode";
    }
})();

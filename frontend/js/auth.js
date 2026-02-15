/*************************************************
    CampusFlow Firebase Authentication
*************************************************/

const cfElLoginForm = document.getElementById("cf-login-form");

if (cfElLoginForm) {

    cfElLoginForm.addEventListener("submit", async function (cfEventLoginSubmit) {

        cfEventLoginSubmit.preventDefault();

        const cfInputEmailValue = document.getElementById("cf-input-email").value;
        const cfInputPasswordValue = document.getElementById("cf-input-password").value;
        const cfElErrorMessage = document.getElementById("cf-login-error");

        try {

            const cfUserCredential = await cfFirebaseAuth.signInWithEmailAndPassword(
                cfInputEmailValue,
                cfInputPasswordValue
            );

            const cfLoggedInUser = cfUserCredential.user;

            // Get Firebase ID Token
            const cfUserIdToken = await cfLoggedInUser.getIdToken();

            // Store token in localStorage
            localStorage.setItem("cfFirebaseIdToken", cfUserIdToken);

            // Simple Role Logic (Hackathon Shortcut)
            if (cfInputEmailValue.includes("admin")) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "student.html";
            }

        } catch (cfLoginError) {

            console.error("Firebase Login Error:", cfLoginError);
            cfElErrorMessage.innerText = cfLoginError.message;

        }

    });
}
async function cfHandleLogout() {

    try {
        await cfFirebaseAuth.signOut();
        localStorage.removeItem("cfFirebaseIdToken");
        window.location.href = "index.html";
    } catch (cfLogoutError) {
        console.error("Logout Error:", cfLogoutError);
    }
}

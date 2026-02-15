/*************************************************
    CampusFlow Firebase Authentication
*************************************************/

const cfElTabLogin = document.getElementById("cf-tab-login");
const cfElTabSignup = document.getElementById("cf-tab-signup");
const cfElLoginPanel = document.getElementById("cf-login-panel");
const cfElSignupPanel = document.getElementById("cf-signup-panel");

function cfSetAuthTab(tabName) {
    if (!cfElTabLogin || !cfElTabSignup || !cfElLoginPanel || !cfElSignupPanel) return;

    const isLoginTab = tabName === "login";
    cfElTabLogin.classList.toggle("active", isLoginTab);
    cfElTabSignup.classList.toggle("active", !isLoginTab);
    cfElLoginPanel.classList.toggle("active", isLoginTab);
    cfElSignupPanel.classList.toggle("active", !isLoginTab);
}

if (cfElTabLogin && cfElTabSignup) {
    cfElTabLogin.addEventListener("click", () => cfSetAuthTab("login"));
    cfElTabSignup.addEventListener("click", () => cfSetAuthTab("signup"));
}

async function cfHandlePostAuthRedirect(email) {
    const currentUser = cfFirebaseAuth.currentUser;
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    localStorage.setItem("cfFirebaseIdToken", token);

    if ((email || "").toLowerCase().includes("admin")) {
        window.location.href = "admin.html";
    } else {
        window.location.href = "student.html";
    }
}

const cfIsAuthScreen = !!document.getElementById("cf-login-form") || !!document.getElementById("cf-signup-form");
if (cfIsAuthScreen) {
    cfFirebaseAuth.onAuthStateChanged(async (cfUser) => {
        if (!cfUser) return;
        await cfHandlePostAuthRedirect(cfUser.email || "");
    });
}

const cfElLoginForm = document.getElementById("cf-login-form");

if (cfElLoginForm) {

    cfElLoginForm.addEventListener("submit", async function (cfEventLoginSubmit) {

        cfEventLoginSubmit.preventDefault();

        const cfInputEmailValue = document.getElementById("cf-input-email").value;
        const cfInputPasswordValue = document.getElementById("cf-input-password").value;
        const cfElErrorMessage = document.getElementById("cf-login-error");
        cfElErrorMessage.innerText = "";

        try {

            await cfFirebaseAuth.signInWithEmailAndPassword(
                cfInputEmailValue,
                cfInputPasswordValue
            );
            await cfHandlePostAuthRedirect(cfInputEmailValue);

        } catch (cfLoginError) {

            console.error("Firebase Login Error:", cfLoginError);
            cfElErrorMessage.innerText = cfLoginError.message;

        }

    });
}

const cfElSignupForm = document.getElementById("cf-signup-form");

if (cfElSignupForm) {
    cfElSignupForm.addEventListener("submit", async function (cfEventSignupSubmit) {
        cfEventSignupSubmit.preventDefault();

        const cfInputNameValue = document.getElementById("cf-signup-name").value.trim();
        const cfInputEmailValue = document.getElementById("cf-signup-email").value.trim();
        const cfInputPasswordValue = document.getElementById("cf-signup-password").value;
        const cfInputConfirmPasswordValue = document.getElementById("cf-signup-confirm-password").value;
        const cfElSignupError = document.getElementById("cf-signup-error");

        cfElSignupError.innerText = "";
        if (cfInputPasswordValue !== cfInputConfirmPasswordValue) {
            cfElSignupError.innerText = "Passwords do not match.";
            return;
        }
        if (cfInputPasswordValue.length < 6) {
            cfElSignupError.innerText = "Password must be at least 6 characters.";
            return;
        }

        try {
            const cfUserCredential = await cfFirebaseAuth.createUserWithEmailAndPassword(
                cfInputEmailValue,
                cfInputPasswordValue
            );

            if (cfUserCredential.user && cfInputNameValue) {
                await cfUserCredential.user.updateProfile({ displayName: cfInputNameValue });
            }

            await cfHandlePostAuthRedirect(cfInputEmailValue);
        } catch (cfSignupError) {
            console.error("Firebase Signup Error:", cfSignupError);
            cfElSignupError.innerText = cfSignupError.message;
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

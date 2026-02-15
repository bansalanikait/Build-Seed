/*************************************************
    CampusFlow Firebase Authentication
*************************************************/
function cfResolveAuthApiBase() {
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

const CF_AUTH_API_BASE = cfResolveAuthApiBase();

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

async function cfHandlePostAuthRedirect() {
    const currentUser = cfFirebaseAuth.currentUser;
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    localStorage.setItem("cfFirebaseIdToken", token);

    const isAdmin = await cfResolveIsAdmin(token);
    if (isAdmin) {
        window.location.href = "admin.html";
    } else {
        window.location.href = "student.html";
    }
}

async function cfResolveIsAdmin(token) {
    try {
        const response = await fetch(`${CF_AUTH_API_BASE}/api/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            return Boolean(data.is_admin);
        }
    } catch (error) {
        // Fall through to local claim fallback if backend check is unavailable.
    }

    try {
        const tokenResult = await cfFirebaseAuth.currentUser?.getIdTokenResult();
        return Boolean(tokenResult?.claims?.admin);
    } catch (error) {
        return false;
    }
}

const cfIsAuthScreen = !!document.getElementById("cf-login-form") || !!document.getElementById("cf-signup-form");
if (cfIsAuthScreen) {
    cfFirebaseAuth.onAuthStateChanged(async (cfUser) => {
        if (!cfUser) return;
        await cfHandlePostAuthRedirect();
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
            await cfHandlePostAuthRedirect();

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

            await cfHandlePostAuthRedirect();
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

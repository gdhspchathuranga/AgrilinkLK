// frontend/js/auth.js
(function () {
    "use strict";

    // When the pages are opened with Live Server or as files, call the backend on port 5000.
    // When Express serves the frontend (or in production), use the same origin.
    const isLocalDev =
        location.protocol === "file:" ||
        (["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "5000");
    const API_BASE = isLocalDev ? "http://localhost:5000" : "";
    const apiUrl = `${API_BASE}/api/auth`;

    const dashboards = {
        farmer: "farmer-dashboard.html",
        buyer: "buyer-dashboard.html",
        admin: "admin-dashboard.html"
    };

    // Show a message in the page (falls back to alert if the page has no message line)
    function showMessage(text, type) {
        const box = document.getElementById("formMessage");
        if (!box) return alert(text);
        box.textContent = text;
        box.classList.toggle("ok", type === "ok");
    }

    function setBusy(form, busy, label) {
        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;
        if (busy) {
            btn.dataset.label = btn.textContent;
            btn.textContent = label;
        } else if (btn.dataset.label) {
            btn.textContent = btn.dataset.label;
        }
        btn.disabled = busy;
    }

    async function postJson(path, data) {
        const res = await fetch(`${apiUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json().catch(() => ({}));
        return { res, result };
    }

    // ---------- Register ----------
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const FullName = document.getElementById("fullname").value.trim();
            const Email = document.getElementById("email").value.trim();
            const Password = document.getElementById("password").value; // do not trim passwords
            const Role = document.getElementById("role").value;
            const Phone = document.getElementById("phone").value.trim();
            const District = document.getElementById("district").value.trim();

            if (!FullName || !Email || !Password || !Role || !Phone || !District) {
                return showMessage("Please fill in all fields.");
            }

            setBusy(registerForm, true, "Creating account...");
            try {
                const { res, result } = await postJson("/register", {
                    FullName, Email, Password, Role, Phone, District
                });

                if (res.ok) {
                    window.location.href = "login.html?registered=1";
                } else {
                    showMessage(result.message || "Registration failed. Please try again.");
                }
            } catch (err) {
                console.error("Registration error:", err.message);
                showMessage("Could not reach the server. Please try again.");
            } finally {
                setBusy(registerForm, false);
            }
        });
    }

    // ---------- Login ----------
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const Email = document.getElementById("email").value.trim();
            const Password = document.getElementById("password").value;

            if (!Email || !Password) {
                return showMessage("Please enter your email and password.");
            }

            setBusy(loginForm, true, "Logging in...");
            try {
                const { res, result } = await postJson("/login", { Email, Password });

                if (!res.ok) {
                    return showMessage(result.message || "Login failed. Check your details and try again.");
                }

                // The role may come back as "Farmer" or "farmer", so normalise it
                const role = String(result.role || "").toLowerCase();
                const target = dashboards[role];

                if (!result.token || !target) {
                    return showMessage("Login worked, but your account type was not recognised.");
                }

                localStorage.setItem("token", result.token);
                localStorage.setItem("role", role);
                if (result.user && result.user.name) localStorage.setItem("name", result.user.name);
                window.location.href = target;
            } catch (err) {
                console.error("Login error:", err.message);
                showMessage("Could not reach the server. Please try again.");
            } finally {
                setBusy(loginForm, false);
            }
        });
    }
})();

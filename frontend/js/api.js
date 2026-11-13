// frontend/js/api.js  (load this before any dashboard script)
(function () {
    "use strict";

    // Live Server / file:// -> backend on port 5000. Express-served or deployed -> same origin.
    const isLocalDev =
        location.protocol === "file:" ||
        (["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "5000");
    const API_BASE = isLocalDev ? "http://localhost:5000" : "";
    const LOGIN_PAGE = "login.html";

    function clearSession() {
        ["token", "role", "name", "user"].forEach((k) => localStorage.removeItem(k));
    }

    function logout() {
        clearSession();
        window.location.href = LOGIN_PAGE;
    }

    // Returns true if the visitor is logged in with the given role, otherwise sends them to login
    function requireRole(role) {
        const token = localStorage.getItem("token");
        const current = (localStorage.getItem("role") || "").toLowerCase();
        if (!token || current !== role) {
            window.location.replace(LOGIN_PAGE);
            return false;
        }
        return true;
    }

    // Calls the backend with the saved token. Throws an Error with a readable message on failure.
    async function request(path, options = {}) {
        // FormData (file uploads) sets its own Content-Type, so only JSON bodies get the header
        const isForm = options.body instanceof FormData;
        const headers = isForm ? {} : { "Content-Type": "application/json" };
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;

        let res;
        try {
            res = await fetch(API_BASE + path, {
                method: options.method || "GET",
                headers,
                body: !options.body ? undefined : isForm ? options.body : JSON.stringify(options.body)
            });
        } catch (e) {
            throw new Error("Could not reach the server. Please try again.");
        }

        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
            clearSession();
            window.location.replace(LOGIN_PAGE);
            throw new Error(data.message || "Please log in again.");
        }
        if (!res.ok) throw new Error(data.message || "Something went wrong.");
        return data;
    }

    // Escape text before putting it into innerHTML
    function esc(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
        );
    }

    // Full URL for an uploaded file such as "/uploads/abc.jpg"
    function assetUrl(path) {
        if (!path) return "";
        return /^https?:/.test(path) ? path : API_BASE + path;
    }

    // Make Chart.js use the same font as the page
    if (window.Chart) Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

    window.Api = { API_BASE, request, requireRole, logout, clearSession, esc, assetUrl };
})();

// frontend/js/site.js  (public pages; load after api.js and ui.js)
(function () {
    "use strict";

    const header = document.querySelector(".site-header");
    const auth = document.getElementById("navAuth");
    const session = Api.session();

    // Header buttons depend on whether the visitor is logged in
    if (auth) {
        auth.innerHTML = session
            ? `<a class="btn btn-primary btn-sm" href="${Api.dashboardFor(session.role)}">My dashboard</a>
               <button class="btn btn-ghost btn-sm" type="button" id="navLogout">Log out</button>`
            : `<a class="btn btn-ghost btn-sm" href="login.html">Log in</a>
               <a class="btn btn-primary btn-sm" href="register.html">Register</a>`;
        const out = document.getElementById("navLogout");
        if (out) out.addEventListener("click", Api.logout);
    }

    // Footer account links
    document.querySelectorAll("[data-account-link]").forEach((a) => {
        a.href = session ? Api.dashboardFor(session.role) : "login.html";
        a.textContent = session ? "My dashboard" : "Login";
    });

    // Mobile menu
    const toggle = document.getElementById("navToggle");
    if (toggle && header) {
        toggle.addEventListener("click", () => {
            const open = header.classList.toggle("open");
            toggle.setAttribute("aria-expanded", open);
        });
        header.addEventListener("click", (e) => {
            if (e.target.closest(".nav-links a")) {
                header.classList.remove("open");
                toggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    // Header border once the page is scrolled
    if (header) {
        const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
})();

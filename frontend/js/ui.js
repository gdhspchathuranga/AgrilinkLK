// frontend/js/ui.js  (load after api.js)
(function () {
    "use strict";

    const ICONS = {
        leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
        home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
        bag: '<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 016 0"/>',
        store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/>',
        users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M18 14.8c2 .6 3.4 2.3 3.7 5.2"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 4-6 8-6s7.3 2 8 6"/>',
        logout: '<path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4"/><path d="M20 12H9"/>',
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
        tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
        truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h5l3 3v4h-8"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
        phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
        pin: '<path d="M12 21s7-6 7-11a7 7 0 00-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'
    };

    const DISTRICTS = [
        "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota",
        "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara",
        "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
    ];

    const COLORS = ["#15803d", "#f59e0b", "#0f3d24", "#22c55e", "#fcd34d", "#86efac", "#14532d", "#65a30d"];

    function icon(name, size) {
        const s = size || 20;
        return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
    }

    const money = (n) => "Rs. " + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const date = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");
    const statusOf = (o) => String(o.status || "pending").toLowerCase();

    function toast(text, type) {
        let t = document.getElementById("toast");
        if (!t) {
            t = document.createElement("div");
            t.id = "toast";
            t.setAttribute("role", "status");
            document.body.appendChild(t);
        }
        t.className = "toast" + (type === "error" ? " error" : "");
        t.textContent = text;
        t.hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => (t.hidden = true), 3400);
    }

    const statusBadge = (s) => `<span class="badge st-${Api.esc(s)}">${Api.esc(s)}</span>`;

    // Small product picture with a leaf fallback (used in tables)
    function thumb(path, name) {
        return path
            ? `<img class="thumb" src="${Api.esc(Api.assetUrl(path))}" alt="${Api.esc(name)}" onerror="this.outerHTML='<span class=&quot;thumb&quot;>${icon("leaf", 22).replace(/"/g, "&quot;")}</span>'">`
            : `<span class="thumb">${icon("leaf", 22)}</span>`;
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms || 200); };
    }

    // Draws (or redraws) a Chart.js chart. "store" is an object that remembers the chart instances.
    function drawChart(store, id, config) {
        if (typeof Chart === "undefined") return;
        Chart.defaults.font.family = '"Inter","Segoe UI",sans-serif';
        Chart.defaults.color = "#5b6b61";
        if (store[id]) store[id].destroy();
        store[id] = new Chart(document.getElementById(id), config);
    }

    window.UI = { icon, money, date, statusOf, statusBadge, toast, thumb, debounce, drawChart, COLORS, DISTRICTS };
})();

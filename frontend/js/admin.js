// frontend/js/admin.js  (needs js/api.js and Chart.js loaded first)
(function () {
    "use strict";

    if (!Api.requireRole("admin")) return;

    const $ = (id) => document.getElementById(id);
    const esc = Api.esc;
    const COLORS = ["#0b2a2a", "#8fe3c0", "#ff8a3d", "#c9dcf5", "#12403f", "#ffd0ac"];
    const money = (n) => "Rs. " + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const date = (d) => new Date(d).toLocaleDateString();
    const status = (o) => String(o.status || "pending").toLowerCase();

    let users = [];
    const charts = {};

    function toast(text) {
        const t = $("toast");
        t.textContent = text;
        t.hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => (t.hidden = true), 3200);
    }

    function thumb(path, name) {
        return path
            ? `<img class="thumb" src="${esc(Api.assetUrl(path))}" alt="${esc(name)}" onerror="this.remove()">`
            : '<span class="thumb" aria-hidden="true">&#127806;</span>';
    }

    function drawChart(id, config) {
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart($(id), config);
    }

    // ---------- Stats and charts ----------
    async function loadStats() {
        try {
            const s = await Api.request("/api/admin/stats");
            const totalUsers = s.users.farmer + s.users.buyer + s.users.admin;
            const totalOrders = Object.values(s.orders).reduce((a, b) => a + b, 0);

            $("statUsers").textContent = totalUsers;
            $("statUsersSub").textContent = `Users (${s.users.farmer} farmers, ${s.users.buyer} buyers)`;
            $("statProducts").textContent = s.products;
            $("statOrders").textContent = totalOrders;
            $("statOrdersSub").textContent = `Orders (${s.orders.delivered} delivered)`;
            $("statRevenue").textContent = money(s.revenue);
            $("statPending").textContent = s.orders.pending;

            if (typeof Chart === "undefined") return;

            drawChart("chartOrders", {
                type: "doughnut",
                data: { labels: Object.keys(s.orders), datasets: [{ data: Object.values(s.orders), backgroundColor: COLORS, borderWidth: 2, borderColor: "#fff" }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom" } } }
            });
            drawChart("chartUsers", {
                type: "doughnut",
                data: { labels: Object.keys(s.users), datasets: [{ data: Object.values(s.users), backgroundColor: ["#ff8a3d", "#8fe3c0", "#0b2a2a"], borderWidth: 2, borderColor: "#fff" }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom" } } }
            });
            drawChart("chartRevenue", {
                type: "bar",
                data: { labels: s.monthly.map((m) => m.month), datasets: [{ label: "Revenue (Rs.)", data: s.monthly.map((m) => m.revenue), backgroundColor: "#12403f", borderRadius: 8 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            });
        } catch (err) { toast(err.message); }
    }

    // ---------- Users ----------
    function renderUsers() {
        const q = $("userSearch").value.trim().toLowerCase();
        const role = $("roleFilter").value;
        const list = users.filter((u) =>
            [u.name, u.email, u.district].join(" ").toLowerCase().includes(q) && (!role || u.role === role)
        );
        const box = $("userTable");
        if (!list.length) {
            box.innerHTML = '<p class="empty">No users match.</p>';
            return;
        }
        $("statUnverified").textContent = users.filter((u) => u.role !== "admin" && !u.verified).length;

        box.innerHTML = `<table>
          <thead><tr><th>Name</th><th>Role</th><th>District</th><th>Phone</th><th>Verified</th><th>Joined</th><th></th></tr></thead>
          <tbody>${list.map((u) => `<tr data-id="${esc(u._id)}">
            <td>${esc(u.name)}<div class="cell-sub">${esc(u.email)}</div></td>
            <td>${esc(u.role)}</td>
            <td>${esc(u.district)}</td>
            <td>${esc(u.phone)}</td>
            <td><span class="st ${u.verified ? "st-yes" : "st-no"}">${u.verified ? "Verified" : "Not verified"}</span></td>
            <td>${date(u.createdAt)}</td>
            <td>${u.role === "admin" ? "" : `
              <button class="btn small ghost" data-act="verify" data-value="${u.verified ? "false" : "true"}">${u.verified ? "Remove verification" : "Verify"}</button>
              <button class="btn small danger" data-act="delete">Delete</button>`}</td>
          </tr>`).join("")}</tbody></table>`;
    }

    async function loadUsers() {
        try {
            users = await Api.request("/api/admin/users");
            renderUsers();
        } catch (err) { $("userTable").innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
    }

    $("userTable").addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const id = btn.closest("tr").dataset.id;
        const u = users.find((x) => String(x._id) === id);
        if (!u) return;

        try {
            if (btn.dataset.act === "verify") {
                await Api.request(`/api/admin/users/${id}/verify`, { method: "PUT", body: { verified: btn.dataset.value === "true" } });
                toast(btn.dataset.value === "true" ? "User verified" : "Verification removed");
            } else {
                const extra = u.role === "farmer" ? " Their products will be deleted too." : "";
                if (!confirm(`Delete ${u.name}?${extra} This cannot be undone.`)) return;
                await Api.request(`/api/admin/users/${id}`, { method: "DELETE" });
                toast("User deleted");
                loadProducts();
            }
            await loadUsers();
            loadStats();
        } catch (err) { toast(err.message); }
    });

    ["userSearch", "roleFilter"].forEach((id) => $(id).addEventListener("input", renderUsers));

    // ---------- Products ----------
    async function loadProducts() {
        const box = $("productTable");
        try {
            const products = await Api.request("/api/admin/products");
            if (!products.length) {
                box.innerHTML = '<p class="empty">No products yet.</p>';
                return;
            }
            box.innerHTML = `<table>
              <thead><tr><th>Product</th><th>Farmer</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>${products.map((p) => {
                  const ok = p.available !== false && p.quantity > 0;
                  return `<tr data-id="${esc(p._id)}">
                    <td>${thumb(p.image, p.name)}${esc(p.name)}<div class="cell-sub">${esc(p.category)}</div></td>
                    <td>${esc((p.farmer && p.farmer.name) || "-")}</td>
                    <td>${money(p.price)} / ${esc(p.unit || "kg")}</td>
                    <td>${esc(p.quantity)}</td>
                    <td><span class="st ${ok ? "st-yes" : "st-no"}">${ok ? "Available" : "Out of stock"}</span></td>
                    <td><button class="btn small danger" data-act="delete" data-name="${esc(p.name)}">Delete</button></td>
                  </tr>`;
              }).join("")}</tbody></table>`;
        } catch (err) { box.innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
    }

    $("productTable").addEventListener("click", async (e) => {
        const btn = e.target.closest('button[data-act="delete"]');
        if (!btn) return;
        if (!confirm(`Delete "${btn.dataset.name}"? This cannot be undone.`)) return;
        try {
            await Api.request(`/api/products/${btn.closest("tr").dataset.id}`, { method: "DELETE" });
            toast("Product deleted");
            loadProducts();
            loadStats();
        } catch (err) { toast(err.message); }
    });

    // ---------- Orders ----------
    async function loadOrders() {
        const box = $("orderTable");
        try {
            const orders = await Api.request("/api/orders");
            if (!orders.length) {
                box.innerHTML = '<p class="empty">No orders yet.</p>';
                return;
            }
            box.innerHTML = `<table>
              <thead><tr><th>Product</th><th>Buyer</th><th>Farmer</th><th>Quantity</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>${orders.map((o) => {
                  const name = o.productName || (o.product && o.product.name) || "Product removed";
                  const st = status(o);
                  return `<tr>
                    <td>${thumb(o.product && o.product.image, name)}${esc(name)}</td>
                    <td>${esc((o.buyer && o.buyer.name) || "-")}</td>
                    <td>${esc((o.farmer && o.farmer.name) || "-")}</td>
                    <td>${esc(o.quantity)} ${esc(o.unit || "kg")}</td>
                    <td>${money(o.totalPrice)}</td>
                    <td><span class="st st-${esc(st)}">${esc(st)}</span></td>
                    <td>${date(o.createdAt)}</td>
                  </tr>`;
              }).join("")}</tbody></table>`;
        } catch (err) { box.innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
    }

    // ---------- Tabs and start ----------
    function showTab(name) {
        ["users", "products", "orders"].forEach((t) => {
            $("tab-" + t).setAttribute("aria-selected", t === name);
            $("panel-" + t).hidden = t !== name;
        });
        if (name === "orders") loadOrders();
        if (name === "products") loadProducts();
    }
    ["users", "products", "orders"].forEach((t) => $("tab-" + t).addEventListener("click", () => showTab(t)));

    $("logoutBtn").addEventListener("click", Api.logout);
    const name = localStorage.getItem("name");
    if (name) $("greeting").textContent = `Welcome, ${name}`;

    loadStats();
    loadUsers();
})();

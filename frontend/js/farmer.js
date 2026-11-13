// frontend/js/farmer.js  (needs js/api.js and Chart.js loaded first)
(function () {
    "use strict";

    if (!Api.requireRole("farmer")) return;

    const $ = (id) => document.getElementById(id);
    const esc = Api.esc;
    const MAX_IMAGE = 3 * 1024 * 1024;
    const COLORS = ["#0b2a2a", "#8fe3c0", "#ff8a3d", "#c9dcf5", "#12403f", "#ffd0ac", "#5aa68a", "#e56b1f"];

    let products = [];
    let editingId = null;
    let stockFilter = "all";
    const charts = {};

    // ---------- Helpers ----------
    function toast(text) {
        const t = $("toast");
        t.textContent = text;
        t.hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => (t.hidden = true), 3200);
    }

    const setMsg = (id, text) => ($(id).textContent = text || "");
    const inStock = (p) => p.available !== false && Number(p.quantity) > 0;
    const money = (n) => "Rs. " + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

    function validate(d) {
        if (!d.name || !d.category) return "Please enter a name and a category.";
        if (!Number.isFinite(d.price) || d.price <= 0) return "Price must be greater than 0.";
        if (!Number.isInteger(d.quantity) || d.quantity < 0) return "Quantity must be 0 or more.";
        return "";
    }

    // Builds the multipart form the server expects
    function buildFormData(ids, file) {
        const d = {
            name: $(ids.name).value.trim(),
            category: $(ids.category).value.trim(),
            price: Number($(ids.price).value),
            unit: $(ids.unit).value,
            quantity: Number($(ids.qty).value),
            description: $(ids.desc).value.trim()
        };
        const problem = validate(d);
        if (problem) return { problem };
        const fd = new FormData();
        Object.keys(d).forEach((k) => fd.append(k, d[k]));
        if (file) fd.append("image", file);
        return { fd };
    }

    // ---------- Image pickers ----------
    function bindImage(input, preview, text) {
        input.addEventListener("change", () => {
            const f = input.files[0];
            if (!f) return resetPreview(preview, text);
            if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
                input.value = "";
                return toast("Please choose a JPG, PNG or WEBP image.");
            }
            if (f.size > MAX_IMAGE) {
                input.value = "";
                return toast("The image must be 3 MB or smaller.");
            }
            preview.src = URL.createObjectURL(f);
            preview.hidden = false;
            text.hidden = true;
        });
    }

    function resetPreview(preview, text) {
        preview.hidden = true;
        preview.removeAttribute("src");
        text.hidden = false;
    }

    bindImage($("image"), $("preview"), $("dropText"));
    bindImage($("e_image"), $("e_preview"), $("e_dropText"));
    $("addForm").addEventListener("reset", () => resetPreview($("preview"), $("dropText")));

    // ---------- Stats and charts ----------
    function renderStats() {
        const available = products.filter(inStock).length;
        $("statTotal").textContent = products.length;
        $("statIn").textContent = available;
        $("statOut").textContent = products.length - available;
        $("statValue").textContent = money(
            products.reduce((sum, p) => sum + Number(p.price) * Number(p.quantity), 0)
        );
    }

    function drawChart(id, config) {
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart($(id), config);
    }

    function renderCharts() {
        if (typeof Chart === "undefined") {
            $("chartsSection").hidden = true; // Chart.js did not load (offline), skip charts
            return;
        }
        const has = products.length > 0;
        $("chartsEmpty").hidden = has;
        $("chartsGrid").hidden = !has;
        if (!has) return;

        const count = {}, value = {};
        products.forEach((p) => {
            const c = p.category || "Other";
            count[c] = (count[c] || 0) + 1;
            value[c] = (value[c] || 0) + Number(p.price) * Number(p.quantity);
        });
        const cats = Object.keys(count);

        drawChart("chartCategory", {
            type: "doughnut",
            data: { labels: cats, datasets: [{ data: cats.map((c) => count[c]), backgroundColor: COLORS, borderWidth: 2, borderColor: "#fff" }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } }
        });

        const top = [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 8);
        drawChart("chartStock", {
            type: "bar",
            data: {
                labels: top.map((p) => p.name),
                datasets: [{ label: "In stock", data: top.map((p) => p.quantity), backgroundColor: "#ff8a3d", borderRadius: 8 }]
            },
            options: {
                indexAxis: "y", responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } }
            }
        });

        drawChart("chartValue", {
            type: "bar",
            data: {
                labels: cats,
                datasets: [{ label: "Stock value (Rs.)", data: cats.map((c) => Math.round(value[c])), backgroundColor: "#12403f", borderRadius: 8 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
            }
        });
    }

    // ---------- Product grid ----------
    function renderList() {
        const q = $("search").value.trim().toLowerCase();
        const list = products.filter((p) => {
            const matches = [p.name, p.category].join(" ").toLowerCase().includes(q);
            const ok = inStock(p);
            return matches && (stockFilter === "all" || (stockFilter === "in" ? ok : !ok));
        });
        const box = $("productList");

        if (!products.length) {
            box.innerHTML = '<p class="empty">You have not added any products yet. Use the form to add your first one.</p>';
            return;
        }
        if (!list.length) {
            box.innerHTML = '<p class="empty">No products match your search or filter.</p>';
            return;
        }

        box.innerHTML = list.map((p) => {
            const ok = inStock(p);
            const img = p.image
                ? `<img src="${esc(Api.assetUrl(p.image))}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">`
                : "";
            return `<article class="prod" data-id="${esc(p._id)}">
              <div class="pic"><span aria-hidden="true">&#127806;</span>${img}
                <span class="badge ${ok ? "in" : "out"}">${ok ? "Available" : "Out of stock"}</span>
              </div>
              <div class="pbody">
                <h3>${esc(p.name)}</h3>
                <p class="meta">${esc(p.category)}, ${esc(p.quantity)} in stock</p>
                <p class="price">${money(p.price)} <small>per ${esc(p.unit || "kg")}</small></p>
                ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
                <div class="actions">
                  <button class="btn small ghost" data-act="toggle">${p.available === false ? "Mark available" : "Mark out of stock"}</button>
                  <button class="btn small ghost" data-act="edit">Edit</button>
                  <button class="btn small danger" data-act="delete">Delete</button>
                </div>
              </div>
            </article>`;
        }).join("");
    }

    function refresh() {
        renderStats();
        renderCharts();
        renderList();
    }

    // ---------- Load ----------
    async function load() {
        try {
            const data = await Api.request("/api/products/mine");
            products = Array.isArray(data) ? data : data.products || [];
            refresh();
        } catch (err) {
            $("productList").innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        }
    }

    // ---------- Create ----------
    $("addForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const { fd, problem } = buildFormData(
            { name: "pname", category: "category", price: "price", unit: "unit", qty: "qty", desc: "desc" },
            $("image").files[0]
        );
        if (problem) return setMsg("addMsg", problem);

        const btn = e.submitter;
        btn.disabled = true;
        try {
            const result = await Api.request("/api/products", { method: "POST", body: fd });
            products.unshift(result.product);
            e.target.reset();
            setMsg("addMsg", "");
            refresh();
            toast("Product added");
        } catch (err) {
            setMsg("addMsg", err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // ---------- Row actions ----------
    $("productList").addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const id = btn.closest(".prod").dataset.id;
        const p = products.find((x) => String(x._id) === id);
        if (!p) return;

        if (btn.dataset.act === "edit") return openEdit(p);

        if (btn.dataset.act === "toggle") {
            try {
                const fd = new FormData();
                fd.append("available", p.available === false);
                const result = await Api.request(`/api/products/${id}`, { method: "PUT", body: fd });
                Object.assign(p, result.product);
                refresh();
                toast(p.available === false ? "Marked as out of stock" : "Marked as available");
            } catch (err) { toast(err.message); }
        }

        if (btn.dataset.act === "delete") {
            if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
            try {
                await Api.request(`/api/products/${id}`, { method: "DELETE" });
                products = products.filter((x) => String(x._id) !== id);
                refresh();
                toast("Product deleted");
            } catch (err) { toast(err.message); }
        }
    });

    // ---------- Edit dialog ----------
    const dialog = $("editDialog");

    function openEdit(p) {
        editingId = String(p._id);
        $("e_name").value = p.name || "";
        $("e_category").value = p.category || "";
        $("e_price").value = p.price;
        $("e_unit").value = p.unit || "kg";
        $("e_qty").value = p.quantity;
        $("e_desc").value = p.description || "";
        $("e_image").value = "";
        $("e_remove").checked = false;
        $("removeRow").hidden = !p.image;

        if (p.image) {
            $("e_preview").src = Api.assetUrl(p.image);
            $("e_preview").hidden = false;
            $("e_dropText").hidden = true;
        } else {
            resetPreview($("e_preview"), $("e_dropText"));
        }
        setMsg("editMsg", "");
        dialog.showModal();
    }

    $("editCancel").addEventListener("click", () => dialog.close());

    $("editForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const { fd, problem } = buildFormData(
            { name: "e_name", category: "e_category", price: "e_price", unit: "e_unit", qty: "e_qty", desc: "e_desc" },
            $("e_image").files[0]
        );
        if (problem) return setMsg("editMsg", problem);
        if ($("e_remove").checked && !$("e_image").files[0]) fd.append("removeImage", "true");

        const btn = e.submitter;
        btn.disabled = true;
        try {
            const result = await Api.request(`/api/products/${editingId}`, { method: "PUT", body: fd });
            const p = products.find((x) => String(x._id) === editingId);
            if (p) Object.assign(p, result.product);
            dialog.close();
            refresh();
            toast("Changes saved");
        } catch (err) {
            setMsg("editMsg", err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // ---------- Incoming orders ----------
    let orders = [];
    const orderStatus = (o) => String(o.status || "pending").toLowerCase();

    function renderOrders() {
        const box = $("orderTable");
        const pending = orders.filter((o) => orderStatus(o) === "pending").length;
        $("pendingCount").hidden = !pending;
        $("pendingCount").textContent = `${pending} pending`;

        if (!orders.length) {
            box.innerHTML = '<p class="empty">No orders yet. They will appear here when buyers order your products.</p>';
            return;
        }
        box.innerHTML = `<table>
          <thead><tr><th>Product</th><th>Buyer</th><th>Quantity</th><th>Total</th><th>Deliver to</th><th>Status</th><th></th></tr></thead>
          <tbody>${orders.map((o) => {
              const st = orderStatus(o);
              const b = o.buyer || {};
              const name = o.productName || (o.product && o.product.name) || "Product removed";
              const buttons = st === "pending"
                  ? '<button class="btn small" data-status="accepted">Accept</button> <button class="btn small danger" data-status="rejected">Reject</button>'
                  : st === "accepted" ? '<button class="btn small" data-status="delivered">Mark delivered</button>' : "";
              return `<tr data-id="${esc(o._id)}">
                <td>${esc(name)}<div class="cell-sub">${new Date(o.createdAt).toLocaleDateString()}</div></td>
                <td>${esc(b.name || "-")}<div class="cell-sub">${esc(b.phone || "")}</div></td>
                <td>${esc(o.quantity)} ${esc(o.unit || "kg")}</td>
                <td>${money(o.totalPrice)}</td>
                <td>${esc(o.deliveryAddress || "-")}${o.note ? `<div class="cell-sub">Note: ${esc(o.note)}</div>` : ""}</td>
                <td><span class="st st-${esc(st)}">${esc(st)}</span></td>
                <td>${buttons}</td>
              </tr>`;
          }).join("")}</tbody></table>`;
    }

    async function loadOrders() {
        try {
            const data = await Api.request("/api/orders/farmer");
            orders = Array.isArray(data) ? data : [];
            renderOrders();
        } catch (err) {
            $("orderTable").innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        }
    }

    $("orderTable").addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-status]");
        if (!btn) return;
        const id = btn.closest("tr").dataset.id;
        try {
            await Api.request(`/api/orders/${id}/status`, { method: "PUT", body: { status: btn.dataset.status } });
            toast(`Order ${btn.dataset.status}`);
            await Promise.all([loadOrders(), load()]); // rejecting gives the stock back, so reload products too
        } catch (err) { toast(err.message); }
    });

    // ---------- Search, filters, logout, greeting ----------
    $("search").addEventListener("input", renderList);
    $("filters").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-filter]");
        if (!b) return;
        stockFilter = b.dataset.filter;
        $("filters").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
        renderList();
    });
    $("logoutBtn").addEventListener("click", Api.logout);

    const name = localStorage.getItem("name");
    if (name) $("greeting").textContent = `Welcome, ${name}`;

    loadOrders();
    load();
})();

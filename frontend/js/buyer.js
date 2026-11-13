// frontend/js/buyer.js  (needs js/api.js and Chart.js loaded first)
(function () {
    "use strict";

    if (!Api.requireRole("buyer")) return;

    const $ = (id) => document.getElementById(id);
    const esc = Api.esc;
    const COLORS = ["#0b2a2a", "#8fe3c0", "#ff8a3d", "#c9dcf5", "#12403f", "#ffd0ac"];

    let products = [];
    let orders = [];
    let ordering = null;
    const charts = {};

    // ---------- Helpers ----------
    function toast(text) {
        const t = $("toast");
        t.textContent = text;
        t.hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => (t.hidden = true), 3200);
    }

    const money = (n) => "Rs. " + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const status = (o) => String(o.status || "pending").toLowerCase();
    const setMsg = (text) => ($("orderMsg").textContent = text || "");

    function thumb(path, name) {
        return path
            ? `<img class="thumb" src="${esc(Api.assetUrl(path))}" alt="${esc(name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'thumb',textContent:'\u{1F33E}'}))">`
            : '<span class="thumb" aria-hidden="true">&#127806;</span>';
    }

    // ---------- Browse produce ----------
    function renderProducts() {
        const q = $("search").value.trim().toLowerCase();
        const cat = $("categoryFilter").value;
        const sort = $("sort").value;

        let list = products.filter((p) => {
            const text = [p.name, p.category, p.farmer && p.farmer.name].join(" ").toLowerCase();
            return text.includes(q) && (!cat || p.category === cat);
        });
        if (sort === "low") list.sort((a, b) => a.price - b.price);
        if (sort === "high") list.sort((a, b) => b.price - a.price);

        const box = $("productGrid");
        if (!products.length) {
            box.innerHTML = '<p class="empty">No produce is available right now. Please check again soon.</p>';
            return;
        }
        if (!list.length) {
            box.innerHTML = '<p class="empty">No produce matches your search.</p>';
            return;
        }

        box.innerHTML = list.map((p) => {
            const farmer = p.farmer || {};
            const img = p.image
                ? `<img src="${esc(Api.assetUrl(p.image))}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">`
                : "";
            return `<article class="prod" data-id="${esc(p._id)}">
              <div class="pic"><span aria-hidden="true">&#127806;</span>${img}</div>
              <div class="pbody">
                <h3>${esc(p.name)}</h3>
                <p class="meta">${esc(p.category)}, ${esc(farmer.name || "Local farmer")}${farmer.district ? ", " + esc(farmer.district) : ""}</p>
                <p class="price">${money(p.price)} <small>per ${esc(p.unit || "kg")}</small></p>
                <p class="meta">${esc(p.quantity)} available</p>
                ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
                <div class="actions"><button class="btn small" data-act="order">Order</button></div>
              </div>
            </article>`;
        }).join("");
    }

    function fillCategories() {
        const select = $("categoryFilter");
        const current = select.value;
        const cats = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
        select.innerHTML = '<option value="">All categories</option>' +
            cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
        select.value = cats.includes(current) ? current : "";
    }

    async function loadProducts() {
        try {
            const data = await Api.request("/api/products");
            products = Array.isArray(data) ? data : data.products || [];
            fillCategories();
            renderProducts();
        } catch (err) {
            $("productGrid").innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        }
    }

    // ---------- My orders ----------
    function renderOrders() {
        const box = $("orderTable");
        if (!orders.length) {
            box.innerHTML = '<p class="empty">You have not placed any orders yet. Pick something from Browse produce.</p>';
            return;
        }
        box.innerHTML = `<table>
          <thead><tr><th>Product</th><th>Farmer</th><th>Quantity</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>${orders.map((o) => {
              const name = o.productName || (o.product && o.product.name) || "Product removed";
              const f = o.farmer || {};
              const st = status(o);
              return `<tr data-id="${esc(o._id)}">
                <td>${thumb(o.product && o.product.image, name)}${esc(name)}</td>
                <td>${esc(f.name || "-")}<div class="cell-sub">${esc(f.phone || "")}</div></td>
                <td>${esc(o.quantity)} ${esc(o.unit || (o.product && o.product.unit) || "kg")}</td>
                <td>${money(o.totalPrice)}</td>
                <td><span class="st st-${esc(st)}">${esc(st)}</span></td>
                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                <td>${st === "pending" ? '<button class="btn small danger" data-act="cancel">Cancel</button>' : ""}</td>
              </tr>`;
          }).join("")}</tbody></table>`;
    }

    function drawChart(id, config) {
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart($(id), config);
    }

    function renderStatsAndCharts() {
        const counted = orders.filter((o) => ["accepted", "delivered"].includes(status(o)));
        $("statOrders").textContent = orders.length;
        $("statPending").textContent = orders.filter((o) => status(o) === "pending").length;
        $("statDelivered").textContent = orders.filter((o) => status(o) === "delivered").length;
        $("statSpent").textContent = money(counted.reduce((s, o) => s + Number(o.totalPrice), 0));

        if (typeof Chart === "undefined" || !orders.length) {
            $("chartsSection").hidden = true;
            return;
        }
        $("chartsSection").hidden = false;

        const byStatus = {};
        orders.forEach((o) => (byStatus[status(o)] = (byStatus[status(o)] || 0) + 1));
        drawChart("chartStatus", {
            type: "doughnut",
            data: { labels: Object.keys(byStatus), datasets: [{ data: Object.values(byStatus), backgroundColor: COLORS, borderWidth: 2, borderColor: "#fff" }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom" } } }
        });

        const spend = {};
        counted.forEach((o) => {
            const name = o.productName || (o.product && o.product.name) || "Other";
            spend[name] = (spend[name] || 0) + Number(o.totalPrice);
        });
        const top = Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 6);
        drawChart("chartSpend", {
            type: "bar",
            data: { labels: top.map((t) => t[0]), datasets: [{ label: "Spent (Rs.)", data: top.map((t) => t[1]), backgroundColor: "#ff8a3d", borderRadius: 8 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
        });
    }

    async function loadOrders() {
        try {
            const data = await Api.request("/api/orders/mine");
            orders = Array.isArray(data) ? data : [];
            renderOrders();
            renderStatsAndCharts();
        } catch (err) {
            $("orderTable").innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        }
    }

    // ---------- Order dialog ----------
    const dialog = $("orderDialog");

    function updateTotal() {
        const qty = Number($("o_qty").value) || 0;
        $("orderTotal").textContent = "Total: " + money(ordering ? ordering.price * qty : 0);
    }

    function openOrder(p) {
        ordering = p;
        $("orderSummary").textContent =
            `${p.name} from ${(p.farmer && p.farmer.name) || "a local farmer"}, ${money(p.price)} per ${p.unit || "kg"}`;
        $("o_qty").max = p.quantity;
        $("o_qty").value = 1;
        $("o_note").value = "";
        setMsg("");
        updateTotal();
        dialog.showModal();
    }

    $("o_qty").addEventListener("input", updateTotal);
    $("orderCancel").addEventListener("click", () => dialog.close());

    $("orderForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const quantity = Number($("o_qty").value);
        if (!Number.isInteger(quantity) || quantity < 1) return setMsg("Quantity must be a whole number of 1 or more.");
        if (quantity > ordering.quantity) return setMsg(`Only ${ordering.quantity} available.`);
        if (!$("o_address").value.trim()) return setMsg("Please enter a delivery address.");

        const btn = e.submitter;
        btn.disabled = true;
        try {
            await Api.request("/api/orders", {
                method: "POST",
                body: {
                    productId: ordering._id,
                    quantity,
                    deliveryAddress: $("o_address").value.trim(),
                    note: $("o_note").value.trim()
                }
            });
            dialog.close();
            toast("Order placed. The farmer will review it.");
            await Promise.all([loadProducts(), loadOrders()]);
            showTab("orders");
        } catch (err) {
            setMsg(err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // ---------- Clicks, tabs, filters ----------
    $("productGrid").addEventListener("click", (e) => {
        const btn = e.target.closest('button[data-act="order"]');
        if (!btn) return;
        const p = products.find((x) => String(x._id) === btn.closest(".prod").dataset.id);
        if (p) openOrder(p);
    });

    $("orderTable").addEventListener("click", async (e) => {
        const btn = e.target.closest('button[data-act="cancel"]');
        if (!btn) return;
        if (!confirm("Cancel this order?")) return;
        try {
            await Api.request(`/api/orders/${btn.closest("tr").dataset.id}/status`, { method: "PUT", body: { status: "cancelled" } });
            toast("Order cancelled");
            await Promise.all([loadProducts(), loadOrders()]);
        } catch (err) { toast(err.message); }
    });

    function showTab(name) {
        ["browse", "orders"].forEach((t) => {
            $("tab-" + t).setAttribute("aria-selected", t === name);
            $("panel-" + t).hidden = t !== name;
        });
    }
    $("tab-browse").addEventListener("click", () => showTab("browse"));
    $("tab-orders").addEventListener("click", () => showTab("orders"));

    ["search", "categoryFilter", "sort"].forEach((id) => $(id).addEventListener("input", renderProducts));
    $("logoutBtn").addEventListener("click", Api.logout);

    const name = localStorage.getItem("name");
    if (name) $("greeting").textContent = `Welcome, ${name}`;

    loadProducts();
    loadOrders();
})();

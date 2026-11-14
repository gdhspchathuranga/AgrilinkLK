// frontend/js/home.js  (home page; needs api.js, ui.js, site.js)
(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const esc = Api.esc;
    const session = Api.session();
    const PAGE_SIZE = 8;

    let products = [];
    let shown = PAGE_SIZE;
    let category = "";

    // Where the "Order now" button leads depends on who is looking
    function orderLink() {
        if (!session) return "register.html?role=buyer";
        if (session.role === "buyer") return "buyer-dashboard.html#browse";
        return null; // farmers and admins do not place orders
    }

    function card(p) {
        const farmer = p.farmer || {};
        const low = Number(p.quantity) <= 5;
        const link = orderLink();
        const img = p.image
            ? `<img src="${esc(Api.assetUrl(p.image))}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">`
            : "";
        return `<article class="pcard">
          <div class="pimg">${UI.icon("leaf", 48)}${img}
            <span class="badge ${low ? "badge-amber" : ""}">${low ? "Only " + esc(p.quantity) + " left" : "Fresh"}</span>
          </div>
          <div class="pbody">
            <span class="pcat">${esc(p.category)}</span>
            <h3 class="ptitle">${esc(p.name)}</h3>
            <p class="pmeta">${esc(farmer.name || "Local farmer")}${farmer.district ? ", " + esc(farmer.district) : ""}</p>
            ${p.description ? `<p class="pdesc">${esc(p.description)}</p>` : ""}
            <div class="pfoot">
              <span class="pprice">${UI.money(p.price)} <small>/ ${esc(p.unit || "kg")}</small></span>
              ${link ? `<a class="btn btn-primary btn-sm" href="${link}">Order now</a>` : ""}
            </div>
          </div>
        </article>`;
    }

    function filtered() {
        const q = $("search").value.trim().toLowerCase();
        const sort = $("sort").value;
        const list = products.filter((p) => {
            const text = [p.name, p.category, p.farmer && p.farmer.name].join(" ").toLowerCase();
            return text.includes(q) && (!category || p.category === category);
        });
        if (sort === "low") list.sort((a, b) => a.price - b.price);
        if (sort === "high") list.sort((a, b) => b.price - a.price);
        return list;
    }

    function render() {
        const box = $("productGrid");
        if (!products.length) {
            box.innerHTML = '<p class="empty">No produce is listed yet. Farmers can add products after registering.</p>';
            $("moreBtn").hidden = true;
            return;
        }
        const list = filtered();
        if (!list.length) {
            box.innerHTML = '<p class="empty">No produce matches your search.</p>';
            $("moreBtn").hidden = true;
            return;
        }
        box.innerHTML = list.slice(0, shown).map(card).join("");
        $("moreBtn").hidden = list.length <= shown;
    }

    function buildCategories() {
        const counts = {};
        products.forEach((p) => p.category && (counts[p.category] = (counts[p.category] || 0) + 1));
        const names = Object.keys(counts).sort();

        $("categories").hidden = !names.length;
        $("catGrid").innerHTML = names.map((c) => `
            <button type="button" class="cat" data-cat="${esc(c)}" aria-pressed="false">
              <div class="ico">${UI.icon("leaf", 26)}</div>
              <b>${esc(c)}</b><span>${counts[c]} ${counts[c] === 1 ? "product" : "products"}</span>
            </button>`).join("");
        $("catFilter").innerHTML = '<option value="">All categories</option>' +
            names.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    }

    function setCategory(value) {
        category = value;
        $("catFilter").value = value;
        document.querySelectorAll(".cat").forEach((b) => b.setAttribute("aria-pressed", b.dataset.cat === value && !!value));
        shown = PAGE_SIZE;
        render();
    }

    function goToProducts() {
        $("products").scrollIntoView({ behavior: "smooth" });
    }

    // ---------- Events ----------
    $("catGrid").addEventListener("click", (e) => {
        const b = e.target.closest(".cat");
        if (!b) return;
        setCategory(category === b.dataset.cat ? "" : b.dataset.cat);
        goToProducts();
    });
    $("catFilter").addEventListener("change", (e) => setCategory(e.target.value));
    $("sort").addEventListener("change", render);
    $("search").addEventListener("input", UI.debounce(() => { shown = PAGE_SIZE; render(); }, 200));
    $("moreBtn").addEventListener("click", () => { shown += PAGE_SIZE; render(); });

    $("heroSearch").addEventListener("submit", (e) => {
        e.preventDefault();
        $("search").value = $("heroQuery").value.trim();
        shown = PAGE_SIZE;
        render();
        goToProducts();
    });

    // ---------- Load ----------
    Api.request("/api/products")
        .then((data) => {
            products = Array.isArray(data) ? data : data.products || [];
            buildCategories();
            render();
        })
        .catch((err) => {
            $("categories").hidden = true;
            $("productGrid").innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        });
})();

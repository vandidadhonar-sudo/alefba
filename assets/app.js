/* ============================================================
   دفترِ اشعارِ حسن بخت‌زاده — منطق سایت (بدون وابستگی بیرونی)
   ============================================================ */
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG;
  var CATS = ["غزلیات", "دوبیتی و رباعی", "مثنوی", "قطعات و اشعار کوتاه"];
  var state = { all: [], poems: [], images: [], voices: [], loaded: false, error: null };

  /* ---------- helpers ---------- */
  function faNum(s) {
    return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[+d]; });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s == null ? "" : s)
      .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ")
      .replace(/[ً-ْٰـ]/g, "").replace(/\s+/g, " ").trim();
  }
  function lines(content) {
    return String(content || "").split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
  }
  function beyts(content) {
    var ls = lines(content), out = [];
    for (var i = 0; i < ls.length; i += 2) out.push([ls[i], ls[i + 1] || ""]);
    return out;
  }
  function firstMesra(content) { return lines(content)[0] || ""; }
  function lastLetter(content) {
    var ls = lines(content); if (!ls.length) return "؟";
    var t = norm(ls[ls.length - 1]).replace(/[\s،؛؟!?.،؛…«»\-]+$/g, "");
    return t.slice(-1) || "؟";
  }
  function byId(id) { for (var i = 0; i < state.all.length; i++) if (String(state.all[i].id) === String(id)) return state.all[i]; return null; }

  /* ---------- data ---------- */
  function fetchWorks() {
    var url = cfg.SUPABASE_URL + "/rest/v1/artworks?select=*&status=eq.published&is_deleted=eq.false&order=created_at.desc";
    return fetch(url, { headers: { apikey: cfg.SUPABASE_KEY, Authorization: "Bearer " + cfg.SUPABASE_KEY } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  function categorize() {
    state.poems = []; state.images = []; state.voices = [];
    state.all.forEach(function (w) {
      var t = w.type || "poem";
      if (t === "voice" || t === "audio") state.voices.push(w);
      else if (t === "calligraphy" || t === "image") state.images.push(w);
      else state.poems.push(w);
    });
  }

  /* ---------- routing ---------- */
  function parseHash() {
    var h = (location.hash || "#/divan").replace(/^#\/?/, "");
    var parts = h.split("/");
    return { route: parts[0] || "divan", param: parts[1] || "" };
  }
  function setActiveNav(route) {
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === route);
    });
  }
  function render() {
    var view = document.getElementById("view");
    if (state.error) { view.innerHTML = errorHTML(); return; }
    if (!state.loaded) { view.innerHTML = '<div class="loading">در حال گشودن دفتر…</div>'; return; }
    var r = parseHash();
    setActiveNav(r.route);
    var html;
    switch (r.route) {
      case "poem": html = viewPoem(r.param); break;
      case "negarkhaneh": html = viewGallery(); break;
      case "avaha": html = viewVoices(); break;
      case "fehrest": html = viewFehrest(); break;
      case "poet": html = viewPoet(); break;
      case "search": html = viewSearch(); break;
      default: html = viewDivan();
    }
    view.innerHTML = html;
    view.classList.remove("view-enter"); void view.offsetWidth; view.classList.add("view-enter");
    afterRender(r);
    if (r.route !== "poem") window.scrollTo({ top: 0, behavior: "auto" });
    closeNav();
  }

  /* ---------- views ---------- */
  function viewDivan() {
    var h = '<section class="masthead">' +
      '<div class="rule"><span>۞</span></div>' +
      '<h1>' + esc(cfg.SITE_TITLE) + '</h1>' +
      '<div class="pen">به خطّ دل، متخلص به «الف‌ب»</div>' +
      '<p class="lead">دفتری دیجیتال از غزل‌ها، دوبیتی‌ها، خطاطی‌ها و آواهای جناب حسن بخت‌زاده؛ نگاشته برای ماندگاری.</p>' +
      '</section>';
    if (!state.poems.length) {
      h += emptyHTML("هنوز شعری منتشر نشده", "به‌زودی نخستین آثار در این دفتر می‌نشیند.");
      return h;
    }
    var groups = {}; CATS.forEach(function (c) { groups[c] = []; });
    state.poems.forEach(function (p) { var c = p.category || "سایر"; (groups[c] = groups[c] || []).push(p); });
    var order = CATS.concat(Object.keys(groups).filter(function (c) { return CATS.indexOf(c) < 0; }));
    h += '<div class="sec-head"><h2>دیوان</h2><span class="dash"></span><span class="count">' + faNum(state.poems.length) + ' اثر</span></div>';
    order.forEach(function (c) {
      var arr = groups[c]; if (!arr || !arr.length) return;
      h += '<div class="daftar"><h3 class="daftar-title">' + esc(c) + '</h3><div class="grid">';
      arr.forEach(function (p) { h += cardHTML(p); });
      h += '</div></div>';
    });
    return h;
  }
  function cardHTML(p) {
    var audio = p.audio_url ? '<span class="has-audio">۩ همراه با صدا</span>' : '';
    return '<a class="card" href="#/poem/' + esc(p.id) + '" role="button">' +
      '<h3>' + esc(p.title || "بی‌عنوان") + '</h3>' +
      '<p class="excerpt">' + esc(firstMesra(p.content)) + '</p>' +
      '<div class="meta"><span class="tag">' + esc(p.author || cfg.PEN_NAME) + '</span>' +
      (p.category ? '<span>' + esc(p.category) + '</span>' : '') + audio + '</div></a>';
  }

  function viewPoem(id) {
    var p = byId(id);
    if (!p) return errorHTML("این اثر یافت نشد.");
    var bs = beyts(p.content), body = "";
    bs.forEach(function (b) {
      body += '<div class="beyt"><div class="mesra">' + esc(b[0]) + '</div>' +
        (b[1] ? '<div class="mesra b">' + esc(b[1]) + '</div>' : '') + '</div>';
    });
    var meta = [];
    if (p.composed_at_text) meta.push('<span><b>زمان سرایش:</b> ' + faNum(esc(p.composed_at_text)) + '</span>');
    if (p.category) meta.push('<span><b>دفتر:</b> ' + esc(p.category) + '</span>');
    if (p.persian_date) meta.push('<span><b>ثبت:</b> ' + faNum(esc(p.persian_date)) + '</span>');
    var audio = "";
    if (p.audio_url) {
      audio = '<div class="audio-wrap"><div class="a-title">۩ خوانشِ شاعر</div>' +
        '<audio controls preload="none" src="' + esc(p.audio_url) + '"></audio></div>';
    }
    return '<article class="reader">' +
      '<a class="back-link" href="#/divan">→ بازگشت به دیوان</a>' +
      '<header class="poem-head"><div class="kicker">' + esc(p.category || "شعر") + '</div>' +
      '<h1>' + esc(p.title || "بی‌عنوان") + '</h1></header>' +
      '<div class="poem-orn">۞ ✦ ۞</div>' +
      '<div class="poem-body">' + body + '</div>' +
      '<div class="poem-sign">' + esc(p.author || cfg.PEN_NAME) + '</div>' +
      (meta.length ? '<div class="poem-meta">' + meta.join("") + '</div>' : '') +
      audio + '</article>';
  }

  function viewGallery() {
    var h = '<div class="sec-head"><h2>نگارخانه</h2><span class="dash"></span><span class="count">خطاطی‌ها</span></div>';
    if (!state.images.length) return h + emptyHTML("نگارخانه به‌زودی", "خطاطی‌های جناب بخت‌زاده پس از افزودن در ربات، اینجا با شکوه نمایش داده می‌شوند.");
    h += '<div class="gal-grid">';
    state.images.forEach(function (im) {
      h += '<figure class="gal-item" data-src="' + esc(im.image_url) + '" data-cap="' + esc(im.title || "") + '">' +
        '<img loading="lazy" src="' + esc(im.image_url) + '" alt="' + esc(im.title || "خطاطی") + '">' +
        (im.title ? '<figcaption class="gal-cap">' + esc(im.title) + '</figcaption>' : '') + '</figure>';
    });
    return h + '</div>';
  }

  function viewVoices() {
    var h = '<div class="sec-head"><h2>آواها</h2><span class="dash"></span><span class="count">دکلمه‌ها</span></div>';
    if (!state.voices.length) return h + emptyHTML("آواها به‌زودی", "دکلمه‌ها و خوانش‌های صوتی پس از ثبت در ربات، اینجا با پلیری ظریف شنیده می‌شوند.");
    state.voices.forEach(function (v) {
      h += '<div class="ava-item"><h3>' + esc(v.title || "بی‌عنوان") + '</h3>' +
        (v.content ? '<p>' + esc(v.content).replace(/\n/g, "<br>") + '</p>' : '') +
        '<audio controls preload="none" src="' + esc(v.audio_url) + '"></audio></div>';
    });
    return h;
  }

  function viewFehrest() {
    var h = '<div class="sec-head"><h2>فهرست</h2><span class="dash"></span></div>';
    if (!state.poems.length) return h + emptyHTML("فهرست خالی است", "با انتشار نخستین اشعار، فهرست‌ها ساخته می‌شوند.");
    h += '<div class="tabs"><button class="tab active" data-tab="title">بر اساس عنوان</button>' +
      '<button class="tab" data-tab="letter">بر اساس حرفِ قافیه</button></div>' +
      '<div id="fehrestBody"></div>';
    return h;
  }
  function fehrestByTitle() {
    var arr = state.poems.slice().sort(function (a, b) {
      return norm(a.title || "بی‌عنوان").localeCompare(norm(b.title || "بی‌عنوان"), "fa");
    });
    var h = '<ul class="index-list">';
    arr.forEach(function (p) {
      h += '<li><a href="#/poem/' + esc(p.id) + '"><span class="il-title">' + esc(p.title || "بی‌عنوان") + '</span></a></li>';
    });
    return h + '</ul>';
  }
  function fehrestByLetter() {
    var groups = {};
    state.poems.forEach(function (p) { var L = lastLetter(p.content); (groups[L] = groups[L] || []).push(p); });
    var keys = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b, "fa"); });
    var h = "";
    keys.forEach(function (L) {
      h += '<div class="index-letter-head">' + esc(L) + '</div><ul class="index-list">';
      groups[L].forEach(function (p) {
        h += '<li><a href="#/poem/' + esc(p.id) + '"><span class="il-title">' + esc(p.title || "بی‌عنوان") + '</span></a></li>';
      });
      h += '</ul>';
    });
    return h;
  }

  function viewSearch() {
    return '<div class="sec-head"><h2>جستجو</h2><span class="dash"></span></div>' +
      '<div class="search-box"><input id="searchInput" type="search" placeholder="جستجو در مصرع‌ها، واژه‌ها و عنوان‌ها…" autocomplete="off"></div>' +
      '<p class="search-hint">هرچه بنویسید بی‌درنگ در میان اشعار می‌گردیم.</p>' +
      '<div id="searchResults"></div>';
  }
  function runSearch(q) {
    var box = document.getElementById("searchResults");
    var nq = norm(q);
    if (nq.length < 2) { box.innerHTML = ""; return; }
    var res = state.poems.filter(function (p) {
      return norm((p.title || "") + " " + (p.content || "") + " " + (p.author || "")).indexOf(nq) > -1;
    });
    if (!res.length) { box.innerHTML = emptyHTML("یافت نشد", "برای «" + esc(q) + "» نتیجه‌ای پیدا نشد."); return; }
    var h = '<div class="grid">';
    res.forEach(function (p) { h += cardHTML(p); });
    box.innerHTML = h + '</div>';
  }

  function viewPoet() {
    return '<div class="poet">' +
      '<div class="poet-photo"><div><span class="ph-mark">الف‌ب</span>' +
      '<small>تصویر جناب بخت‌زاده<br>به‌زودی</small></div></div>' +
      '<div class="poet-bio">' +
      '<h1>حسن بخت‌زاده</h1>' +
      '<div class="aliases">خطّاط و شاعر — متخلص به «الف‌ب»</div>' +
      '<p>جناب حسن بخت‌زاده، سالیانِ سال با قلم و کلام زیسته‌اند؛ هم خطّ خوش را ارج نهاده‌اند و هم در سرودن شعر. این دفتر دیجیتال فراهم آمده تا آثار ایشان — از غزل و دوبیتی تا خطاطی و خوانشِ صدا — یک‌جا و ماندگار در دسترس دوستداران باشد.</p>' +
      '<div class="name-card"><h4>دربارهٔ نام و تخلص</h4><dl>' +
      '<dt>نام</dt><dd>حسن بخت‌زاده</dd>' +
      '<dt>تخلصِ کنونی</dt><dd>الف‌ب (ارشک بخت‌زاده)</dd>' +
      '<dt>تخلصِ پیشین</dt><dd>صبا</dd>' +
      '</dl><p style="margin:12px 0 0;color:var(--ink-faint);font-size:.9rem">در پای اشعار، تخلصِ «الف‌ب» ذکر می‌شود؛ برخی سروده‌های کهن‌تر با تخلصِ «صبا» نگاشته شده‌اند.</p></div>' +
      '</div></div>';
  }

  function emptyHTML(title, sub) {
    return '<div class="empty"><div class="orn">۞</div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></div>';
  }
  function errorHTML(msg) {
    return '<div class="err"><p><b>در گشودن دفتر خطایی پیش آمد.</b></p><p>' +
      esc(msg || "لطفاً اتصال اینترنت را بررسی کنید و صفحه را دوباره باز کنید.") + '</p></div>';
  }

  /* ---------- post-render wiring ---------- */
  function afterRender(r) {
    if (r.route === "negarkhaneh") wireGallery();
    if (r.route === "fehrest") wireFehrest();
    if (r.route === "search") wireSearch();
  }
  function wireGallery() {
    document.querySelectorAll(".gal-item").forEach(function (fig) {
      fig.addEventListener("click", function () { openLightbox(fig.getAttribute("data-src"), fig.getAttribute("data-cap")); });
    });
  }
  function wireFehrest() {
    var body = document.getElementById("fehrestBody");
    body.innerHTML = fehrestByTitle();
    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        body.innerHTML = t.getAttribute("data-tab") === "letter" ? fehrestByLetter() : fehrestByTitle();
      });
    });
  }
  function wireSearch() {
    var inp = document.getElementById("searchInput");
    if (!inp) return; inp.focus();
    var t;
    inp.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { runSearch(inp.value); }, 120); });
  }

  /* ---------- lightbox ---------- */
  var lb;
  function openLightbox(src, cap) {
    if (!lb) {
      lb = document.createElement("div"); lb.className = "lightbox";
      lb.innerHTML = '<button class="lb-close" aria-label="بستن">×</button><img alt=""><div class="lb-cap"></div>';
      document.body.appendChild(lb);
      lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-close")) lb.classList.remove("open"); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb) lb.classList.remove("open"); });
    }
    lb.querySelector("img").src = src; lb.querySelector(".lb-cap").textContent = cap || "";
    lb.classList.add("open");
  }

  /* ---------- nav + theme ---------- */
  function closeNav() {
    var nav = document.getElementById("siteNav"), tog = document.getElementById("navToggle");
    if (nav) nav.classList.remove("open"); if (tog) tog.setAttribute("aria-expanded", "false");
  }
  function initChrome() {
    var tog = document.getElementById("navToggle"), nav = document.getElementById("siteNav");
    tog.addEventListener("click", function () {
      var open = nav.classList.toggle("open"); tog.setAttribute("aria-expanded", open ? "true" : "false");
    });
    var saved = localStorage.getItem("alefba-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    document.getElementById("themeToggle").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      if (!cur) cur = matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
      var next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("alefba-theme", next);
    });
  }

  /* ---------- PWA ---------- */
  function initPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
    }
    var deferred;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); deferred = e;
      var btn = document.getElementById("installBtn"); btn.hidden = false;
      btn.onclick = function () { btn.hidden = true; deferred.prompt(); deferred = null; };
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    initChrome(); initPWA();
    window.addEventListener("hashchange", render);
    fetchWorks().then(function (data) {
      state.all = Array.isArray(data) ? data : []; categorize();
      state.loaded = true; render();
    }).catch(function (e) {
      state.error = e; state.loaded = true; render();
      console.error("fetch error", e);
    });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

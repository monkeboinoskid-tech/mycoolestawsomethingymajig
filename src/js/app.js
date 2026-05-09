import { getProxied } from "../../math.mjs";
import { initPerformance } from "./performance.js";
import { mountLoader } from "./loader.js";
import { wireHoverPrefetch, prefetchedUrl } from "./prefetch.js";
import { listCloaks, applyCloak, restoreCloak, reset as resetCloak } from "./cloak.js";

const frame = document.getElementById("frame");
const toolbar = document.getElementById("toolbar");
const homePage = document.getElementById("homePage");
const errorPage = document.getElementById("errorPage");
const errDetail = document.getElementById("errDetail");

const searchForm = document.getElementById("searchForm");
const searchHome = document.getElementById("searchHome");
const urlBar = document.getElementById("urlBar");

const settingsPanel = document.getElementById("settingsPanel");
const dockHome = document.getElementById("dockHome");
const dockSettings = document.getElementById("dockSettings");

const fxToggle = document.getElementById("fxToggle");
const cloakSelect = document.getElementById("cloakSelect");
const engineSelect = document.getElementById("engineSelect");

const btnBack = document.getElementById("btnBack");
const btnFwd  = document.getElementById("btnFwd");

(function shimUrlBar() {
    const el = urlBar;
    if (!el || el.tagName !== "DIV") return;
    Object.defineProperty(el, "value", {
        get() { return this.textContent || ""; },
        set(v) { this.textContent = String(v == null ? "" : v); },
        configurable: true
    });
    Object.defineProperty(el, "placeholder", {
        get() { return this.getAttribute("data-placeholder") || ""; },
        set(v) { this.setAttribute("data-placeholder", String(v == null ? "" : v)); },
        configurable: true
    });
    el.select = function() {
        try {
            const range = document.createRange();
            range.selectNodeContents(this);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } catch {}
    };
    el.addEventListener("paste", e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
        const cleaned = text.replace(/[\r\n]+/g, " ").trim();
        document.execCommand("insertText", false, cleaned);
    });
    el.addEventListener("drop", e => e.preventDefault());
})();

const loader = mountLoader(document.getElementById("lineLoader"));

const ENGINES = {
    duckduckgo: { label: "DuckDuckGo", url: q => "https://duckduckgo.com/?q=" + encodeURIComponent(q) },
    google:     { label: "Google",     url: q => "https://www.google.com/search?q=" + encodeURIComponent(q) },
    bing:       { label: "Bing",       url: q => "https://www.bing.com/search?q=" + encodeURIComponent(q) },
    brave:      { label: "Brave",      url: q => "https://search.brave.com/search?q=" + encodeURIComponent(q) },
    startpage:  { label: "Startpage",  url: q => "https://www.startpage.com/do/search?q=" + encodeURIComponent(q) }
};

function checkBlocked(input) {
    // Basic stub, real check is complex
    return null;
}

let currentEngine = localStorage.getItem("nocturne-engine") || "duckduckgo";
let lastURL = "";
let navStack = [];
let navIndex = -1;
let loadWatchdog = null;

function obfuscate(url) {
    try { return btoa(url).replace(/=+$/, ""); }
    catch { return btoa(encodeURIComponent(url)).replace(/=+$/, ""); }
}
function deobfuscate(s) {
    try { return atob(s); }
    catch { try { return decodeURIComponent(atob(s)); } catch { return null; } }
}

function clearWatchdog() {
    if (loadWatchdog) { clearTimeout(loadWatchdog); loadWatchdog = null; }
}

function showError(detail) {
    clearWatchdog();
    stopFrameUrlPoller();
    loader.fail();
    frame.classList.remove("visible");
    errorPage.classList.add("visible");
    if (errDetail && detail) errDetail.textContent = detail;
}

function decodeFrameUrl() {
    try {
        const win = frame.contentWindow;
        if (!win) return null;
        const path = win.location.pathname;
        if (path.startsWith("/rw/")) {
            const enc = path.slice(4).split("/")[0];
            const padded = enc.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((enc.length + 3) % 4);
            try { return atob(padded); } catch { return null; }
        }
        if (window.__scramjet && typeof window.__scramjet.decodeUrl === "function") {
            try { return window.__scramjet.decodeUrl(win.location.href); } catch { return null; }
        }
        return null;
    } catch { return null; }
}

function syncUrlBarFromFrame() {
    const real = decodeFrameUrl();
    if (real) {
        urlBar.value = real;
        lastURL = real;
    }
}

let frameUrlPoller = null;
let lastSyncedHref = "";
function startFrameUrlPoller() {
    stopFrameUrlPoller();
    frameUrlPoller = setInterval(() => {
        try {
            const href = frame.contentWindow?.location.href;
            if (!href || href === lastSyncedHref) return;
            lastSyncedHref = href;
            syncUrlBarFromFrame();
        } catch {}
    }, 600);
}
function stopFrameUrlPoller() {
    if (frameUrlPoller) { clearInterval(frameUrlPoller); frameUrlPoller = null; }
}

function finishLoad() {
    clearWatchdog();
    try {
        const doc = frame.contentDocument;
        if (doc) {
            const body = (doc.body && doc.body.innerText) || "";
            if (body.startsWith("Proxy error:")) return showError(body.slice(0, 160));
            if (body.startsWith("Service worker not active")) return showError("Service worker not active. Reload to recover.");
        }
    } catch {}
    syncUrlBarFromFrame();
    startFrameUrlPoller();
    loader.finish();
    frame.classList.add("visible");
}

function showHome(pushHistory = true) {
    clearWatchdog();
    stopFrameUrlPoller();
    loader.fail();
    frame.classList.remove("visible");
    frame.src = "data:text/html;charset=utf-8,<!doctype html><html style='background:%2305060d;color-scheme:dark'><body style='background:%2305060d;margin:0'></body></html>";
    toolbar.classList.remove("visible");
    homePage.style.display = "";
    errorPage.classList.remove("visible");
    if (pushHistory) history.pushState(null, "", "./");
    navStack = [];
    navIndex = -1;
    updateNavButtons();
}

function updateNavButtons() {
    btnBack.disabled = navIndex <= 0;
    btnFwd.disabled  = navIndex >= navStack.length - 1;
}

async function load(url, addToHistory = true) {
    try {
        clearWatchdog();

        if (checkBlocked(url)) {
            toolbar.classList.remove("visible");
            homePage.style.display = "none";
            return showError("This page is blocked by Monkturne policy. See the Terms of Service.");
        }

        try {
            const parsed = new URL(url);
            if (parsed.hostname === "localhost" || parsed.origin === location.origin) {
                return showError("Cannot proxy local addresses.");
            }
        } catch {}

        lastURL = url;
        errorPage.classList.remove("visible");
        if (errDetail) errDetail.textContent = "";

        toolbar.classList.add("visible");
        homePage.style.display = "none";
        frame.classList.remove("visible");

        if (addToHistory) {
            history.pushState(null, "", "#search/" + obfuscate(url));
            navStack = navStack.slice(0, navIndex + 1);
            navStack.push(url);
            navIndex = navStack.length - 1;
        }
        updateNavButtons();
        urlBar.value = url;
        loader.start();

        let proxied = prefetchedUrl(url);
        if (!proxied) {
            try { proxied = await getProxied(url); }
            catch (err) { return showError(err.message); }
        }

        loader.stage("loading");

        let loaded = false;
        frame.onload = () => {
            loaded = true;
            loader.stage("rendering");
            setTimeout(finishLoad, 60);
        };
        frame.onerror = () => showError("Failed to load page.");
        frame.src = proxied;

        setTimeout(() => {
            if (!loaded) frame.classList.add("visible");
        }, 1500);

        loadWatchdog = setTimeout(() => {
            if (loaded) return;
            clearWatchdog();
            loader.finish();
            frame.classList.add("visible");
        }, 25000);
    } catch (err) {
        showError(err.message || "Unknown error");
    }
}

function parseInput(value) {
    const v = (value || "").trim();
    if (!v) return null;
    const engineKey = localStorage.getItem("nocturne-engine") || "duckduckgo";
    const engine = ENGINES[engineKey] || ENGINES.duckduckgo;
    
    if (/^https?:\/\//i.test(v)) return v;
    if (v.includes(".") && !v.includes(" ") && !v.startsWith("http")) {
        return "https://" + v;
    }
    if (v.startsWith("localhost") || /^\d{1,3}(\.\d{1,3}){3}/.test(v)) {
        return "http://" + v;
    }
    
    return engine.url(v);
}

async function serverModerationCheck(rawQuery) {
    try {
        const r = await fetch("/api/moderation/check", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: rawQuery })
        });
        if (!r.ok) return { blocked: false };
        return await r.json();
    } catch { return { blocked: false }; }
}

async function promptOverride(rawQuery) {
    const modal = document.getElementById("overrideModal");
    const input = document.getElementById("overrideInput");
    const err = document.getElementById("overrideErr");
    const submit = document.getElementById("overrideSubmit");
    const cancel = document.getElementById("overrideCancel");
    const desc = document.getElementById("overrideDesc");
    if (!modal) return false;
    desc.textContent = "This search has been flagged. Enter the override password to continue, or it will be denied and you will be banned for 24 hours.";
    err.textContent = "";
    input.value = "";
    modal.classList.add("open");
    setTimeout(() => input.focus(), 50);

    return new Promise(resolve => {
        const close = (allowed) => {
            modal.classList.remove("open");
            submit.removeEventListener("click", onSubmit);
            cancel.removeEventListener("click", onCancel);
            input.removeEventListener("keydown", onKey);
            resolve(allowed);
        };
        const onSubmit = async () => {
            const pw = input.value;
            submit.disabled = true;
            try {
                const r = await fetch("/api/moderation/override", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: rawQuery, password: pw })
                });
                const j = await r.json().catch(() => ({}));
                if (j.allowed) {
                    close(true);
                } else {
                    err.textContent = j.error || "Wrong password";
                }
            } catch (e) {
                err.textContent = "Request failed";
            } finally {
                submit.disabled = false;
            }
        };
        const onCancel = () => close(false);
        const onKey = e => {
            if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
            if (e.key === "Escape") onCancel();
        };
        submit.addEventListener("click", onSubmit);
        cancel.addEventListener("click", onCancel);
        input.addEventListener("keydown", onKey);
    });
}

searchForm.addEventListener("submit", async e => {
    e.preventDefault();
    const raw = searchHome.value;
    console.log("[monkturne] Search submitted:", raw);
    const url = parseInput(raw);
    if (url) { 
        console.log("[monkturne] Loading URL:", url);
        searchHome.value = ""; 
        load(url); 
    } else {
        console.warn("[monkturne] Parse input returned null for:", raw);
    }
});

urlBar.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const raw = urlBar.value;
    console.log("[monkturne] URL bar submitted:", raw);
    const url = parseInput(raw);
    if (url) load(url);
});

btnBack.addEventListener("click", () => {
    if (navIndex > 0) { navIndex--; updateNavButtons(); load(navStack[navIndex], false); }
});
btnFwd.addEventListener("click", () => {
    if (navIndex < navStack.length - 1) { navIndex++; updateNavButtons(); load(navStack[navIndex], false); }
});
document.getElementById("btnReload").addEventListener("click", () => { if (lastURL) load(lastURL, false); });
document.getElementById("btnFullscreen").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.requestFullscreen?.();
});

document.getElementById("retryBtn").addEventListener("click", () => { if (lastURL) load(lastURL, false); });
document.getElementById("homeFromErrorBtn").addEventListener("click", () => showHome());

if (dockHome) dockHome.addEventListener("click", () => showHome());

fxToggle.addEventListener("change", () => {
    const on = fxToggle.checked;
    window.dispatchEvent(new CustomEvent("nocturne:bgfx", { detail: on }));
    localStorage.setItem("nocturne-bgfx", on ? "1" : "0");
});

const debugToggle = document.getElementById("debugToggle");
if (debugToggle) {
    debugToggle.checked = localStorage.getItem("nocturne-debug") === "1";
    debugToggle.addEventListener("change", () => {
        window.dispatchEvent(new CustomEvent("nocturne:debug", { detail: debugToggle.checked }));
    });
}

for (const id in ENGINES) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = ENGINES[id].label;
    engineSelect.appendChild(opt);
}
engineSelect.value = currentEngine;
engineSelect.addEventListener("change", () => {
    currentEngine = engineSelect.value;
    localStorage.setItem("nocturne-engine", currentEngine);
});

cloakSelect.innerHTML = '<option value="">Off</option>' +
    listCloaks().map(c => `<option value="${c.id}">${c.title.replace(/"/g, "&quot;")}</option>`).join("");
cloakSelect.value = localStorage.getItem("nocturne-cloak") || "";
cloakSelect.addEventListener("change", () => {
    const v = cloakSelect.value;
    if (v) applyCloak(v); else resetCloak();
});

if (localStorage.getItem("nocturne-auto-cloak") === "1" && window.self === window.top && window.name !== "__monkturne_cloak") {
    const win = window.open('about:blank', '_blank');
    if (win) {
        const doc = win.document;
        const iframe = doc.createElement('iframe');
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.border = 'none';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.src = window.location.href;
        win.name = "__monkturne_cloak";
        doc.body.style.margin = '0';
        doc.body.style.padding = '0';
        doc.body.style.overflow = 'hidden';
        doc.body.appendChild(iframe);
        window.location.replace('https://classroom.google.com');
    }
}

document.getElementById("resetProxyBtn").addEventListener("click", () => {
    localStorage.setItem("nocturne-reset", "true");
    location.reload();
});

document.querySelectorAll(".link-btn[data-url]").forEach(btn => {
    btn.addEventListener("click", () => load(btn.getAttribute("data-url")));
});

wireHoverPrefetch();

document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        window.location.replace("https://www.google.com");
        return;
    }
});

window.addEventListener("popstate", () => {
    const h = window.location.hash;
    if (h.startsWith("#search/")) {
        const enc = h.slice(8);
        const decoded = deobfuscate(enc);
        if (decoded) load(decoded, false);
    } else {
        showHome(false);
    }
});

const initHash = window.location.hash;
if (initHash.startsWith("#search/")) {
    const enc = initHash.slice(8);
    const decoded = deobfuscate(enc);
    if (decoded) load(decoded);
}

updateNavButtons();
initPerformance();

import { BareMuxConnection } from "./baremux/index.mjs";

const NOCTURNE_VERSION = "5";

const PROXY_ENGINE = "scramjet";
const SW_PATH = "scramworker.js";

async function clearOldSW() {
    if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
    }
    await new Promise(r => setTimeout(r, 200));
}

if (window.self === window.top) {
    (async () => {
        const storedVer = localStorage.getItem("nocturne-version");
        const resetFlag = localStorage.getItem("nocturne-reset");
        const swapFlag = localStorage.getItem("nocturne-engine-swap");
        if (storedVer !== NOCTURNE_VERSION || resetFlag === "true" || swapFlag === "true") {
            await clearOldSW();
            await new Promise(resolve => {
                const req = indexedDB.deleteDatabase("$scramjet");
                req.onsuccess = resolve;
                req.onerror = resolve;
                req.onblocked = () => setTimeout(resolve, 400);
            });
            localStorage.setItem("nocturne-version", NOCTURNE_VERSION);
            localStorage.removeItem("nocturne-reset");
            localStorage.removeItem("nocturne-engine-swap");
        }
    })();
}

const AUTO_RESET_COOLDOWN_MS = 60_000;
let autoResetFired = false;

function triggerAutoReset(reason) {
    if (autoResetFired) return false;
    const last = parseInt(localStorage.getItem("nocturne-last-autoreset") || "0", 10);
    if (Date.now() - last < AUTO_RESET_COOLDOWN_MS) {
        console.warn("[monkturne] auto-reset suppressed (cooldown):", reason);
        return false;
    }
    autoResetFired = true;
    localStorage.setItem("nocturne-last-autoreset", String(Date.now()));
    localStorage.setItem("nocturne-reset", "true");
    console.warn("[monkturne] auto-reset:", reason);
    setTimeout(() => location.reload(), 50);
    return true;
}

async function registerSW() {
    if (!navigator.serviceWorker) throw new Error("Service workers not supported.");
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) existing.update().catch(() => {});
    else {
        const opts = { scope: "/", updateViaCache: "none" };
        if (PROXY_ENGINE === "nocturne") opts.type = "module";
        await navigator.serviceWorker.register(SW_PATH, opts);
    }

    await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, rej) => setTimeout(() => rej(new Error("SW ready timeout")), 4000))
    ]);

    if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
            setTimeout(resolve, 1200);
        });
    }
}

let _swReady = Promise.resolve();
if (window.self === window.top) {
    _swReady = registerSW().catch(e => { triggerAutoReset("sw: " + e.message); });
}

const connection = new BareMuxConnection("bareworker.js");
const EPOXY_URL = "https://cdn.jsdelivr.net/npm/@mercuryworkshop/epoxy-transport/dist/index.mjs";

function makeTransportCode() {
    return 'const { default: EpoxyBase } = await import("' + EPOXY_URL + '");\
function fixHeaders(h) { \
    if (!h) return h; \
    if (typeof h[Symbol.iterator] === "function") return h; \
    return Object.entries(h); \
} \
function entriesToObj(h) { \
    if (!h || typeof h !== "object") return h; \
    if (!Array.isArray(h)) return h; \
    const obj = {}; \
    for (let i = 0; i < h.length; i++) { \
        const pair = h[i]; \
        if (Array.isArray(pair) && pair.length >= 2) { \
            const key = pair[0].toLowerCase(); \
            obj[key] = obj[key] ? obj[key] + ", " + pair[1] : pair[1]; \
        } \
    } \
    return obj; \
} \
class EpoxyWrapped extends EpoxyBase { \
    async request(remote, method, body, headers, signal) { \
        const resp = await super.request(remote, method, body, fixHeaders(headers), signal); \
        resp.headers = entriesToObj(resp.headers); \
        return resp; \
    } \
    connect(url, protocols, reqHeaders, onopen, onmessage, onclose, onerror) { \
        return super.connect(url, protocols, fixHeaders(reqHeaders), onopen, onmessage, onclose, onerror); \
    } \
} \
return [EpoxyWrapped, "' + EPOXY_URL + '"];';
}

const WISP_PATHS = [
    "wss://wisp.mercurywork.shop/",
    "/api/sync/",
    "/api/v1/sync/",
    "/api/v2/connect/",
    "/api/realtime/",
    "/api/notifications/",
    "/api/feed/",
    "/api/channel/",
    "/api/stream/"
];

function shuffleArr(a) {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

let _transportReady = Promise.resolve();

if (window.self === window.top) {
    const wispProto = location.protocol === "https:" ? "wss:" : "ws:";
    const code = makeTransportCode();
    const transportPref = localStorage.getItem("nocturne-transport-pref") || "auto";
    const useCfDns = localStorage.getItem("nocturne-cf-dns") !== "0";

    const lastGood = localStorage.getItem("nocturne-wisp-path");
    let candidates = shuffleArr(WISP_PATHS);
    
    // Cloudflare specific candidates if selected
    if (transportPref === "cloudflare") {
        candidates = ["/api/v2/connect/", "/api/sync/", ...candidates];
    }
    
    if (lastGood && WISP_PATHS.includes(lastGood)) {
        candidates = [lastGood, ...candidates.filter(p => p !== lastGood)];
    }
    candidates = candidates.slice(0, 4);

    _transportReady = (async () => {
        let lastError = null;
        for (let i = 0; i < candidates.length; i++) {
            const path = candidates[i];
            let wispUrl = path;
            if (!path.includes("://")) {
                wispUrl = wispProto + "//" + location.host + path;
            }
            const opts = [{ wisp: wispUrl }];
            
            if (useCfDns) {
                // Add DNS preference for Epoxy/Bare-Mux if the implementation supports it in opts
                // Many epoxy implementations look for 'dns' or 'udp' flags
                opts[0].dns = "1.1.1.1";
            }

            const timeoutMs = i === 0 ? 6000 : 3500;
            try {
                await Promise.race([
                    connection.setManualTransport(code, opts),
                    new Promise((_, r) => setTimeout(() => r(new Error("timeout @ " + path)), timeoutMs))
                ]);
                localStorage.setItem("nocturne-wisp-path", path);
                window.dispatchEvent(new CustomEvent("nocturne:transport", { detail: { ok: true, path } }));
                return;
            } catch (e) {
                lastError = e;
                console.warn("[monkturne] wisp path failed:", path, e.message);
                await new Promise(r => setTimeout(r, 200));
            }
        }
        const errMsg = (lastError && lastError.message) || "all wisp paths failed";
        window.dispatchEvent(new CustomEvent("nocturne:transport", { detail: { ok: false, error: errMsg } }));
        triggerAutoReset("transport: " + errMsg);
    })();
}

async function loadScramjetScript() {
    if (window.$scramjetLoadController) return;
    await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "scram/scramjet.all.js";
        s.async = true;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
    });
}

function buildController() {
    if (!window.$scramjetLoadController) return null;
    const loader = window.$scramjetLoadController();
    return new loader.ScramjetController({
        files: {
            wasm: "scram/scramjet.wasm.wasm",
            all: "scram/scramjet.all.js",
            sync: "scram/scramjet.sync.js"
        },
        flags: {
            rewriterLogs: false,
            captureErrors: true,
            cleanErrors: true,
            sourcemaps: false,
            scramitize: false
        },
        siteFlags: {
            ".*": {
                aggressive: true,
                rewriteUrls: true,
                handleWebSockets: true
            }
        }
    });
}

function pingSWConfig() {
    const c = navigator.serviceWorker?.controller;
    if (!c) return;
    try { c.postMessage({ scramjet$type: "loadConfig" }); } catch {}
}

async function initScramjet() {
    let sc = buildController();
    if (!sc) return;
    try {
        await sc.init();
        window.__scramjet = sc;
        pingSWConfig();
        setTimeout(pingSWConfig, 400);
        setTimeout(pingSWConfig, 1200);
        window.dispatchEvent(new CustomEvent("nocturne:scramjet", { detail: { ok: true } }));
        return;
    } catch (e) {}

    try { if (sc.db) sc.db.close(); } catch {}
    await new Promise(resolve => {
        const req = indexedDB.deleteDatabase("$scramjet");
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = () => setTimeout(resolve, 400);
    });

    sc = buildController();
    await sc.init();
    window.__scramjet = sc;
    pingSWConfig();
    setTimeout(pingSWConfig, 400);
    setTimeout(pingSWConfig, 1200);
    window.dispatchEvent(new CustomEvent("nocturne:scramjet", { detail: { ok: true } }));
}

if (window.self === window.top && PROXY_ENGINE === "scramjet") {
    (async () => {
        try {
            const scriptLoad = loadScramjetScript();
            await _swReady;
            await scriptLoad;
            if ("locks" in navigator) await navigator.locks.request("nocturne-scramjet", initScramjet);
            else await initScramjet();
        } catch (e) {
            window.dispatchEvent(new CustomEvent("nocturne:scramjet", { detail: { ok: false, error: e.message } }));
            triggerAutoReset("scramjet: " + e.message);
        }
    })();
}

function waitFor(fn, ms = 30000) {
    return new Promise((resolve, reject) => {
        if (fn()) return resolve();
        const deadline = setTimeout(() => { clearInterval(t); reject(new Error("Proxy not ready (timeout)")); }, ms);
        const t = setInterval(() => {
            if (fn()) { clearInterval(t); clearTimeout(deadline); resolve(); }
        }, 60);
    });
}

function nocturneEncode(url) {
    const bytes = new TextEncoder().encode(url);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getProxied(url) {
    await Promise.all([
        _swReady,
        waitFor(() => !!window.__scramjet),
        _transportReady
    ]);
    return window.__scramjet.encodeUrl(url);
}

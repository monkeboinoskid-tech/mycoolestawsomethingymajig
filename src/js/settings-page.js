import { listCloaks, applyCloak, restoreCloak, reset as resetCloak } from "./cloak.js";

const $ = id => document.getElementById(id);

const PREFS = {
    bgColor:       "nocturne-bg-color",
    panelColor:    "nocturne-panel-color",
    panelOpacity:  "nocturne-panel-opacity",
    starDensity:   "nocturne-star-density",
    bgImage:       "nocturne-bg-image",
    bgOpacity:     "nocturne-bg-opacity",
    bgBlur:        "nocturne-bg-blur",
    bgFx:          "nocturne-bgfx",
    accent:        "nocturne-accent" ,
    uiScale:       "nocturne-ui-scale",
    reduceMotion:  "nocturne-reduce-motion",
    searchEngine:  "nocturne-engine",
    cloak:         "nocturne-cloak",
    autoCloak:     "nocturne-auto-cloak",
    cfDns:         "nocturne-cf-dns",
    transport:     "nocturne-transport-pref",
    proxyEngine:   "nocturne-proxy-engine",
    debug:         "nocturne-debug"
};

const ENGINES = {
    duckduckgo: "DuckDuckGo",
    google:     "Google",
    bing:       "Bing",
    brave:      "Brave",
    startpage:  "Startpage"
};

const CLOAKS = [
    { id: "", title: "Off" },
    ...listCloaks()
];

function get(key, dflt) {
    const v = localStorage.getItem(key);
    return v == null ? dflt : v;
}
function set(key, value) {
    if (value == null || value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
}

function applyAccent(color) {
    if (!color) {
        document.documentElement.style.removeProperty("--accent");
        document.documentElement.style.removeProperty("--accent-2");
        return;
    }
    document.documentElement.style.setProperty("--accent", color);
    const darker = shadeColor(color, -25);
    document.documentElement.style.setProperty("--accent-2", darker);
}

function shadeColor(hex, percent) {
    const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (!m) return hex;
    let r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    const f = (1 + percent / 100);
    r = Math.max(0, Math.min(255, Math.round(r * f)));
    g = Math.max(0, Math.min(255, Math.round(g * f)));
    b = Math.max(0, Math.min(255, Math.round(b * f)));
    return "#" + r.toString(16).padStart(2,"0") + g.toString(16).padStart(2,"0") + b.toString(16).padStart(2,"0");
}

function applyBgImage(dataUrl, opacity, blur) {
    let el = document.getElementById("__nocturneBg");
    if (!dataUrl) {
        if (el) el.remove();
        return;
    }
    if (!el) {
        el = document.createElement("div");
        el.id = "__nocturneBg";
        el.style.cssText = "position:fixed;inset:0;z-index:0;pointer-events:none;background-position:center;background-size:cover;background-repeat:no-repeat;transition:opacity 0.2s,filter 0.2s";
        document.body.insertBefore(el, document.body.firstChild);
    }
    el.style.backgroundImage = `url("${dataUrl}")`;
    el.style.opacity = (parseInt(opacity, 10) || 100) / 100;
    el.style.filter = `blur(${parseInt(blur, 10) || 0}px)`;
}

function applyUiScale(percent) {
    const v = parseInt(percent, 10) || 100;
    document.documentElement.style.fontSize = (16 * v / 100) + "px";
    document.documentElement.style.zoom = v / 100;
}

function applyReduceMotion(on) {
    document.documentElement.classList.toggle("reduce-motion", !!on);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function applyPanelStyle() {
    const color = get(PREFS.panelColor, "#0d0e1a");
    const opacity = get(PREFS.panelOpacity, "60");
    const rgb = hexToRgb(color);
    if (rgb) {
        document.documentElement.style.setProperty("--panel", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity / 100})`);
    } else {
        document.documentElement.style.setProperty("--panel", `rgba(13, 14, 26, ${opacity / 100})`);
    }
}

function applyAll() {
    applyAccent(get(PREFS.accent, ""));
    const bgColor = get(PREFS.bgColor, "");
    if (bgColor) document.body.style.backgroundColor = bgColor;
    applyPanelStyle();
    applyBgImage(get(PREFS.bgImage, ""), get(PREFS.bgOpacity, "100"), get(PREFS.bgBlur, "0"));
    applyUiScale(get(PREFS.uiScale, "100"));
    applyReduceMotion(get(PREFS.reduceMotion, "0") === "1");
}

(function bootBackground() {
    const bgFx = get(PREFS.bgFx, "1");
    if (bgFx === "0") {
        const c = document.getElementById("bgCanvas");
        if (c) c.style.display = "none";
    }
    applyAll();
})();

const engineSelect = $("engineSelect");
Object.entries(ENGINES).forEach(([id, label]) => {
    const opt = document.createElement("option");
    opt.value = id; opt.textContent = label;
    engineSelect.appendChild(opt);
});
engineSelect.value = get(PREFS.searchEngine, "duckduckgo");
engineSelect.addEventListener("change", () => set(PREFS.searchEngine, engineSelect.value));

const cfDnsToggle = $("cfDnsToggle");
cfDnsToggle.checked = get(PREFS.cfDns, "1") === "1"; // Default to ON
cfDnsToggle.addEventListener("change", () => {
    set(PREFS.cfDns, cfDnsToggle.checked ? "1" : "0");
    localStorage.setItem("nocturne-engine-swap", "true"); // Force reload on next boot
});

const transportSelect = $("transportSelect");
transportSelect.value = get(PREFS.transport, "auto");
transportSelect.addEventListener("change", () => {
    set(PREFS.transport, transportSelect.value);
    localStorage.setItem("nocturne-engine-swap", "true");
});

const autoCloakToggle = $("autoCloakToggle");
autoCloakToggle.checked = get(PREFS.autoCloak, "0") === "1";
autoCloakToggle.addEventListener("change", () => {
    set(PREFS.autoCloak, autoCloakToggle.checked ? "1" : "0");
    if (autoCloakToggle.checked) {
        if (confirm("Monkturne will now try to cloak in about:blank. Proceed?")) {
            cloakToAboutBlank();
        }
    }
});

function cloakToAboutBlank() {
    try {
        const win = window.open();
        if (!win || win.closed) {
            alert("Popup blocked! Please allow popups for Monkturne to cloak.");
            return;
        }
        const doc = win.document;
        const iframe = doc.createElement('iframe');
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.border = 'none';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.src = window.location.href;
        
        doc.body.style.margin = '0';
        doc.body.style.padding = '0';
        doc.body.style.overflow = 'hidden';
        doc.title = document.title;
        
        // Link favicon
        const currentIcon = document.querySelector('link[rel="icon"]')?.href;
        if (currentIcon) {
            const link = doc.createElement('link');
            link.rel = 'icon';
            link.href = currentIcon;
            doc.head.appendChild(link);
        }

        doc.body.appendChild(iframe);
        
        // Redirect current tab to hide it
        window.location.replace('https://classroom.google.com');
    } catch (e) {
        console.error("Cloak failed", e);
    }
}

const cloakSelect = $("cloakSelect");
CLOAKS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id; opt.textContent = c.title || c.label;
    cloakSelect.appendChild(opt);
});
cloakSelect.value = get(PREFS.cloak, "");
cloakSelect.addEventListener("change", () => {
    const v = cloakSelect.value;
    set(PREFS.cloak, v);
    if (v) applyCloak(v); else resetCloak();
});

const proxyEngineSelect = $("proxyEngineSelect");
proxyEngineSelect.value = "scramjet";

const debugToggle = $("debugToggle");
debugToggle.checked = get(PREFS.debug, "0") === "1";
debugToggle.addEventListener("change", () => {
    set(PREFS.debug, debugToggle.checked ? "1" : "0");
    window.dispatchEvent(new CustomEvent("nocturne:debug", { detail: debugToggle.checked }));
});

const fxToggle = $("fxToggle");
fxToggle.checked = get(PREFS.bgFx, "1") !== "0";
fxToggle.addEventListener("change", () => {
    const on = fxToggle.checked;
    set(PREFS.bgFx, on ? "1" : "0");
    const c = document.getElementById("bgCanvas");
    if (c) c.style.display = on ? "" : "none";
    window.dispatchEvent(new CustomEvent("nocturne:bgfx", { detail: on }));
});

const reduceMotionToggle = $("reduceMotionToggle");
reduceMotionToggle.checked = get(PREFS.reduceMotion, "0") === "1";
reduceMotionToggle.addEventListener("change", () => {
    set(PREFS.reduceMotion, reduceMotionToggle.checked ? "1" : "0");
    applyReduceMotion(reduceMotionToggle.checked);
});

const scaleRange = $("scaleRange");
scaleRange.value = get(PREFS.uiScale, "100");
$("scaleVal").textContent = scaleRange.value + "%";
scaleRange.addEventListener("input", () => {
    $("scaleVal").textContent = scaleRange.value + "%";
    set(PREFS.uiScale, scaleRange.value);
    applyUiScale(scaleRange.value);
});

const panelColorPicker = $("panelColorPicker");
const panelResetColorBtn = $("panelResetColorBtn");
const panelOpacityRange = $("panelOpacityRange");
const starDensityRange = $("starDensityRange");

panelColorPicker.value = get(PREFS.panelColor, "#0d0e1a");
panelColorPicker.addEventListener("input", () => {
    set(PREFS.panelColor, panelColorPicker.value);
    applyPanelStyle();
    window.dispatchEvent(new CustomEvent("nocturne:panelcolor", { detail: panelColorPicker.value }));
});
panelResetColorBtn.addEventListener("click", () => {
    localStorage.removeItem(PREFS.panelColor);
    panelColorPicker.value = "#0d0e1a";
    applyPanelStyle();
    window.dispatchEvent(new CustomEvent("nocturne:panelcolor", { detail: "" }));
});

panelOpacityRange.value = get(PREFS.panelOpacity, "60");
$("panelOpacityVal").textContent = panelOpacityRange.value + "%";
panelOpacityRange.addEventListener("input", () => {
    $("panelOpacityVal").textContent = panelOpacityRange.value + "%";
    set(PREFS.panelOpacity, panelOpacityRange.value);
    applyPanelStyle();
    window.dispatchEvent(new CustomEvent("nocturne:panelopacity", { detail: panelOpacityRange.value }));
});

starDensityRange.value = get(PREFS.starDensity, "100");
starDensityRange.addEventListener("input", () => {
    set(PREFS.starDensity, starDensityRange.value);
    window.dispatchEvent(new CustomEvent("nocturne:stardensity", { detail: starDensityRange.value }));
});

const bgColorPicker = $("bgColorPicker");
const bgResetColorBtn = $("bgResetColorBtn");

bgColorPicker.value = get(PREFS.bgColor, "#05060d");
bgColorPicker.addEventListener("input", () => {
    const color = bgColorPicker.value;
    set(PREFS.bgColor, color);
    document.body.style.backgroundColor = color;
    window.dispatchEvent(new CustomEvent("nocturne:bgcolor", { detail: color }));
});

bgResetColorBtn.addEventListener("click", () => {
    localStorage.removeItem(PREFS.bgColor);
    document.body.style.backgroundColor = "";
    bgColorPicker.value = "#05060d";
    window.dispatchEvent(new CustomEvent("nocturne:bgcolor", { detail: "" }));
});

const opacityRange = $("bgOpacityRange");
opacityRange.value = get(PREFS.bgOpacity, "100");
$("bgOpacityVal").textContent = opacityRange.value + "%";
opacityRange.addEventListener("input", () => {
    $("bgOpacityVal").textContent = opacityRange.value + "%";
    set(PREFS.bgOpacity, opacityRange.value);
    applyBgImage(get(PREFS.bgImage, ""), opacityRange.value, get(PREFS.bgBlur, "0"));
});

const blurRange = $("bgBlurRange");
blurRange.value = get(PREFS.bgBlur, "0");
$("bgBlurVal").textContent = blurRange.value + "px";
blurRange.addEventListener("input", () => {
    $("bgBlurVal").textContent = blurRange.value + "px";
    set(PREFS.bgBlur, blurRange.value);
    applyBgImage(get(PREFS.bgImage, ""), get(PREFS.bgOpacity, "100"), blurRange.value);
});

function paintBgPreview() {
    const dataUrl = get(PREFS.bgImage, "");
    const preview = $("bgPreview");
    if (dataUrl) {
        preview.classList.remove("empty");
        preview.style.backgroundImage = `url("${dataUrl}")`;
    } else {
        preview.classList.add("empty");
        preview.style.backgroundImage = "";
    }
}
paintBgPreview();

$("bgUploadBtn").addEventListener("click", () => $("bgUploadInput").click());
$("bgUploadInput").addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert("Image must be under 5 MB.");
        return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
        const dataUrl = ev.target.result;
        set(PREFS.bgImage, dataUrl);
        applyBgImage(dataUrl, get(PREFS.bgOpacity, "100"), get(PREFS.bgBlur, "0"));
        paintBgPreview();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
});

$("bgClearBtn").addEventListener("click", () => {
    set(PREFS.bgImage, "");
    applyBgImage("", 100, 0);
    paintBgPreview();
});

const accentPicker = $("accentPicker");
const currentAccent = get(PREFS.accent, "#b8b0da");
accentPicker.value = currentAccent;

function markSwatch(color) {
    document.querySelectorAll(".swatch").forEach(s => s.classList.toggle("selected", s.dataset.color.toLowerCase() === (color || "").toLowerCase()));
}
markSwatch(currentAccent);

document.querySelectorAll(".swatch").forEach(s => {
    s.addEventListener("click", () => {
        const color = s.dataset.color;
        set(PREFS.accent, color);
        applyAccent(color);
        markSwatch(color);
        accentPicker.value = color;
    });
});
accentPicker.addEventListener("input", () => {
    const color = accentPicker.value;
    set(PREFS.accent, color);
    applyAccent(color);
    markSwatch(color);
});

$("resetProxyBtn").addEventListener("click", () => {
    if (!confirm("Reset proxy state? This clears the service worker and reloads.")) return;
    localStorage.setItem("nocturne-reset", "true");
    location.reload();
});

$("resetAllBtn").addEventListener("click", () => {
    if (!confirm("Reset every Monkturne setting to default? You will not be signed out.")) return;
    Object.values(PREFS).forEach(k => localStorage.removeItem(k));
    location.reload();
});

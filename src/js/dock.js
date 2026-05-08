(function applyGlobalPrefs() {
    try {
        const accent = localStorage.getItem("nocturne-accent");
        if (accent) {
            document.documentElement.style.setProperty("--accent", accent);
            const m = accent.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
            if (m) {
                const r = Math.max(0, Math.round(parseInt(m[1], 16) * 0.75));
                const g = Math.max(0, Math.round(parseInt(m[2], 16) * 0.75));
                const b = Math.max(0, Math.round(parseInt(m[3], 16) * 0.75));
                document.documentElement.style.setProperty("--accent-2",
                    "#" + r.toString(16).padStart(2,"0") + g.toString(16).padStart(2,"0") + b.toString(16).padStart(2,"0"));
            }
        }
        const scale = parseInt(localStorage.getItem("nocturne-ui-scale") || "100", 10);
        if (scale && scale !== 100) {
            document.documentElement.style.fontSize = (16 * scale / 100) + "px";
            document.documentElement.style.zoom = scale / 100;
        }
        if (localStorage.getItem("nocturne-reduce-motion") === "1") {
            document.documentElement.classList.add("reduce-motion");
        }
        const bgColor = localStorage.getItem("nocturne-bg-color");
        if (bgColor) {
            document.body.style.backgroundColor = bgColor;
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
            const panelColor = localStorage.getItem("nocturne-panel-color") || "#0d0e1a";
            const panelOpacity = localStorage.getItem("nocturne-panel-opacity") || "60";
            const rgb = hexToRgb(panelColor);
            if (rgb) {
                document.documentElement.style.setProperty("--panel", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${panelOpacity / 100})`);
            } else {
                document.documentElement.style.setProperty("--panel", `rgba(13, 14, 26, ${panelOpacity / 100})`);
            }
        }
        applyPanelStyle();

        window.addEventListener("nocturne:panelcolor", applyPanelStyle);
        window.addEventListener("nocturne:panelopacity", applyPanelStyle);

        if (localStorage.getItem("nocturne-auto-cloak") === "1" && window.self === window.top && !window.name.includes('cloak')) {
            // Already handled by first-load logic usually, but here's a safe check
        }

        const bg = localStorage.getItem("nocturne-bg-image");
        if (bg) {
            const op = (parseInt(localStorage.getItem("nocturne-bg-opacity") || "100", 10) || 100) / 100;
            const bl = parseInt(localStorage.getItem("nocturne-bg-blur") || "0", 10) || 0;
            const apply = () => {
                if (document.getElementById("__nocturneBg")) return;
                const el = document.createElement("div");
                el.id = "__nocturneBg";
                el.style.cssText = `position:fixed;inset:0;z-index:0;pointer-events:none;background:center/cover no-repeat url("${bg}");opacity:${op};filter:blur(${bl}px)`;
                document.body.insertBefore(el, document.body.firstChild);
            };
            if (document.body) apply();
            else document.addEventListener("DOMContentLoaded", apply, { once: true });
        }
    } catch {}
})();

(function() {
    const dock = document.getElementById("dock");
    if (!dock || dock.dataset.docked === "1") return;
    dock.dataset.docked = "1";

    const base = (function() {
        const p = window.location.pathname;
        const pages = ["/settings.html", "/games.html", "/apps.html", "/code.html", "/banned.html", "/portable.html", "/privacy.html", "/terms.html", "/index.html"];
        for (const pg of pages) {
            const idx = p.lastIndexOf(pg);
            if (idx !== -1) return p.substring(0, idx + 1);
        }
        return p.substring(0, p.lastIndexOf("/") + 1);
    })();

    const resolve = (p) => {
        if (p.includes("://") || p.startsWith("#")) return p;
        return base + p;
    };

    const ICONS = {
        home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></svg>',
        games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11h4M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/></svg>',
        settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        apps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
        editor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/></svg>',
        movies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="7" y1="3" x2="7" y2="21"/><line x1="17" y1="3" x2="17" y2="21"/><line x1="2" y1="9" x2="7" y2="9"/><line x1="2" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="22" y2="9"/><line x1="17" y1="15" x2="22" y2="15"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
        tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.8 2.8 0 1 1-4-4z"/><path d="M14.7 6.3l3-3 4 4-3 3"/></svg>',
        ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/><line x1="9" y1="10" x2="9" y2="14"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="15" y1="11" x2="15" y2="13"/></svg>',
        account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        legal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M5 7l7-2 7 2"/><path d="M2 11l3-4 3 4-3 4z"/><path d="M16 11l3-4 3 4-3 4z"/></svg>'
    };

    const isHome = !!document.getElementById("homePage");
    const settingsBtn = `<a class="dock-btn" data-path="settings.html" href="${resolve("settings.html")}" aria-label="Settings">${ICONS.settings}</a>`;
    const homeBtn = isHome
        ? `<button class="dock-btn" id="dockHome" data-path="index.html" aria-label="Home">${ICONS.home}</button>`
        : `<a class="dock-btn" data-path="index.html" href="${resolve("index.html")}" aria-label="Home">${ICONS.home}</a>`;

    dock.innerHTML = `
        ${homeBtn}
        <a class="dock-btn" data-path="games.html" href="${resolve("games.html")}" aria-label="Games">${ICONS.games}</a>
        ${settingsBtn}
        <button class="dock-btn dock-toggle" id="dockExpand" aria-label="More apps" aria-expanded="false">${ICONS.plus}</button>
        <div class="dock-popover" id="dockPopover" role="menu">
            <a class="dock-btn" data-path="apps.html" href="${resolve("apps.html")}" aria-label="Apps" role="menuitem">${ICONS.apps}</a>
            <a class="dock-btn" data-path="code.html" href="${resolve("code.html")}" aria-label="Editor" role="menuitem">${ICONS.editor}</a>
            <a class="dock-btn" data-path="movies.html" href="${resolve("movies.html")}" aria-label="Movies" role="menuitem">${ICONS.movies}</a>
            <a class="dock-btn" data-path="tools.html" href="${resolve("tools.html")}" aria-label="Tools" role="menuitem">${ICONS.tools}</a>
            <a class="dock-btn" data-path="ai.html" href="${resolve("ai.html")}" aria-label="AI" role="menuitem">${ICONS.ai}</a>
            <a class="dock-btn" data-path="account.html" href="${resolve("account.html")}" aria-label="Account" role="menuitem">${ICONS.account}</a>
            <a class="dock-btn" data-path="legal.html" href="${resolve("legal.html")}" aria-label="Legal" role="menuitem">${ICONS.legal}</a>
        </div>`;

    const path = location.pathname.split("/").pop() || "index.html";
    dock.querySelectorAll("[data-path]").forEach(el => {
        const p = el.dataset.path;
        const match = (p === "index.html" && (path === "" || path === "index.html" || path === "/")) ||
                      p === path;
        if (match) el.classList.add("active");
    });
    if (dock.querySelector(".dock-popover .active")) {
        document.getElementById("dockExpand").classList.add("has-active");
    }

    const expand = document.getElementById("dockExpand");
    const popover = document.getElementById("dockPopover");

    function close() {
        popover.classList.remove("open");
        expand.classList.remove("open");
        expand.setAttribute("aria-expanded", "false");
    }
    function open() {
        popover.classList.add("open");
        expand.classList.add("open");
        expand.setAttribute("aria-expanded", "true");
    }
    function toggle() {
        if (popover.classList.contains("open")) close(); else open();
    }

    expand.addEventListener("click", e => { e.stopPropagation(); toggle(); });
    document.addEventListener("click", e => {
        if (!popover.classList.contains("open")) return;
        if (e.target.closest("#dockPopover") || e.target.closest("#dockExpand")) return;
        close();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") close();
    });
})();

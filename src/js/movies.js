const VIDKING_BASE = "https://www.vidking.net/embed";
const VIDKING_COLOR = "8a80b6";
const POSTER_SIZE = "w342";
const BACKDROP_SIZE = "w1280";
const PROFILE_SIZE = "w185";
const STILL_SIZE = "w300";

const state = {
    imageBase: "https://image.tmdb.org/t/p",
    configured: false,
    heroItems: [],
    heroIndex: 0,
    heroTimer: 0,
    searchTimer: 0,
    activeKind: "all",
    detail: null,
    season: 1,
    seasonsCache: {}
};

const $ = id => document.getElementById(id);

function img(path, size) {
    if (!path) return "";
    return `${state.imageBase}/${size}${path}`;
}

function fmtRuntime(min) {
    if (!min) return "";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}

function fmtYear(d) { return d ? String(d).slice(0, 4) : ""; }

function debounce(fn, ms) {
    let t = 0;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

async function api(path) {
    // Determine base URL for API calls. 
    // On AI Studio/local, it's relative.
    // On static hosts like GH Pages, it's impossible without a CORS proxy or similar.
    const r = await fetch(path);
    if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
    }
    return r.json();
}

function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function kindOf(item) {
    return item.media_type || (item.first_air_date ? "tv" : "movie");
}

function titleOf(item) { return item.title || item.name || ""; }
function dateOf(item) { return item.release_date || item.first_air_date || ""; }

function renderCard(item, opts = {}) {
    const k = kindOf(item);
    const t = titleOf(item);
    const yr = fmtYear(dateOf(item));
    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : "";
    const poster = img(item.poster_path, POSTER_SIZE);
    const progress = opts.progress;

    return `
        <div class="card" data-id="${item.id}" data-kind="${k}">
            <div class="card-poster ${poster ? "" : "empty"}">
                ${poster ? `<img src="${poster}" loading="lazy" alt="${escapeHtml(t)}">` : escapeHtml(t)}
                <span class="card-kind">${k === "tv" ? "TV" : "Film"}</span>
                ${rating ? `<span class="card-rating">★ ${rating}</span>` : ""}
                ${progress != null ? `<div class="card-progress"><div class="card-progress-bar" style="width:${Math.min(100, progress)}%"></div></div>` : ""}
            </div>
            <div class="card-title">${escapeHtml(t)}</div>
            <div class="card-sub">${yr}${opts.subExtra ? " · " + escapeHtml(opts.subExtra) : ""}</div>
        </div>`;
}

function renderHero(items) {
    state.heroItems = items.slice(0, 5);
    state.heroIndex = 0;
    const dots = state.heroItems.map((_, i) => `<div class="hero-dot ${i === 0 ? "active" : ""}" data-i="${i}"></div>`).join("");
    const heroDots = $("heroDots");
    if (heroDots) heroDots.innerHTML = dots;
    paintHero();
    clearInterval(state.heroTimer);
    state.heroTimer = setInterval(() => {
        state.heroIndex = (state.heroIndex + 1) % state.heroItems.length;
        paintHero();
    }, 6500);
    if (heroDots) {
        heroDots.addEventListener("click", e => {
            const dot = e.target.closest(".hero-dot");
            if (!dot) return;
            state.heroIndex = parseInt(dot.dataset.i, 10);
            paintHero();
        });
    }
}

function paintHero() {
    const item = state.heroItems[state.heroIndex];
    if (!item) return;
    const k = kindOf(item);
    const t = titleOf(item);
    const yr = fmtYear(dateOf(item));
    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
    const bg = img(item.backdrop_path, BACKDROP_SIZE) || img(item.poster_path, "w780");

    const heroBg = $("heroBg");
    if (heroBg) heroBg.style.backgroundImage = bg ? `url("${bg}")` : "";
    
    const heroContent = $("heroContent");
    if (heroContent) {
        heroContent.innerHTML = `
            <span class="hero-tag">${k === "tv" ? "TV Series" : "Featured Film"}</span>
            <h1 class="hero-title">${escapeHtml(t)}</h1>
            <div class="hero-meta">
                ${yr ? `<span>${yr}</span><span class="dot"></span>` : ""}
                ${rating ? `<span>★ ${rating}</span><span class="dot"></span>` : ""}
                <span>${k === "tv" ? "Series" : "Movie"}</span>
            </div>
            <p class="hero-overview">${escapeHtml(item.overview || "")}</p>
            <div class="hero-actions">
                <button class="hero-btn primary" data-action="play" data-id="${item.id}" data-kind="${k}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    Play
                </button>
                <button class="hero-btn secondary" data-action="info" data-id="${item.id}" data-kind="${k}">More Info</button>
            </div>`;
    }

    const heroDots = $("heroDots");
    if (heroDots) {
        heroDots.querySelectorAll(".hero-dot").forEach((d, i) => d.classList.toggle("active", i === state.heroIndex));
    }
}

function fillTrack(id, items) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = items.map(i => renderCard(i)).join("") || `<div style="color:var(--fg-3);font-size:12px;padding:8px">Nothing here yet.</div>`;
}

async function loadBrowse() {
    try {
        const [trending, popMovies, popTv, topMovies, topTv] = await Promise.all([
            api("/api/movies/trending?window=week"),
            api("/api/movies/popular/movies"),
            api("/api/movies/popular/tv"),
            api("/api/movies/top/movies"),
            api("/api/movies/top/tv")
        ]);

        renderHero(trending.results || []);
        fillTrack("trendingTrack", trending.results || []);
        fillTrack("popMoviesTrack", popMovies.results || []);
        fillTrack("popTvTrack", popTv.results || []);
        fillTrack("topMoviesTrack", topMovies.results || []);
        fillTrack("topTvTrack", topTv.results || []);
    } catch (e) {
        console.error("[movies] browse load failed:", e);
        showError(e.message);
    }
}

function showError(msg) {
    const hero = $("hero");
    if (hero) {
        hero.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--fg-3);font-size:13px;text-align:center;padding:24px">Couldn't load movies: ${escapeHtml(msg)}</div>`;
    }
}

function getContinueList() {
    try { return JSON.parse(localStorage.getItem("nocturne-mv-continue") || "[]"); }
    catch { return []; }
}
function saveContinueList(arr) {
    try { localStorage.setItem("nocturne-mv-continue", JSON.stringify(arr.slice(0, 24))); } catch {}
}
function recordProgress(entry) {
    const list = getContinueList().filter(e => !(e.id === entry.id && e.kind === entry.kind && (e.kind !== "tv" || (e.season === entry.season && e.episode === entry.episode))));
    list.unshift({ ...entry, lastWatched: Date.now() });
    saveContinueList(list);
}
function removeContinueEntry(id, kind) {
    const list = getContinueList().filter(e => !(e.id === id && e.kind === kind));
    saveContinueList(list);
}

function renderContinue() {
    const row = $("continueRow");
    if (!row) return;
    const list = getContinueList();
    if (!list.length) { row.style.display = "none"; return; }
    row.style.display = "";
    $("continueTrack").innerHTML = list.map(e => {
        const pct = e.duration ? Math.round((e.progress / e.duration) * 100) : 0;
        const sub = e.kind === "tv" && e.season != null ? `S${e.season} · E${e.episode}` : "";
        const item = { id: e.id, poster_path: e.poster, title: e.title, name: e.title, vote_average: e.rating, first_air_date: e.kind === "tv" ? "1970" : "", release_date: e.kind === "movie" ? "1970" : "" };
        return renderCard(item, { progress: pct, subExtra: sub });
    }).join("");
}

let searchAbort = null;
async function runSearch(q) {
    const out = $("searchResults");
    const browse = $("browse");
    if (!q) {
        if (out) out.classList.add("hidden");
        if (browse) browse.classList.remove("hidden");
        return;
    }
    if (out) {
        out.classList.remove("hidden");
        out.innerHTML = `<div class="search-empty">Searching…</div>`;
    }
    if (browse) browse.classList.add("hidden");
    
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    try {
        const r = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`, { signal: searchAbort.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        let results = (j.results || []).filter(x => x.media_type === "movie" || x.media_type === "tv");
        if (state.activeKind !== "all") results = results.filter(x => kindOf(x) === state.activeKind);
        if (!results.length) {
            if (out) out.innerHTML = `<div class="search-empty">No results for "${escapeHtml(q)}"</div>`;
            return;
        }
        if (out) out.innerHTML = results.map(i => renderCard(i)).join("");
    } catch (e) {
        if (e.name === "AbortError") return;
        if (out) out.innerHTML = `<div class="search-empty">Search failed: ${escapeHtml(e.message)}</div>`;
    }
}

const debouncedSearch = debounce(runSearch, 280);

async function openDetail(id, kind) {
    try {
        const item = await api(`/api/movies/details/${kind}/${id}`);
        state.detail = { ...item, kind };
        state.season = 1;
        if (kind === "tv") state.seasonsCache = {};
        paintDetail();
        $("detailOverlay").classList.add("open");
        document.body.style.overflow = "hidden";
        if (kind === "tv") loadSeason(1);
    } catch (e) {
        alert("Failed to load: " + e.message);
    }
}

function paintDetail() {
    const d = state.detail;
    const k = d.kind;
    const t = titleOf(d);
    const yr = fmtYear(dateOf(d));
    const rating = d.vote_average ? Number(d.vote_average).toFixed(1) : "";
    const runtime = k === "movie" ? fmtRuntime(d.runtime) : (d.number_of_seasons ? `${d.number_of_seasons} season${d.number_of_seasons > 1 ? "s" : ""}` : "");
    const backdrop = img(d.backdrop_path, BACKDROP_SIZE) || img(d.poster_path, "w780");
    const cast = (d.credits?.cast || []).slice(0, 14);
    const recs = (d.recommendations?.results || []).slice(0, 10);
    const seasons = (d.seasons || []).filter(s => s.season_number > 0);

    let actionsHtml = "";
    if (k === "movie") {
        actionsHtml = `
            <button class="hero-btn primary" data-action="play" data-id="${d.id}" data-kind="movie">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Play
            </button>`;
    }

    let episodeBar = "";
    if (k === "tv") {
        const opts = seasons.map(s => `<option value="${s.season_number}" ${s.season_number === state.season ? "selected" : ""}>Season ${s.season_number}</option>`).join("");
        episodeBar = `
            <div class="episode-bar">
                <select class="season-select" id="seasonSelect">${opts}</select>
            </div>
            <div id="episodeArea"><div class="search-empty">Loading episodes…</div></div>`;
    }

    $("detailInner").innerHTML = `
        <div class="detail-backdrop" style="${backdrop ? `background-image:url('${backdrop}')` : ""}">
            <div class="detail-backdrop-fade"></div>
            <button class="detail-close" id="detailClose" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        <div class="detail-body">
            <h1 class="detail-title">${escapeHtml(t)}</h1>
            <div class="detail-meta">
                ${yr ? `<span>${yr}</span><span class="dot"></span>` : ""}
                ${rating ? `<span class="rating">★ ${rating}</span><span class="dot"></span>` : ""}
                ${runtime ? `<span>${runtime}</span>` : `<span>${k === "tv" ? "Series" : "Movie"}</span>`}
            </div>
            <div class="detail-genres">${(d.genres || []).map(g => `<span class="genre-chip">${escapeHtml(g.name)}</span>`).join("")}</div>
            <p class="detail-overview">${escapeHtml(d.overview || "No synopsis available.")}</p>
            <div class="detail-actions">${actionsHtml}</div>
            ${episodeBar}
            ${cast.length ? `<div class="detail-section-title">Cast</div><div class="cast-row">${cast.map(c => `
                <div class="cast-card">
                    <div class="cast-avatar" style="${c.profile_path ? `background-image:url('${img(c.profile_path, PROFILE_SIZE)}')` : ""}"></div>
                    <div class="cast-name">${escapeHtml(c.name)}</div>
                    <div class="cast-char">${escapeHtml(c.character || "")}</div>
                </div>`).join("")}</div>` : ""}
            ${recs.length ? `<div class="detail-section-title">More Like This</div><div class="row-track" id="recsTrack">${recs.map(i => renderCard(i)).join("")}</div>` : ""}
        </div>`;

    $("detailClose").addEventListener("click", closeDetail);
    if (k === "tv") {
        $("seasonSelect").addEventListener("change", e => {
            state.season = parseInt(e.target.value, 10);
            loadSeason(state.season);
        });
    }
}

async function loadSeason(seasonNum) {
    const area = $("episodeArea");
    if (!area) return;
    if (state.seasonsCache[seasonNum]) {
        renderEpisodes(state.seasonsCache[seasonNum]);
        return;
    }
    area.innerHTML = `<div class="search-empty">Loading episodes…</div>`;
    try {
        const j = await api(`/api/movies/season/${state.detail.id}/${seasonNum}`);
        state.seasonsCache[seasonNum] = j.episodes || [];
        renderEpisodes(j.episodes || []);
    } catch (e) {
        area.innerHTML = `<div class="search-empty">Failed to load episodes</div>`;
    }
}

function renderEpisodes(eps) {
    const area = $("episodeArea");
    if (!eps.length) { area.innerHTML = `<div class="search-empty">No episodes available</div>`; return; }
    area.innerHTML = `<div class="episode-grid">${eps.map(e => `
        <div class="ep-card" data-ep="${e.episode_number}">
            <div class="ep-thumb" style="${e.still_path ? `background-image:url('${img(e.still_path, STILL_SIZE)}')` : ""}"></div>
            <div class="ep-info">
                <div class="ep-num">Episode ${e.episode_number}${e.runtime ? ` · ${e.runtime}m` : ""}</div>
                <div class="ep-name">${escapeHtml(e.name || "Untitled")}</div>
                <div class="ep-overview">${escapeHtml(e.overview || "")}</div>
            </div>
        </div>`).join("")}</div>`;
}

function closeDetail() {
    $("detailOverlay").classList.remove("open");
    document.body.style.overflow = "";
    state.detail = null;
}

function buildEmbedUrl(kind, tmdbId, season, episode) {
    const params = new URLSearchParams({
        color: VIDKING_COLOR,
        autoPlay: "true",
        nextEpisode: "true",
        episodeSelector: "true"
    });
    if (kind === "tv") {
        return `${VIDKING_BASE}/tv/${tmdbId}/${season}/${episode}?${params.toString()}`;
    }
    return `${VIDKING_BASE}/movie/${tmdbId}?${params.toString()}`;
}

function openPlayer(kind, tmdbId, season, episode) {
    const url = buildEmbedUrl(kind, tmdbId, season, episode);
    $("playerFrame").src = url;
    $("playerOverlay").classList.add("open");
    document.body.style.overflow = "hidden";

    const meta = state.detail || {};
    state.currentPlay = {
        id: tmdbId,
        kind,
        season: kind === "tv" ? season : null,
        episode: kind === "tv" ? episode : null,
        title: titleOf(meta) || "",
        poster: meta.poster_path || "",
        rating: meta.vote_average || 0
    };
}

function closePlayer() {
    $("playerFrame").src = "about:blank";
    $("playerOverlay").classList.remove("open");
    if (!$("detailOverlay").classList.contains("open")) document.body.style.overflow = "";
    state.currentPlay = null;
    renderContinue();
}

window.addEventListener("message", e => {
    const d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "PLAYER_EVENT" && state.currentPlay) {
        const { event, currentTime, duration } = d.data || {};
        if (!duration || !currentTime) return;
        if (event === "timeupdate" || event === "pause" || event === "ended") {
            recordProgress({
                ...state.currentPlay,
                progress: currentTime,
                duration
            });
        }
    }
});

document.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (card && !e.target.closest("[data-action]")) {
        openDetail(parseInt(card.dataset.id, 10), card.dataset.kind);
        return;
    }
    const epCard = e.target.closest(".ep-card");
    if (epCard && state.detail && state.detail.kind === "tv") {
        openPlayer("tv", state.detail.id, state.season, parseInt(epCard.dataset.ep, 10));
        return;
    }
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const kind = btn.dataset.kind;
    if (btn.dataset.action === "play") {
        if (kind === "tv") {
            openDetail(id, "tv");
        } else {
            openPlayer("movie", id);
        }
    } else if (btn.dataset.action === "info") {
        openDetail(id, kind);
    }
});

$("playerClose").addEventListener("click", closePlayer);

document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if ($("playerOverlay").classList.contains("open")) { closePlayer(); return; }
    if ($("detailOverlay").classList.contains("open")) { closeDetail(); return; }
});

const detailOverlay = $("detailOverlay");
if (detailOverlay) {
    detailOverlay.addEventListener("click", e => {
        if (e.target === detailOverlay) closeDetail();
    });
}

const searchInput = $("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", e => debouncedSearch(e.target.value.trim()));
}
const searchForm = $("searchForm");
if (searchForm) {
    searchForm.addEventListener("submit", e => { e.preventDefault(); runSearch(searchInput.value.trim()); });
}

document.querySelectorAll(".kind-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".kind-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        state.activeKind = tab.dataset.kind;
        const q = searchInput.value.trim();
        if (q) runSearch(q);
    });
});

const continueClear = $("continueClear");
if (continueClear) {
    continueClear.addEventListener("click", () => {
        if (confirm("Clear continue watching?")) {
            saveContinueList([]);
            renderContinue();
        }
    });
}

(async function boot() {
    try {
        const cfg = await api("/api/movies/config");
        state.imageBase = cfg.imageBase || state.imageBase;
        state.configured = !!cfg.configured;
        if (!state.configured) {
            $("setupNotice").classList.remove("hidden");
            const main = document.querySelector("main");
            if (main) main.style.display = "none";
            return;
        }
        renderContinue();
        loadBrowse();
    } catch (e) {
        const setupNotice = $("setupNotice");
        if (setupNotice) {
            setupNotice.classList.remove("hidden");
            setupNotice.querySelector(".setup-desc").innerHTML = `Failed to reach the server API: ${escapeHtml(e.message)}`;
        }
    }
})();

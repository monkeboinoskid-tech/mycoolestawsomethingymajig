// Storage / cookie polyfill — survives private-mode and sandboxed contexts where
// localStorage / document.cookie throw. Runs first so anything below can rely on them.
(function() {
    const memoryStorage = {};
    const safeStorage = {
        getItem: function(key) { try { return localStorage.getItem(key); } catch(e) { return memoryStorage[key] || null; } },
        setItem: function(key, value) { try { localStorage.setItem(key, value); } catch(e) { memoryStorage[key] = String(value); } },
        removeItem: function(key) { try { localStorage.removeItem(key); } catch(e) { delete memoryStorage[key]; } }
    };
    try { localStorage.setItem('test', 'test'); localStorage.removeItem('test'); }
    catch(e) { Object.defineProperty(window, 'localStorage', { value: safeStorage, writable: false, configurable: false }); }
    try { document.cookie = 'test=test'; }
    catch(e) { Object.defineProperty(document, 'cookie', { get: function() { return ''; }, set: function() { return true; } }); }
})();

const CONFIG = {
    zones: "https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json",
    zonesFallback: "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json",
    tagsZones: "https://cdn.jsdelivr.net/gh/sealiee11/gnmathstuff@main/zones.json",
    covers: "https://cdn.jsdelivr.net/gh/freebuisness/covers@main",
    coversFallback: "https://cdn.jsdelivr.net/gh/gn-math/covers@main",
    html: "https://cdn.jsdelivr.net/gh/freebuisness/html@main",
    htmlFallback: "https://cdn.jsdelivr.net/gh/gn-math/html@main",
    stats: "https://data.jsdelivr.net/v1/stats/packages/gh/gn-math/html@main/files?period="
};

let state = { games: [], hits: {}, theme: 'modern', categories: [], tagGames: [], tagCount: 0 };

async function fetchZones() {
    let zonesURL = CONFIG.zones;
    try {
        const r = await fetch("https://api.github.com/repos/freebuisness/assets/commits?t=" + Date.now());
        if (r.ok) {
            const j = await r.json();
            if (j[0]?.sha) zonesURL = `https://cdn.jsdelivr.net/gh/freebuisness/assets@${j[0].sha}/zones.json`;
        }
    } catch(e) {}

    try {
        const r = await fetch(zonesURL + "?t=" + Date.now());
        if (!r.ok) throw new Error("HTTP " + r.status);
        return { games: await r.json(), source: "primary" };
    } catch(e) {
        const r2 = await fetch(CONFIG.zonesFallback + "?t=" + Date.now());
        if (!r2.ok) throw new Error("Both zones sources failed (HTTP " + r2.status + ")");
        return { games: await r2.json(), source: "fallback" };
    }
}

async function init() {
    try {
        const { games, source } = await fetchZones();
        state.games = games;
        state.zonesSource = source;

        try {
            const tr = await fetch(CONFIG.tagsZones + "?t=" + Date.now());
            state.tagGames = tr.ok ? await tr.json() : state.games;
        } catch(e) { state.tagGames = state.games; }

        if (state.games[0]) state.games[0].featured = true;
        extractCategories();
        renderApp();

        const id = new URLSearchParams(window.location.search).get('id');
        if (id) {
            const zone = state.games.find(z => z.id + '' == id + '');
            if (zone) openGame(zone.id);
        }

        fetchAllStats('week');
        fetchAllStats('year');
    } catch(e) {
        console.error("Init failed", e);
        document.getElementById('allGamesGrid').innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; color: var(--fg-3);">Failed to load games: ${e.message}</div>`;
    }
}

async function fetchAllStats(period) {
    if (!state.hits[period]) state.hits[period] = {};
    let page = 1;
    let hasMore = true;
    while (hasMore) {
        try {
            const res = await fetch(`${CONFIG.stats}${period}&page=${page}`);
            if (res.status === 425) { hasMore = false; break; }
            const data = await res.json();
            if (!data || data.length === 0) { hasMore = false; }
            else {
                data.forEach(f => {
                    const m = f.name.match(/\/(\d+)\.html/);
                    if (m) {
                        const id = m[1];
                        if (!state.hits[period][id]) state.hits[period][id] = 0;
                        state.hits[period][id] += f.hits.total;
                    }
                });
                page++;
                if (page === 2) updatePlayCounts();
                await new Promise(r => setTimeout(r, 500));
            }
        } catch(e) { hasMore = false; }
    }
    updatePlayCounts();
    if (period === 'week') { updateTrendingWeek(); updateTagSections(); }
}

function updateTrendingWeek() {
    const top = [...state.games].sort((a, b) => getScore(b, 'week') - getScore(a, 'week')).slice(0, 15);
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const el = document.getElementById('trendingWrapper');
    if (!el) return;
    el.innerHTML = top.map(g => renderCardSlide(g, favs, 'week')).join('');
}

function updateTagSections() {
    const tagCount = state.tagCount || 0;
    for (let i = 0; i < tagCount; i++) {
        const wrap = document.getElementById(`tagWrapper${i}`);
        if (wrap && wrap.children.length > 0) {
            wrap.querySelectorAll('.swiper-slide').forEach(slide => {
                const card = slide.querySelector('.game-card');
                if (!card) return;
                const m = card.getAttribute('onclick').match(/openGame\((\d+)\)/);
                if (!m) return;
                const game = state.games.find(g => g.id === parseInt(m[1]));
                if (!game) return;
                const sr = slide.querySelector('.stat-row');
                if (sr) sr.innerHTML = `<span class="stat-dot"></span>${formatPlays(getScore(game, 'week'))} plays`;
            });
        }
    }
}

function updatePlayCounts() {
    document.querySelectorAll('.stat-row').forEach(async el => {
        const card = el.closest('[onclick^="openGame"]');
        if (!card) return;
        const m = card.getAttribute('onclick').match(/openGame\((\d+)\)/);
        if (!m) return;
        const plays = await getStats(m[1]);
        el.innerHTML = `<span class="stat-dot"></span>${formatPlays(plays)} plays`;
    });
}

function extractCategories() {
    const s = new Set();
    state.games.forEach(g => { if (g.special?.length) g.special.forEach(x => s.add(x)); });
    state.categories = Array.from(s).sort();
}
function getScore(g, p) { return state.hits[p]?.[g.id] || 0; }
function formatPlays(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'm';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return n.toString();
}
function resolveUrl(u) { return u.replace("{COVER_URL}", CONFIG.covers).replace("{HTML_URL}", CONFIG.html); }
function toTitleCase(s) { return s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase()); }

function renderCardSlide(g, favs, period) {
    return `
    <div class="swiper-slide">
        <div class="game-card" onclick="event.stopPropagation(); openGame(${g.id})">
            <div class="star-icon ${favs.includes(g.id) ? 'starred' : ''}" onclick="event.stopPropagation(); toggleFavorite(${g.id})">★</div>
            <img src="${resolveUrl(g.cover)}" class="card-thumb" loading="lazy" onerror="this.style.background='var(--bg-3)'">
            <div class="card-body">
                <div class="card-title">${g.name}</div>
                <div class="card-tags">${(g.special || g.tags || []).slice(0,2).map(toTitleCase).join(' · ') || '&nbsp;'}</div>
                <div class="stat-row"><span class="stat-dot"></span>${period ? formatPlays(getScore(g, period)) + ' plays' : '...'}</div>
            </div>
        </div>
    </div>`;
}

function renderCard(g, favs, index) {
    const delay = Math.min(index, 20) * 0.03;
    return `
    <div class="game-card" onclick="openGame(${g.id})" style="animation-delay: ${delay}s" data-index="${index}">
        <div class="star-icon ${favs.includes(g.id) ? 'starred' : ''}" onclick="event.stopPropagation(); toggleFavorite(${g.id})">★</div>
        <img src="${resolveUrl(g.cover)}" class="card-thumb" loading="lazy" onerror="this.style.background='var(--bg-3)'">
        <div class="card-body">
            <div class="card-title">${g.name}</div>
            <div class="card-tags">${(g.special || []).slice(0,2).map(toTitleCase).join(' · ') || '&nbsp;'}</div>
            <div class="stat-row"><span class="stat-dot"></span>...</div>
        </div>
    </div>`;
}

function renderTagSections() {
    const allTags = new Set();
    state.tagGames.forEach(g => { if (g.tags?.length) g.tags.forEach(t => allTags.add(t)); });
    const arr = Array.from(allTags);
    if (!arr.length) return 0;
    const picked = arr.sort(() => Math.random() - 0.5).slice(0, 3);
    const container = document.getElementById('tagSections');
    if (!container) return 0;
    container.innerHTML = picked.map((tag, i) => `
        <div class="section">
            <div class="section-header"><div class="section-title">${tag}</div></div>
            <div class="swiper horizontal-list" id="tagSwiper${i}">
                <div class="swiper-wrapper" id="tagWrapper${i}"></div>
                <div class="swiper-button-next"></div>
                <div class="swiper-button-prev"></div>
            </div>
        </div>
    `).join('');
    picked.forEach((tag, i) => {
        const games = state.tagGames.filter(g => g.tags?.includes(tag)).slice(0, 15);
        if (!games.length) return;
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        document.getElementById(`tagWrapper${i}`).innerHTML = games.map(g => renderCardSlide(g, favs, 'week')).join('');
    });
    return picked.length;
}

function renderApp() {
    renderCatStrip();
    const popular = state.games.filter(g => (g.featured || g.special?.includes('popular')) && !g.special?.includes('tools'));
    const ports = state.games.filter(g => g.special?.includes('port') && !g.special?.includes('tools'));
    const rnd = [];
    for (let i = 0; i < 2; i++) {
        const rg = state.games[Math.floor(Math.random() * state.games.length)];
        if (rg && !rg.special?.includes('tools')) rnd.push(rg);
    }
    const pp = popular[Math.floor(Math.random() * popular.length)];
    const pk = ports.length ? ports[Math.floor(Math.random() * ports.length)] : popular[1];
    const featured = [pp, ...rnd, pk, popular[0]].filter(Boolean).slice(0, 5);
    renderHero(featured);

    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    document.getElementById('trendingWrapper').innerHTML = state.games.slice(0, 15).map(g => renderCardSlide(g, favs)).join('');
    updatePlayCounts();

    state.tagCount = renderTagSections() || 0;

    document.getElementById('featuredGrid').innerHTML = state.games.filter(g => g.featured).map((g, i) => renderCard(g, favs, i)).join('');

    document.getElementById('sortOptions').value = localStorage.getItem('sortPreference') || 'name';
    sortZones();

    initSwipers();
    updatePlayCounts();
}

function renderCatStrip() {
    const strip = document.getElementById('catStrip');
    strip.innerHTML = '';
    const all = document.createElement('button');
    all.className = 'chip active';
    all.textContent = 'All Games';
    all.onclick = (e) => switchView('all', e);
    strip.appendChild(all);

    const fav = document.createElement('button');
    fav.className = 'chip';
    fav.textContent = '★ Favorites';
    fav.onclick = (e) => filterFavorites(e);
    strip.appendChild(fav);

    state.categories.forEach(c => {
        const b = document.createElement('button');
        b.className = 'chip';
        b.textContent = toTitleCase(c);
        b.onclick = (e) => filterByCategory(c, e);
        strip.appendChild(b);
    });
}

function filterFavorites(e) {
    setActiveChip(e);
    document.getElementById('modernView').classList.add('hidden');
    document.getElementById('searchView').classList.remove('hidden');
    document.getElementById('searchBar').value = '';
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const hits = state.games.filter(g => favs.includes(g.id));
    const grid = document.getElementById('searchResults');
    grid.innerHTML = hits.length
        ? hits.map((g, i) => renderCard(g, favs, i)).join('')
        : '<div style="grid-column: 1 / -1; text-align:center; padding:40px; color: var(--fg-3); font-size: 13px;">No favorites yet. Tap the star on any game to save it here.</div>';
}

function toggleFavorite(id) {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const i = favs.indexOf(id);
    const star = event.target;
    if (i > -1) { favs.splice(i, 1); star.classList.remove('starred'); }
    else { favs.push(id); star.classList.add('starred'); }
    localStorage.setItem('favorites', JSON.stringify(favs));
}

function renderHero(games) {
    document.getElementById('heroWrapper').innerHTML = games.map(g => `
        <div class="swiper-slide">
            <div class="slide-bg" style="background-image: url('${resolveUrl(g.cover)}')"></div>
            <div class="slide-content">
                <div class="slide-image-wrapper"><img src="${resolveUrl(g.cover)}" class="slide-image" loading="lazy"></div>
                <div class="slide-info">
                    <h2 class="hero-title">${g.name}</h2>
                    <div class="hero-meta">
                        ${(g.special || ['Popular']).slice(0,3).map(t => `<span class="tag-badge">${toTitleCase(t)}</span>`).join('')}
                    </div>
                    ${g.author ? `<p class="hero-author">by ${g.author}</p>` : ''}
                    <button class="hero-btn" onclick="event.stopPropagation(); openGame(${g.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        Play now
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function sortZones() {
    const sortBy = document.getElementById('sortOptions').value;
    localStorage.setItem('sortPreference', sortBy);
    let games = [...state.games];
    const pinned = games.filter(g => g.id === -1 || g.id === 596);
    const regular = games.filter(g => g.id !== -1 && g.id !== 596);
    if (sortBy === 'name') regular.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'id') regular.sort((a, b) => b.id - a.id);
    else if (sortBy === 'popular') regular.sort((a, b) => getScore(b, 'year') - getScore(a, 'year'));
    const all = [...pinned, ...regular];
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const grid = document.getElementById('allGamesGrid');
    grid.innerHTML = all.map((g, i) => renderCard(g, favs, i)).join('');

    if (all.length > 20) {
        const cards = grid.querySelectorAll('.game-card');
        const obs = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    const c = en.target;
                    if (parseInt(c.dataset.index) > 20) { c.style.animationDelay = '0s'; c.style.opacity = '1'; }
                    obs.unobserve(c);
                }
            });
        }, { rootMargin: '100px' });
        cards.forEach(c => { if (parseInt(c.dataset.index) > 20) obs.observe(c); });
    }
    updatePlayCounts();
}

let heroSwiper, trendingSwiper;
function initSwipers() {
    if (heroSwiper) heroSwiper.destroy(true, true);
    heroSwiper = new Swiper('.featured-slider', {
        loop: true, observer: true, observeParents: true, centeredSlides: true,
        slidesPerView: 'auto',
        autoplay: { delay: 5000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.featured-slider .swiper-button-next', prevEl: '.featured-slider .swiper-button-prev' },
        speed: 600
    });

    if (trendingSwiper) trendingSwiper.destroy(true, true);
    trendingSwiper = new Swiper('#trendingSwiper', {
        slidesPerView: 'auto', spaceBetween: 12, slidesPerGroup: 1, speed: 400,
        observer: true, observeParents: true,
        navigation: { nextEl: '#trendingSwiper .swiper-button-next', prevEl: '#trendingSwiper .swiper-button-prev' }
    });

    for (let i = 0; i < (state.tagCount || 0); i++) {
        const el = document.getElementById(`tagSwiper${i}`);
        if (el) new Swiper(`#tagSwiper${i}`, {
            slidesPerView: 'auto', spaceBetween: 12, slidesPerGroup: 1, speed: 400,
            observer: true, observeParents: true,
            navigation: { nextEl: `#tagSwiper${i} .swiper-button-next`, prevEl: `#tagSwiper${i} .swiper-button-prev` }
        });
    }
}

function setActiveChip(e) {
    document.querySelectorAll('#catStrip .chip').forEach(c => c.classList.remove('active'));
    if (e && e.target) e.target.classList.add('active');
}

function handleSearch(q) {
    const s = document.getElementById('searchView');
    const m = document.getElementById('modernView');
    const r = document.getElementById('searchResults');
    if (!q) { s.classList.add('hidden'); m.classList.remove('hidden'); return; }
    m.classList.add('hidden');
    s.classList.remove('hidden');
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const hits = state.games.filter(g => g.name.toLowerCase().includes(q.toLowerCase()));
    r.innerHTML = hits.length
        ? hits.map((g, i) => renderCard(g, favs, i)).join('')
        : `<div style="grid-column: 1 / -1; text-align:center; padding:40px; color: var(--fg-3); font-size: 13px;">No results for "${q}".</div>`;
}

function switchView(v, e) {
    setActiveChip(e);
    document.getElementById('searchBar').value = '';
    handleSearch('');
}

function filterByCategory(cat, e) {
    setActiveChip(e);
    document.getElementById('modernView').classList.add('hidden');
    document.getElementById('searchView').classList.remove('hidden');
    document.getElementById('searchBar').value = '';
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const hits = state.games.filter(g => g.special?.includes(cat));
    document.getElementById('searchResults').innerHTML = hits.map((g, i) => renderCard(g, favs, i)).join('');
}

async function openGame(id) {
    const g = state.games.find(x => x.id === id);
    if (!g) return;
    const stats = JSON.parse(localStorage.getItem('userStats') || '{"opens": {}, "timeStart": null}');
    stats.opens[id] = (stats.opens[id] || 0) + 1;
    stats.timeStart = Date.now();
    localStorage.setItem('userStats', JSON.stringify(stats));

    document.getElementById('zoneName').textContent = g.name;
    document.getElementById('zoneId').textContent = id;
    const authorLink = document.getElementById('zoneAuthor');
    authorLink.textContent = "by " + (g.author || "Unknown");
    authorLink.href = g.authorLink || "#";

    document.getElementById('zoneViewer').style.display = 'flex';
    document.querySelector('nav.nav').style.display = 'none';
    document.querySelector('main').style.display = 'none';
    document.querySelector('footer').style.display = 'none';

    const url = new URL(window.location);
    url.searchParams.set('id', id);
    history.pushState(null, '', url.toString());

    if (g.url.startsWith('http') && !g.url.includes('{')) {
        window.open(g.url, '_blank');
        closeZone();
        return;
    }
    try {
        const f = document.getElementById('zoneFrame');
        const primary = resolveUrl(g.url);
        const fallback = g.url.replace("{COVER_URL}", CONFIG.coversFallback).replace("{HTML_URL}", CONFIG.htmlFallback);
        let h = "";
        try {
            const r = await fetch(primary + "?t=" + Date.now());
            if (!r.ok) throw new Error("HTTP " + r.status);
            h = await r.text();
            if (h.trim().startsWith("Couldn't find the requested file")) throw new Error("not-found");
        } catch(e) {
            const r2 = await fetch(fallback + "?t=" + Date.now());
            if (!r2.ok) throw new Error("Both sources failed");
            h = await r2.text();
        }
        f.contentDocument.open();
        f.contentDocument.write(h);
        f.contentDocument.close();
    } catch(e) { alert("Load failed: " + e.message); closeZone(); }
}

function closeZone() {
    const stats = JSON.parse(localStorage.getItem('userStats') || '{"opens": {}, "timeStart": null, "totalTime": 0}');
    if (stats.timeStart) {
        stats.totalTime = (stats.totalTime || 0) + (Date.now() - stats.timeStart);
        stats.timeStart = null;
        localStorage.setItem('userStats', JSON.stringify(stats));
    }
    document.getElementById('zoneViewer').style.display = 'none';
    document.getElementById('zoneFrame').src = '';
    document.querySelector('nav.nav').style.display = '';
    document.querySelector('main').style.display = '';
    document.querySelector('footer').style.display = '';
    const url = new URL(window.location);
    url.searchParams.delete('id');
    history.pushState(null, '', url.toString());
}

function fullscreenZone() {
    const f = document.getElementById('zoneFrame');
    if (f.requestFullscreen) f.requestFullscreen();
}

function aboutBlank() {
    const id = document.getElementById('zoneId').textContent;
    const g = state.games.find(x => x.id == id);
    if (!g) return;
    const w = window.open('about:blank', '_blank');
    if (!w) { alert('Popup blocked.'); return; }
    const fallback = g.url.replace("{COVER_URL}", CONFIG.coversFallback).replace("{HTML_URL}", CONFIG.htmlFallback);
    fetch(resolveUrl(g.url)).then(r => r.text()).then(h => {
        if (h.trim().startsWith("Couldn't find the requested file")) {
            return fetch(fallback + "?t=" + Date.now()).then(r => r.text()).then(hh => {
                w.document.open(); w.document.write(hh); w.document.close();
            });
        }
        w.document.open(); w.document.write(h); w.document.close();
    }).catch(() => { try { w.close(); } catch {}; alert("Failed to open"); });
}

function downloadZone() {
    const id = document.getElementById('zoneId').textContent;
    const g = state.games.find(x => x.id == id);
    fetch(resolveUrl(g.url)).then(r => r.text()).then(t => {
        const b = new Blob([t], { type: "text/html" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = g.name + ".html";
        a.click();
    });
}

function openModal(t, c) {
    document.getElementById('modalTitle').textContent = t;
    document.getElementById('modalContent').innerHTML = c;
    const o = document.getElementById('modalOverlay');
    o.style.display = 'flex';
    setTimeout(() => o.classList.add('open'), 10);
}
function closeModal() {
    const o = document.getElementById('modalOverlay');
    o.classList.remove('open');
    setTimeout(() => o.style.display = 'none', 300);
}

function openSettings() {
    const stats = JSON.parse(localStorage.getItem('userStats') || '{"opens": {}, "totalTime": 0}');
    const totalOpens = Object.values(stats.opens).reduce((a, b) => a + b, 0);
    const mostPlayedId = Object.keys(stats.opens).reduce((a, b) => stats.opens[a] > stats.opens[b] ? a : b, Object.keys(stats.opens)[0]);
    const mostPlayed = state.games.find(g => g.id == mostPlayedId);
    const hours = Math.floor(stats.totalTime / 3600000);
    const minutes = Math.floor((stats.totalTime % 3600000) / 60000);
    openModal("Settings", `
        <div class="cfg-row">
            <span class="cfg-label">Export save data</span>
            <button class="cfg-btn" onclick="saveData()">Export</button>
        </div>
        <div class="cfg-row">
            <span class="cfg-label">Import save data</span>
            <button class="cfg-btn" onclick="document.getElementById('importFile').click()">Import</button>
        </div>
        <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line);">
            <div style="color: var(--fg-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Your stats</div>
            <div style="color: var(--fg-2); line-height: 1.8; font-size: 13px;">
                <div><b>Total games played:</b> ${totalOpens}</div>
                <div><b>Most played:</b> ${mostPlayed ? mostPlayed.name : 'None'} (${stats.opens[mostPlayedId] || 0} times)</div>
                <div><b>Time on site:</b> ${hours}h ${minutes}m</div>
            </div>
        </div>
    `);
}

async function getAllStats(force = false) {
    if (!force && state._statsCache) return state._statsCache;
    try {
        const BASE = 'https://data.jsdelivr.com/v1/stats/packages/gh/gn-math/html@main/files';
        const map = Object.create(null);
        let page = 1, empty = 0;
        while (empty < 2 && page < 50) {
            const res = await fetch(`${BASE}?period=year&page=${page}&limit=100`);
            const data = await res.json();
            if (!data || !data.length) empty++;
            else {
                empty = 0;
                for (const item of data) {
                    const m = item.name.match(/^\/(\d+)([.-])/);
                    if (m) {
                        const id = m[1];
                        if (!map[id]) map[id] = { hits: 0 };
                        map[id].hits += item.hits?.total ?? 0;
                    }
                }
            }
            page++;
        }
        state._statsCache = map;
        return map;
    } catch(e) { return {}; }
}
async function getStats(id) { 
    const hits = await getAllStats();
    return hits[String(id)]?.hits ?? 0; 
}

async function showZoneInfo() {
    let id = Number(document.getElementById('zoneId').textContent);
    openModal("Info", `<p>Loading...</p>`);
    try {
        const j = await (await fetch(`https://api.github.com/repos/gn-math/html/commits?path=${id}.html`)).json();
        const g = state.games.find(a => a.id === id);
        document.getElementById('modalTitle').textContent = g.name;
        const date = new Date(j.at(-1)?.commit.author.date || Date.now());
        const fd = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(date);
        const stats = await getStats(id);
        document.getElementById('modalContent').innerHTML = `
            <p><b>Name:</b> ${g.name}</p>
            ${g.author ? `<p><b>Author:</b> ${g.author}</p>` : ''}
            ${g.authorLink ? `<p><b>Link:</b> <a style="color:var(--accent);" href="${g.authorLink}">${g.authorLink}</a></p>` : ''}
            ${g.special ? `<p><b>Tags:</b> ${g.special.join(', ')}</p>` : ''}
            <p><b>Added:</b> ${fd}</p>
            <p><b>Plays:</b> ${Number(stats).toLocaleString("en-US")}</p>`;
    } catch(e) { document.getElementById('modalContent').innerHTML = `<p>Failed to load info.</p>`; }
}

function sanitizeData(obj, maxStr = 1000, maxArr = 10000) {
    if (typeof obj === 'string') return obj.length > maxStr ? obj.slice(0, maxStr) + '...[truncated]' : obj;
    if (obj instanceof Uint8Array) return obj.length > maxArr ? `[Uint8Array too large (${obj.length} bytes)]` : obj;
    if (Array.isArray(obj)) return obj.map(x => sanitizeData(x, maxStr, maxArr));
    if (obj && typeof obj === 'object') { const n = {}; for (const k in obj) if (obj.hasOwnProperty(k)) n[k] = sanitizeData(obj[k], maxStr, maxArr); return n; }
    return obj;
}

async function saveData() {
    alert("Exporting save data — this can take a moment.");
    const result = {};
    result.cookies = document.cookie;
    result.localStorage = { ...localStorage };
    result.sessionStorage = { ...sessionStorage };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(result)], { type: "application/octet-stream" }));
    link.download = `monkturne-${Date.now()}.data`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function loadData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.cookies) data.cookies.split(';').forEach(c => { document.cookie = c.trim(); });
            if (data.localStorage) for (const k in data.localStorage) localStorage.setItem(k, data.localStorage[k]);
            if (data.sessionStorage) for (const k in data.sessionStorage) sessionStorage.setItem(k, data.sessionStorage[k]);
            alert("Data imported.");
        } catch(err) { alert("Import failed"); }
    };
    reader.readAsText(file);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('zoneViewer').style.display === 'flex') closeZone();
});

(function waitForSwiper() {
    if (typeof Swiper !== 'undefined') init();
    else setTimeout(waitForSwiper, 50);
})();

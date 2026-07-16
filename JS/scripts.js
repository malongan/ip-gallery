/**
 * IP Archive - Gallery Scripts v6
 * Safe rendering, accessible dialog, data-driven categories and deep links.
 */

const DATA_URL = 'data.json';
const FETCH_TIMEOUT = 10000;
let allIPs = [];
let currentFilter = 'all';
let activeIP = null;
let lastFocusedElement = null;

const CATEGORY_LABELS = { all: 'ALL', character: '卡通IP', product: '商品', real: '真人' };

async function init() {
    setupEventListeners();
    try {
        await loadData();
        renderFilterBar();
        renderGallery();
        openDeepLinkedIP();
    } catch (error) {
        console.error('Failed to load gallery data:', error);
        renderLoadError();
    }
}

async function loadData() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
        const response = await fetch(DATA_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.ips)) throw new Error('Invalid data format');
        allIPs = data.ips.map(normalizeIP);
        const versionTag = document.getElementById('versionTag');
        if (data.version) versionTag.textContent = data.version;
    } finally {
        clearTimeout(timeout);
    }
}

function normalizeIP(ip) {
    return {
        ...ip,
        id: String(ip.id || ''),
        code: String(ip.code || ''),
        name: String(ip.name || ''),
        brand: String(ip.brand || ''),
        description: String(ip.description || ''),
        type: CATEGORY_LABELS[ip.type] ? ip.type : inferType(ip),
        preview: safeUrl(ip.preview),
        brand_url: safeUrl(ip.brand_url),
        official_url: safeUrl(ip.official_url),
        source_url: safeUrl(ip.source_url)
    };
}

function inferType(ip) {
    const brand = String(ip.brand || '').toLowerCase();
    if (brand.includes('个人ip')) return 'real';
    if (brand.includes('古茗')) return 'product';
    return 'character';
}

function safeUrl(value) {
    if (!value) return '';
    try {
        const url = new URL(value, window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
}

function categories() {
    return ['all', 'character', 'product', 'real'].map(categoryId => ({
        id: categoryId,
        label: CATEGORY_LABELS[categoryId],
        count: categoryId === 'all' ? allIPs.length : allIPs.filter(ip => ip.type === categoryId).length
    }));
}

function renderFilterBar() {
    const filterBar = document.getElementById('filterBar');
    filterBar.replaceChildren();
    const fragment = document.createDocumentFragment();

    categories().filter(category => category.count > 0).forEach(category => {
        fragment.append(createFilterButton(category.label, category.count, category.id, currentFilter === category.id));
    });

    const brandCounts = allIPs.reduce((counts, ip) => {
        if (ip.brand) counts.set(ip.brand, (counts.get(ip.brand) || 0) + 1);
        return counts;
    }, new Map());
    if (brandCounts.size) {
        const separator = document.createElement('div');
        separator.className = 'filter-sep';
        separator.setAttribute('aria-hidden', 'true');
        fragment.append(separator);
        [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([brand, count]) => {
            fragment.append(createFilterButton(brand, count, `brand:${brand}`, currentFilter === `brand:${brand}`, true));
        });
    }
    filterBar.append(fragment);
}

function createFilterButton(label, count, filter, isActive, small = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-btn${small ? ' filter-btn-sm' : ''}${isActive ? ' active' : ''}`;
    button.dataset.filter = filter;
    button.setAttribute('aria-pressed', String(isActive));
    button.append(document.createTextNode(label + ' '));
    const countEl = document.createElement('span');
    countEl.className = 'filter-count';
    countEl.textContent = String(count);
    button.append(countEl);
    return button;
}

function filteredIPs() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    return allIPs.filter(ip => {
        const matchesSearch = !searchTerm || [ip.name, ip.code, ip.brand, ip.id].some(value => value.toLowerCase().includes(searchTerm));
        const matchesFilter = currentFilter === 'all' ||
            (currentFilter.startsWith('brand:') ? ip.brand === currentFilter.slice(6) : ip.type === currentFilter);
        return matchesSearch && matchesFilter;
    });
}

function renderGallery() {
    const gallery = document.getElementById('gallery');
    const ips = filteredIPs();
    gallery.setAttribute('aria-busy', 'false');
    gallery.replaceChildren();
    if (!ips.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.innerHTML = '<div class="empty-text">NO RESULTS</div>';
        gallery.append(empty);
        return;
    }
    const fragment = document.createDocumentFragment();
    ips.forEach(ip => fragment.append(createCard(ip)));
    gallery.append(fragment);
    setupPixelation();
}

function createCard(ip) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = ip.id;
    card.tabIndex = 0;
    card.setAttribute('aria-label', `查看 ${ip.code} ${ip.name} 详情`);

    const imageWrap = document.createElement('div');
    imageWrap.className = 'card-image';
    const image = document.createElement('img');
    image.src = ip.preview;
    image.alt = ip.name;
    image.loading = 'lazy';
    image.addEventListener('error', () => imageWrap.classList.add('image-error'), { once: true });
    imageWrap.append(image, createEl('div', 'card-overlay'));

    const badge = createEl('div', 'card-badge');
    badge.append(createEl('span', 'badge-label', ip.id.split('_')[0].toUpperCase()), createEl('span', 'badge-number', ip.code.replace(/^IP/i, '')));
    imageWrap.append(badge);

    const links = createEl('div', 'card-links');
    appendExternalLink(links, ip.brand_url, 'BRAND');
    appendExternalLink(links, ip.official_url, 'OFFICIAL');
    if (links.childElementCount) imageWrap.append(links);

    const info = createEl('div', 'card-info');
    info.append(createEl('div', 'card-code', ip.code));
    const name = createEl('button', 'card-name', ip.name);
    name.type = 'button';
    name.dataset.code = ip.code;
    name.setAttribute('aria-label', `复制 ${ip.code}`);
    info.append(name, createEl('div', 'card-brand', ip.brand));
    card.append(imageWrap, info);
    return card;
}

function createEl(tag, className, text = '') {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
}

function appendExternalLink(parent, url, label) {
    if (!url) return;
    const link = document.createElement('a');
    link.className = 'card-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    parent.append(link);
}

function setupPixelation() {
    document.querySelectorAll('.card-image img').forEach(img => {
        if (img.dataset.pixelReady) return;
        const addOverlay = () => {
            try {
                img.dataset.pixelReady = '1';
                const overlay = createPixelOverlay(img, 18);
                if (overlay) img.after(overlay);
            } catch (error) {
                console.warn('Pixel overlay unavailable; showing source image.', error);
                img.parentElement.classList.add('pixelation-unavailable');
            }
        };
        if (img.complete && img.naturalWidth > 0) addOverlay();
        else img.addEventListener('load', addOverlay, { once: true });
    });
}

function createPixelOverlay(img, blocks) {
    const w = img.naturalWidth || 400, h = img.naturalHeight || 400;
    const cvs = document.createElement('canvas');
    cvs.className = 'pixel-overlay'; cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const bw = Math.max(1, Math.floor(w / blocks)), bh = Math.max(1, Math.floor(h / blocks));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, bw, bh);
    ctx.drawImage(cvs, 0, 0, bw, bh, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.7 * (0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2]);
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;transition:opacity .4s;';
    return cvs;
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(renderGallery, 180));
    document.getElementById('filterBar').addEventListener('click', event => {
        const button = event.target.closest('.filter-btn');
        if (!button) return;
        currentFilter = button.dataset.filter;
        renderFilterBar(); renderGallery();
    });
    document.getElementById('gallery').addEventListener('click', event => {
        const link = event.target.closest('.card-link');
        if (link) return;
        const nameButton = event.target.closest('.card-name');
        if (nameButton) { event.stopPropagation(); copyToClipboard(nameButton.dataset.code); return; }
        const card = event.target.closest('.card');
        if (card) openIPById(card.dataset.id, card);
    });
    document.getElementById('gallery').addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.card') && !event.target.closest('.card-name')) {
            event.preventDefault(); openIPById(event.target.closest('.card').dataset.id, event.target.closest('.card'));
        }
    });
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
    document.getElementById('copyNameBtn').addEventListener('click', () => {
        if (!activeIP) return;
        copyToClipboard(activeIP.code);
        const btn = document.getElementById('copyNameBtn');
        btn.textContent = 'COPIED!'; btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'COPY IP CODE'; btn.classList.remove('copied'); }, 1500);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.getElementById('modal').classList.contains('active')) closeModal();
        if (event.key === 'Tab' && document.getElementById('modal').classList.contains('active')) trapFocus(event);
    });
}

function openIPById(id, trigger) {
    const ip = allIPs.find(item => item.id === id);
    if (ip) openModal(ip, trigger);
}

function openDeepLinkedIP() {
    const code = new URLSearchParams(window.location.search).get('ip');
    if (!code) return;
    const ip = allIPs.find(item => item.code.toLowerCase() === code.toLowerCase() || item.id === code);
    if (ip) openModal(ip);
}

function openModal(ip, trigger = document.activeElement) {
    activeIP = ip; lastFocusedElement = trigger;
    const modal = document.getElementById('modal');
    document.getElementById('modalImage').src = ip.preview;
    document.getElementById('modalImage').alt = ip.name;
    document.getElementById('modalName').textContent = ip.name;
    document.getElementById('modalMeta').textContent = `${ip.code} · ${ip.brand}`;
    document.getElementById('modalDescription').textContent = ip.description || 'No description available.';
    setModalLink('brandLink', ip.brand_url); setModalLink('officialLink', ip.official_url); setModalLink('sourceLink', ip.source_url);
    history.replaceState(null, '', `${location.pathname}?ip=${encodeURIComponent(ip.code)}`);
    modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    document.querySelector('.modal-close').focus();
}

function setModalLink(id, url) {
    const link = document.getElementById(id);
    link.classList.toggle('hidden', !url);
    if (url) link.href = url;
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    if (lastFocusedElement?.focus) lastFocusedElement.focus();
}

function trapFocus(event) {
    const focusable = [...document.querySelectorAll('#modal button:not([disabled]), #modal a:not(.hidden)')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function renderLoadError() {
    const gallery = document.getElementById('gallery'); gallery.setAttribute('aria-busy', 'false'); gallery.replaceChildren();
    const error = createEl('div', 'empty');
    error.innerHTML = '<div class="empty-text">LOADING FAILED</div>';
    const retry = createEl('button', 'retry-btn', 'RETRY'); retry.type = 'button';
    retry.addEventListener('click', init); error.append(retry); gallery.append(error);
}

function showToast(message) {
    const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
        const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.cssText = 'position:fixed;opacity:0;';
        document.body.append(textarea); textarea.select(); document.execCommand('copy'); textarea.remove();
    }
    showToast('COPIED');
}

function debounce(func, wait) { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; }

init();

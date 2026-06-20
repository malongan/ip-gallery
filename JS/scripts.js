/**
 * IP Archive - Gallery Scripts v5
 */

const DATA_URL = 'data.json';

let allIPs = [];
let currentFilter = 'all';

const CATEGORIES = {
    'all': { label: 'ALL', ips: [] },
    'character': { label: '卡通人物', ips: [] },
    'product': { label: '商品', ips: [] },
    'personal': { label: '个人IP', ips: [] }
};

// ═══ Init ═══
async function init() {
    try {
        await loadData();
        setupCategories();
        renderFilterBar();
        renderGallery();
        setupEventListeners();
    } catch (error) {
        console.error('Failed to load gallery data:', error);
        document.getElementById('gallery').innerHTML = `
            <div class="empty">
                <div class="empty-text">LOADING FAILED</div>
            </div>
        `;
    }
}

// ═══ Load Data ═══
async function loadData() {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allIPs = data.ips || [];

    const versionTag = document.getElementById('versionTag');
    if (versionTag && data.version) {
        versionTag.textContent = data.version;
    }
}

// ═══ Categories ═══
function setupCategories() {
    CATEGORIES['character'].ips = allIPs.filter(ip => {
        const brand = (ip.brand || '').toLowerCase();
        return ['芒果tv', '爱奇艺', '百度网盘'].some(b => brand.includes(b));
    }).map(ip => ip.id);
    
    CATEGORIES['product'].ips = allIPs.filter(ip => {
        const type = (ip.type || '').toLowerCase();
        const brand = (ip.brand || '').toLowerCase();
        return type.includes('商品') || brand.includes('古茗');
    }).map(ip => ip.id);
    
    CATEGORIES['personal'].ips = allIPs.filter(ip => {
        const brand = (ip.brand || '').toLowerCase();
        return brand.includes('个人') || !['芒果tv', '爱奇艺', '百度网盘', '古茗'].some(b => brand.includes(b));
    }).map(ip => ip.id);
    
    CATEGORIES['all'].ips = allIPs.map(ip => ip.id);
}

// ═══ Render Filter Bar ═══
function renderFilterBar() {
    const filterBar = document.getElementById('filterBar');
    let html = '';
    const mainCategories = ['all', 'character', 'product', 'personal'];
    
    mainCategories.forEach(key => {
        const cat = CATEGORIES[key];
        if (cat.ips.length > 0 || key === 'all') {
            html += `
                <div class="filter-group">
                    <button class="filter-btn ${key === 'all' ? 'active' : ''}" data-filter="${key}">
                        ${cat.label}
                    </button>
                </div>
            `;
        }
    });
    
    const brands = [...new Set(allIPs.map(ip => ip.brand).filter(Boolean))];
    if (brands.length > 0) {
        html += `<div class="filter-group">`;
        brands.slice(0, 4).forEach(brand => {
            html += `<button class="filter-btn" data-filter="brand:${brand}">${brand}</button>`;
        });
        html += `</div>`;
    }
    
    filterBar.innerHTML = html;
}

// ═══ Render Gallery ═══
function renderGallery() {
    const gallery = document.getElementById('gallery');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredIPs = allIPs;
    
    if (searchTerm) {
        filteredIPs = filteredIPs.filter(ip => 
            ip.name.toLowerCase().includes(searchTerm) ||
            (ip.brand && ip.brand.toLowerCase().includes(searchTerm))
        );
    }
    
    if (currentFilter !== 'all') {
        if (currentFilter.startsWith('brand:')) {
            const brand = currentFilter.replace('brand:', '');
            filteredIPs = filteredIPs.filter(ip => ip.brand === brand);
        } else {
            const categoryIPs = CATEGORIES[currentFilter]?.ips || [];
            filteredIPs = filteredIPs.filter(ip => categoryIPs.includes(ip.id));
        }
    }
    
    if (filteredIPs.length === 0) {
        gallery.innerHTML = `
            <div class="empty">
                <div class="empty-text">NO RESULTS</div>
            </div>
        `;
        return;
    }
    
    gallery.innerHTML = filteredIPs.map(ip => {
        // 提取编号的数字部分 (IP001 → 001)
        const codeNum = (ip.code || '').replace(/^IP/i, '');
        // IP 名称拼音（取 id 下划线前部分，大写）
        const pinyin = (ip.id || '').split('_')[0].toUpperCase();
        return `
        <article class="card" data-id="${ip.id}">
            <div class="card-image">
                <img src="${ip.preview}" alt="${ip.name}" loading="lazy">
                <div class="card-overlay"></div>
                <div class="card-badge">
                    <span class="badge-label">${pinyin}</span>
                    <span class="badge-number">${codeNum}</span>
                </div>
                <div class="card-links">
                    ${ip.brand_url ? `<a class="card-link" href="${ip.brand_url}" target="_blank">BRAND</a>` : ''}
                    ${ip.official_url ? `<a class="card-link" href="${ip.official_url}" target="_blank">OFFICIAL</a>` : ''}
                </div>
            </div>
            <div class="card-info">
                <div class="card-name" data-name="${ip.name}">${ip.name}</div>
                <div class="card-brand">${ip.brand || ''}</div>
            </div>
        </article>
    `}).join('');
}

// ═══ Event Listeners ═══
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(renderGallery, 200));
    
    document.getElementById('filterBar').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderGallery();
        }
    });
    
    document.getElementById('gallery').addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        const nameBtn = e.target.closest('.card-name');
        const linkBtn = e.target.closest('.card-link');
        
        if (linkBtn) return;
        
        if (nameBtn) {
            e.stopPropagation();
            copyToClipboard(nameBtn.dataset.name);
            return;
        }
        
        if (card) {
            const ipId = card.dataset.id;
            const ip = allIPs.find(i => i.id === ipId);
            if (ip) openModal(ip);
        }
    });
    
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    
    document.getElementById('copyNameBtn').addEventListener('click', () => {
        const name = document.getElementById('modalName').textContent;
        copyToClipboard(name);
        const btn = document.getElementById('copyNameBtn');
        btn.classList.add('copied');
        btn.textContent = 'COPIED!';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = 'COPY';
        }, 1500);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ═══ Modal ═══
function openModal(ip) {
    const modal = document.getElementById('modal');
    
    document.getElementById('modalView').style.display = '';
    document.getElementById('modalImage').src = ip.preview || '';
    document.getElementById('modalImage').alt = ip.name;
    document.getElementById('modalName').textContent = ip.name;
    document.getElementById('modalMeta').textContent = `${ip.code || ''} · ${ip.brand || ''}`;
    document.getElementById('modalDescription').textContent = ip.description || 'No description available.';

    const brandLink = document.getElementById('brandLink');
    const officialLink = document.getElementById('officialLink');
    const sourceLink = document.getElementById('sourceLink');

    if (ip.brand_url) { brandLink.href = ip.brand_url; brandLink.classList.remove('hidden'); }
    else { brandLink.classList.add('hidden'); }

    if (ip.official_url) { officialLink.href = ip.official_url; officialLink.classList.remove('hidden'); }
    else { officialLink.classList.add('hidden'); }

    if (ip.source_url) { sourceLink.href = ip.source_url; sourceLink.classList.remove('hidden'); }
    else { sourceLink.classList.add('hidden'); }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.style.overflow = '';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('COPIED');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

init();

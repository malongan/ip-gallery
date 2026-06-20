/**
 * IP Archive - Gallery Scripts v3
 * 复古像素风格 · 大类分类
 */

// Data URL
const DATA_URL = 'data.json';

// State
let allIPs = [];
let currentFilter = 'all';

// 分类配置
const CATEGORIES = {
    'all': { label: 'ALL', ips: [] },
    'character': { label: '卡通人物', ips: [] },
    'product': { label: '商品', ips: [] },
    'personal': { label: '个人IP', ips: [] }
};

/**
 * Initialize the gallery
 */
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

/**
 * Load data from JSON file
 */
async function loadData() {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    allIPs = data.ips || [];
}

/**
 * Setup category filters based on IP data
 */
function setupCategories() {
    // 卡通人物
    CATEGORIES['character'].ips = allIPs.filter(ip => {
        const brand = (ip.brand || '').toLowerCase();
        return ['芒果tv', '爱奇艺', '百度网盘'].some(b => brand.includes(b));
    }).map(ip => ip.id);
    
    // 商品
    CATEGORIES['product'].ips = allIPs.filter(ip => {
        const type = (ip.type || '').toLowerCase();
        const brand = (ip.brand || '').toLowerCase();
        return type.includes('商品') || brand.includes('古茗');
    }).map(ip => ip.id);
    
    // 个人IP
    CATEGORIES['personal'].ips = allIPs.filter(ip => {
        const brand = (ip.brand || '').toLowerCase();
        return brand.includes('个人') || !['芒果tv', '爱奇艺', '百度网盘', '古茗'].some(b => brand.includes(b));
    }).map(ip => ip.id);
    
    // All
    CATEGORIES['all'].ips = allIPs.map(ip => ip.id);
}

/**
 * Render filter bar with categories
 */
function renderFilterBar() {
    const filterBar = document.getElementById('filterBar');
    
    let html = '';
    
    // Main categories
    const mainCategories = ['all', 'character', 'product', 'personal'];
    
    mainCategories.forEach(key => {
        const cat = CATEGORIES[key];
        if (cat.ips.length > 0 || key === 'all') {
            html += `
                <div class="filter-group">
                    <span class="filter-label">${key === 'all' ? '' : ''}</span>
                    <button class="filter-btn ${key === 'all' ? 'active' : ''}" data-filter="${key}">
                        ${cat.label}
                    </button>
                </div>
            `;
        }
    });
    
    // Brand filters
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

/**
 * Render gallery cards
 */
function renderGallery() {
    const gallery = document.getElementById('gallery');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter IPs
    let filteredIPs = allIPs;
    
    // Search filter
    if (searchTerm) {
        filteredIPs = filteredIPs.filter(ip => 
            ip.name.toLowerCase().includes(searchTerm) ||
            (ip.brand && ip.brand.toLowerCase().includes(searchTerm))
        );
    }
    
    // Category filter
    if (currentFilter !== 'all') {
        if (currentFilter.startsWith('brand:')) {
            const brand = currentFilter.replace('brand:', '');
            filteredIPs = filteredIPs.filter(ip => ip.brand === brand);
        } else {
            const categoryIPs = CATEGORIES[currentFilter]?.ips || [];
            filteredIPs = filteredIPs.filter(ip => categoryIPs.includes(ip.id));
        }
    }
    
    // Empty state
    if (filteredIPs.length === 0) {
        gallery.innerHTML = `
            <div class="empty">
                <div class="empty-text">NO RESULTS</div>
            </div>
        `;
        return;
    }
    
    // Render cards
    gallery.innerHTML = filteredIPs.map((ip, index) => `
        <article class="card" data-id="${ip.id}">
            <div class="card-image">
                <picture>
                    <source srcset="${ip.preview}" type="image/webp">
                    <img src="${ip.preview}" alt="${ip.name}" loading="lazy">
                </picture>
            </div>
            <div class="card-info">
                <div class="card-code">${ip.code || 'IP' + String(index + 1).padStart(3, '0')}</div>
                <div class="card-name" data-name="${ip.name}">${ip.name}</div>
                <div class="card-brand">${ip.brand || ''}</div>
                <div class="card-links">
                    ${ip.brand_url ? `<a class="card-link" href="${ip.brand_url}" target="_blank">BRAND</a>` : ''}
                    ${ip.official_url ? `<a class="card-link" href="${ip.official_url}" target="_blank">OFFICIAL</a>` : ''}
                </div>
            </div>
        </article>
    `).join('');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search input
    document.getElementById('searchInput').addEventListener('input', debounce(renderGallery, 200));
    
    // Filter buttons
    document.getElementById('filterBar').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update filter
            currentFilter = e.target.dataset.filter;
            renderGallery();
        }
    });
    
    // Card click
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
            if (ip) {
                openModal(ip);
            }
        }
    });
    
    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    });
    
    // Copy button
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
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

/**
 * Open modal with IP details
 */
function openModal(ip) {
    const modal = document.getElementById('modal');
    
    document.getElementById('modalImage').src = ip.preview || '';
    document.getElementById('modalImage').alt = ip.name;
    document.getElementById('modalName').textContent = ip.name;
    document.getElementById('modalMeta').textContent = `${ip.brand || ''} · ${ip.code || ''}`;
    document.getElementById('modalDescription').textContent = ip.description || 'No description available.';
    
    // Links
    const brandLink = document.getElementById('brandLink');
    const officialLink = document.getElementById('officialLink');
    
    if (ip.brand_url) {
        brandLink.href = ip.brand_url;
        brandLink.classList.remove('hidden');
    } else {
        brandLink.classList.add('hidden');
    }
    
    if (ip.official_url) {
        officialLink.href = ip.official_url;
        officialLink.classList.remove('hidden');
    } else {
        officialLink.classList.add('hidden');
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('COPIED');
    } catch (err) {
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
}

/**
 * Show toast message
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

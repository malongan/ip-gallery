/**
 * IP Archive - Gallery Scripts v2
 * 复古像素风格
 */

// Data URL (CI will auto-generate this)
const DATA_URL = 'data.json';

// State
let allIPs = [];
let currentFilter = 'all';

/**
 * Initialize the gallery
 */
async function init() {
    try {
        await loadData();
        renderBrandFilter();
        renderGallery();
        setupEventListeners();
    } catch (error) {
        console.error('Failed to load gallery data:', error);
        document.getElementById('gallery').innerHTML = `
            <div class="empty">
                <div class="empty-icon">▣</div>
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
 * Render brand filter buttons
 */
function renderBrandFilter() {
    const brands = [...new Set(allIPs.map(ip => ip.brand).filter(Boolean))];
    const filterBar = document.getElementById('filterBar');
    
    // All button
    let html = `<button class="filter-btn active" data-brand="all">ALL</button>`;
    
    // Brand buttons
    brands.forEach(brand => {
        html += `<button class="filter-btn" data-brand="${brand}">${brand}</button>`;
    });
    
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
    
    // Brand filter
    if (currentFilter !== 'all') {
        filteredIPs = filteredIPs.filter(ip => ip.brand === currentFilter);
    }
    
    // Empty state
    if (filteredIPs.length === 0) {
        gallery.innerHTML = `
            <div class="empty">
                <div class="empty-icon">▣</div>
                <div class="empty-text">NO RESULTS</div>
            </div>
        `;
        return;
    }
    
    // Render cards
    gallery.innerHTML = filteredIPs.map((ip, index) => `
        <article class="card" data-id="${ip.id}">
            <div class="card-image">
                <img src="${ip.preview}" alt="${ip.name}" loading="lazy">
            </div>
            <div class="card-info">
                <div class="card-code">${ip.code || 'IP' + String(index + 1).padStart(3, '0')}</div>
                <div class="card-name" data-name="${ip.name}">${ip.name}</div>
                <div class="card-brand">${ip.brand || ''}</div>
                <div class="card-links">
                    ${ip.brand_url ? `<a class="card-link" href="${ip.brand_url}" target="_blank">BRAND</a>` : ''}
                    ${ip.official_url ? `<a class="card-link" href="${ip.official_url}" target="_blank">OFFICIAL</a>` : ''}
                    ${ip.source_url ? `<a class="card-link" href="${ip.source_url}" target="_blank">SOURCE</a>` : ''}
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
    
    // Brand filter buttons
    document.getElementById('filterBar').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update filter
            currentFilter = e.target.dataset.brand;
            renderGallery();
        }
    });
    
    // Card click - open modal or copy name
    document.getElementById('gallery').addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        const nameBtn = e.target.closest('.card-name');
        const linkBtn = e.target.closest('.card-link');
        
        // If clicked on a link, don't open modal
        if (linkBtn) return;
        
        if (nameBtn) {
            // Copy name
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
    
    // Copy name button in modal
    document.getElementById('copyNameBtn').addEventListener('click', () => {
        const name = document.getElementById('modalName').textContent;
        copyToClipboard(name);
        
        // Visual feedback
        const btn = document.getElementById('copyNameBtn');
        btn.classList.add('copied');
        btn.textContent = 'COPIED!';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = 'COPY NAME';
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
    
    // Set image
    document.getElementById('modalImage').src = ip.preview || '';
    document.getElementById('modalImage').alt = ip.name;
    
    // Set info
    document.getElementById('modalName').textContent = ip.name;
    document.getElementById('modalMeta').textContent = `${ip.brand || ''} · ${ip.code || ''}`;
    
    // Set description
    document.getElementById('modalDescription').textContent = ip.description || 'No description available.';
    
    // Set links
    const brandLink = document.getElementById('brandLink');
    const officialLink = document.getElementById('officialLink');
    const sourceLink = document.getElementById('sourceLink');
    
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
    
    if (ip.source_url) {
        sourceLink.href = ip.source_url;
        sourceLink.classList.remove('hidden');
    } else {
        sourceLink.classList.add('hidden');
    }
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
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
        // Fallback
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
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 1500);
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

/**
 * IP Archive - Gallery Scripts v4
 * 复古像素风 · 编辑模式
 */

const DATA_URL = 'data.json';
const OVERRIDES_KEY = 'ip-gallery-edits';

let allIPs = [];
let currentFilter = 'all';
let editModeIP = null; // IP being edited
let localOverrides = {}; // localStorage overrides

const CATEGORIES = {
    'all': { label: 'ALL', ips: [] },
    'character': { label: '卡通人物', ips: [] },
    'product': { label: '商品', ips: [] },
    'personal': { label: '个人IP', ips: [] }
};

// ═══ Init ═══
async function init() {
    try {
        loadOverrides();
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

// ═══ LocalStorage Overrides ═══
function loadOverrides() {
    try {
        const saved = localStorage.getItem(OVERRIDES_KEY);
        localOverrides = saved ? JSON.parse(saved) : {};
    } catch(e) {
        localOverrides = {};
    }
}

function saveOverrides() {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(localOverrides));
}

function getOverride(ipId, field) {
    return localOverrides[ipId]?.[field];
}

function setOverride(ipId, field, value) {
    if (!localOverrides[ipId]) localOverrides[ipId] = {};
    if (value === '' || value === null || value === undefined) {
        delete localOverrides[ipId][field];
        if (Object.keys(localOverrides[ipId]).length === 0) {
            delete localOverrides[ipId];
        }
    } else {
        localOverrides[ipId][field] = value;
    }
    saveOverrides();
}

// ═══ Load Data ═══
async function loadData() {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allIPs = data.ips || [];

    // Apply overrides
    allIPs.forEach(ip => {
        const ov = localOverrides[ip.id];
        if (ov) {
            Object.keys(ov).forEach(key => {
                ip[key] = ov[key];
            });
        }
    });

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
    
    gallery.innerHTML = filteredIPs.map(ip => `
        <article class="card" data-id="${ip.id}">
            <div class="card-image">
                <img src="${ip.preview}" alt="${ip.name}" loading="lazy">
            </div>
            <div class="card-info">
                <div class="card-code">${ip.code || ''}</div>
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

    // Edit button
    document.getElementById('editBtn').addEventListener('click', toggleEditMode);

    // Save edits
    document.getElementById('saveEditBtn').addEventListener('click', saveEdits);

    // Cancel edits
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);

    // Upload image button
    document.getElementById('uploadBtn').addEventListener('click', handleUpload);

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ═══ Modal ═══
function openModal(ip) {
    editModeIP = ip;
    const modal = document.getElementById('modal');
    
    // Switch to view mode
    document.getElementById('modalView').style.display = '';
    document.getElementById('modalEdit').style.display = 'none';
    document.getElementById('editBtn').textContent = 'EDIT';
    document.getElementById('editBtn').classList.remove('editing');

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
    editModeIP = null;
}

// ═══ Edit Mode ═══
function toggleEditMode() {
    const view = document.getElementById('modalView');
    const edit = document.getElementById('modalEdit');
    const btn = document.getElementById('editBtn');
    
    const isEditing = btn.classList.contains('editing');
    
    if (isEditing) {
        // Switch back to view
        view.style.display = '';
        edit.style.display = 'none';
        btn.textContent = 'EDIT';
        btn.classList.remove('editing');
    } else {
        // Switch to edit mode
        view.style.display = 'none';
        edit.style.display = '';
        btn.textContent = 'CLOSE';
        btn.classList.add('editing');
        
        // Populate edit fields
        document.getElementById('editPreview').value = editModeIP.preview || '';
        document.getElementById('editBrandUrl').value = editModeIP.brand_url || '';
        document.getElementById('editOfficialUrl').value = editModeIP.official_url || '';
        document.getElementById('editSourceUrl').value = editModeIP.source_url || '';
        document.getElementById('editDescription').value = editModeIP.description || '';
    }
}

function saveEdits() {
    const ip = editModeIP;
    if (!ip) return;
    
    const fields = {
        preview: document.getElementById('editPreview').value.trim(),
        brand_url: document.getElementById('editBrandUrl').value.trim(),
        official_url: document.getElementById('editOfficialUrl').value.trim(),
        source_url: document.getElementById('editSourceUrl').value.trim(),
        description: document.getElementById('editDescription').value.trim()
    };
    
    // Save to localStorage
    Object.keys(fields).forEach(key => {
        setOverride(ip.id, key, fields[key]);
    });
    
    // Update in-memory IP
    Object.keys(fields).forEach(key => {
        ip[key] = fields[key] || ip[key];
    });
    
    // Close edit mode and refresh
    toggleEditMode();
    closeModal();
    renderGallery();
    showToast('EDITS SAVED ✓');
}

function cancelEdit() {
    toggleEditMode();
}

// ═══ Upload Handler ═══
function handleUpload() {
    if (!editModeIP) return;
    const ipId = editModeIP.id;
    const ipName = editModeIP.name;
    
    showToast('ASK GITHUB MANAGER TO UPLOAD');
    
    // Show instructions
    const previewInput = document.getElementById('editPreview');
    previewInput.placeholder = 'Ask: @github-manager upload preview for ' + ipName;
    previewInput.value = '';
    
    // Open a small help text
    const helpText = document.createElement('div');
    helpText.className = 'edit-upload-help';
    helpText.textContent = `Tell GitHub Manager: "Upload preview for ${ipName}"`;
    
    const existing = document.querySelector('.edit-upload-help');
    if (existing) existing.remove();
    
    previewInput.parentNode.after(helpText);
    
    setTimeout(() => {
        if (helpText.parentNode) helpText.remove();
    }, 8000);
}

// ═══ Utilities ═══
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

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

document.addEventListener('DOMContentLoaded', init);

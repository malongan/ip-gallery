/**
 * IP Archive Gallery - 瀑布流画廊
 */

// 数据源（CI 会自动更新此文件）
let galleryData = {
    updated: '-',
    ips: []
};

// 当前筛选
let currentFilter = 'all';
let searchQuery = '';

// ========================================
// 初始化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initEventListeners();
});

// 加载数据
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('数据加载失败');
        
        galleryData = await response.json();
        renderGallery();
        renderFilters();
        updateTime();
    } catch (error) {
        console.error('加载数据失败:', error);
        showEmpty();
    }
}

// 初始化事件监听
function initEventListeners() {
    // 搜索
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderGallery();
    });

    // 弹窗关闭
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });

    // ESC 关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // 复制按钮
    document.getElementById('btnCopy').addEventListener('click', copyName);
}

// ========================================
// 渲染
// ========================================

// 渲染瀑布流
function renderGallery() {
    const gallery = document.getElementById('gallery');
    const filteredIPs = getFilteredIPs();

    if (filteredIPs.length === 0) {
        showEmpty();
        return;
    }

    gallery.innerHTML = filteredIPs.map((ip, index) => createCardHTML(ip, index)).join('');
    
    // 添加卡片点击事件
    gallery.querySelectorAll('.card').forEach((card, i) => {
        card.addEventListener('click', () => openModal(filteredIPs[i]));
    });

    // 添加名称点击复制事件
    gallery.querySelectorAll('.card-name').forEach((name, i) => {
        name.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(filteredIPs[i].name, name);
        });
    });
}

// 创建卡片 HTML
function createCardHTML(ip, index) {
    const code = `IP${String(index + 1).padStart(3, '0')}`;
    
    return `
        <div class="card" data-id="${ip.id}">
            <img class="card-image" src="${ip.preview}" alt="${ip.name}" loading="lazy">
            <div class="card-info">
                <div class="card-code">${code}</div>
                <div class="card-name">${ip.name}</div>
                <div class="card-brand">${ip.brand || ''}</div>
                <div class="card-links">
                    ${createLinkButtons(ip, 'card-link')}
                </div>
            </div>
        </div>
    `;
}

// 创建链接按钮
function createLinkButtons(ip, className = 'btn-link') {
    let buttons = '';
    
    if (ip.brand_url) {
        buttons += `<a class="${className}" href="${ip.brand_url}" target="_blank">品牌</a>`;
    }
    if (ip.official_url) {
        buttons += `<a class="${className}" href="${ip.official_url}" target="_blank">官网</a>`;
    }
    if (ip.source_url) {
        buttons += `<a class="${className}" href="${ip.source_url}" target="_blank">设定</a>`;
    }
    
    return buttons;
}

// 渲染筛选按钮
function renderFilters() {
    const filterBar = document.getElementById('filterBar');
    const brands = [...new Set(galleryData.ips.map(ip => ip.brand).filter(Boolean))];
    
    let html = '<button class="filter-btn active" data-brand="all">全部</button>';
    
    brands.forEach(brand => {
        html += `<button class="filter-btn" data-brand="${brand}">${brand}</button>`;
    });
    
    filterBar.innerHTML = html;
    
    // 添加点击事件
    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.brand;
            renderGallery();
        });
    });
}

// 更新时间
function updateTime() {
    const timeEl = document.getElementById('updateTime');
    if (galleryData.updated) {
        timeEl.textContent = galleryData.updated;
    }
}

// 空状态
function showEmpty() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = `
        <div class="empty">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">没有找到匹配的 IP</div>
        </div>
    `;
}

// ========================================
// 筛选
// ========================================

function getFilteredIPs() {
    return galleryData.ips.filter(ip => {
        // 品牌筛选
        const brandMatch = currentFilter === 'all' || ip.brand === currentFilter;
        
        // 搜索筛选
        const searchMatch = !searchQuery || 
            ip.name.toLowerCase().includes(searchQuery) ||
            (ip.brand && ip.brand.toLowerCase().includes(searchQuery)) ||
            (ip.code && ip.code.toLowerCase().includes(searchQuery));
        
        return brandMatch && searchMatch;
    });
}

// ========================================
// 弹窗
// ========================================

function openModal(ip) {
    const modal = document.getElementById('modal');
    const index = galleryData.ips.findIndex(i => i.id === ip.id) + 1;
    const code = `IP${String(index).padStart(3, '0')}`;
    
    document.getElementById('modalImg').src = ip.preview;
    document.getElementById('modalImg').alt = ip.name;
    document.getElementById('modalTitle').textContent = ip.name;
    document.getElementById('modalMeta').textContent = `${ip.brand || ''} · ${code}`;
    document.getElementById('modalDesc').textContent = ip.description || '暂无介绍';
    
    // 链接按钮
    const btnBrand = document.getElementById('btnBrand');
    const btnOfficial = document.getElementById('btnOfficial');
    const btnSource = document.getElementById('btnSource');
    
    if (ip.brand_url) {
        btnBrand.href = ip.brand_url;
        btnBrand.classList.remove('hidden');
    } else {
        btnBrand.classList.add('hidden');
    }
    
    if (ip.official_url) {
        btnOfficial.href = ip.official_url;
        btnOfficial.classList.remove('hidden');
    } else {
        btnOfficial.classList.add('hidden');
    }
    
    if (ip.source_url) {
        btnSource.href = ip.source_url;
        btnSource.classList.remove('hidden');
    } else {
        btnSource.classList.add('hidden');
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// 复制功能
// ========================================

async function copyName() {
    const name = document.getElementById('modalTitle').textContent;
    const success = await copyToClipboard(name, document.getElementById('btnCopy'));
    
    if (success) {
        showToast('已复制');
    }
}

async function copyToClipboard(text, element) {
    try {
        await navigator.clipboard.writeText(text);
        
        if (element && element.classList.contains('card-name')) {
            const original = element.textContent;
            element.textContent = '已复制';
            element.style.color = 'var(--accent)';
            setTimeout(() => {
                element.textContent = original;
                element.style.color = '';
            }, 1000);
        }
        
        return true;
    } catch (err) {
        console.error('复制失败:', err);
        return false;
    }
}

// Toast 提示
function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

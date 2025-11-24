// ==================== TMDB API 配置 ====================
const API_KEY = '36c359ac72f71f2a596e69f9d65f6960';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// ==================== 全局状态 ====================
let currentMediaType = 'movie';
let currentGenre = '';
let trendingData = [];
let popularData = [];

// ==================== API 请求函数 ====================
async function fetchFromAPI(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}&language=zh-CN`);
        if (!response.ok) throw new Error('API 请求失败');
        return await response.json();
    } catch (error) {
        console.error('API 错误:', error);
        return null;
    }
}

// 获取热门内容
async function getTrending(mediaType = 'movie') {
    return await fetchFromAPI(`/trending/${mediaType}/day`);
}

// 获取流行内容
async function getPopular(mediaType = 'movie') {
    return await fetchFromAPI(`/${mediaType}/popular`);
}

// 搜索
async function searchMulti(query) {
    return await fetchFromAPI(`/search/multi?query=${encodeURIComponent(query)}`);
}

// 获取详情
async function getDetails(id, mediaType = 'movie') {
    return await fetchFromAPI(`/${mediaType}/${id}?append_to_response=credits`);
}

// 获取类型列表
async function getGenres(mediaType = 'movie') {
    return await fetchFromAPI(`/genre/${mediaType}/list`);
}

// 按类型发现
async function discoverByGenre(mediaType = 'movie', genreId = '') {
    const genreParam = genreId ? `&with_genres=${genreId}` : '';
    return await fetchFromAPI(`/discover/${mediaType}?sort_by=popularity.desc${genreParam}`);
}

// ==================== UI 渲染函数 ====================

// 创建电影卡片
function createMovieCard(item) {
    const mediaType = item.media_type || currentMediaType;
    const title = item.title || item.name;
    const posterPath = item.poster_path 
        ? `${IMAGE_BASE_URL}/w500${item.poster_path}` 
        : 'https://via.placeholder.com/500x750/1e293b/64748b?text=暂无海报';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const year = (item.release_date || item.first_air_date || '').split('-')[0];

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img src="${posterPath}" alt="${title}" class="movie-poster" loading="lazy">
        <div class="movie-info">
            <h4 class="movie-title">${title}</h4>
            <div class="movie-meta">
                <span class="movie-year">${year || '未知'}</span>
                <span class="movie-rating">⭐ ${rating}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showDetails(item.id, mediaType));
    return card;
}

// 渲染电影网格
function renderMovieGrid(items, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    if (!items || items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">暂无内容</p>';
        return;
    }
    
    items.forEach(item => {
        grid.appendChild(createMovieCard(item));
    });
}

// 显示详情弹窗
async function showDetails(id, mediaType) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    loadingOverlay.classList.add('active');
    
    const data = await getDetails(id, mediaType);
    
    loadingOverlay.classList.remove('active');
    
    if (!data) {
        alert('获取详情失败，请稍后重试');
        return;
    }
    
    const title = data.title || data.name;
    const backdropPath = data.backdrop_path 
        ? `${IMAGE_BASE_URL}/original${data.backdrop_path}` 
        : `${IMAGE_BASE_URL}/w500${data.poster_path}`;
    const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
    const releaseDate = data.release_date || data.first_air_date || '未知';
    const runtime = data.runtime ? `${data.runtime} 分钟` : (data.number_of_seasons ? `${data.number_of_seasons} 季` : '');
    const genres = data.genres ? data.genres.map(g => g.name).join(', ') : '';
    const overview = data.overview || '暂无简介';
    
    modalBody.innerHTML = `
        <img src="${backdropPath}" alt="${title}" class="detail-backdrop" onerror="this.style.display='none'">
        <h2 class="detail-title">${title}</h2>
        <div class="detail-meta">
            <span class="detail-rating">⭐ ${rating}</span>
            <span>${releaseDate}</span>
            ${runtime ? `<span>${runtime}</span>` : ''}
            ${genres ? `<span>${genres}</span>` : ''}
        </div>
        <p class="detail-overview">${overview}</p>
    `;
    
    modal.classList.add('active');
}

// 关闭弹窗
function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// ==================== 加载内容 ====================

// 加载热门和流行内容
async function loadContent() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    const [trending, popular] = await Promise.all([
        currentGenre ? discoverByGenre(currentMediaType, currentGenre) : getTrending(currentMediaType),
        getPopular(currentMediaType)
    ]);
    
    loadingOverlay.classList.remove('active');
    
    if (trending) {
        trendingData = trending.results;
        renderMovieGrid(trendingData, 'trendingGrid');
    }
    
    if (popular) {
        popularData = popular.results;
        renderMovieGrid(popularData, 'popularGrid');
    }
}

// 随机推荐
function showRandomPick() {
    const allItems = [...trendingData, ...popularData];
    if (allItems.length === 0) {
        alert('请稍候，正在加载内容...');
        return;
    }
    
    const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
    const mediaType = randomItem.media_type || currentMediaType;
    showDetails(randomItem.id, mediaType);
}

// 搜索功能
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        alert('请输入搜索内容');
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    const results = await searchMulti(query);
    
    loadingOverlay.classList.remove('active');
    
    if (results && results.results) {
        const filtered = results.results.filter(item => 
            item.media_type === 'movie' || item.media_type === 'tv'
        );
        renderMovieGrid(filtered, 'searchGrid');
        document.getElementById('searchResultTitle').style.display = 'block';
    }
}

// 加载类型列表
async function loadGenres() {
    const genreSelect = document.getElementById('genreSelect');
    const data = await getGenres(currentMediaType);
    
    if (data && data.genres) {
        genreSelect.innerHTML = '<option value="">所有类型</option>';
        data.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            genreSelect.appendChild(option);
        });
    }
}

// ==================== 事件监听 ====================

document.addEventListener('DOMContentLoaded', () => {
    // 初始化加载
    loadContent();
    loadGenres();
    
    // 随机推荐按钮
    document.getElementById('surpriseBtn').addEventListener('click', showRandomPick);
    
    // 导航标签切换
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 更新按钮状态
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 切换标签页
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`${tab}Tab`).classList.add('active');
        });
    });
    
    // 媒体类型切换
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentMediaType = btn.dataset.media;
            currentGenre = '';
            document.getElementById('genreSelect').value = '';
            loadContent();
            loadGenres();
        });
    });
    
    // 类型筛选
    document.getElementById('genreSelect').addEventListener('change', (e) => {
        currentGenre = e.target.value;
        loadContent();
    });
    
    // 搜索
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // 关闭弹窗
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);
    
    // ESC 键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});

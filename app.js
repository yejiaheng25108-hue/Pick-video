// ==================== TMDB API 配置 ====================
const API_KEY = '36c359ac72f71f2a596e69f9d65f6960';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Worker API 端点 - 部署后替换为你的 Worker URL
const COMMENT_API_URL = 'https://pick-video-api.yejiaheng25108.workers.dev/api/comments'; // 例如: https://pick-video-api.your-subdomain.workers.dev/api/comments

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
    document.body.style.overflow = 'hidden'; // 禁止背景滚动
}

// 关闭弹窗
function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
    document.body.style.overflow = ''; // 恢复背景滚动
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
    const optionsContainer = document.querySelector('.select-options');
    const data = await getGenres(currentMediaType);

    if (data && data.genres) {
        optionsContainer.innerHTML = '<div class="option active" data-value="">所有类型</div>';
        data.genres.forEach(genre => {
            const option = document.createElement('div');
            option.className = 'option';
            option.dataset.value = genre.id;
            option.textContent = genre.name;
            optionsContainer.appendChild(option);
        });

        setupCustomSelect();
    }
}

// 设置自定义下拉菜单
function setupCustomSelect() {
    const customSelect = document.getElementById('customGenreSelect');
    const trigger = customSelect.querySelector('.select-trigger');
    const options = customSelect.querySelectorAll('.option');
    const selectedText = customSelect.querySelector('.selected-text');

    // 切换下拉菜单
    trigger.onclick = (e) => {
        e.stopPropagation();
        customSelect.classList.toggle('open');
    };

    // 选择选项
    options.forEach(option => {
        option.onclick = (e) => {
            e.stopPropagation();

            // 更新选中状态
            options.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // 更新显示文本
            selectedText.textContent = option.textContent;

            // 更新值并触发加载
            currentGenre = option.dataset.value;
            loadContent();

            // 关闭菜单
            customSelect.classList.remove('open');
        };
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });
}

// ==================== 留言系统 ====================

// 加载留言
async function loadComments() {
    try {
        const response = await fetch(COMMENT_API_URL);
        const data = await response.json();

        if (data.success && data.comments) {
            renderComments(data.comments);
        } else {
            document.getElementById('commentsList').innerHTML = '<p class="no-comments">暂时还没有留言哦~快来抢沙发吧！</p>';
        }
    } catch (error) {
        console.error('加载留言失败:', error);
        document.getElementById('commentsList').innerHTML = '<p class="error-message">加载留言失败，请稍后重试</p>';
    }
}

// 渲染留言列表
function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');

    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">暂时还没有留言哦~快来抢沙发吧！</p>';
        return;
    }

    commentsList.innerHTML = '';

    comments.forEach(comment => {
        const commentCard = document.createElement('div');
        commentCard.className = 'comment-card';

        const timeAgo = getTimeAgo(comment.created_at);

        commentCard.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">👤 ${escapeHtml(comment.nickname)}</span>
                <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
        `;

        commentsList.appendChild(commentCard);
    });
}

// 提交留言
async function submitComment(e) {
    e.preventDefault();

    const nicknameInput = document.getElementById('nicknameInput');
    const contentInput = document.getElementById('contentInput');
    const submitBtn = document.querySelector('.btn-submit');

    const nickname = nicknameInput.value.trim();
    const content = contentInput.value.trim();

    if (!nickname || !content) {
        alert('请填写昵称和留言内容！');
        return;
    }

    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">提交中...</span>';

    try {
        const response = await fetch(COMMENT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname, content })
        });

        const data = await response.json();

        if (data.success) {
            // 清空表单
            nicknameInput.value = '';
            contentInput.value = '';
            document.getElementById('charCount').textContent = '0';

            // 重新加载留言
            await loadComments();

            // 滚动到留言列表
            document.getElementById('commentsList').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            alert('留言成功！✨');
        } else {
            alert(data.error || '提交失败，请稍后重试');
        }
    } catch (error) {
        console.error('提交留言失败:', error);
        alert('提交留言失败，请检查网络连接');
    } finally {
        // 恢复提交按钮
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">✨</span><span class="btn-text">发送留言</span>';
    }
}

// 更新字符计数
function updateCharCount() {
    const contentInput = document.getElementById('contentInput');
    const charCount = document.getElementById('charCount');
    charCount.textContent = contentInput.value.length;
}

// HTML 转义（防止 XSS）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 时间格式化（多久之前）
function getTimeAgo(timestamp) {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffMs = now - commentTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return commentTime.toLocaleDateString('zh-CN');
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
            // 重置自定义下拉菜单
            const customSelect = document.getElementById('customGenreSelect');
            if (customSelect) {
                customSelect.querySelector('.selected-text').textContent = '所有类型';
                customSelect.classList.remove('open');
            }

            loadContent();
            loadGenres();
        });
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

    // 留言系统
    loadComments(); // 加载留言
    document.getElementById('commentForm').addEventListener('submit', submitComment);
    document.getElementById('contentInput').addEventListener('input', updateCharCount);

    // 留言板导航
    document.getElementById('commentNavBtn').addEventListener('click', () => {
        // 移除所有导航按钮的 active 状态
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        // 滚动到留言板
        document.getElementById('commentBoard').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });
});

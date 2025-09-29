// Global variables
let currentUser = null;
let currentPage = 'home';
let currentBlogId = null;
let uploadedImages = [];

// API base URL
const API_BASE = 'http://localhost:5000';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Check if user is authenticated

    await checkAuthStatus();

    // Set up event listeners
    setupEventListeners();

    // Handle URL routing
    handleRouting();

    // Load initial content
    if (currentPage === 'home') {
        loadPublicBlogs();
    }
}

// Authentication functions
async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');

    if (token) {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateUIForAuthenticatedUser();
            } else {
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('authToken');
        }
    }
}

function updateUIForAuthenticatedUser() {
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('my-blogs-link').style.display = 'block';
    document.getElementById('create-link').style.display = 'block';
    document.getElementById('user-menu').style.display = 'flex';

    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    userAvatar.src = currentUser.avatar || 'https://via.placeholder.com/32';
    userName.textContent = currentUser.username;
}

function login() {
    window.location.href = `${API_BASE}/auth/google`;
}

function logout() {
    localStorage.removeItem('authToken');
    currentUser = null;
    location.reload();
}

// Routing functions
function handleRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const page = window.location.hash.substr(1) || 'home';
    if (token) {
        localStorage.setItem('authToken', token);
        window.history.replaceState({}, document.title, '/');
        location.reload();
        return;
    }

    navigateToPage(page);
}

function navigateToPage(pageName, data = null) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show requested page
    const pageElement = document.getElementById(`${pageName}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
        currentPage = pageName;

        // Update URL
        window.history.pushState({}, '', `#${pageName}`);

        // Load page-specific content
        switch (pageName) {
            case 'home':
                loadPublicBlogs();
                break;
            case 'my-blogs':
                loadMyBlogs();
                break;
            case 'create':
                setupCreateForm(data);
                break;
            case 'blog-detail':
                loadBlogDetail(data);
                break;
            case 'profile':
                loadProfile();
                break;
        }
    }
}

// Event listeners setup
function setupEventListeners() {
    // Navigation
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('logout-btn').addEventListener('click', logout);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    document.querySelectorAll('[data-page]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Search
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Filters
    document.getElementById('tag-filter').addEventListener('input', handleFilters);
    document.getElementById('sort-filter').addEventListener('change', handleFilters);

    // Blog form
    document.getElementById('save-draft').addEventListener('click', () => saveBlog(false));
    document.getElementById('publish-blog').addEventListener('click', () => saveBlog(true));
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', saveProfile);
}

// Blog loading functions
async function loadPublicBlogs(page = 1, search = '', tag = '', sort = 'newest') {
    showLoading(true);

    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '9',
            ...(search && { search }),
            ...(tag && { tag }),
            ...(sort && { sort })
        });

        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/api/blogs?${params}`, {
            headers
        });

        const data = await response.json();

        if (response.ok) {
            renderBlogsGrid(data.blogs, 'blogs-grid');
            renderPagination(data.pagination, 'pagination', (p) => loadPublicBlogs(p, search, tag, sort));
        } else {
            showToast('Failed to load blogs', 'error');
        }
    } catch (error) {
        console.error('Error loading blogs:', error);
        showToast('Failed to load blogs', 'error');
    }

    showLoading(false);
}

async function loadMyBlogs(page = 1) {
    if (!currentUser) {
        navigateToPage('home');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/blogs/my?page=${page}&limit=9`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            renderBlogsGrid(data.blogs, 'my-blogs-grid', true);
            renderPagination(data.pagination, 'my-blogs-pagination', loadMyBlogs);
        } else {
            showToast('Failed to load your blogs', 'error');
        }
    } catch (error) {
        console.error('Error loading my blogs:', error);
        showToast('Failed to load your blogs', 'error');
    }

    showLoading(false);
}

async function loadBlogDetail(blogId) {
    showLoading(true);

    try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/api/blogs/${blogId}`, {
            headers
        });

        const blog = await response.json();

        if (response.ok) {
            renderBlogDetail(blog);
        } else {
            showToast(blog.error || 'Blog not found', 'error');
            navigateToPage('home');
        }
    } catch (error) {
        console.error('Error loading blog:', error);
        showToast('Failed to load blog', 'error');
        navigateToPage('home');
    }

    showLoading(false);
}

// Rendering functions
function renderBlogsGrid(blogs, containerId, showActions = false) {
    const container = document.getElementById(containerId);

    if (blogs.length === 0) {
        container.innerHTML = '<div class="no-content">No blogs found.</div>';
        return;
    }

    container.innerHTML = blogs.map(blog => `
        <div class="blog-card" onclick="navigateToPage('blog-detail', '${blog._id}')">
            ${blog.images && blog.images.length > 0 ?
            `<img src="${blog.images[0]}" alt="${blog.title}" class="blog-card-image">` :
            '<div class="blog-card-image" style="background: var(--surface-color); display: flex; align-items: center; justify-content: center; color: var(--text-muted);">No Image</div>'
        }
            <div class="blog-card-content">
                <h3 class="blog-card-title">${blog.title}</h3>
                ${blog.summary ? `<p class="blog-card-summary">${blog.summary}</p>` : ''}
                
                <div class="blog-card-meta">
                    <div class="blog-card-author">
                        <img src="${blog.author.avatar || 'https://via.placeholder.com/24'}" alt="${blog.author.name}">
                        <span>${blog.author.name}</span>
                    </div>
                    <span class="blog-card-date">${formatDate(blog.createdAt)}</span>
                </div>
                
                ${blog.tags && blog.tags.length > 0 ? `
                    <div class="blog-card-tags">
                        ${blog.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="blog-card-stats">
                    <span>${blog.views || 0} views • ${blog.readTime || 1} min read</span>
                    <span>${blog.likes?.length || 0} ❤️</span>
                </div>
                
                ${showActions ? `
                    <div class="blog-card-actions" onclick="event.stopPropagation()">
                        <button onclick="editBlog('${blog._id}')" title="Edit">✏️</button>
                        <button onclick="deleteBlog('${blog._id}')" title="Delete">🗑️</button>
                        <span class="${blog.isPublic ? 'text-success' : 'text-muted'}">${blog.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderBlogDetail(blog) {
    const container = document.getElementById('blog-detail');
    const isOwner = currentUser && blog.author._id === currentUser._id;
    const isLiked = currentUser && blog.likes && blog.likes.includes(currentUser._id);

    container.innerHTML = `
        <div class="blog-detail-header">
            <h1 class="blog-detail-title">${blog.title}</h1>
            <div class="blog-detail-meta">
                <div class="blog-detail-author">
                    <img src="${blog.author.avatar || 'https://via.placeholder.com/40'}" alt="${blog.author.name}">
                    <div>
                        <strong>${blog.author.name}</strong>
                        ${blog.author.bio ? `<p style="margin: 0; color: var(--text-muted); font-size: 0.875rem;">${blog.author.bio}</p>` : ''}
                    </div>
                </div>
                <div style="text-align: right; color: var(--text-muted); font-size: 0.875rem;">
                    <div>${formatDate(blog.createdAt)}</div>
                    <div>${blog.views || 0} views • ${blog.readTime || 1} min read</div>
                </div>
            </div>
            
            ${blog.tags && blog.tags.length > 0 ? `
                <div class="blog-card-tags" style="margin-top: 1rem;">
                    ${blog.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            ${isOwner ? `
                <div style="margin-top: 1rem;">
                    <button class="btn-secondary" onclick="editBlog('${blog._id}')">Edit Blog</button>
                    <button class="btn-secondary" onclick="deleteBlog('${blog._id}')" style="margin-left: 0.5rem;">Delete Blog</button>
                    <span class="blog-tag" style="margin-left: 1rem;">${blog.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                </div>
            ` : ''}
        </div>
        
        ${blog.images && blog.images.length > 0 ? `
            <div class="blog-detail-images">
                ${blog.images.map(image => `<img src="${image}" alt="Blog image">`).join('')}
            </div>
        ` : ''}
        
        <div class="blog-detail-content">
            ${formatBlogContent(blog.content)}
        </div>
        
        <div class="blog-detail-actions">
            ${currentUser ? `
                <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${blog._id}')">
                    <span>${isLiked ? '❤️' : '🤍'}</span>
                    <span>${blog.likes?.length || 0} likes</span>
                </button>
            ` : `
                <span style="color: var(--text-muted);">❤️ ${blog.likes?.length || 0} likes</span>
            `}
            
            <button class="btn-secondary" onclick="navigator.share && navigator.share({title: '${blog.title}', url: window.location.href}) || copyToClipboard(window.location.href)">
                Share 📤
            </button>
        </div>
    `;
}

function renderPagination(pagination, containerId, onPageChange) {
    const container = document.getElementById(containerId);

    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button ${pagination.current === 1 ? 'disabled' : ''} 
                onclick="${pagination.current > 1 ? `(${onPageChange})(${pagination.current - 1})` : ''}">
            ‹ Previous
        </button>
    `;

    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.current ||
            i === 1 ||
            i === pagination.pages ||
            (i >= pagination.current - 1 && i <= pagination.current + 1)) {
            paginationHTML += `
                <button class="${i === pagination.current ? 'active' : ''}"
                        onclick="(${onPageChange})(${i})">
                    ${i}
                </button>
            `;
        } else if (i === pagination.current - 2 || i === pagination.current + 2) {
            paginationHTML += '<span>...</span>';
        }
    }

    // Next button
    paginationHTML += `
        <button ${pagination.current === pagination.pages ? 'disabled' : ''} 
                onclick="${pagination.current < pagination.pages ? `(${onPageChange})(${pagination.current + 1})` : ''}">
            Next ›
        </button>
    `;

    container.innerHTML = paginationHTML;
}

// Blog form functions
function setupCreateForm(blogId = null) {
    currentBlogId = blogId;
    uploadedImages = [];

    document.getElementById('create-title').textContent = blogId ? 'Edit Blog' : 'Create New Blog';

    // Clear form
    document.getElementById('blog-form').reset();
    document.getElementById('image-preview').innerHTML = '';

    // Load blog data if editing
    if (blogId) {
        loadBlogForEdit(blogId);
    }
}

async function loadBlogForEdit(blogId) {
    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/blogs/${blogId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const blog = await response.json();

        if (response.ok) {
            // Populate form
            document.getElementById('blog-id').value = blog._id;
            document.getElementById('blog-title').value = blog.title;
            document.getElementById('blog-summary').value = blog.summary || '';
            document.getElementById('blog-content').value = blog.content;
            document.getElementById('blog-tags').value = blog.tags?.join(', ') || '';
            document.getElementById('is-public').checked = blog.isPublic;

            // Handle images
            uploadedImages = blog.images || [];
            renderImagePreview();
        } else {
            showToast('Failed to load blog for editing', 'error');
            navigateToPage('my-blogs');
        }
    } catch (error) {
        console.error('Error loading blog for edit:', error);
        showToast('Failed to load blog for editing', 'error');
        navigateToPage('my-blogs');
    }

    showLoading(false);
}

async function saveBlog(isPublic) {
    if (!currentUser) {
        showToast('Please log in to create blogs', 'error');
        return;
    }

    const title = document.getElementById('blog-title').value.trim();
    const content = document.getElementById('blog-content').value.trim();
    const summary = document.getElementById('blog-summary').value.trim();
    const tags = document.getElementById('blog-tags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    if (!title || !content) {
        showToast('Title and content are required', 'error');
        return;
    }

    showLoading(true);

    try {
        const blogData = {
            title,
            content,
            summary: summary || null,
            images: uploadedImages,
            tags,
            isPublic
        };

        const url = currentBlogId ?
            `${API_BASE}/api/blogs/${currentBlogId}` :
            `${API_BASE}/api/blogs`;

        const method = currentBlogId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(blogData)
        });

        const result = await response.json();

        if (response.ok) {
            showToast(
                currentBlogId ? 'Blog updated successfully!' : 'Blog created successfully!',
                'success'
            );
            navigateToPage('my-blogs');
        } else {
            showToast(result.error || 'Failed to save blog', 'error');
        }
    } catch (error) {
        console.error('Error saving blog:', error);
        showToast('Failed to save blog', 'error');
    }

    showLoading(false);
}

async function handleImageUpload(event) {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    showLoading(true);

    try {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));

        const response = await fetch(`${API_BASE}/api/upload/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            uploadedImages.push(...result.images.map(img => img.url));
            renderImagePreview();
            showToast(`${result.images.length} image(s) uploaded successfully!`, 'success');
        } else {
            showToast(result.error || 'Failed to upload images', 'error');
        }
    } catch (error) {
        console.error('Error uploading images:', error);
        showToast('Failed to upload images', 'error');
    }

    showLoading(false);

    // Clear the input
    event.target.value = '';
}

function renderImagePreview() {
    const container = document.getElementById('image-preview');

    container.innerHTML = uploadedImages.map((url, index) => `
        <div class="image-preview-item">
            <img src="${url}" alt="Preview">
            <button onclick="removeImage(${index})" title="Remove image">×</button>
        </div>
    `).join('');
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreview();
}

// Blog actions
async function editBlog(blogId) {
    navigateToPage('create', blogId);
}

async function deleteBlog(blogId) {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/blogs/${blogId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Blog deleted successfully', 'success');
            if (currentPage === 'blog-detail') {
                navigateToPage('my-blogs');
            } else {
                loadMyBlogs();
            }
        } else {
            showToast(result.error || 'Failed to delete blog', 'error');
        }
    } catch (error) {
        console.error('Error deleting blog:', error);
        showToast('Failed to delete blog', 'error');
    }

    showLoading(false);
}

async function toggleLike(blogId) {
    if (!currentUser) {
        showToast('Please log in to like blogs', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/blogs/${blogId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            // Update the like button in the current view
            const likeBtn = document.querySelector('.like-btn');
            if (likeBtn) {
                likeBtn.classList.toggle('liked', result.liked);
                likeBtn.innerHTML = `
                    <span>${result.liked ? '❤️' : '🤍'}</span>
                    <span>${result.likes} likes</span>
                `;
            }
        } else {
            showToast('Failed to update like', 'error');
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showToast('Failed to update like', 'error');
    }
}

// Search and filter functions
function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    loadPublicBlogs(1, query);
}

function handleFilters() {
    const tag = document.getElementById('tag-filter').value.trim();
    const sort = document.getElementById('sort-filter').value;
    const search = document.getElementById('search-input').value.trim();
    loadPublicBlogs(1, search, tag, sort);
}

// Profile functions
async function loadProfile() {
    if (!currentUser) {
        navigateToPage('home');
        return;
    }

    document.getElementById('profile-name').value = currentuser.username;
    document.getElementById('profile-bio').value = currentUser.bio || '';
    document.getElementById('profile-avatar').value = currentUser.avatar || '';
}

async function saveProfile(event) {
    event.preventDefault();

    const name = document.getElementById('profile-name').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();
    const avatar = document.getElementById('profile-avatar').value.trim();

    if (!name) {
        showToast('Name is required', 'error');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ name, bio, avatar })
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result;
            updateUIForAuthenticatedUser();
            showToast('Profile updated successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile', 'error');
    }

    showLoading(false);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function formatBlogContent(content) {
    // Simple markdown-like formatting
    return content
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Link copied to clipboard!', 'success');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Link copied to clipboard!', 'success');
    }
}

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
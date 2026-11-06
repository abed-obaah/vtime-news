import axios from 'axios';

export const API_BASE_URL =
    import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000/api';

const TOKEN_KEY = 'pulsenews_token';

export const tokenStore = {
    get() {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    },
    set(token) {
        try {
            if (token) localStorage.setItem(TOKEN_KEY, token);
            else localStorage.removeItem(TOKEN_KEY);
        } catch {
            /* private browsing — the session just won't survive a reload */
        }
    },
    clear() {
        this.set(null);
    },
};

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: { Accept: 'application/json' },
    timeout: 30000,
});

client.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/** Fires when the server rejects our token so the app can sign the user out. */
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

client.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        // A 401 on a login attempt is just "wrong password" — don't log out.
        const isAuthAttempt = /\/auth\/(login|register)$/.test(error.config?.url || '');

        if (status === 401 && !isAuthAttempt) {
            tokenStore.clear();
            onUnauthorized?.();
        }

        return Promise.reject(normalizeError(error));
    }
);

/**
 * Collapses axios/Laravel error shapes into one predictable object.
 */
export function normalizeError(error) {
    if (error?.isApiError) return error;

    const response = error?.response;
    const data = response?.data;

    const fieldErrors = data?.errors || null;
    const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat()[0]
        : null;

    let message =
        firstFieldError ||
        data?.message ||
        (error?.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Please try again.'
            : null) ||
        (!response
            ? 'Cannot reach the Vtime News server. Is the backend running?'
            : 'Something went wrong. Please try again.');

    if (response?.status === 403 && !data?.message) {
        message = 'You do not have permission to do that.';
    }

    return {
        isApiError: true,
        status: response?.status ?? 0,
        message,
        errors: fieldErrors,
        original: error,
    };
}

/** Unwraps `{ data: ... }` envelopes that Laravel resources emit. */
const unwrap = (response) =>
    response.data && Object.prototype.hasOwnProperty.call(response.data, 'data')
        ? response.data.data
        : response.data;

const get = (url, config) => client.get(url, config).then(unwrap);
const post = (url, body, config) => client.post(url, body, config).then((r) => r.data);
const put = (url, body, config) => client.put(url, body, config).then((r) => r.data);
const del = (url, config) => client.delete(url, config).then((r) => r.data);

/** Keeps pagination metadata alongside the rows. */
const paginated = (url, config) =>
    client.get(url, config).then((response) => ({
        items: response.data?.data ?? [],
        meta: response.data?.meta ?? null,
        links: response.data?.links ?? null,
    }));

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */
export const authApi = {
    register: (payload) => post('/auth/register', payload),
    login: (payload) => post('/auth/login', payload),
    me: () => client.get('/auth/me').then((r) => r.data.user),
    logout: () => post('/auth/logout'),
    updateProfile: (payload) => put('/auth/profile', payload),
    forgotPassword: (email) => post('/auth/forgot-password', { email }),
    resetPassword: (payload) => post('/auth/reset-password', payload),
};

/* ------------------------------------------------------------------ *
 * Public site
 * ------------------------------------------------------------------ */
export const publicApi = {
    home: () => get('/home'),
    categories: () => get('/categories'),
    posts: (params) => paginated('/posts', { params }),
    post: (slug) => get(`/posts/${encodeURIComponent(slug)}`),
    related: (slug) => get(`/posts/${encodeURIComponent(slug)}/related`),
    comments: (slug) => get(`/posts/${encodeURIComponent(slug)}/comments`),
    addComment: (slug, payload) =>
        post(`/posts/${encodeURIComponent(slug)}/comments`, payload).then((r) => r.data),
    likeComment: (id) => post(`/comments/${id}/like`),
    reportComment: (id) => post(`/comments/${id}/report`),
    deleteComment: (id) => del(`/comments/${id}`),
    toggleLike: (slug) => post(`/posts/${encodeURIComponent(slug)}/like`),
    toggleBookmark: (slug) => post(`/posts/${encodeURIComponent(slug)}/bookmark`),
    ratePost: (slug, value) => post(`/posts/${encodeURIComponent(slug)}/rate`, { value }),
    bookmarks: () => get('/me/bookmarks'),
    likes: () => get('/me/likes'),
    ads: (placement) => get('/ads', { params: placement ? { placement } : undefined }),
    adImpression: (id) => post(`/ads/${id}/impression`),
    adClick: (id) => post(`/ads/${id}/click`),
    announcements: () => get('/announcements'),
    tags: () => get('/tags'),
    sendFeedback: (payload) => post('/feedback', payload),
};

/* ------------------------------------------------------------------ *
 * Live broadcasts
 * ------------------------------------------------------------------ */
export const liveApi = {
    list: () => get('/live'),
    get: (roomName) => get(`/live/${encodeURIComponent(roomName)}`),
    // Returns the full body — { data: stream, token, wsUrl } — not just `data`,
    // since the caller needs the LiveKit token alongside the stream record.
    goLive: (payload) => post('/live', payload),
    end: (roomName) => post(`/live/${encodeURIComponent(roomName)}/end`),
    viewerToken: (roomName) => post(`/live/${encodeURIComponent(roomName)}/token`),
};

/* ------------------------------------------------------------------ *
 * Admin / newsroom
 * ------------------------------------------------------------------ */
export const adminApi = {
    overview: () => get('/admin/stats/overview'),
    analytics: (days) => get('/admin/stats/analytics', { params: { days } }),

    uploadImage: (file, { onProgress } = {}) => {
        const body = new FormData();
        body.append('image', file);

        return post('/admin/uploads/image', body, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? (e) => onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
                : undefined,
        });
    },

    posts: (params) => paginated('/admin/posts', { params }),
    postCounts: () => get('/admin/posts/counts'),
    post: (id) => get(`/admin/posts/${id}`),
    createPost: (payload) => post('/admin/posts', payload),
    updatePost: (id, payload) => put(`/admin/posts/${id}`, payload),
    deletePost: (id) => del(`/admin/posts/${id}`),
    publishPost: (id, note) => post(`/admin/posts/${id}/publish`, note ? { note } : {}),
    rejectPost: (id, note) => post(`/admin/posts/${id}/reject`, note ? { note } : {}),
    unpublishPost: (id) => post(`/admin/posts/${id}/unpublish`),
    bulkPosts: (ids, action) => post('/admin/posts/bulk', { ids, action }),

    categories: () => get('/admin/categories'),
    createCategory: (payload) => post('/admin/categories', payload),
    updateCategory: (id, payload) => put(`/admin/categories/${id}`, payload),
    deleteCategory: (id) => del(`/admin/categories/${id}`),

    users: (params) => paginated('/admin/users', { params }),
    updateUser: (id, payload) => put(`/admin/users/${id}`, payload),
    deleteUser: (id) => del(`/admin/users/${id}`),

    comments: (params) => paginated('/admin/comments', { params }),
    commentCounts: () => get('/admin/comments/counts'),
    updateComment: (id, status) => put(`/admin/comments/${id}`, { status }),
    deleteComment: (id) => del(`/admin/comments/${id}`),

    ads: () => get('/admin/ads'),
    createAd: (payload) => post('/admin/ads', payload),
    updateAd: (id, payload) => put(`/admin/ads/${id}`, payload),
    toggleAd: (id) => post(`/admin/ads/${id}/toggle`),
    deleteAd: (id) => del(`/admin/ads/${id}`),

    announcements: () => get('/admin/announcements'),
    createAnnouncement: (payload) => post('/admin/announcements', payload),
    updateAnnouncement: (id, payload) => put(`/admin/announcements/${id}`, payload),
    toggleAnnouncement: (id) => post(`/admin/announcements/${id}/toggle`),
    deleteAnnouncement: (id) => del(`/admin/announcements/${id}`),

    feedback: (params) => paginated('/admin/feedback', { params }),
    replyFeedback: (id, reply) => post(`/admin/feedback/${id}/reply`, { reply }),
    resolveFeedback: (id) => post(`/admin/feedback/${id}/resolve`),
    deleteFeedback: (id) => del(`/admin/feedback/${id}`),

    feeds: () => get('/admin/feeds'),
    createFeed: (payload) => post('/admin/feeds', payload),
    updateFeed: (id, payload) => put(`/admin/feeds/${id}`, payload),
    toggleFeed: (id) => post(`/admin/feeds/${id}/toggle`),
    deleteFeed: (id) => del(`/admin/feeds/${id}`),
    fetchFeed: (id) => post(`/admin/feeds/${id}/fetch`),
    fetchAllFeeds: () => post('/admin/feeds/fetch-all'),

    liveStreams: (params) => paginated('/admin/live', { params }),
    liveCounts: () => get('/admin/live/counts'),
    endLiveStream: (roomName) => post(`/admin/live/${encodeURIComponent(roomName)}/end`),
    deleteLiveStream: (roomName) => del(`/admin/live/${encodeURIComponent(roomName)}`),
};

export default client;

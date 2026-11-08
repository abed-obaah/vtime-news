// iOS Simulator shares the Mac's network — localhost works.
// For physical device or Android emulator, use your machine's LAN IP instead.
const BASE_URL = 'http://localhost:8010/api'; // backend: php artisan serve --port=8010

function buildUrl(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return `${BASE_URL}${path}`;
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${BASE_URL}${path}?${qs}`;
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = buildUrl(path, params);
  console.log('[API] GET', url);
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const msg = `API ${res.status} ${res.statusText} — ${url}`;
    console.error('[API] Error:', msg);
    throw new Error(msg);
  }
  const json = await res.json();
  console.log('[API] OK', url, JSON.stringify(json).slice(0, 120));
  return json as T;
}

async function apiPost(path: string): Promise<void> {
  fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  }).catch(() => {});
}

/* ------------------------------------------------------------------ *
 * Public API — mirrors web's publicApi
 * ------------------------------------------------------------------ */

// Home — returns { data: { featured, latest, trending, ... } }
export const fetchHome = (): Promise<HomeData> =>
  get<{ data: HomeData }>('/home').then((r) => r.data);

// Posts list — returns { data: [...], meta, links }
export const fetchPosts = (params?: Record<string, string>): Promise<Post[]> =>
  get<{ data: Post[]; meta: unknown; links: unknown }>('/posts', params).then((r) => r.data);

// Single post — returns { data: { ... } } (uses auth so viewer.liked/saved is populated)
export const fetchPost = (slug: string): Promise<PostDetail> =>
  authGet<{ data: PostDetail }>(`/posts/${encodeURIComponent(slug)}`).then((r) => r.data);

// Related posts — returns { data: [...] }
export const fetchRelated = (slug: string): Promise<Post[]> =>
  get<{ data: Post[] }>(`/posts/${encodeURIComponent(slug)}/related`).then((r) => r.data);

// Categories
export const fetchCategories = (): Promise<Category[]> =>
  get<{ data: Category[] }>('/categories').then((r) => r.data);

// Ads
export const fetchAds = (placement?: string): Promise<Ad[]> =>
  get<{ data: Ad[] }>('/ads', placement ? { placement } : undefined).then((r) => r.data);

export const trackImpression = (id: string) => apiPost(`/ads/${id}/impression`);
export const trackClick = (id: string) => apiPost(`/ads/${id}/click`);

/* ------------------------------------------------------------------ *
 * Types — match backend PostResource / AdResource shapes
 * ------------------------------------------------------------------ */

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  category: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: number;
  views: number;
  likes: number;
  commentsCount: number;
  isFeatured: boolean;
  isBreaking: boolean;
};

export type PostDetail = Post & {
  content: string;
  sourceUrl: string | null;
  sourceName: string | null;
  viewer: { liked: boolean; saved: boolean; rating: number };
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  postsCount?: number;
};

export type Ad = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  link: string;
  placement: string;
  networkName: string | null;
  active: boolean;
  priority: number;
};

export type HomeData = {
  featured: Post[];
  latest: Post[];
  trending: Post[];
  editorPicks: Post[];
  breaking: Post[];
  sections: { category: Category; posts: Post[] }[];
};

// Auth token storage (simple in-memory for session)
let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };
export const getAuthToken = () => authToken;

async function authPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log('[API] POST', url);
  const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `API ${res.status}`);
  return json as T;
}

async function authGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = buildUrl(path, params);
  console.log('[API] GET (auth)', url);
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export const login = (email: string, password: string) =>
  authPost<{ token: string; data: AuthUser }>('/auth/login', { email, password });

export const register = (name: string, email: string, password: string, password_confirmation: string) =>
  authPost<{ token: string; data: AuthUser }>('/auth/register', { name, email, password, password_confirmation });

export const logout = () => {
  if (!authToken) return Promise.resolve();
  return fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` },
  }).catch(() => {}).finally(() => { authToken = null; });
};

export const fetchMe = () =>
  authGet<{ data: AuthUser }>('/auth/me').then(r => r.data);

export const fetchBookmarks = () =>
  authGet<{ data: Post[] }>('/me/bookmarks').then(r => r.data);

export const toggleBookmark = (slug: string) => {
  const url = `${BASE_URL}/posts/${encodeURIComponent(slug)}/bookmark`;
  return fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${authToken || ''}` },
  }).then(r => r.json());
};

export const sendFeedback = (body: { type: string; subject: string; message: string; name?: string; email?: string }) =>
  authPost<{ message: string }>('/feedback', body);

export const togglePostLike = (slug: string) =>
  fetch(`${BASE_URL}/posts/${encodeURIComponent(slug)}/like`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${authToken || ''}` },
  }).then(r => r.json()) as Promise<{ liked: boolean; likes: number }>;

export type Comment = {
  id: string;
  parentId: string | null;
  userId: string | null;
  userName: string;
  content: string;
  likes: number;
  createdAt: string;
  replies: Comment[];
};

export const fetchComments = (slug: string) =>
  get<{ data: Comment[]; meta: { total: number } }>(`/posts/${encodeURIComponent(slug)}/comments`).then(r => r);

export const postComment = (slug: string, content: string, parentId?: string) =>
  fetch(`${BASE_URL}/posts/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${authToken || ''}` },
    body: JSON.stringify({ content, ...(parentId ? { parent_id: parentId } : {}) }),
  }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.message || 'Failed'); return j.data as Comment; });

export const likeComment = (commentId: string) =>
  fetch(`${BASE_URL}/comments/${commentId}/like`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${authToken || ''}` },
  }).then(r => r.json()) as Promise<{ liked: boolean; likes: number }>;

export const searchPosts = (q: string) =>
  get<{ data: Post[]; meta: unknown }>('/posts', { q, per_page: '30' }).then(r => r.data);

export type AuthUser = { id: number; name: string; email: string; role: string; avatar: string | null; };

export type AppNotification = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationMeta = {
  total: number;
  unread: number;
  currentPage: number;
  lastPage: number;
};

export const fetchNotifications = () =>
  authGet<{ data: AppNotification[]; meta: NotificationMeta }>('/notifications').then(r => r);

export const fetchUnreadCount = () =>
  authGet<{ unread: number }>('/notifications/unread-count').then(r => r.unread);

export const markNotificationRead = (id: string) =>
  fetch(`${BASE_URL}/notifications/${id}/read`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${authToken || ''}` },
  }).then(r => r.json());

export const markAllNotificationsRead = () =>
  fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${authToken || ''}` },
  }).then(r => r.json());

export type SubmissionPayload = {
  title: string;
  content: string;
  author_name?: string;
  excerpt?: string;
  category_id?: number | null;
  image?: string;
};

export const submitPost = (payload: SubmissionPayload): Promise<{ message: string; data: { id: string; title: string; status: string } }> => {
  const url = `${BASE_URL}/posts/submit`;
  const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.message || `API ${r.status}`); return j; });
};

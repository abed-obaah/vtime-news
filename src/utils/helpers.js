import { formatDistanceToNow, format, parseISO } from 'date-fns';

export const formatRelativeDate = (dateString) => {
    try {
        const date = parseISO(dateString);
        return formatDistanceToNow(date, { addSuffix: true });
    } catch {
        return dateString;
    }
};

export const formatFullDate = (dateString) => {
    try {
        return format(parseISO(dateString), 'MMMM d, yyyy');
    } catch {
        return dateString;
    }
};

export const formatDateTime = (dateString) => {
    try {
        return format(parseISO(dateString), 'MMM d, yyyy · h:mm a');
    } catch {
        return dateString;
    }
};

export const generateSlug = (title) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const truncate = (text, maxLength = 150) =>
    text.length > maxLength ? text.substring(0, maxLength).trim() + '…' : text;

export const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

export const getReadingTime = (content) => {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 200);
};

export const getCategoryColor = (categories, categoryId) => {
    const cat = categories.find(c => c.id === categoryId || c.slug === categoryId);
    return cat?.color || '#6B7280';
};

export const groupPostsByCategory = (posts, categories) => {
    const grouped = {};
    categories.forEach(cat => {
        grouped[cat.id] = posts.filter(p => p.category === cat.id && p.status === 'published');
    });
    return grouped;
};

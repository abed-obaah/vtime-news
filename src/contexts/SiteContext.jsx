import { createContext, useContext, useMemo } from 'react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';

const SiteContext = createContext(null);

/**
 * Categories and announcements are needed by the navbar, footer, cards and
 * several pages at once — fetch them once here instead of per component.
 */
export function SiteProvider({ children }) {
    const categoriesQuery = useApi(() => publicApi.categories(), [], { initialData: [] });
    const announcementsQuery = useApi(() => publicApi.announcements(), [], { initialData: [] });

    const value = useMemo(() => {
        const categories = categoriesQuery.data || [];

        return {
            categories,
            categoriesLoading: categoriesQuery.loading,
            categoriesError: categoriesQuery.error,
            refreshCategories: categoriesQuery.refetch,
            announcements: announcementsQuery.data || [],
            findCategory: (slugOrId) =>
                categories.find(
                    (c) => c.slug === slugOrId || String(c.id) === String(slugOrId)
                ) || null,
        };
    }, [categoriesQuery.data, categoriesQuery.loading, categoriesQuery.error, categoriesQuery.refetch, announcementsQuery.data]);

    return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => {
    const context = useContext(SiteContext);
    if (!context) throw new Error('useSite must be used within SiteProvider');
    return context;
};

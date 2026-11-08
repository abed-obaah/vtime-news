import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchPosts, fetchCategories, Post, Category } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import ApiNewsListItem from '@/components/ListItems/ApiNewsListItem';
import AdBanner from '@/components/Ads/AdBanner';

const SORT_OPTIONS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Popular', value: 'popular' },
  { label: 'Oldest', value: 'oldest' },
];

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [postsData, cats] = await Promise.all([
        fetchPosts({ category: slug, sort, per_page: '20' }),
        fetchCategories(),
      ]);
      setPosts(postsData);
      const found = cats.find((c) => c.slug === slug);
      if (found) setCategory(found);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [slug, sort]);

  useEffect(() => { load(); }, [load]);

  const accentColor = category?.color || '#DC2626';

  type ListItem = { type: 'post'; post: Post } | { type: 'ad'; key: string };

  const buildListData = (): ListItem[] => {
    const items: ListItem[] = [];
    posts.forEach((post, idx) => {
      items.push({ type: 'post', post });
      if ((idx + 1) % 6 === 0) items.push({ type: 'ad', key: `ad-${idx}` });
    });
    return items;
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'ad') return <AdBanner />;
    return <ApiNewsListItem post={item.post} />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgBtn }]}>
          <Ionicons name="chevron-back" size={22} color={colors.iconBack} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {category?.name || slug}
          </Text>
          {category?.description ? (
            <Text style={[styles.headerDesc, { color: colors.textMuted }]} numberOfLines={2}>{category.description}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.sortBtn, { backgroundColor: sort === opt.value ? accentColor : colors.bgBtn }]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.sortBtnText, { color: sort === opt.value ? 'white' : colors.text }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#DC2626" /></View>
      ) : (
        <FlatList
          data={buildListData()}
          keyExtractor={(item, idx) => item.type === 'post' ? item.post.id : item.key}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#DC2626" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No articles in this category</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  accentBar: { height: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  sortBtnText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyText: { fontSize: 16 },
});

import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCategories, Category } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }: { item: Category }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colors.bgCard }]}
      onPress={() => router.push(`/category/${item.slug}` as any)}
    >
      <View style={[styles.colorBar, { backgroundColor: item.color || '#DC2626' }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
          {item.postsCount !== undefined && (
            <View style={[styles.badge, { backgroundColor: item.color || '#DC2626' }]}>
              <Text style={styles.badgeText}>{item.postsCount}</Text>
            </View>
          )}
        </View>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.iconBack} />
        </Pressable>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Categories</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Browse by topic</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#DC2626" /></View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#DC2626" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="grid-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No categories found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  card: { borderRadius: 12, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  colorBar: { width: 5, alignSelf: 'stretch' },
  cardContent: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyText: { fontSize: 16 },
});

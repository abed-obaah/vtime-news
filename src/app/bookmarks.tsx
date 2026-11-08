import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchBookmarks, Post } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ApiNewsListItem from '@/components/ListItems/ApiNewsListItem';

export default function BookmarksScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchBookmarks();
      setBookmarks(data);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const Header = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={26} color={colors.iconBack} />
      </Pressable>
      <Ionicons name="bookmark" size={22} color="#DC2626" />
      <Text style={[styles.headerTitle, { color: colors.text }]}>Bookmarks</Text>
      <View style={{ width: 34 }} />
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Header />
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Save articles for later</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Sign in to bookmark articles and read them anytime.
          </Text>
          <Pressable style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ApiNewsListItem post={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#DC2626" />}
          ListEmptyComponent={
            <View style={[styles.center, { paddingTop: 60 }]}>
              <Ionicons name="bookmark-outline" size={56} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookmarks yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Tap the bookmark icon on any article to save it here.
              </Text>
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
  headerTitle: { fontSize: 26, fontWeight: '800' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  signInBtn: { backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 40, marginTop: 8 },
  signInBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});

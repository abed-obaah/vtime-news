import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  RefreshControl, StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchPosts, Post,
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  AppNotification, NotificationMeta,
} from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

function NewsRow({ post }: { post: Post }) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.row, { backgroundColor: colors.bgCard }]}
      onPress={() => router.push(`/newsArticle/${post.slug}` as any)}
    >
      <View style={[styles.iconWrap, { backgroundColor: post.isBreaking ? '#DC262618' : '#10B98118' }]}>
        <Ionicons name={post.isBreaking ? 'flash' : 'newspaper-outline'} size={20} color={post.isBreaking ? '#DC2626' : '#10B981'} />
      </View>
      <View style={styles.rowContent}>
        {post.isBreaking && <Text style={styles.breakingLabel}>BREAKING</Text>}
        <Text style={[styles.rowTitleUnread, { color: colors.text }]} numberOfLines={2}>{post.title}</Text>
        {post.excerpt ? <Text style={[styles.rowExcerpt, { color: colors.textMuted }]} numberOfLines={1}>{post.excerpt}</Text> : null}
        <Text style={[styles.rowTime, { color: colors.textMuted }]}>
          {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
        </Text>
      </View>
    </Pressable>
  );
}

const ACTIVITY_ICON: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  comment: { name: 'chatbubble', color: '#4A90D9' },
  like: { name: 'heart', color: '#DC2626' },
  breaking: { name: 'flash', color: '#DC2626' },
  new_article: { name: 'newspaper', color: '#10B981' },
  default: { name: 'notifications', color: '#666' },
};

function ActivityRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { colors } = useTheme();
  const icon = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.default;
  const isUnread = !item.readAt;
  return (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: isUnread ? (colors.bgCard + 'EE') : colors.bgCard }]}>
      <View style={[styles.iconWrap, { backgroundColor: icon.color + '18' }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[isUnread ? styles.rowTitleUnread : styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
          {String(item.data.title ?? item.data.message ?? item.type)}
        </Text>
        {item.data.excerpt ? <Text style={[styles.rowExcerpt, { color: colors.textMuted }]} numberOfLines={1}>{String(item.data.excerpt)}</Text> : null}
        <Text style={[styles.rowTime, { color: colors.textMuted }]}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
      {isUnread && <View style={styles.dot} />}
    </Pressable>
  );
}

type Tab = 'news' | 'activity';

function TabBar({ active, onChange, activityUnread }: { active: Tab; onChange: (t: Tab) => void; activityUnread: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
      {(['news', 'activity'] as Tab[]).map(tab => (
        <Pressable key={tab} style={styles.tabItem} onPress={() => onChange(tab)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.tabLabel, { color: active === tab ? colors.text : colors.textMuted }, active === tab && styles.tabLabelActive]}>
              {tab === 'news' ? 'News' : 'Activity'}
            </Text>
            {tab === 'activity' && activityUnread > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{activityUnread > 99 ? '99+' : activityUnread}</Text>
              </View>
            )}
          </View>
          {active === tab && <View style={styles.tabUnderline} />}
        </Pressable>
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [newsPosts, setNewsPosts] = useState<Post[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [meta, setMeta] = useState<NotificationMeta | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityRefreshing, setActivityRefreshing] = useState(false);

  const loadNews = useCallback(async () => {
    try {
      const breaking = await fetchPosts({ breaking: '1', per_page: '5', sort: 'latest' });
      const latest = await fetchPosts({ per_page: '15', sort: 'latest' });
      const breakingIds = new Set(breaking.map(p => p.id));
      setNewsPosts([...breaking, ...latest.filter(p => !breakingIds.has(p.id))]);
    } catch { }
  }, []);

  const loadActivity = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetchNotifications();
      setNotifications(res.data);
      setMeta(res.meta);
    } catch { }
  }, [isAuthenticated]);

  useEffect(() => { loadNews().finally(() => setNewsLoading(false)); }, [loadNews]);
  useEffect(() => {
    if (isAuthenticated && activeTab === 'activity') {
      setActivityLoading(true);
      loadActivity().finally(() => setActivityLoading(false));
    }
  }, [isAuthenticated, activeTab, loadActivity]);

  const onRefreshNews = useCallback(() => { setNewsRefreshing(true); loadNews().finally(() => setNewsRefreshing(false)); }, [loadNews]);
  const onRefreshActivity = useCallback(() => { setActivityRefreshing(true); loadActivity().finally(() => setActivityRefreshing(false)); }, [loadActivity]);

  const handleActivityPress = async (item: AppNotification) => {
    if (!item.readAt) {
      await markNotificationRead(item.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n));
      if (meta) setMeta({ ...meta, unread: Math.max(0, meta.unread - 1) });
    }
    const slug = item.data.slug as string | undefined;
    if (slug) router.push(`/newsArticle/${slug}` as any);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    if (meta) setMeta({ ...meta, unread: 0 });
  };

  const activityUnread = meta?.unread ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.iconBack} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        {activeTab === 'activity' && activityUnread > 0 ? (
          <Pressable onPress={handleMarkAll} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      <TabBar active={activeTab} onChange={setActiveTab} activityUnread={activityUnread} />

      {activeTab === 'news' && (
        newsLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#DC2626" /></View>
        ) : (
          <FlatList
            data={newsPosts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <NewsRow post={item} />}
            refreshControl={<RefreshControl refreshing={newsRefreshing} onRefresh={onRefreshNews} tintColor="#DC2626" />}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="newspaper-outline" size={60} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No news yet</Text>
              </View>
            }
          />
        )
      )}

      {activeTab === 'activity' && (
        !isAuthenticated ? (
          <View style={styles.center}>
            <Ionicons name="person-circle-outline" size={60} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to see your activity</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Replies, likes on your comments, and more.</Text>
            <Pressable style={styles.signInBtn} onPress={() => router.push('/login')}>
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          </View>
        ) : activityLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#DC2626" /></View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ActivityRow item={item} onPress={() => handleActivityPress(item)} />}
            refreshControl={<RefreshControl refreshing={activityRefreshing} onRefresh={onRefreshActivity} tintColor="#DC2626" />}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="notifications-outline" size={60} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>You'll see replies and likes on your comments here.</Text>
              </View>
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  markAllBtn: { width: 90, alignItems: 'flex-end' },
  markAllText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 15, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, backgroundColor: '#DC2626', borderRadius: 1 },
  tabBadge: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  rowContent: { flex: 1 },
  breakingLabel: { fontSize: 10, fontWeight: '800', color: '#DC2626', marginBottom: 2 },
  rowTitle: { fontSize: 14, lineHeight: 20 },
  rowTitleUnread: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  rowExcerpt: { fontSize: 13, marginTop: 2 },
  rowTime: { fontSize: 12, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626', marginTop: 6, marginLeft: 8, flexShrink: 0 },
  separator: { height: 0.5, marginLeft: 68 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  signInBtn: { marginTop: 20, backgroundColor: '#DC2626', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  signInText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

import { useCallback, useEffect, useState } from 'react';
import { Text, View, FlatList, ActivityIndicator, RefreshControl, Pressable, StyleSheet, Image, Modal, TextInput, SafeAreaView as RNSafeAreaView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fetchPosts, Post } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import AdBanner from '@/components/Ads/AdBanner';
import { Link } from 'expo-router';

const DUMMY_STREAMS = [
  { id: 'live-1', title: 'Breaking: Markets React to Fed Decision', host: 'PulseNews Desk', viewers: 1243, live: true },
  { id: 'live-2', title: 'Live: Parliament Session Coverage', host: 'Jane Editorial', viewers: 832, live: true },
  { id: 'live-3', title: 'Replay: Morning Market Briefing', host: 'Finance Desk', viewers: 4210, live: false },
];

function GoLiveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const handleGoLive = () => { setBroadcasting(true); };
  const handleStop = () => { setBroadcasting(false); setName(''); setTitle(''); onClose(); };

  if (broadcasting) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleStop}>
        <RNSafeAreaView style={[styles.broadcastContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.broadcastView}>
            <MaterialCommunityIcons name="television-play" size={80} color="white" />
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
          </View>
          <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 4, color: colors.text }}>
              {title || 'My Live Broadcast'}
            </Text>
            <Text style={{ color: colors.textMuted, marginBottom: 24 }}>
              Broadcasting as {name.trim() || 'Anonymous'} · 0 viewers
            </Text>
            <Pressable style={styles.stopButton} onPress={handleStop}>
              <MaterialCommunityIcons name="stop-circle" size={22} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>End Broadcast</Text>
            </Pressable>
          </View>
        </RNSafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.bgCard }]}>
        <RNSafeAreaView>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Go Live</Text>
          <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
            Start a live broadcast. No sign-in required — you can broadcast anonymously.
          </Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Broadcast title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
            placeholder="What are you covering?"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Your name (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
            placeholder="Leave blank to go anonymous"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.anonNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
            <Text style={{ color: '#10B981', fontSize: 13, marginLeft: 6 }}>
              No account needed · Broadcast anonymously
            </Text>
          </View>

          <Pressable style={styles.goLiveBtn} onPress={handleGoLive}>
            <View style={[styles.liveDot, { backgroundColor: 'white', width: 8, height: 8, borderRadius: 4 }]} />
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Go Live Now</Text>
            <MaterialCommunityIcons name="broadcast" size={20} color="white" style={{ marginLeft: 'auto' }} />
          </Pressable>

          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>Cancel</Text>
          </Pressable>
        </RNSafeAreaView>
      </View>
    </Modal>
  );
}

function LiveStreamCard({ stream }: { stream: typeof DUMMY_STREAMS[0] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.streamCard, { backgroundColor: colors.bgCard }]}>
      <View style={styles.streamThumb}>
        <MaterialCommunityIcons name="television-play" size={40} color="white" />
        {stream.live && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, padding: 12, gap: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={2}>{stream.title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{stream.host}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{stream.viewers.toLocaleString()} watching</Text>
        </View>
      </View>
    </View>
  );
}

function RecentArticleCard({ post }: { post: Post }) {
  const { colors } = useTheme();
  const timeAgo = post.publishedAt ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) : '';
  return (
    <Link href={`/newsArticle/${post.slug}`} asChild>
      <Pressable style={[styles.recentCard, { backgroundColor: colors.bgCard }]}>
        {post.image ? (
          <Image source={{ uri: post.image }} style={styles.recentThumb} />
        ) : (
          <View style={[styles.recentThumb, { backgroundColor: colors.bgBtn, alignItems: 'center', justifyContent: 'center' }]}>
            <MaterialCommunityIcons name="newspaper" size={28} color={colors.border} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          {post.categoryName ? (
            <Text style={{ fontSize: 10, fontWeight: '700', color: post.categoryColor || '#DC2626', textTransform: 'uppercase' }}>
              {post.categoryName}
            </Text>
          ) : null}
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={2}>{post.title}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{timeAgo} · {post.readTime} min read</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export default function LiveFeedScreen() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goLiveVisible, setGoLiveVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchPosts({ per_page: '15', sort: 'latest' });
      setPosts(data);
    } catch { setPosts([]); }
  }, []);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <GoLiveModal visible={goLiveVisible} onClose={() => setGoLiveVisible(false)} />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item, index }) => (
          <View style={{ marginHorizontal: 15 }}>
            <RecentArticleCard post={item} />
            {(index + 1) % 5 === 0 ? <AdBanner placement="feed" /> : null}
          </View>
        )}
        ListHeaderComponent={
          <View>
            <View style={{ marginHorizontal: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginTop: 10 }}>
                <View style={styles.liveIndicator} />
                <Text style={{ fontSize: 27, fontWeight: '800', marginLeft: 8, color: colors.text }}>Live Feed</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
                Live broadcasts · Breaking news
              </Text>
            </View>

            <Pressable style={styles.goLiveButton} onPress={() => setGoLiveVisible(true)}>
              <View style={styles.liveIndicator} />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Go Live</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 8 }}>No sign-in needed</Text>
              <MaterialCommunityIcons name="broadcast" size={20} color="white" style={{ marginLeft: 'auto' }} />
            </Pressable>

            <View style={{ marginHorizontal: 15, marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 12, color: '#DC2626' }}>
                Live Now
              </Text>
              {DUMMY_STREAMS.map(s => <LiveStreamCard key={s.id} stream={s} />)}
            </View>

            <AdBanner placement="top_banner" style={{ marginHorizontal: 15 }} />

            <View style={{ marginHorizontal: 15, marginTop: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Latest Stories</Text>
            </View>

            {loading && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator size="large" color="#DC2626" />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>No stories available.</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 10,
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 15 },
  sheetTitle: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  anonNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FAF0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20 },
  goLiveBtn: { backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 4 },
  goLiveButton: { backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', marginHorizontal: 15, marginBottom: 20, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16 },
  liveIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  broadcastContainer: { flex: 1 },
  broadcastView: { height: 280, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  livePill: { position: 'absolute', top: 16, left: 16, backgroundColor: '#DC2626', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePillText: { color: 'white', fontSize: 12, fontWeight: '800' },
  stopButton: { backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16 },
  streamCard: { borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  streamThumb: { width: 110, height: 90, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  liveBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#DC2626', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },
  liveBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  recentCard: { borderRadius: 12, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', gap: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  recentThumb: { width: 80, height: 70, borderRadius: 8, flexShrink: 0 },
});

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Text, View, SectionList, ActivityIndicator, RefreshControl, Image, Pressable,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fetchHome, HomeData, Post, fetchUnreadCount, submitPost, fetchCategories, Category } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ApiNewsListItem from '@/components/ListItems/ApiNewsListItem';
import ApiMainNewsCard from '@/components/ListItems/ApiMainNewsCard';
import ApiTrendingListItem from '@/components/ListItems/ApiTrendingListItem';
import AdBanner from '@/components/Ads/AdBanner';
import BreakingTicker from '@/components/BreakingTicker';

const SECTIONS = {
  TOP_STORIES: 'Top Stories',
  TRENDING: 'Trending Stories',
  EDITOR_PICKS: "Editor's Picks",
  LATEST: 'Latest',
};

type Section = { title: string; data: Post[] };

function buildSections(home: HomeData): Section[] {
  const out: Section[] = [];
  if (home.featured.length > 0) out.push({ title: SECTIONS.TOP_STORIES, data: home.featured.slice(0, 6) });
  if (home.trending.length > 0) out.push({ title: SECTIONS.TRENDING, data: home.trending });
  if (home.editorPicks.length > 0) out.push({ title: SECTIONS.EDITOR_PICKS, data: home.editorPicks });
  if (home.latest.length > 0) out.push({ title: SECTIONS.LATEST, data: home.latest.slice(0, 10) });
  return out;
}

// ---------- Submission Modal ----------

function SubmitStoryModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [image, setImage] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCategories().then(setCategories).catch(() => {});
    }
  }, [visible]);

  const reset = () => {
    setTitle(''); setContent(''); setAuthorName(''); setImage(''); setCategoryId(null);
    setSubmitting(false); setSuccess(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }
    if (!content.trim()) { Alert.alert('Required', 'Please enter your story content.'); return; }
    setSubmitting(true);
    try {
      await submitPost({
        title: title.trim(),
        content: content.trim(),
        author_name: authorName.trim() || undefined,
        image: image.trim() || undefined,
        category_id: categoryId ?? undefined,
      });
      setSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={handleClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.icon} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit a Story</Text>
            <View style={{ width: 40 }} />
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Story Submitted!</Text>
              <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
                Your story is now pending review. Our editors will approve it shortly.
              </Text>
              <Pressable style={styles.doneBtn} onPress={handleClose}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textSecondary }]}>Headline *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                placeholder="Write a compelling headline…"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Story *</Text>
              <TextInput
                style={[styles.input, styles.contentInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                placeholder="Tell the full story here…"
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Your name (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                placeholder="Leave blank to submit anonymously"
                placeholderTextColor={colors.textMuted}
                value={authorName}
                onChangeText={setAuthorName}
                maxLength={100}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Cover Image URL (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                placeholder="https://…"
                placeholderTextColor={colors.textMuted}
                value={image}
                onChangeText={setImage}
                autoCapitalize="none"
                keyboardType="url"
              />

              {categories.length > 0 && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Category (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => setCategoryId(null)}
                        style={[styles.catChip,
                          { borderColor: categoryId === null ? '#DC2626' : colors.border, backgroundColor: categoryId === null ? '#DC262618' : colors.bgBtn }]}
                      >
                        <Text style={{ color: categoryId === null ? '#DC2626' : colors.textMuted, fontWeight: '600', fontSize: 13 }}>Any</Text>
                      </Pressable>
                      {categories.map(cat => (
                        <Pressable
                          key={cat.id}
                          onPress={() => setCategoryId(cat.id)}
                          style={[styles.catChip,
                            { borderColor: categoryId === cat.id ? (cat.color || '#DC2626') : colors.border, backgroundColor: categoryId === cat.id ? (cat.color || '#DC2626') + '18' : colors.bgBtn }]}
                        >
                          <Text style={{ color: categoryId === cat.id ? (cat.color || '#DC2626') : colors.textMuted, fontWeight: '600', fontSize: 13 }}>{cat.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <View style={[styles.noteBox, { backgroundColor: colors.bgCard }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 13, marginLeft: 8, flex: 1 }}>
                  No sign-in needed. Stories are reviewed by our editors before being published.
                </Text>
              </View>

              <Pressable
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <MaterialCommunityIcons name="send" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Submit Story</Text>
                    </>}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Home Screen ----------

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [breaking, setBreaking] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [submitVisible, setSubmitVisible] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const date = new Date();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const home = await fetchHome();
      setSections(buildSections(home));
      setBreaking(home.breaking ?? []);
      setUnreadCount(() => {
        const newsCount = (home.breaking?.length ?? 0) + Math.min(home.latest?.length ?? 0, 10);
        return newsCount;
      });
    } catch {
      setError('Could not load news. Make sure the backend & database are running.');
    }
  }, []);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount().then(count => setUnreadCount(prev => prev + count)).catch(() => {});
    pollRef.current = setInterval(() => {
      fetchUnreadCount().then(setUnreadCount).catch(() => {});
    }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const renderSectionHeader = (title: string) => {
    if (title === SECTIONS.TOP_STORIES) {
      return (
        <View style={{ gap: 5, marginBottom: 10, marginTop: 40 }}>
          <Text style={{ color: '#DC2626', fontSize: 25, fontWeight: '800' }}>Top Stories</Text>
          <Text style={{ color: colors.textSecondary }}>Chosen by the editors.</Text>
        </View>
      );
    }
    if (title === SECTIONS.TRENDING) {
      return (
        <View style={{ marginBottom: 10, marginTop: 40 }}>
          <Text style={{ color: '#F59E0B', fontSize: 25, fontWeight: '800' }}>Trending Stories</Text>
        </View>
      );
    }
    if (title === SECTIONS.EDITOR_PICKS) {
      return (
        <View style={{ gap: 5, marginBottom: 10, marginTop: 40 }}>
          <Text style={{ color: '#DC2626', fontSize: 25, fontWeight: '800' }}>Editor's Picks</Text>
          <Text style={{ color: colors.textSecondary }}>Top-rated stories from our readers.</Text>
        </View>
      );
    }
    if (title === SECTIONS.LATEST) {
      return (
        <View style={{ gap: 5, marginBottom: 10, marginTop: 20 }}>
          <Text style={{ color: '#10B981', fontSize: 25, fontWeight: '800' }}>Latest</Text>
          <Text style={{ color: colors.textSecondary }}>The most recent stories.</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#DC2626" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: colors.bg }}>
        <AntDesign name="warning" size={40} color="#DC2626" style={{ marginBottom: 12 }} />
        <Text style={{ color: '#DC2626', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Connection Error</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg, flex: 1 }} edges={['top']}>
      <SubmitStoryModal visible={submitVisible} onClose={() => setSubmitVisible(false)} />

      <SectionList
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
        style={{ backgroundColor: colors.bg }}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index, section }) => {
          switch (section.title) {
            case SECTIONS.TOP_STORIES:
              return index === 0 ? <ApiMainNewsCard post={item} /> : <ApiNewsListItem post={item} />;
            case SECTIONS.TRENDING:
              return <ApiTrendingListItem post={item} index={index + 1} />;
            case SECTIONS.EDITOR_PICKS:
              return <ApiNewsListItem post={item} />;
            case SECTIONS.LATEST:
              return (
                <View>
                  <ApiNewsListItem post={item} />
                  {(index + 1) % 5 === 0 ? <AdBanner placement="feed" /> : null}
                </View>
              );
            default:
              return null;
          }
        }}
        renderSectionHeader={({ section }) => renderSectionHeader(section.title)}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View>
                <Image
                  source={require('@assets/logo.png')}
                  style={{ height: 36, width: 120 }}
                  resizeMode="contain"
                />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>
                  {date.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/notifications')}
                style={{ padding: 6, position: 'relative' }}
              >
                <Ionicons name="notifications-outline" size={26} color={colors.icon} />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: 2, right: 2,
                    backgroundColor: '#DC2626', borderRadius: 10,
                    minWidth: 18, height: 18,
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
            <BreakingTicker posts={breaking} />
            <AdBanner placement="top_banner" />
          </View>
        }
      />

      {/* Floating Action Button */}
      <Pressable
        style={styles.fab}
        onPress={() => setSubmitVisible(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  modalCloseBtn: { width: 40, alignItems: 'flex-start' },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 18,
  },
  contentInput: { minHeight: 160, maxHeight: 280 },
  catChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  catChipActive: {},
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 30,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  successSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  doneBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
  },
});

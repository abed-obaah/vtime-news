import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Text, StyleSheet, ScrollView, View, Image, ActivityIndicator,
  Pressable, Linking, TextInput, KeyboardAvoidingView, Platform,
  Alert, Share,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import {
  fetchPost, fetchRelated, PostDetail, Post,
  togglePostLike, toggleBookmark, fetchComments, postComment, likeComment,
  Comment,
} from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ApiNewsListItem from '@/components/ListItems/ApiNewsListItem';
import AdBanner from '@/components/Ads/AdBanner';

function CommentRow({
  comment, onReply, onLike, isAuthenticated, depth = 0,
}: {
  comment: Comment; onReply: (c: Comment) => void; onLike: (c: Comment) => void;
  isAuthenticated: boolean; depth?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.commentRow, { borderBottomColor: colors.borderLight }, depth > 0 && { marginLeft: 24, borderLeftWidth: 2, borderLeftColor: colors.borderLight, paddingLeft: 12 }]}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{comment.userName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={[styles.commentUser, { color: colors.text }]}>{comment.userName}</Text>
          <Text style={[styles.commentTime, { color: colors.textMuted }]}>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </Text>
        </View>
        <Text style={[styles.commentContent, { color: colors.textSecondary }]}>{comment.content}</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <Pressable style={styles.commentAction} onPress={() => isAuthenticated ? onLike(comment) : router.push('/login')}>
            <AntDesign name="like2" size={13} color={colors.textMuted} />
            <Text style={[styles.commentActionText, { color: colors.textMuted }]}>{comment.likes > 0 ? comment.likes : 'Like'}</Text>
          </Pressable>
          {depth === 0 && (
            <Pressable style={styles.commentAction} onPress={() => isAuthenticated ? onReply(comment) : router.push('/login')}>
              <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.commentActionText, { color: colors.textMuted }]}>Reply</Text>
            </Pressable>
          )}
        </View>
        {comment.replies?.map(reply => (
          <CommentRow key={reply.id} comment={reply} onReply={onReply} onLike={onLike} isAuthenticated={isAuthenticated} depth={depth + 1} />
        ))}
      </View>
    </View>
  );
}

export default function DetailedArticle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchPost(id).then(p => { setPost(p); setLiked(p.viewer?.liked ?? false); setLikeCount(p.likes); setBookmarked(p.viewer?.saved ?? false); }),
      fetchRelated(id).then(setRelated).catch(() => {}),
    ]).catch(() => setError('Article not found.')).finally(() => setLoading(false));
  }, [id]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const res = await fetchComments(id);
      setComments(res.data);
      setCommentTotal(res.meta.total);
    } catch { } finally { setCommentsLoading(false); }
  }, [id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleLike = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (liking || !id) return;
    setLiking(true);
    const prev = { liked, likeCount };
    setLiked(l => !l);
    setLikeCount(c => liked ? c - 1 : c + 1);
    try {
      const res = await togglePostLike(id);
      setLiked(res.liked);
      setLikeCount(res.likes);
    } catch { setLiked(prev.liked); setLikeCount(prev.likeCount); }
    finally { setLiking(false); }
  };

  const handleCommentLike = async (comment: Comment) => {
    try {
      const res = await likeComment(comment.id);
      const update = (list: Comment[]): Comment[] =>
        list.map(c => c.id === comment.id ? { ...c, likes: res.likes } : { ...c, replies: update(c.replies ?? []) });
      setComments(prev => update(prev));
    } catch { }
  };

  const handleShare = async () => {
    if (!post) return;
    await Share.share({ title: post.title, message: post.sourceUrl ? `${post.title}\n\n${post.sourceUrl}` : post.title });
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (bookmarking || !id) return;
    setBookmarking(true);
    const prev = bookmarked;
    setBookmarked(b => !b);
    try {
      const res = await toggleBookmark(id);
      setBookmarked(res.saved ?? !prev);
    } catch { setBookmarked(prev); }
    finally { setBookmarking(false); }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || !id) return;
    setSubmitting(true);
    try {
      const newComment = await postComment(id, text, replyTo?.id);
      if (replyTo) {
        setComments(prev => prev.map(c => c.id === replyTo.id ? { ...c, replies: [...(c.replies ?? []), newComment] } : c));
      } else {
        setComments(prev => [...prev, { ...newComment, replies: [] }]);
      }
      setCommentTotal(t => t + 1);
      setCommentText('');
      setReplyTo(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not post comment.');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (error || !post) {
    return <Text style={{ marginTop: 100, textAlign: 'center', color: colors.text }}>{error || 'Article Not Found!'}</Text>;
  }

  const publishedDate = post.publishedAt ? format(new Date(post.publishedAt), 'MMM dd, yyyy hh:mm a') : '';

  const htmlTagStyles = {
    body: { color: colors.text, fontSize: 16, lineHeight: 26 },
    p: { color: colors.text, fontSize: 16, lineHeight: 26, marginBottom: 12 },
    h1: { color: colors.text, fontSize: 26, fontWeight: '800' as const, marginBottom: 10, marginTop: 16 },
    h2: { color: colors.text, fontSize: 22, fontWeight: '700' as const, marginBottom: 8, marginTop: 14 },
    h3: { color: colors.text, fontSize: 18, fontWeight: '700' as const, marginBottom: 6, marginTop: 12 },
    strong: { color: colors.text, fontWeight: '700' as const },
    em: { color: colors.text },
    a: { color: '#DC2626' },
    li: { color: colors.text, fontSize: 16, lineHeight: 24 },
    blockquote: { borderLeftColor: '#DC2626', borderLeftWidth: 3, paddingLeft: 12, marginLeft: 0 },
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: colors.bg }}>
        <Stack.Screen options={{ headerTitle: post.categoryName || 'Article' }} />

        {post.image ? (
          <Image source={{ uri: post.image }} style={{ width: '100%', aspectRatio: 3 / 2 }} />
        ) : null}

        <View style={{ padding: 25, backgroundColor: colors.bg }}>
          {post.isBreaking && (
            <View style={styles.breakingBadge}>
              <Text style={styles.breakingText}>BREAKING</Text>
            </View>
          )}
          {post.categoryName ? (
            <Text style={{ fontSize: 12, fontWeight: '700', color: post.categoryColor || '#DC2626', textTransform: 'uppercase', marginBottom: 6 }}>
              {post.categoryName}
            </Text>
          ) : null}

          <View style={{ gap: 10, paddingBottom: 25 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>{post.title}</Text>
            <Text style={{ fontWeight: '300', color: colors.textMuted, fontSize: 12 }}>
              {`by ${post.author}  ·  ${publishedDate}`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 15 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{post.readTime} min read</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{post.views} views</Text>
            </View>
          </View>

          <AdBanner placement="article_top" />

          <RenderHtml
            contentWidth={width - 50}
            source={{ html: post.content || '' }}
            tagsStyles={htmlTagStyles}
            baseStyle={{ color: colors.text, fontSize: 16 }}
            systemFonts={[]}
          />

          {post.sourceUrl ? (
            <Pressable onPress={() => post.sourceUrl && Linking.openURL(post.sourceUrl)}>
              <Text style={{ color: '#DC2626', marginTop: 20, fontSize: 13 }}>
                Source: {post.sourceName || post.sourceUrl}
              </Text>
            </Pressable>
          ) : null}

          <AdBanner placement="article_bottom" style={{ marginTop: 20 }} />

          <View style={[styles.likeRow, { borderTopColor: colors.borderLight }]}>
            <Pressable onPress={handleLike} style={[styles.likeBtn, { borderColor: colors.border }]} disabled={liking}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#DC2626' : colors.icon} />
              <Text style={[styles.likeBtnText, { color: colors.textSecondary }, liked && { color: '#DC2626' }]}>
                {likeCount > 0 ? likeCount : ''} {liked ? 'Liked' : 'Like'}
              </Text>
            </Pressable>
            <Pressable onPress={handleBookmark} style={[styles.likeBtn, { borderColor: colors.border }]} disabled={bookmarking}>
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={bookmarked ? '#DC2626' : colors.icon} />
              <Text style={[styles.likeBtnText, { color: colors.textSecondary }, bookmarked && { color: '#DC2626' }]}>
                {bookmarked ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
            <Pressable onPress={handleShare} style={[styles.likeBtn, { borderColor: colors.border }]}>
              <Ionicons name="share-outline" size={22} color={colors.icon} />
              <Text style={[styles.likeBtnText, { color: colors.textSecondary }]}>Share</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.commentsSection, { borderTopColor: colors.bgBtn }]}>
          <Text style={[styles.commentsHeader, { color: colors.text }]}>
            Comments {commentTotal > 0 ? `(${commentTotal})` : ''}
          </Text>

          {isAuthenticated ? (
            <View style={styles.inputArea}>
              {replyTo && (
                <View style={[styles.replyBanner, { backgroundColor: colors.bgBtn }]}>
                  <Text style={[styles.replyBannerText, { color: colors.textSecondary }]} numberOfLines={1}>
                    Replying to <Text style={{ fontWeight: '700' }}>{replyTo.userName}</Text>
                  </Text>
                  <Pressable onPress={() => setReplyTo(null)}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              )}
              <View style={styles.inputRow}>
                <View style={styles.inputAvatar}>
                  <Text style={styles.commentAvatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
                </View>
                <TextInput
                  ref={inputRef}
                  style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder={replyTo ? `Reply to ${replyTo.userName}…` : 'Add a comment…'}
                  placeholderTextColor={colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={2000}
                />
                <Pressable
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  style={[styles.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.4 }]}
                >
                  {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={[styles.signInPrompt, { backgroundColor: colors.bgBtn }]} onPress={() => router.push('/login')}>
              <Ionicons name="person-circle-outline" size={20} color="#DC2626" />
              <Text style={styles.signInPromptText}>Sign in to join the conversation</Text>
            </Pressable>
          )}

          {commentsLoading ? (
            <ActivityIndicator size="small" color="#DC2626" style={{ marginVertical: 20 }} />
          ) : comments.length === 0 ? (
            <Text style={[styles.noComments, { color: colors.textMuted }]}>No comments yet. Be the first!</Text>
          ) : (
            comments.map(c => (
              <CommentRow key={c.id} comment={c} onReply={handleReply} onLike={handleCommentLike} isAuthenticated={isAuthenticated} />
            ))
          )}
        </View>

        {related.length > 0 && (
          <View style={{ paddingHorizontal: 15, paddingBottom: 30, backgroundColor: colors.bg }}>
            <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 15, color: '#DC2626' }}>Related Stories</Text>
            {related.map((r) => <ApiNewsListItem key={r.id} post={r} />)}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  breakingBadge: { backgroundColor: '#DC2626', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10 },
  breakingText: { color: 'white', fontSize: 11, fontWeight: '800' },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 0.5 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  likeBtnText: { fontSize: 14, fontWeight: '600' },
  commentsSection: { paddingHorizontal: 16, paddingBottom: 20, borderTopWidth: 6 },
  commentsHeader: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 16 },
  inputArea: { marginBottom: 20 },
  replyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  replyBannerText: { fontSize: 13, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  inputAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  signInPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 20 },
  signInPromptText: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
  noComments: { textAlign: 'center', marginVertical: 24, fontSize: 14 },
  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: 0.5 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  commentUser: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 12 },
});

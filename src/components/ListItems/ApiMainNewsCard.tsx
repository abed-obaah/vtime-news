import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Post } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

type Props = { post: Post };

export default function ApiMainNewsCard({ post }: Props) {
  const { colors } = useTheme();
  const timeAgo = post.publishedAt
    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
    : '';

  return (
    <Link href={`/newsArticle/${post.slug}`} asChild>
      <Pressable style={[styles.container, { backgroundColor: colors.bgCard }]}>
        {post.image ? (
          <Image source={{ uri: post.image }} style={styles.mainImage} />
        ) : null}
        {post.isBreaking && (
          <View style={styles.breakingBadge}>
            <Text style={styles.breakingText}>BREAKING</Text>
          </View>
        )}
        <View style={{ padding: 10 }}>
          {post.categoryName ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: post.categoryColor || '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>
              {post.categoryName}
            </Text>
          ) : null}
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: colors.text }}>{post.title}</Text>
          {post.excerpt ? (
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 15 }} numberOfLines={2}>
              {post.excerpt}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{timeAgo}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>&#x2022;</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{post.author}</Text>
            <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.icon} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    borderRadius: 10,
  },
  mainImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  breakingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#DC2626',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  breakingText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
});

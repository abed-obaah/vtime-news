import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Post } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

type Props = { post: Post; index: number };

export default function ApiTrendingListItem({ post, index }: Props) {
  const { colors } = useTheme();
  const timeAgo = post.publishedAt
    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
    : '';

  return (
    <Link href={`/newsArticle/${post.slug}`} asChild>
      <Pressable style={{ flexDirection: 'row', marginBottom: 20, gap: 15 }}>
        <View style={styles.bubbleContainer}>
          <Text style={styles.bubbleTitle}>{index}</Text>
        </View>
        <View style={[styles.textContainer, { borderBottomColor: colors.borderLight }]}>
          <View style={{ gap: 5 }}>
            {post.categoryName ? (
              <Text style={{ fontSize: 10, fontWeight: '700', color: post.categoryColor || '#DC2626', textTransform: 'uppercase' }}>
                {post.categoryName}
              </Text>
            ) : null}
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{post.title}</Text>
          </View>
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
  bubbleContainer: {
    backgroundColor: '#F59E0B',
    width: 35,
    height: 35,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  textContainer: {
    gap: 25,
    flex: 1,
    borderBottomWidth: 0.5,
    paddingBottom: 10,
  },
});

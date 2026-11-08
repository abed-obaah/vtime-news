import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Post } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

type Props = { post: Post };

export default function ApiNewsListItem({ post }: Props) {
  const { colors } = useTheme();
  const timeAgo = post.publishedAt
    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
    : '';

  return (
    <Link href={`/newsArticle/${post.slug}`} asChild>
      <Pressable style={{ backgroundColor: colors.bgCard, padding: 10, gap: 10, borderRadius: 10, marginBottom: 15 }}>
        {post.isBreaking && (
          <View style={{ backgroundColor: '#DC2626', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>BREAKING</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flexShrink: 1, marginRight: 15, gap: 5 }}>
            {post.categoryName ? (
              <Text style={{ fontSize: 11, fontWeight: '700', color: post.categoryColor || '#DC2626', textTransform: 'uppercase' }}>
                {post.categoryName}
              </Text>
            ) : null}
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>{post.title}</Text>
          </View>
          {post.image ? (
            <Image source={{ uri: post.image }} style={{ width: 100, aspectRatio: 1, borderRadius: 10, marginLeft: 'auto' }} />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{timeAgo}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>&#x2022;</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{post.author}</Text>
          <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.icon} style={{ marginLeft: 'auto' }} />
        </View>
      </Pressable>
    </Link>
  );
}

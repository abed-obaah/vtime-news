import { useEffect, useRef } from 'react';
import { View, Text, Animated, Pressable, StyleSheet, Easing } from 'react-native';
import { router } from 'expo-router';
import { Post } from '@/services/api';

type Props = { posts: Post[] };

export default function BreakingTicker({ posts }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const containerWidth = useRef(0);
  const contentWidth = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  if (!posts || posts.length === 0) return null;

  // Build the ticker text — join all headlines with a separator
  const text = posts.map(p => p.title).join('   ·   ');

  const startScroll = () => {
    if (contentWidth.current === 0 || containerWidth.current === 0) return;
    const distance = contentWidth.current + containerWidth.current;
    const duration = distance * 12; // ~12ms per pixel → smooth constant speed

    translateX.setValue(containerWidth.current);
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -contentWidth.current,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();
  };

  useEffect(() => {
    return () => { animRef.current?.stop(); };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>BREAKING</Text>
      </View>
      <View
        style={styles.scroll}
        onLayout={e => {
          containerWidth.current = e.nativeEvent.layout.width;
          startScroll();
        }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{ transform: [{ translateX }], flexDirection: 'row' }}
          onLayout={e => {
            contentWidth.current = e.nativeEvent.layout.width;
            startScroll();
          }}
        >
          {posts.map(post => (
            <Pressable
              key={post.id}
              onPress={() => router.push(`/newsArticle/${post.slug}` as any)}
              style={styles.item}
            >
              <Text style={styles.itemText} numberOfLines={1}>{post.title}</Text>
              <Text style={styles.separator}>   ·   </Text>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    overflow: 'hidden',
    height: 34,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#B71C1C',
    paddingHorizontal: 10,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 4,
    whiteSpace: 'nowrap',
  } as any,
  separator: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
});

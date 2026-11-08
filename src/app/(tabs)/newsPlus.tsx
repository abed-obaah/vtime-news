import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { Text, FlatList, View, Pressable, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';
import { fetchPosts, Post } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import ApiMainNewsCard from '@/components/ListItems/ApiMainNewsCard';
import ApiNewsListItem from '@/components/ListItems/ApiNewsListItem';
import AdBanner from '@/components/Ads/AdBanner';

const FILTERS = {
  FEATURED: 'Featured',
  POPULAR: 'Popular',
  NEWEST: 'Newest',
} as const;

type FilterKey = keyof typeof FILTERS;

const SORT_MAP: Record<string, string> = {
  Featured: 'top-rated',
  Popular: 'most-liked',
  Newest: 'latest',
};

export default function NewsPlusScreen() {
  const { colors } = useTheme();
  const [selectedOption, setSelectedOption] = useState<string>(FILTERS.FEATURED);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async (option: string) => {
    try {
      const sort = SORT_MAP[option] || 'latest';
      const params: Record<string, string> = { per_page: '20', sort };
      if (option === FILTERS.FEATURED) params.featured = '1';
      const data = await fetchPosts(params);
      setPosts(data);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => { loadPosts(selectedOption).finally(() => setLoading(false)); }, [selectedOption]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts(selectedOption).finally(() => setRefreshing(false));
  }, [selectedOption, loadPosts]);

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    setIsMenuVisible(false);
    setLoading(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />}
        renderItem={({ item, index }) => (
          <View>
            {index === 0 ? <ApiMainNewsCard post={item} /> : <ApiNewsListItem post={item} />}
            {(index + 1) % 5 === 0 ? <AdBanner placement="feed" /> : null}
          </View>
        )}
        ListHeaderComponent={
          <View style={{ paddingBottom: 10 }}>
            <View style={{ marginBottom: 20 }}>
              <Image
                source={require('@assets/logo.png')}
                style={{ height: 48, width: 160 }}
                resizeMode="contain"
              />
              <Text style={{ fontSize: 27, fontWeight: '800', color: colors.textSecondary }}>Discover</Text>
            </View>

            <AdBanner placement="top_banner" />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 19, marginRight: 5, color: colors.text }}>Showing:</Text>
              <Menu
                visible={isMenuVisible}
                onDismiss={() => setIsMenuVisible(false)}
                anchorPosition="bottom"
                anchor={
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setIsMenuVisible(true)}
                  >
                    <Text style={{ fontWeight: 'bold', fontSize: 19, color: '#DC2626' }}>{selectedOption}</Text>
                    <Entypo name="chevron-down" size={26} color="#DC2626" />
                  </Pressable>
                }
              >
                {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
                  <Menu.Item
                    key={key}
                    title={FILTERS[key]}
                    titleStyle={{ fontWeight: 'bold', fontSize: 19, color: '#DC2626' }}
                    onPress={() => handleSelectOption(FILTERS[key])}
                  />
                ))}
              </Menu>
            </View>

            {loading && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <ActivityIndicator size="large" color="#DC2626" />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>No articles found.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

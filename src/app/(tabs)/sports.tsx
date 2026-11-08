import { useCallback, useEffect, useState } from 'react';
import { Text, View, FlatList, ActivityIndicator, RefreshControl, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchPosts, Post } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import ApiNewsListItem from '@/components/ListItems/ApiNewsListItem';
import ApiMainNewsCard from '@/components/ListItems/ApiMainNewsCard';
import AdBanner from '@/components/Ads/AdBanner';

const MARKET_PAIRS = [
  { symbol: 'EUR/USD', color: '#10B981' },
  { symbol: 'GBP/USD', color: '#DC2626' },
  { symbol: 'USD/JPY', color: '#F59E0B' },
  { symbol: 'BTC/USD', color: '#F7931A' },
  { symbol: 'ETH/USD', color: '#627EEA' },
  { symbol: 'XAU/USD', color: '#D4AF37' },
];

type Ticker = { symbol: string; price: string; change: string; up: boolean; color: string };

function MarketTicker() {
  const { colors } = useTheme();
  const [tickers, setTickers] = useState<Ticker[]>(MARKET_PAIRS.map(p => ({ ...p, price: '---', change: '---', up: true })));

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r => r.json())
      .then(data => {
        const rates = data.rates || {};
        setTickers(prev => prev.map(t => {
          const [base, quote] = t.symbol.split('/');
          if (base === 'USD') {
            const rate = rates[quote];
            return rate ? { ...t, price: rate.toFixed(4), change: '+0.00%', up: true } : t;
          } else if (quote === 'USD') {
            const rate = rates[base];
            return rate ? { ...t, price: (1 / rate).toFixed(4), change: '+0.00%', up: true } : t;
          }
          return t;
        }));
      })
      .catch(() => {});
  }, []);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      {tickers.map((t) => (
        <View key={t.symbol} style={[styles.tickerCard, { borderLeftColor: t.color, backgroundColor: colors.bgCard }]}>
          <Text style={[styles.tickerSymbol, { color: colors.textSecondary }]}>{t.symbol}</Text>
          <Text style={[styles.tickerPrice, { color: colors.text }]}>{t.price}</Text>
          <Text style={[styles.tickerChange, { color: t.up ? '#10B981' : '#DC2626' }]}>
            {t.up ? '▲' : '▼'} {t.change}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const FOREX_TABS = [
  { label: 'All', filter: {} },
  { label: 'Forex', filter: { tag: 'forex' } },
  { label: 'Crypto', filter: { tag: 'crypto' } },
  { label: 'Markets', filter: { tag: 'markets' } },
  { label: 'Economy', filter: { tag: 'economy' } },
];

export default function ForexScreen() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async (tabIndex: number) => {
    try {
      const tab = FOREX_TABS[tabIndex];
      let data: Post[] = [];
      data = await fetchPosts({ per_page: '20', sort: 'latest', ...(tab.filter as Record<string, string>) });
      if (data.length === 0) {
        data = await fetchPosts({ per_page: '20', sort: 'latest' });
      }
      setPosts(data);
    } catch {
      try {
        const data = await fetchPosts({ per_page: '20' });
        setPosts(data);
      } catch { setPosts([]); }
    }
  }, []);

  useEffect(() => { loadPosts(activeTab).finally(() => setLoading(false)); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts(activeTab).finally(() => setRefreshing(false));
  }, [activeTab, loadPosts]);

  const handleTab = (i: number) => {
    setActiveTab(i);
    setLoading(true);
    loadPosts(i).finally(() => setLoading(false));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />}
        renderItem={({ item, index }) => (
          <View style={{ marginHorizontal: 15 }}>
            {index === 0 ? <ApiMainNewsCard post={item} /> : <ApiNewsListItem post={item} />}
            {(index + 1) % 6 === 0 ? <AdBanner placement="feed" /> : null}
          </View>
        )}
        ListHeaderComponent={
          <View style={{ marginHorizontal: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 10 }}>
              <MaterialCommunityIcons name="chart-line" size={24} color="#DC2626" />
              <Text style={{ fontSize: 27, fontWeight: '800', marginLeft: 6, color: colors.text }}>Forex & Markets</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Live rates · Crypto · Global markets</Text>

            <MarketTicker />

            <AdBanner placement="top_banner" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {FOREX_TABS.map((tab, i) => (
                <Pressable
                  key={tab.label}
                  onPress={() => handleTab(i)}
                  style={[
                    styles.tabChip,
                    { backgroundColor: activeTab === i ? '#DC2626' : colors.bgBtn },
                  ]}
                >
                  <Text style={[styles.tabChipText, { color: activeTab === i ? 'white' : colors.text }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#DC2626" />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>No articles found.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tickerCard: {
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 100,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tickerSymbol: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  tickerPrice: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  tickerChange: { fontSize: 11, fontWeight: '600' },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabChipText: { fontWeight: '700', fontSize: 13 },
});

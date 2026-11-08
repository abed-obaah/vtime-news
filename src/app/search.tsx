import { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, ActivityIndicator,
  Pressable, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchPosts, Post } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import ApiNewsListItem from '@/components/ListItems/ApiNewsListItem';

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchPosts(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgBtn }]}>
            <Ionicons name="chevron-back" size={24} color={colors.iconBack} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search articles, topics, tags..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={handleSearch} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Go</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : !searched ? (
          <View style={styles.center}>
            <Ionicons name="search" size={56} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Search PulseNews</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Find articles, topics, and tags</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={56} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Try a different search term</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Text style={[styles.resultCount, { color: colors.textMuted }]}>
                {results.length} result{results.length !== 1 ? 's' : ''} for "{query.trim()}"
              </Text>
            }
            renderItem={({ item }) => <ApiNewsListItem post={item} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  searchBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  searchBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  resultCount: { fontSize: 13, marginBottom: 12, fontWeight: '500' },
});

import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

type Block = { h: string } | { p: string } | { list: string[] };

type Props = {
  title: string;
  description: string;
  updated?: string | null;
  body: Block[];
};

export default function PolicyScreen({ title, description, updated, body }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {updated && <Text style={styles.updated}>Last updated: {updated}</Text>}
        <View style={styles.divider} />

        {body.map((block, i) => {
          if ('h' in block) {
            return <Text key={i} style={styles.heading}>{block.h}</Text>;
          }
          if ('list' in block) {
            return (
              <View key={i} style={styles.list}>
                {block.list.map((item, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          }
          return <Text key={i} style={styles.paragraph}>{block.p}</Text>;
        })}

        <View style={styles.footer}>
          <Pressable style={styles.contactBtn} onPress={() => router.push('/contact')}>
            <Ionicons name="mail-outline" size={16} color="#fff" />
            <Text style={styles.contactBtnText}>Contact us</Text>
          </Pressable>
          <Text style={styles.footerNote}>PulseNews Media · hello@pulsenews.local</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 50 },
  title: { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 6 },
  description: { fontSize: 15, color: '#666', lineHeight: 22 },
  updated: { fontSize: 12, color: '#AAA', marginTop: 8 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  heading: { fontSize: 17, fontWeight: '700', color: '#111', marginTop: 20, marginBottom: 8 },
  paragraph: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 12 },
  list: { marginBottom: 12 },
  listItem: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  bullet: { color: '#DC2626', fontSize: 16, marginTop: 1 },
  listText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 22 },
  footer: { marginTop: 36, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0', alignItems: 'flex-start', gap: 12 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DC2626', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
  },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footerNote: { fontSize: 12, color: '#AAA' },
});

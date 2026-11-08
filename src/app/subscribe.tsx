import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendFeedback } from '@/services/api';

const FREQUENCIES = [
  { label: 'Breaking News', value: 'breaking', desc: 'Alerts for major stories as they happen' },
  { label: 'Daily Digest', value: 'daily', desc: 'Top stories once a day, every morning' },
  { label: 'Weekly Roundup', value: 'weekly', desc: 'The week\'s best stories, every Sunday' },
];

export default function SubscribeScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }

    setLoading(true);
    try {
      await sendFeedback({
        type: 'feedback',
        subject: `Newsletter subscription — ${frequency}`,
        message: `Newsletter subscription request.\nFrequency: ${frequency}\nName: ${name.trim() || 'Not provided'}`,
        name: name.trim() || undefined,
        email: email.trim(),
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Subscribe</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {success ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={36} color="#fff" />
              </View>
              <Text style={styles.successTitle}>You're subscribed!</Text>
              <Text style={styles.successBody}>
                Thanks for subscribing. You'll start receiving news updates at {email}.
              </Text>
              <Pressable style={styles.doneBtn} onPress={() => router.back()}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Hero */}
              <View style={styles.hero}>
                <View style={styles.heroIcon}>
                  <Ionicons name="mail" size={32} color="#DC2626" />
                </View>
                <Text style={styles.heroTitle}>Stay in the know</Text>
                <Text style={styles.heroSubtitle}>
                  Get the stories that matter delivered straight to your inbox. No spam, ever.
                </Text>
              </View>

              {/* Frequency picker */}
              <Text style={styles.sectionLabel}>Choose your frequency</Text>
              {FREQUENCIES.map(f => (
                <Pressable
                  key={f.value}
                  style={[styles.frequencyCard, frequency === f.value && styles.frequencyCardActive]}
                  onPress={() => setFrequency(f.value)}
                >
                  <View style={styles.frequencyLeft}>
                    <View style={[styles.radio, frequency === f.value && styles.radioActive]}>
                      {frequency === f.value && <View style={styles.radioDot} />}
                    </View>
                    <View>
                      <Text style={[styles.frequencyLabel, frequency === f.value && styles.frequencyLabelActive]}>
                        {f.label}
                      </Text>
                      <Text style={styles.frequencyDesc}>{f.desc}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Name */}
              <Text style={styles.sectionLabel}>Your details</Text>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Name <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#AAA"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#AAA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable style={styles.subscribeBtn} onPress={handleSubscribe} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.subscribeBtnText}>Subscribe</Text>}
              </Pressable>

              <Text style={styles.legalNote}>
                By subscribing you agree to our{' '}
                <Text style={styles.legalLink} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
                {' '}and{' '}
                <Text style={styles.legalLink} onPress={() => router.push('/tos')}>Terms of Service</Text>.
                {' '}Unsubscribe any time.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 50 },
  hero: { alignItems: 'center', marginBottom: 32 },
  heroIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 4 },
  frequencyCard: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 12,
    padding: 14, marginBottom: 10, backgroundColor: '#FAFAFA',
  },
  frequencyCardActive: { borderColor: '#DC2626', backgroundColor: '#FFF5F5' },
  frequencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#CCC',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#DC2626' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  frequencyLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  frequencyLabelActive: { color: '#DC2626' },
  frequencyDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCCCC',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 14, flex: 1 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  optional: { fontWeight: '400', color: '#AAA' },
  input: {
    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#111',
  },
  subscribeBtn: {
    backgroundColor: '#DC2626', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  subscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  legalNote: { fontSize: 12, color: '#AAA', textAlign: 'center', marginTop: 16, lineHeight: 18 },
  legalLink: { color: '#DC2626', fontWeight: '600' },
  successCard: { alignItems: 'center', paddingTop: 40 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 10 },
  successBody: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  doneBtn: {
    marginTop: 30, backgroundColor: '#DC2626',
    paddingHorizontal: 40, paddingVertical: 13, borderRadius: 12,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

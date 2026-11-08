import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendFeedback } from '@/services/api';

const TYPES = [
  { label: 'Feedback', value: 'feedback' },
  { label: 'Bug Report', value: 'bug' },
  { label: 'Suggestion', value: 'suggestion' },
];

const MAX_MESSAGE = 1000;

export default function ContactScreen() {
  const [type, setType] = useState('feedback');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in email, subject, and message.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendFeedback({
        type,
        subject: subject.trim(),
        message: message.trim(),
        name: name.trim() || undefined,
        email: email.trim(),
      });
      setSuccess(res.message || 'Your message has been sent. Thank you!');
      setSubject('');
      setMessage('');
      setName('');
      setEmail('');
    } catch (e: any) {
      setError(e.message || 'Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </Pressable>
        <Text style={styles.navTitle}>Contact Us</Text>
        <View style={{ width: 34 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.title}>Get in touch</Text>
          <Text style={styles.subtitle}>We'd love to hear from you</Text>

          {/* Type selector */}
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                onPress={() => setType(t.value)}
              >
                <Text
                  style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Success */}
          {success ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#22C55E" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Name (optional) */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Name <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#AAAAAA"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#AAAAAA"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Subject */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What's this about?"
              placeholderTextColor="#AAAAAA"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Message */}
          <View style={styles.fieldWrap}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Message</Text>
              <Text style={styles.charCount}>{message.length}/{MAX_MESSAGE}</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Tell us more..."
              placeholderTextColor="#AAAAAA"
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, MAX_MESSAGE))}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Send button */}
          <Pressable style={styles.button} onPress={handleSend} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Send Message</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  backBtn: { padding: 4 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111' },
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 24,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#EEEEEE',
  },
  typeBtnActive: {
    backgroundColor: '#DC2626',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  typeBtnTextActive: {
    color: 'white',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#22C55E',
    fontSize: 14,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCCCC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  optional: {
    fontWeight: '400',
    color: '#AAAAAA',
  },
  charCount: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111',
  },
  textarea: {
    minHeight: 130,
    paddingTop: 14,
  },
  button: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

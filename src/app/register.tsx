import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Image, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function RegisterScreen() {
  const { register, loading } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    const result = await register(name.trim(), email.trim(), password);
    if (result.success) { router.replace('/(tabs)/'); }
    else { setError(result.error || 'Registration failed. Please try again.'); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.iconBack} />
          </Pressable>

          <View style={styles.logoWrap}>
            <Image source={require('@assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Join PulseNews and stay informed</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} placeholder="John Doe" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]} placeholder="you@example.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.passwordRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
              <TextInput style={[styles.input, { flex: 1, borderWidth: 0, color: colors.text }]} placeholder="Min. 6 characters" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" />
              <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <View style={[styles.passwordRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
              <TextInput style={[styles.input, { flex: 1, borderWidth: 0, color: colors.text }]} placeholder="Re-enter password" placeholderTextColor={colors.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} autoCapitalize="none" autoComplete="new-password" />
              <Pressable onPress={() => setShowConfirm((p) => !p)} hitSlop={8}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </Pressable>

          <View style={styles.linkRow}>
            <Text style={[styles.linkLabel, { color: colors.textMuted }]}>Already have an account? </Text>
            <Link href="/login" asChild>
              <Pressable><Text style={styles.linkText}>Sign In</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 8 },
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logo: { height: 56, width: 180 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCCCC', borderRadius: 10, padding: 12, marginBottom: 20 },
  errorText: { color: '#DC2626', fontSize: 14, flex: 1 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14 },
  button: { backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkLabel: { fontSize: 14 },
  linkText: { fontSize: 14, color: '#DC2626', fontWeight: '700' },
});

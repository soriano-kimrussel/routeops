import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, defaultApiUrl } from '../api';
import { useStore } from '../store';
import { colors } from '../theme';

export function LoginScreen() {
  const { signIn } = useStore();
  const [code, setCode] = useState('');
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim()) {
      setError('Enter your driver code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(code, apiUrl);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Could not reach the office server at ${apiUrl}. Check the address and that this phone is on the same Wi-Fi.`,
      );
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoText}>R</Text>
          </View>
          <Text style={styles.title}>RouteOps Driver</Text>
          <Text style={styles.subtitle}>Sign in to load today's route.</Text>

          <Text style={styles.label}>Driver code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="D-101"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <Text style={styles.label}>Office server address</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.1.20:3000"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            The computer running the web app, on port 3000. Signing in needs a connection; after that the app works
            offline.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>

          <Text style={styles.demo}>Demo driver code: D-101</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: '#ffffff', fontSize: 28, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 17 },
  error: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 19,
  },
  button: {
    marginTop: 24,
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  demo: { marginTop: 20, textAlign: 'center', fontSize: 13, color: colors.muted },
});

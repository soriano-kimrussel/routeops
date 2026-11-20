import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';

function formatTime(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? time : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

/** Always-visible sync status: what is waiting, whether we can reach the office, and when we last did. */
export function SyncBar() {
  const { pendingCount, online, syncing, lastSyncedAt, authExpired, rejectedCount, syncNow } = useStore();

  let tone: 'ok' | 'waiting' | 'problem' = 'ok';
  let headline = 'All updates synced';

  if (authExpired) {
    tone = 'problem';
    headline = 'Sign in again to sync';
  } else if (pendingCount > 0) {
    tone = 'waiting';
    const updates = `${pendingCount} update${pendingCount === 1 ? '' : 's'}`;
    headline = online === false ? `Offline. ${updates} saved on this phone` : `${updates} waiting to sync`;
  } else if (online === false) {
    tone = 'waiting';
    headline = 'Offline. Nothing waiting to sync';
  }

  const dotColor = tone === 'ok' ? colors.primary : tone === 'waiting' ? colors.warning : colors.danger;

  return (
    <View style={styles.bar}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.text}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.detail}>
          Last synced: {formatTime(lastSyncedAt)}
          {rejectedCount > 0 ? `  ·  ${rejectedCount} rejected by office` : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => void syncNow()}
        disabled={syncing}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Sync now"
      >
        {syncing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.buttonText}>Sync now</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1 },
  headline: { fontSize: 14, fontWeight: '600', color: colors.text },
  detail: { fontSize: 12, color: colors.muted, marginTop: 1 },
  button: {
    minWidth: 84,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPressed: { backgroundColor: colors.background },
  buttonText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});

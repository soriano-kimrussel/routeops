import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SyncBar } from '../components/SyncBar';
import type { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { colors, statusColors } from '../theme';
import { STOP_TYPE_LABELS, type StopView } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;

export function RouteScreen({ navigation }: Props) {
  const { stops, session, syncing, syncNow, signOut, pendingCount, online, lastSyncedAt } = useStore();

  useLayoutEffect(() => {
    function confirmSignOut() {
      const warning =
        pendingCount > 0
          ? `You have ${pendingCount} update${pendingCount === 1 ? '' : 's'} that have not synced yet. Signing out will delete them from this phone.`
          : 'You will need a connection to sign in again.';
      Alert.alert('Sign out?', warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
      ]);
    }

    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={confirmSignOut} hitSlop={10} accessibilityRole="button">
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      ),
    });
  }, [navigation, pendingCount, signOut]);

  const done = stops.filter((stop) => stop.status !== 'pending').length;
  const gallons = stops.reduce(
    (sum, stop) => (stop.status === 'completed' ? sum + (stop.gallonsCollected ?? 0) : sum),
    0,
  );

  return (
    <View style={styles.screen}>
      <SyncBar />
      <FlatList
        data={stops}
        keyExtractor={(stop) => stop.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={() => void syncNow()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.driver}>{session?.driver.name}</Text>
            <Text style={styles.summary}>
              {done} of {stops.length} stops done  ·  {Math.round(gallons * 100) / 100} gal collected
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {lastSyncedAt === null && online === false ? 'Route not downloaded yet' : 'No stops for today'}
            </Text>
            <Text style={styles.emptyText}>
              {lastSyncedAt === null && online === false
                ? 'Connect to the office server once to download today’s route. After that it works offline.'
                : 'The office has not assigned you any stops for today. Pull down to check again.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <StopCard stop={item} onPress={() => navigation.navigate('Stop', { stopId: item.id })} />
        )}
      />
    </View>
  );
}

function StopCard({ stop, onPress }: { stop: StopView; onPress: () => void }) {
  const status = statusColors[stop.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Stop ${stop.order}, ${stop.name}, ${stop.status}`}
    >
      <View style={styles.order}>
        <Text style={styles.orderText}>{stop.order}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name} numberOfLines={1}>
          {stop.name}
        </Text>
        <Text style={styles.type}>{STOP_TYPE_LABELS[stop.type] ?? stop.type}</Text>
        <Text style={styles.address} numberOfLines={2}>
          {stop.address}, {stop.city}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: status.background }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>{stop.status}</Text>
          </View>
          {stop.status === 'completed' && stop.gallonsCollected !== null ? (
            <Text style={styles.gallons}>{stop.gallonsCollected} gal</Text>
          ) : null}
          {stop.pendingSync ? (
            <View style={[styles.badge, styles.pendingBadge]}>
              <Text style={[styles.badgeText, styles.pendingBadgeText]}>waiting to sync</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  header: { marginBottom: 12 },
  driver: { fontSize: 20, fontWeight: '700', color: colors.text },
  summary: { fontSize: 14, color: colors.muted, marginTop: 2 },
  signOut: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardPressed: { backgroundColor: '#f8fafc' },
  order: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  type: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 1 },
  address: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  pendingBadge: { backgroundColor: colors.warningSoft },
  pendingBadgeText: { color: '#92400e', textTransform: 'none' },
  gallons: { fontSize: 13, fontWeight: '600', color: colors.text },
  chevron: { fontSize: 26, color: colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});

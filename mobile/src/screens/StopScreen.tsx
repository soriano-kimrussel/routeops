import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { RootStackParamList } from '../navigation';
import { parseGallons } from '../outbox';
import { keepPhoto } from '../photos';
import { useStore } from '../store';
import { colors } from '../theme';
import { STOP_TYPE_LABELS, type StopStatus } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Stop'>;

const STATUS_OPTIONS: { value: StopStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'pending', label: 'Pending' },
];

export function StopScreen({ route, navigation }: Props) {
  const { stops, session, saveStop } = useStore();
  const stop = stops.find((candidate) => candidate.id === route.params.stopId);

  // A pending stop opens with "Completed" preselected: that is what the driver is here to do.
  const [status, setStatus] = useState<StopStatus>(stop && stop.status !== 'pending' ? stop.status : 'completed');
  const [gallons, setGallons] = useState(stop?.gallonsCollected != null ? String(stop.gallonsCollected) : '');
  const [note, setNote] = useState(stop?.note ?? '');
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [gallonsError, setGallonsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!stop) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This stop is no longer on your route.</Text>
      </View>
    );
  }
  const stopId = stop.id;

  const existingPhoto = stop.localPhotoUri ?? (stop.photoUrl && session ? `${session.apiUrl}${stop.photoUrl}` : null);
  const photoToShow = newPhotoUri ?? existingPhoto;

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph the stop.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.4 });
    if (!result.canceled && result.assets[0]) setNewPhotoUri(keepPhoto(result.assets[0].uri, stopId));
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.4 });
    if (!result.canceled && result.assets[0]) setNewPhotoUri(keepPhoto(result.assets[0].uri, stopId));
  }

  async function save() {
    const parsed = parseGallons(gallons);
    if (!parsed.ok) {
      setGallonsError('Enter gallons as a number, for example 42.5');
      return;
    }
    setGallonsError(null);
    setSaving(true);
    await saveStop(stopId, {
      status,
      gallonsCollected: parsed.value,
      note: note.trim() || null,
      photoUri: newPhotoUri,
    });
    navigation.goBack();
  }

  function openMaps() {
    const query = encodeURIComponent(`${stop!.address}, ${stop!.city}`);
    const url = Platform.OS === 'ios' ? `http://maps.apple.com/?q=${query}` : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() => undefined);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.type}>
            Stop {stop.order}  ·  {STOP_TYPE_LABELS[stop.type] ?? stop.type}
          </Text>
          <Text style={styles.name}>{stop.name}</Text>
          <Pressable onPress={openMaps} accessibilityRole="link">
            <Text style={styles.address}>
              {stop.address}, {stop.city}
            </Text>
          </Pressable>
          {stop.contactName || stop.phone ? (
            <Pressable
              onPress={() => stop.phone && Linking.openURL(`tel:${stop.phone.replace(/[^\d+]/g, '')}`).catch(() => undefined)}
              accessibilityRole={stop.phone ? 'link' : undefined}
            >
              <Text style={styles.contact}>
                {[stop.contactName, stop.phone].filter(Boolean).join('  ·  ')}
              </Text>
            </Pressable>
          ) : null}
          {stop.siteNotes ? <Text style={styles.siteNotes}>{stop.siteNotes}</Text> : null}
          {stop.pendingSync ? <Text style={styles.pending}>Saved on this phone, waiting to sync</Text> : null}
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.segments}>
          {STATUS_OPTIONS.map((option) => {
            const selected = status === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setStatus(option.value)}
                style={[styles.segment, selected && styles.segmentSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Gallons collected</Text>
        <TextInput
          style={[styles.input, gallonsError ? styles.inputError : null]}
          value={gallons}
          onChangeText={setGallons}
          placeholder="0"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
        />
        {gallonsError ? <Text style={styles.errorText}>{gallonsError}</Text> : null}

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="Anything the office should know"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Photo</Text>
        {photoToShow ? <Image source={{ uri: photoToShow }} style={styles.photo} resizeMode="cover" /> : null}
        <View style={styles.photoButtons}>
          <Pressable onPress={takePhoto} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}>
            <Text style={styles.secondaryText}>{photoToShow ? 'Retake photo' : 'Take photo'}</Text>
          </Pressable>
          <Pressable onPress={choosePhoto} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}>
            <Text style={styles.secondaryText}>Choose from library</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.savePressed]}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
        <Text style={styles.saveHint}>Saves to this phone right away and syncs when there is a connection.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  missingText: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  type: { fontSize: 13, fontWeight: '600', color: colors.primary },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 },
  address: { fontSize: 15, color: colors.primary, marginTop: 6, textDecorationLine: 'underline' },
  contact: { fontSize: 14, color: colors.text, marginTop: 6 },
  siteNotes: {
    fontSize: 14,
    color: colors.text,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    lineHeight: 19,
  },
  pending: { fontSize: 13, color: colors.warning, fontWeight: '600', marginTop: 10 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 20, marginBottom: 8 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  segmentSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.text },
  segmentTextSelected: { color: '#ffffff' },
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
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 13, color: colors.danger, marginTop: 6 },
  noteInput: { minHeight: 90 },
  photo: { width: '100%', height: 220, borderRadius: 12, marginBottom: 10, backgroundColor: colors.neutralSoft },
  photoButtons: { flexDirection: 'row', gap: 8 },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
  },
  secondaryPressed: { backgroundColor: colors.background },
  secondaryText: { fontSize: 14, fontWeight: '600', color: colors.text },
  saveButton: {
    marginTop: 28,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePressed: { backgroundColor: colors.primaryPressed },
  saveText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  saveHint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 10 },
});

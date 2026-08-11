import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { InstalledApp } from '../../specs/NativeAppGate';
import type { GatedApp, Mode } from '../types';

const DURATION_CHIPS: { label: string; getMillis: () => number }[] = [
  { label: '1h', getMillis: () => 60 * 60 * 1000 },
  { label: '3h', getMillis: () => 3 * 60 * 60 * 1000 },
  { label: '4h', getMillis: () => 4 * 60 * 60 * 1000 },
  { label: '8h', getMillis: () => 8 * 60 * 60 * 1000 },
  {
    label: 'Until tomorrow 6am',
    getMillis: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(6, 0, 0, 0);
      return d.getTime() - Date.now();
    },
  },
];

export default function AddConfigureScreen({
  app,
  onCancel,
  onSave,
}: {
  app: InstalledApp;
  onCancel: () => void;
  onSave: (gatedApp: GatedApp) => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [durationMillis, setDurationMillis] = useState<number | null>(null);
  const [customHours, setCustomHours] = useState('');
  const [message, setMessage] = useState('');

  if (mode === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{app.appName}</Text>
        <Text style={styles.subtitle}>Choose what happens when you open it</Text>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          android_ripple={{ color: '#333' }}
          onPress={() => setMode('BLOCK')}>
          <Text style={styles.cardTitle}>Block completely</Text>
          <Text style={styles.cardSubtitle}>No way in until a timer expires</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          android_ripple={{ color: '#333' }}
          onPress={() => setMode('MESSAGE')}>
          <Text style={styles.cardTitle}>Show me a message</Text>
          <Text style={styles.cardSubtitle}>A reminder, then you can continue</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelWrap, pressed && styles.pressedText]}
          android_ripple={{ color: '#333' }}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (mode === 'BLOCK') {
    const canSave = durationMillis !== null && durationMillis > 0;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{app.appName}</Text>
        <Text style={styles.subtitle}>Block for how long?</Text>
        <View style={styles.chipRow}>
          {DURATION_CHIPS.map(chip => (
            <Pressable
              key={chip.label}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              android_ripple={{ color: '#3a3a3e' }}
              onPress={() => {
                setCustomHours('');
                setDurationMillis(chip.getMillis());
              }}>
              <Text style={styles.chipText}>{chip.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            placeholder="Custom"
            placeholderTextColor="#6a6a6e"
            keyboardType="numeric"
            value={customHours}
            onChangeText={text => {
              setCustomHours(text);
              const hours = parseFloat(text);
              setDurationMillis(!Number.isNaN(hours) && hours > 0 ? hours * 60 * 60 * 1000 : null);
            }}
          />
          <Text style={styles.customLabel}>hours</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
            pressed && canSave && styles.saveButtonPressed,
          ]}
          android_ripple={canSave ? { color: '#2c56cc' } : undefined}
          disabled={!canSave}
          onPress={() => {
            if (durationMillis === null) {
              return;
            }
            onSave({
              packageName: app.packageName,
              appName: app.appName,
              mode: 'BLOCK',
              blockUntilMillis: Date.now() + durationMillis,
              createdAt: Date.now(),
            });
          }}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode(null)}
          style={({ pressed }) => [styles.cancelWrap, pressed && styles.pressedText]}
          android_ripple={{ color: '#333' }}>
          <Text style={styles.cancel}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const trimmed = message.trim();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{app.appName}</Text>
      <Text style={styles.subtitle}>Message to show (max 200 characters)</Text>
      <TextInput
        style={styles.messageInput}
        placeholder="you have to..."
        placeholderTextColor="#6a6a6e"
        multiline
        maxLength={200}
        value={message}
        onChangeText={setMessage}
      />
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Preview</Text>
        <View style={styles.previewOverlay}>
          <Text style={styles.previewMessage}>{trimmed || 'Your message will appear here'}</Text>
          <View style={styles.previewButtons}>
            <Text style={styles.previewButtonText}>Go back</Text>
            <Text style={styles.previewButtonText}>Continue anyway</Text>
          </View>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          !trimmed && styles.saveButtonDisabled,
          pressed && !!trimmed && styles.saveButtonPressed,
        ]}
        android_ripple={trimmed ? { color: '#2c56cc' } : undefined}
        disabled={!trimmed}
        onPress={() =>
          onSave({
            packageName: app.packageName,
            appName: app.appName,
            mode: 'MESSAGE',
            message: trimmed,
            createdAt: Date.now(),
          })
        }>
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
      <Pressable
        onPress={() => setMode(null)}
        style={({ pressed }) => [styles.cancelWrap, pressed && styles.pressedText]}
        android_ripple={{ color: '#333' }}>
        <Text style={styles.cancel}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0f',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: '#9a9a9e',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1f1f23',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardPressed: {
    backgroundColor: '#28282d',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#9a9a9e',
    fontSize: 13,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1f1f23',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipPressed: {
    backgroundColor: '#2c2c30',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  customInput: {
    backgroundColor: '#1f1f23',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
  },
  customLabel: {
    color: '#9a9a9e',
  },
  messageInput: {
    backgroundColor: '#1f1f23',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  preview: {
    marginTop: 20,
  },
  previewLabel: {
    color: '#9a9a9e',
    fontSize: 12,
    marginBottom: 8,
  },
  previewOverlay: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  previewMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 24,
  },
  previewButtonText: {
    color: '#7aa2ff',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#3a6cf6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonPressed: {
    backgroundColor: '#2c56cc',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelWrap: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  cancel: {
    color: '#9a9a9e',
    fontSize: 14,
  },
  pressedText: {
    opacity: 0.5,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { useGatedApps } from '../hooks/useGatedApps';
import type { GatedApp } from '../types';

const REARM_CHIPS = [
  { label: '1h', millis: 60 * 60 * 1000 },
  { label: '3h', millis: 3 * 60 * 60 * 1000 },
  { label: '4h', millis: 4 * 60 * 60 * 1000 },
  { label: '8h', millis: 8 * 60 * 60 * 1000 },
];

type GatedAppActions = Pick<ReturnType<typeof useGatedApps>, 'update' | 'remove' | 'rearm' | 'switchMode'>;

export default function EditAppSheet({
  app,
  actions,
  onClose,
}: {
  app: GatedApp;
  actions: GatedAppActions;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(app.message ?? '');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          android_ripple={{ color: '#333', borderless: true }}
          style={({ pressed }) => pressed && styles.pressedText}>
          <Text style={styles.headerAction}>Close</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{app.appName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={({ pressed }) => [
            styles.modeButton,
            app.mode === 'BLOCK' && styles.modeButtonActive,
            pressed && styles.modeButtonPressed,
          ]}
          android_ripple={{ color: '#2c56cc' }}
          onPress={() => actions.switchMode(app.packageName, 'BLOCK')}>
          <Text style={styles.modeButtonText}>Block</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.modeButton,
            app.mode === 'MESSAGE' && styles.modeButtonActive,
            pressed && styles.modeButtonPressed,
          ]}
          android_ripple={{ color: '#2c56cc' }}
          onPress={() => actions.switchMode(app.packageName, 'MESSAGE')}>
          <Text style={styles.modeButtonText}>Message</Text>
        </Pressable>
      </View>

      {app.mode === 'BLOCK' ? (
        <View style={styles.chipRow}>
          {REARM_CHIPS.map(chip => (
            <Pressable
              key={chip.label}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              android_ripple={{ color: '#3a3a3e' }}
              onPress={() => actions.rearm(app.packageName, chip.millis)}>
              <Text style={styles.chipText}>Re-arm {chip.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <TextInput
            style={styles.messageInput}
            multiline
            maxLength={200}
            value={message}
            onChangeText={setMessage}
            placeholder="Message"
            placeholderTextColor="#6a6a6e"
          />
          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
            android_ripple={{ color: '#2c56cc' }}
            onPress={() => actions.update({ ...app, message: message.trim() })}>
            <Text style={styles.saveButtonText}>Save message</Text>
          </Pressable>
        </>
      )}

      <Pressable
        style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
        android_ripple={{ color: '#5a2a2a' }}
        onPress={() => {
          actions.remove(app.packageName);
          onClose();
        }}>
        <Text style={styles.removeButtonText}>Remove</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerAction: {
    color: '#7aa2ff',
    fontSize: 15,
    width: 60,
  },
  headerSpacer: {
    width: 60,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#1f1f23',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#3a6cf6',
  },
  modeButtonPressed: {
    backgroundColor: '#28282d',
  },
  modeButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  messageInput: {
    backgroundColor: '#1f1f23',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3a6cf6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonPressed: {
    backgroundColor: '#2c56cc',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  removeButton: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 12,
  },
  removeButtonPressed: {
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '600',
  },
  pressedText: {
    opacity: 0.5,
  },
});

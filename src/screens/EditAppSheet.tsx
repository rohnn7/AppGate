import { useEffect, useReducer, useState } from 'react';
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

function remainingText(blockUntilMillis: number): string {
  const remaining = blockUntilMillis - Date.now();
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m left`;
}

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
  const [, tick] = useReducer(x => x + 1, 0);

  // Keep the lock state and "Xh Ym left" text fresh while the sheet is open,
  // in case a block expires while the user is looking at it.
  useEffect(() => {
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  // Anti-bypass: while a BLOCK is actively counting down, neither switching
  // away from BLOCK nor removing the entry is allowed — otherwise the whole
  // feature is defeated by a two-tap edit. Re-arming (extending) is still
  // allowed since it only tightens the block, never weakens it.
  const isActiveBlock =
    app.mode === 'BLOCK' && app.blockUntilMillis != null && app.blockUntilMillis > Date.now();

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
          disabled={isActiveBlock}
          style={({ pressed }) => [
            styles.modeButton,
            app.mode === 'MESSAGE' && styles.modeButtonActive,
            isActiveBlock && styles.modeButtonDisabled,
            pressed && !isActiveBlock && styles.modeButtonPressed,
          ]}
          android_ripple={isActiveBlock ? undefined : { color: '#2c56cc' }}
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

      {isActiveBlock ? (
        <View style={styles.lockedNotice}>
          <Text style={styles.lockedNoticeText}>
            🔒 Locked until this block expires — {remainingText(app.blockUntilMillis as number)}
          </Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
          android_ripple={{ color: '#5a2a2a' }}
          onPress={() => {
            actions.remove(app.packageName);
            onClose();
          }}>
          <Text style={styles.removeButtonText}>Remove</Text>
        </Pressable>
      )}
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
  modeButtonDisabled: {
    opacity: 0.35,
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
  lockedNotice: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1f1f23',
    borderRadius: 8,
  },
  lockedNoticeText: {
    color: '#9a9a9e',
    fontSize: 13,
    textAlign: 'center',
  },
  pressedText: {
    opacity: 0.5,
  },
});

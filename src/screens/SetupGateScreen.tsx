import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import NativeAppGate from '../../specs/NativeAppGate';

function PermissionRow({
  title,
  description,
  granted,
  actionLabel,
  onPress,
}: {
  title: string;
  description: string;
  granted: boolean;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={[styles.status, granted ? styles.statusGranted : styles.statusMissing]}>
          {granted ? 'Granted' : 'Needed'}
        </Text>
      </View>
      <Text style={styles.rowDescription}>{description}</Text>
      {!granted && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          android_ripple={{ color: '#2c56cc' }}
          onPress={onPress}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function InfoRow({
  title,
  description,
  actionLabel,
  onPress,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowDescription}>{description}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        android_ripple={{ color: '#2c56cc' }}
        onPress={onPress}>
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function SetupGateScreen({ onReady }: { onReady: () => void }) {
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [canDrawOverlays, setCanDrawOverlays] = useState(false);

  const recheck = useCallback(() => {
    setAccessibilityEnabled(NativeAppGate.isAccessibilityEnabled());
    setCanDrawOverlays(NativeAppGate.canDrawOverlays());
  }, []);

  // The user grants these by leaving the app, so re-check whenever they come
  // back rather than only once on mount (§9.1).
  useEffect(() => {
    recheck();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        recheck();
      }
    });
    return () => subscription.remove();
  }, [recheck]);

  const ready = accessibilityEnabled && canDrawOverlays;

  useEffect(() => {
    if (ready) {
      onReady();
    }
  }, [ready, onReady]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up AppGate</Text>
      <Text style={styles.subtitle}>
        Both permissions below are required before AppGate can block or interrupt anything.
      </Text>

      <PermissionRow
        title="Accessibility service"
        description="Lets AppGate notice when a gated app opens."
        granted={accessibilityEnabled}
        actionLabel="Open accessibility settings"
        onPress={() => NativeAppGate.openAccessibilitySettings()}
      />
      <PermissionRow
        title="Display over other apps"
        description="Lets AppGate draw the block or message screen on top of the gated app."
        granted={canDrawOverlays}
        actionLabel="Open overlay settings"
        onPress={() => NativeAppGate.openOverlaySettings()}
      />
      <InfoRow
        title="Battery optimisation"
        description={
          'On some phones (Xiaomi, Vivo, Oppo, Realme) the accessibility service gets killed ' +
          'in the background unless you disable battery optimisation and enable autostart for ' +
          'AppGate, per device, in system settings.'
        }
        actionLabel="Open battery settings"
        onPress={() => NativeAppGate.openBatteryOptimizationSettings()}
      />
      <InfoRow
        title="Accessibility toggle greyed out?"
        description={
          'Android blocks accessibility for freshly sideloaded apps. Open AppGate’s app ' +
          'info, tap the ⋮ menu in the top right, choose "Allow restricted settings", ' +
          'then try the accessibility toggle again.'
        }
        actionLabel="Open app info"
        onPress={() => NativeAppGate.openAppInfoSettings()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0f',
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9a9a9e',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  row: {
    backgroundColor: '#1f1f23',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rowDescription: {
    color: '#9a9a9e',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusGranted: {
    color: '#7cffb2',
    backgroundColor: '#1d3a26',
  },
  statusMissing: {
    color: '#ff9a7a',
    backgroundColor: '#3a2320',
  },
  button: {
    backgroundColor: '#3a6cf6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonPressed: {
    backgroundColor: '#2c56cc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

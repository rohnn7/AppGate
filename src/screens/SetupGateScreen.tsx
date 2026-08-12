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

// Autostart has no public API to verify — self-certified via a checkbox the
// user must tick after actually visiting the OEM screen, persisted so they
// don't have to re-confirm on every launch.
function AutostartRow({
  acknowledged,
  onAcknowledge,
}: {
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>Autostart / "don't kill my app"</Text>
        <Text
          style={[styles.status, acknowledged ? styles.statusGranted : styles.statusMissing]}>
          {acknowledged ? 'Confirmed' : 'Needed'}
        </Text>
      </View>
      <Text style={styles.rowDescription}>
        On Xiaomi, Vivo, Oppo, and Realme phones, the accessibility service gets silently killed
        in the background unless autostart is enabled for AppGate. There's no way for the app to
        check this itself — open the screen below, enable autostart for AppGate, then confirm it
        below.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        android_ripple={{ color: '#2c56cc' }}
        onPress={() => NativeAppGate.openAutostartSettings()}>
        <Text style={styles.buttonText}>Open autostart settings</Text>
      </Pressable>
      {!acknowledged && (
        <Pressable
          style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressedText]}
          android_ripple={{ color: '#333' }}
          onPress={onAcknowledge}>
          <View style={styles.checkbox} />
          <Text style={styles.checkboxLabel}>I've enabled autostart for AppGate</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function SetupGateScreen({ onReady }: { onReady: () => void }) {
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [canDrawOverlays, setCanDrawOverlays] = useState(false);
  const [batteryOptimizationIgnored, setBatteryOptimizationIgnored] = useState(false);
  const [autostartAcknowledged, setAutostartAcknowledged] = useState(false);

  const recheck = useCallback(() => {
    setAccessibilityEnabled(NativeAppGate.isAccessibilityEnabled());
    setCanDrawOverlays(NativeAppGate.canDrawOverlays());
    setBatteryOptimizationIgnored(NativeAppGate.isBatteryOptimizationIgnored());
    setAutostartAcknowledged(NativeAppGate.loadSetupAcknowledged());
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

  const ready =
    accessibilityEnabled && canDrawOverlays && batteryOptimizationIgnored && autostartAcknowledged;

  useEffect(() => {
    if (ready) {
      onReady();
    }
  }, [ready, onReady]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up AppGate</Text>
      <Text style={styles.subtitle}>
        Every item below is required before AppGate can reliably block or interrupt anything.
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
      <PermissionRow
        title="Battery optimisation"
        description="Without this, Android may pause AppGate's detection in the background."
        granted={batteryOptimizationIgnored}
        actionLabel="Open battery settings"
        onPress={() => NativeAppGate.openBatteryOptimizationSettings()}
      />
      <AutostartRow
        acknowledged={autostartAcknowledged}
        onAcknowledge={() => {
          NativeAppGate.saveSetupAcknowledged(true);
          setAutostartAcknowledged(true);
        }}
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#7aa2ff',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 13,
    flexShrink: 1,
  },
  pressedText: {
    opacity: 0.6,
  },
});

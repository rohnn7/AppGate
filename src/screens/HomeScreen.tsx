import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import NativeAppGate from '../../specs/NativeAppGate';
import { useGatedApps } from '../hooks/useGatedApps';
import type { GatedApp } from '../types';

function statusText(app: GatedApp): string {
  if (app.mode === 'MESSAGE') {
    return 'Message on open';
  }
  const remaining = (app.blockUntilMillis ?? 0) - Date.now();
  if (remaining <= 0) {
    return 'Expired';
  }
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `Blocked · ${hours}h ${minutes}m left`;
}

function Row({ app }: { app: GatedApp }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconPlaceholder} />
      <View style={styles.rowText}>
        <Text style={styles.appName}>{app.appName}</Text>
        <Text style={styles.status}>{statusText(app)}</Text>
      </View>
      <View style={[styles.badge, app.mode === 'BLOCK' ? styles.badgeBlock : styles.badgeMessage]}>
        <Text style={styles.badgeText}>{app.mode}</Text>
      </View>
    </View>
  );
}

// Temporary: proves the TurboModule bridge is wired end to end. Replaced by
// the real setup gate in build-order step 9.
function NativeBridgeStatus() {
  const [status, setStatus] = useState('checking native bridge…');

  useEffect(() => {
    try {
      const accessibilityEnabled = NativeAppGate.isAccessibilityEnabled();
      const canOverlay = NativeAppGate.canDrawOverlays();
      setStatus(`native ok · accessibility=${accessibilityEnabled} · overlay=${canOverlay}`);
    } catch (e) {
      setStatus(`native bridge error: ${String(e)}`);
    }
  }, []);

  return <Text style={styles.debug}>{status}</Text>;
}

// Temporary: stands in for the real app picker + add flow (build-order step 4).
// Proves saveConfig/loadConfig round-trip through a real file.
function DebugAddButtons({
  add,
}: {
  add: ReturnType<typeof useGatedApps>['add'];
}) {
  return (
    <View style={styles.debugRow}>
      <Pressable
        style={styles.debugButton}
        onPress={() =>
          add({
            packageName: 'com.instagram.android',
            appName: 'Instagram',
            mode: 'BLOCK',
            blockUntilMillis: Date.now() + 3 * 60 * 60 * 1000,
            createdAt: Date.now(),
          })
        }>
        <Text style={styles.debugButtonText}>+ Instagram (BLOCK 3h)</Text>
      </Pressable>
      <Pressable
        style={styles.debugButton}
        onPress={() =>
          add({
            packageName: 'com.application.zomato',
            appName: 'Zomato',
            mode: 'MESSAGE',
            message: 'you have to reduce your weight, get over your taste addiction',
            createdAt: Date.now(),
          })
        }>
        <Text style={styles.debugButtonText}>+ Zomato (MESSAGE)</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const { apps, loaded, add } = useGatedApps();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AppGate</Text>
      <FlatList
        data={apps}
        keyExtractor={item => item.packageName}
        renderItem={({ item }) => <Row app={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loaded ? 'No apps gated yet. Tap the add button to gate your first app.' : ''}
          </Text>
        }
      />
      <DebugAddButtons add={add} />
      <NativeBridgeStatus />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0f',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2a2a2e',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  status: {
    fontSize: 13,
    color: '#9a9a9e',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeBlock: {
    backgroundColor: '#4c1d1d',
  },
  badgeMessage: {
    backgroundColor: '#1d3a4c',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  empty: {
    color: '#9a9a9e',
    textAlign: 'center',
    marginTop: 40,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  debugButton: {
    backgroundColor: '#1f1f23',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  debugButtonText: {
    color: '#9a9a9e',
    fontSize: 11,
  },
  debug: {
    color: '#5a5a5e',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 8,
  },
});

import { useEffect, useReducer } from 'react';
import { AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

function Row({ app, onPress }: { app: GatedApp; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconPlaceholder} />
      <View style={styles.rowText}>
        <Text style={styles.appName}>{app.appName}</Text>
        <Text style={styles.status}>{statusText(app)}</Text>
      </View>
      <View style={[styles.badge, app.mode === 'BLOCK' ? styles.badgeBlock : styles.badgeMessage]}>
        <Text style={styles.badgeText}>{app.mode}</Text>
      </View>
    </Pressable>
  );
}

// Recomputes "Xh Ym left" text on a 30s interval and on app resume, without a
// second-accurate countdown — see §9.2.
function useCountdownTick() {
  const [, tick] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const interval = setInterval(tick, 30000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        tick();
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
}

export default function HomeScreen({
  apps,
  loaded,
  onAdd,
  onSelectApp,
}: {
  apps: GatedApp[];
  loaded: boolean;
  onAdd: () => void;
  onSelectApp: (app: GatedApp) => void;
}) {
  useCountdownTick();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>AppGate</Text>
        <Pressable style={styles.fab} onPress={onAdd} hitSlop={8}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
      <FlatList
        data={apps}
        keyExtractor={item => item.packageName}
        renderItem={({ item }) => <Row app={item} onPress={() => onSelectApp(item)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loaded ? 'No apps gated yet. Tap + to gate your first app.' : ''}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0f',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3a6cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
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
});

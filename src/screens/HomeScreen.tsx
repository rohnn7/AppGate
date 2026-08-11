import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { GatedApp } from '../types';

const HARDCODED_APPS: GatedApp[] = [
  {
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    mode: 'BLOCK',
    blockUntilMillis: Date.now() + 2 * 60 * 60 * 1000 + 14 * 60 * 1000,
    createdAt: Date.now(),
  },
  {
    packageName: 'com.application.zomato',
    appName: 'Zomato',
    mode: 'MESSAGE',
    message: 'you have to reduce your weight, get over your taste addiction',
    createdAt: Date.now(),
  },
];

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

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AppGate</Text>
      <FlatList
        data={HARDCODED_APPS}
        keyExtractor={item => item.packageName}
        renderItem={({ item }) => <Row app={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No apps gated yet. Tap the add button to gate your first app.
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
});

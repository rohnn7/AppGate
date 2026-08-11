import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NativeAppGate from '../../specs/NativeAppGate';
import type { InstalledApp } from '../../specs/NativeAppGate';

export default function AppPickerScreen({
  excludePackageNames,
  onSelect,
  onCancel,
}: {
  excludePackageNames: Set<string>;
  onSelect: (app: InstalledApp) => void;
  onCancel: () => void;
}) {
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Called once and cached in state, per §9.3 — this is not cheap.
    NativeAppGate.getInstalledApps().then(result => {
      setApps([...result].sort((a, b) => a.appName.localeCompare(b.appName)));
    });
  }, []);

  const filtered = useMemo(() => {
    if (!apps) {
      return [];
    }
    const available = apps.filter(a => !excludePackageNames.has(a.packageName));
    const q = query.trim().toLowerCase();
    if (!q) {
      return available;
    }
    return available.filter(a => a.appName.toLowerCase().includes(q));
  }, [apps, excludePackageNames, query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          android_ripple={{ color: '#333', borderless: true }}
          style={({ pressed }) => pressed && styles.pressedText}>
          <Text style={styles.headerAction}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add app</Text>
        <View style={styles.headerSpacer} />
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search apps"
        placeholderTextColor="#6a6a6e"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      {apps === null ? (
        <ActivityIndicator style={styles.loading} color="#fff" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.packageName}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              android_ripple={{ color: '#333' }}
              onPress={() => onSelect(item)}>
              <Image source={{ uri: item.iconUri }} style={styles.icon} />
              <Text style={styles.appName}>{item.appName}</Text>
            </Pressable>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No matching apps</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1f1f23',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loading: {
    marginTop: 40,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  rowPressed: {
    backgroundColor: '#1a1a1d',
  },
  pressedText: {
    opacity: 0.5,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#2a2a2e',
  },
  appName: {
    color: '#fff',
    fontSize: 15,
  },
  empty: {
    color: '#9a9a9e',
    textAlign: 'center',
    marginTop: 40,
  },
});

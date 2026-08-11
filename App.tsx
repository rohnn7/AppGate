/**
 * AppGate
 *
 * @format
 */

import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { InstalledApp } from './specs/NativeAppGate';
import AddConfigureScreen from './src/screens/AddConfigureScreen';
import AppPickerScreen from './src/screens/AppPickerScreen';
import EditAppSheet from './src/screens/EditAppSheet';
import HomeScreen from './src/screens/HomeScreen';
import { useGatedApps } from './src/hooks/useGatedApps';
import type { GatedApp } from './src/types';

type Route =
  | { name: 'home' }
  | { name: 'picker' }
  | { name: 'configure'; app: InstalledApp }
  | { name: 'edit'; packageName: string };

function EditRoute({
  packageName,
  apps,
  actions,
  onClose,
}: {
  packageName: string;
  apps: GatedApp[];
  actions: Pick<ReturnType<typeof useGatedApps>, 'update' | 'remove' | 'rearm' | 'switchMode'>;
  onClose: () => void;
}) {
  const app = apps.find(a => a.packageName === packageName);

  useEffect(() => {
    if (!app) {
      onClose();
    }
  }, [app, onClose]);

  if (!app) {
    return null;
  }
  return <EditAppSheet app={app} actions={actions} onClose={onClose} />;
}

function App() {
  const gatedApps = useGatedApps();
  const [route, setRoute] = useState<Route>({ name: 'home' });

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {route.name === 'home' && (
        <HomeScreen
          apps={gatedApps.apps}
          loaded={gatedApps.loaded}
          onAdd={() => setRoute({ name: 'picker' })}
          onSelectApp={app => setRoute({ name: 'edit', packageName: app.packageName })}
        />
      )}
      {route.name === 'picker' && (
        <AppPickerScreen
          excludePackageNames={new Set(gatedApps.apps.map(a => a.packageName))}
          onCancel={() => setRoute({ name: 'home' })}
          onSelect={app => setRoute({ name: 'configure', app })}
        />
      )}
      {route.name === 'configure' && (
        <AddConfigureScreen
          app={route.app}
          onCancel={() => setRoute({ name: 'home' })}
          onSave={(gatedApp: GatedApp) => {
            gatedApps.add(gatedApp);
            setRoute({ name: 'home' });
          }}
        />
      )}
      {route.name === 'edit' && (
        <EditRoute
          packageName={route.packageName}
          apps={gatedApps.apps}
          actions={gatedApps}
          onClose={() => setRoute({ name: 'home' })}
        />
      )}
    </SafeAreaProvider>
  );
}

export default App;

import { useCallback, useEffect, useState } from 'react';
import NativeAppGate from '../../specs/NativeAppGate';
import type { GatedApp, Mode } from '../types';

function persist(apps: GatedApp[]) {
  NativeAppGate.saveConfig(JSON.stringify(apps));
}

function parseConfig(json: string): GatedApp[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useGatedApps() {
  const [apps, setApps] = useState<GatedApp[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setApps(parseConfig(NativeAppGate.loadConfig()));
    setLoaded(true);
  }, []);

  const add = useCallback((app: GatedApp) => {
    setApps(prev => {
      const next = [...prev.filter(a => a.packageName !== app.packageName), app];
      persist(next);
      return next;
    });
  }, []);

  const update = useCallback((app: GatedApp) => {
    setApps(prev => {
      const next = prev.map(a => (a.packageName === app.packageName ? app : a));
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((packageName: string) => {
    setApps(prev => {
      const next = prev.filter(a => a.packageName !== packageName);
      persist(next);
      return next;
    });
  }, []);

  const rearm = useCallback((packageName: string, durationMillis: number) => {
    setApps(prev => {
      const next = prev.map(a =>
        a.packageName === packageName
          ? { ...a, blockUntilMillis: Date.now() + durationMillis }
          : a,
      );
      persist(next);
      return next;
    });
  }, []);

  const switchMode = useCallback((packageName: string, mode: Mode) => {
    setApps(prev => {
      const next = prev.map(a => {
        if (a.packageName !== packageName) {
          return a;
        }
        return mode === 'BLOCK'
          ? { ...a, mode, message: undefined }
          : { ...a, mode, blockUntilMillis: undefined };
      });
      persist(next);
      return next;
    });
  }, []);

  return { apps, loaded, add, update, remove, rearm, switchMode };
}

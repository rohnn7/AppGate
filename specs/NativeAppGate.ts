import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface InstalledApp {
  packageName: string;
  appName: string;
  iconUri: string; // file:// URI, see CLAUDE.md §6
}

export interface Spec extends TurboModule {
  // config
  loadConfig(): string; // JSON string, "[]" if absent
  saveConfig(json: string): void; // writes file + refreshes native cache

  // permissions
  isAccessibilityEnabled(): boolean;
  canDrawOverlays(): boolean;
  openAccessibilitySettings(): void;
  openOverlaySettings(): void;
  openBatteryOptimizationSettings(): void;
  openAppInfoSettings(): void; // for the restricted-settings fix, trap 6

  // apps
  getInstalledApps(): Promise<InstalledApp[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAppGate');

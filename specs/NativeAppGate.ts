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

  // one-time setup acknowledgement (OEM autostart, self-certified — see setup gate)
  loadSetupAcknowledged(): boolean;
  saveSetupAcknowledged(acknowledged: boolean): void;

  // permissions
  isAccessibilityEnabled(): boolean;
  canDrawOverlays(): boolean;
  isBatteryOptimizationIgnored(): boolean;
  openAccessibilitySettings(): void;
  openOverlaySettings(): void;
  openBatteryOptimizationSettings(): void;
  openAppInfoSettings(): void; // for the restricted-settings fix, trap 6
  openAutostartSettings(): void; // OEM-specific (MIUI confirmed, others best-effort)
  getManufacturer(): string; // Build.MANUFACTURER, to tailor autostart guidance

  // apps
  getInstalledApps(): Promise<InstalledApp[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAppGate');

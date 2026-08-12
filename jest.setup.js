/* eslint-env jest */
jest.mock('./specs/NativeAppGate', () => ({
  __esModule: true,
  default: {
    loadConfig: jest.fn(() => '[]'),
    saveConfig: jest.fn(),
    loadSetupAcknowledged: jest.fn(() => false),
    saveSetupAcknowledged: jest.fn(),
    isAccessibilityEnabled: jest.fn(() => false),
    canDrawOverlays: jest.fn(() => false),
    isBatteryOptimizationIgnored: jest.fn(() => false),
    openAccessibilitySettings: jest.fn(),
    openOverlaySettings: jest.fn(),
    openBatteryOptimizationSettings: jest.fn(),
    openAppInfoSettings: jest.fn(),
    openAutostartSettings: jest.fn(),
    getManufacturer: jest.fn(() => 'unknown'),
    getInstalledApps: jest.fn(() => Promise.resolve([])),
  },
}));

/* eslint-env jest */
jest.mock('./specs/NativeAppGate', () => ({
  __esModule: true,
  default: {
    loadConfig: jest.fn(() => '[]'),
    saveConfig: jest.fn(),
    isAccessibilityEnabled: jest.fn(() => false),
    canDrawOverlays: jest.fn(() => false),
    openAccessibilitySettings: jest.fn(),
    openOverlaySettings: jest.fn(),
    openBatteryOptimizationSettings: jest.fn(),
    openAppInfoSettings: jest.fn(),
    getInstalledApps: jest.fn(() => Promise.resolve([])),
  },
}));

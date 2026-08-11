export type Mode = 'BLOCK' | 'MESSAGE';

export interface GatedApp {
  packageName: string;
  appName: string;
  mode: Mode;
  blockUntilMillis?: number;
  message?: string;
  createdAt: number;
}

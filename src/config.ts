import * as path from 'path';

export interface Config {
  port: number | string;
  savesDir: string;
  dataDir: string;
  claudeModel: string;
  claudeCmd: string;
  maxTurnHistory: number;
  autosaveInterval: number;
  logsDir: string;
  shipName: string;
  missionName: string;
  destinationSystem: string;
  launchYear: number;
  journeyYearsTotal: number;
  journeyYearsElapsed: number;
}

// Browser-safe: check if we're in Node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _isNode = typeof (globalThis as any).process !== 'undefined' && typeof (globalThis as any).process.env !== 'undefined';
const _dirname = _isNode ? __dirname : '';
const _env = _isNode ? process.env : {} as Record<string, string | undefined>;

const config: Config = {
  port: _env.PORT || 3000,
  savesDir: _isNode ? path.join(_dirname, '..', 'saves') : '',
  dataDir: _isNode ? path.join(_dirname, 'data') : '',
  claudeModel: 'haiku',
  claudeCmd: 'claude',
  maxTurnHistory: 20,
  autosaveInterval: 5,
  logsDir: _isNode ? path.join(_dirname, '..', 'logs') : '',
  shipName: 'ISV Kepler\'s Promise',
  missionName: 'TRANSIT-7',
  destinationSystem: '82 Eridani',
  launchYear: 2187,
  journeyYearsTotal: 42,
  journeyYearsElapsed: 19.3
};

export default config;

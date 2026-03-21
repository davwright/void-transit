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

const config: Config = {
  port: process.env.PORT || 3000,
  savesDir: path.join(__dirname, '..', 'saves'),
  dataDir: path.join(__dirname, 'data'),
  claudeModel: 'haiku',
  claudeCmd: 'claude',
  maxTurnHistory: 20,
  autosaveInterval: 5,
  logsDir: path.join(__dirname, '..', 'logs'),
  shipName: 'ISV Kepler\'s Promise',
  missionName: 'TRANSIT-7',
  destinationSystem: '82 Eridani',
  launchYear: 2187,
  journeyYearsTotal: 42,
  journeyYearsElapsed: 19.3
};

export default config;

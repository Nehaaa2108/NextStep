/**
 * Backend configuration options for Opportunity Radar.
 */
export interface ProviderConfig {
  defaultTimeoutMs: number;
  maxResultsDefault: number;
}

export interface AppConfig {
  environment: 'development' | 'production' | 'test';
  provider: ProviderConfig;
}

/**
 * Default fallback configuration.
 */
export const defaultConfig: AppConfig = {
  environment: (process.env.NODE_ENV as AppConfig['environment']) || 'development',
  provider: {
    defaultTimeoutMs: 30000,
    maxResultsDefault: 20,
  },
};

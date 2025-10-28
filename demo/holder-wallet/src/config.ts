/**
 * Configuration for the Holder Wallet
 */

export const config = {
  // Backend API URL
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5003',
  
  // App metadata
  appName: 'DID Wallet',
  appVersion: '1.0.0',
  
  // Feature flags
  features: {
    qrScanner: true,
    biometrics: false, // Future feature
    backup: false, // Future feature
  },
  
  // Default settings
  defaultSettings: {
    autoAcceptCredentials: false,
    showTechnicalDetails: false,
    theme: 'light' as 'light' | 'dark',
  },
};

export type AppConfig = typeof config;


export type QRType = 'url' | 'text' | 'wifi';

export type CenterContentType = 'none' | 'text' | 'logo';

export interface CenterContentConfig {
  type: CenterContentType;
  text: string;
  logoDataUrl: string | null;
}

export interface URLData {
  url: string;
}

export interface TextData {
  text: string;
}

export interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface QRStateData {
  type: QRType;
  url: URLData;
  text: TextData;
  wifi: WifiData;
}

export interface QROptions {
  margin: number;
  size: number;
  centerContent: CenterContentConfig;
}

export interface RecentQRItem {
  id: string;
  timestamp: number;
  type: QRType;
  title: string;
  rawPayload: string;
  stateData: QRStateData;
  options: QROptions;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

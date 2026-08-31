// TypeScript interfaces for SAGAR-MITRA

export interface PFZZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  species: string;
  chlorophyll: string;
  sst?: string;
  wave_height: number;
  wind_kmh?: number;
  status: 'OPTIMAL' | 'HAZARDOUS';
  polygon?: number[][];
}

export interface Recommendation {
  zone: PFZZone;
  distance_km: number;
  distance_nm: number;
  bearing_deg: number;
}

export type Language = 'ta' | 'te' | 'hi' | 'ml' | 'bn';

export interface CaptainProfile {
  name: string;
  phone: string;
  language: Language;
  harbor_name: string;
  lat: number;
  lon: number;
}

export interface AppSession {
  captain: CaptainProfile;
  recommendation: Recommendation;
  registeredAt: string;
}

export interface FriendEntry {
  id: string;
  name: string;
  phone: string;
  language: Language;
  harbor: string;
  targetZoneId: string;
  isKeypad: boolean;
  status?: string;
}

export interface SMSLog {
  to: string;
  message: string;
  is_flash: boolean;
  type: string;
  timestamp: string;
  status: string;
}

export interface GpsCoords {
  lat: number;
  lon: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export type AppView = 'REGISTER' | 'HUD' | 'GUARDIAN' | 'WEATHER' | 'MAP';

export type Scene = "commute" | "outing" | "sport";
export type Category =
  "top" | "bottom" | "shoes" | "outer" | "dress" | "accessory";
export interface Item {
  id: string;
  name: string;
  category: Category;
  image: string;
  color: string;
  hex: string;
  material: string | null;
  fit: string;
  seasons: string[];
  scenes: Scene[];
  styles: string[];
  minTemp: number;
  maxTemp: number;
  rainSafe: boolean;
  windproof: boolean;
  available: boolean;
  notes: string;
  compatibleWith: string[];
}
export interface Outfit {
  id: string;
  name: string;
  subtitle: string;
  scenes: Scene[];
  itemIds: string[];
  minTemp: number;
  maxTemp: number;
  rainSafe: boolean;
  windproof: boolean;
  description: string;
  cover?: string;
  swaps: { from: string; to: string; reason: string }[];
}
export interface Rules {
  jacketBelow: number;
  rainProbability: number;
  rainMm: number;
  windyKmh: number;
  temperatureSwing: number;
}
export interface Wardrobe {
  version: number;
  example: boolean;
  items: Item[];
  outfits: Outfit[];
  rules: Rules;
}
export interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  country?: string;
}
export interface WeatherDay {
  date: string;
  min: number;
  max: number;
  feelsMin: number;
  feelsMax: number;
  code: number;
  rainProbability: number;
  rainMm: number;
  wind: number;
}
export interface Forecast {
  city: City;
  fetchedAt: number;
  days: WeatherDay[];
}
export interface ProfilePhoto {
  id: string;
  title: string;
  description: string;
  image: string | null;
}
export interface ProfileDocument {
  id: string;
  title: string;
  description: string;
  path: string;
  format: "markdown" | "pdf";
  updatedAt: string | null;
}
export interface PersonalProfile {
  version: 1;
  displayName: string | null;
  heightCm: number | null;
  weightKg: number | null;
  sizes: { top: string | null; bottom: string | null; shoes: string | null };
  measurements: {
    shouldersCm: number | null;
    chestCm: number | null;
    waistCm: number | null;
    hipsCm: number | null;
  };
  bodyNotes: string | null;
  preferences: {
    styleWords: string[];
    favoriteColors: string[];
    avoidColors: string[];
    notes: string | null;
  };
  photos: ProfilePhoto[];
  documents: ProfileDocument[];
  updatedAt: string | null;
}

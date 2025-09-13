/**
 * Geodesy Utilities for Directional Drilling
 * Coordinate system conversions, UTM projections, and spatial calculations
 */

import proj4 from 'proj4';

// Common coordinate reference systems for oil & gas
export const CRS_DEFINITIONS = {
  'WGS84': '+proj=longlat +datum=WGS84 +no_defs',
  'NAD83': '+proj=longlat +datum=NAD83 +no_defs',
  'NAD27': '+proj=longlat +datum=NAD27 +no_defs',
  'UTM_10N_NAD83': '+proj=utm +zone=10 +datum=NAD83 +units=m +no_defs',
  'UTM_11N_NAD83': '+proj=utm +zone=11 +datum=NAD83 +units=m +no_defs',
  'UTM_12N_NAD83': '+proj=utm +zone=12 +datum=NAD83 +units=m +no_defs',
  'UTM_13N_NAD83': '+proj=utm +zone=13 +datum=NAD83 +units=m +no_defs',
  'UTM_14N_NAD83': '+proj=utm +zone=14 +datum=NAD83 +units=m +no_defs',
  'STATE_PLANE_TX_C_NAD83': '+proj=lcc +lat_0=31.6666666666667 +lat_1=32.1333333333333 +lat_2=33.9666666666667 +lon_0=-98.5 +x_0=600000 +y_0=2000000 +datum=NAD83 +units=m +no_defs'
} as const;

export type SupportedCRS = keyof typeof CRS_DEFINITIONS;

export interface Coordinates {
  x: number;
  y: number;
}

export interface GeographicCoordinates {
  latitude: number;
  longitude: number;
}

export interface UTMCoordinates extends Coordinates {
  zone: number;
  hemisphere: 'N' | 'S';
}

export interface ProjectedCoordinates extends Coordinates {
  crs: string;
}

/**
 * Transform coordinates between different CRS
 */
export function transformCoordinates(
  coords: Coordinates,
  fromCRS: string,
  toCRS: string
): Coordinates {
  try {
    const fromProj = CRS_DEFINITIONS[fromCRS as SupportedCRS] || fromCRS;
    const toProj = CRS_DEFINITIONS[toCRS as SupportedCRS] || toCRS;
    
    const result = proj4(fromProj, toProj, [coords.x, coords.y]);
    
    return {
      x: result[0],
      y: result[1]
    };
  } catch (error) {
    throw new Error(`Failed to transform coordinates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert geographic coordinates to UTM
 */
export function latLonToUTM(lat: number, lon: number): UTMCoordinates {
  // Clamp UTM zone to valid range [1,60]
  const zone = Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1));
  const hemisphere: 'N' | 'S' = lat >= 0 ? 'N' : 'S';
  
  // Add +south parameter for southern hemisphere
  const utmProj = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere === 'S' ? ' +south' : ''}`;
  const wgs84 = CRS_DEFINITIONS.WGS84;
  
  try {
    const result = proj4(wgs84, utmProj, [lon, lat]);
    
    return {
      x: result[0],
      y: result[1],
      zone,
      hemisphere
    };
  } catch (error) {
    throw new Error(`Failed to convert to UTM: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert UTM coordinates to geographic
 */
export function utmToLatLon(utm: UTMCoordinates): GeographicCoordinates {
  // Add +south parameter for southern hemisphere
  const utmProj = `+proj=utm +zone=${utm.zone} +datum=WGS84 +units=m +no_defs${utm.hemisphere === 'S' ? ' +south' : ''}`;
  const wgs84 = CRS_DEFINITIONS.WGS84;
  
  try {
    const result = proj4(utmProj, wgs84, [utm.x, utm.y]);
    
    return {
      longitude: result[0],
      latitude: result[1]
    };
  } catch (error) {
    throw new Error(`Failed to convert from UTM: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate distance between two geographic points using Haversine formula
 */
export function calculateDistance(
  point1: GeographicCoordinates,
  point2: GeographicCoordinates
): number {
  const R = 6371000; // Earth's radius in meters
  
  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;
  
  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
           Math.cos(lat1Rad) * Math.cos(lat2Rad) *
           Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate bearing between two geographic points
 */
export function calculateBearing(
  from: GeographicCoordinates,
  to: GeographicCoordinates
): number {
  const lat1Rad = (from.latitude * Math.PI) / 180;
  const lat2Rad = (to.latitude * Math.PI) / 180;
  const deltaLonRad = ((to.longitude - from.longitude) * Math.PI) / 180;
  
  const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);
  
  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (bearingRad * 180) / Math.PI;
  
  return (bearingDeg + 360) % 360;
}

/**
 * Determine UTM zone from longitude
 */
export function getUTMZone(longitude: number): number {
  // Clamp UTM zone to valid range [1,60]
  return Math.min(60, Math.max(1, Math.floor((longitude + 180) / 6) + 1));
}

/**
 * Get list of available CRS definitions
 */
export function getAvailableCRS(): Array<{ key: SupportedCRS; name: string; definition: string }> {
  return Object.entries(CRS_DEFINITIONS).map(([key, definition]) => ({
    key: key as SupportedCRS,
    name: key.replace(/_/g, ' '),
    definition
  }));
}

/**
 * Validate coordinates are within reasonable bounds
 */
export function validateCoordinates(coords: GeographicCoordinates): boolean {
  return coords.latitude >= -90 && coords.latitude <= 90 &&
         coords.longitude >= -180 && coords.longitude <= 180;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(
  coords: GeographicCoordinates,
  format: 'decimal' | 'dms' = 'decimal',
  precision: number = 6
): string {
  if (format === 'decimal') {
    return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
  }
  
  // Format as Degrees, Minutes, Seconds
  const formatDMS = (decimal: number, isLatitude: boolean): string => {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees) * 60 - minutes) * 60;
    
    const direction = decimal >= 0 
      ? (isLatitude ? 'N' : 'E')
      : (isLatitude ? 'S' : 'W');
    
    return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
  };
  
  return `${formatDMS(coords.latitude, true)}, ${formatDMS(coords.longitude, false)}`;
}

/**
 * Validate UTM coordinate transformations with round-trip testing
 */
export function validateUTMRoundTrip(coords: GeographicCoordinates, tolerance: number = 1e-6): {
  isValid: boolean;
  errors: string[];
  utm: UTMCoordinates | null;
  roundTrip: GeographicCoordinates | null;
  deltaLat: number;
  deltaLon: number;
} {
  const errors: string[] = [];
  
  if (!validateCoordinates(coords)) {
    return {
      isValid: false,
      errors: ['Invalid input coordinates'],
      utm: null,
      roundTrip: null,
      deltaLat: NaN,
      deltaLon: NaN
    };
  }
  
  try {
    // Forward transformation: lat/lon -> UTM
    const utm = latLonToUTM(coords.latitude, coords.longitude);
    
    // Backward transformation: UTM -> lat/lon
    const roundTrip = utmToLatLon(utm);
    
    // Calculate deltas
    const deltaLat = Math.abs(roundTrip.latitude - coords.latitude);
    const deltaLon = Math.abs(roundTrip.longitude - coords.longitude);
    
    // Check tolerance
    const isValid = deltaLat <= tolerance && deltaLon <= tolerance;
    
    if (!isValid) {
      errors.push(`Round-trip error exceeds tolerance: ΔLat=${deltaLat.toExponential(3)}, ΔLon=${deltaLon.toExponential(3)}`);
    }
    
    // Additional validations
    if (utm.zone < 1 || utm.zone > 60) {
      errors.push(`Invalid UTM zone: ${utm.zone}`);
    }
    
    if (utm.hemisphere !== (coords.latitude >= 0 ? 'N' : 'S')) {
      errors.push(`Incorrect hemisphere: expected ${coords.latitude >= 0 ? 'N' : 'S'}, got ${utm.hemisphere}`);
    }
    
    return {
      isValid: isValid && errors.length === 0,
      errors,
      utm,
      roundTrip,
      deltaLat,
      deltaLon
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      utm: null,
      roundTrip: null,
      deltaLat: NaN,
      deltaLon: NaN
    };
  }
}

/**
 * Test UTM transformations for critical drilling regions
 */
export function testUTMTransformations(): Array<{
  location: string;
  coordinates: GeographicCoordinates;
  result: ReturnType<typeof validateUTMRoundTrip>;
}> {
  const testLocations = [
    { name: 'Permian Basin (US)', lat: 32.0, lon: -102.0 },
    { name: 'Bakken/Williston (US)', lat: 48.0, lon: -103.0 },
    { name: 'North Sea (Norway)', lat: 60.0, lon: 2.0 },
    { name: 'Campos Basin (Brazil)', lat: -22.0, lon: -40.0 },
    { name: 'Bass Strait (Australia)', lat: -39.0, lon: 147.0 },
    { name: 'Santos Basin (Brazil)', lat: -25.0, lon: -44.0 },
    { name: 'Edge Case: Zone 1', lat: 0.0, lon: -177.0 },
    { name: 'Edge Case: Zone 60', lat: 0.0, lon: 177.0 },
    { name: 'Edge Case: Equator', lat: 0.0, lon: 0.0 },
    { name: 'Edge Case: High Latitude North', lat: 80.0, lon: 0.0 },
    { name: 'Edge Case: High Latitude South', lat: -80.0, lon: 0.0 }
  ];
  
  return testLocations.map(loc => ({
    location: loc.name,
    coordinates: { latitude: loc.lat, longitude: loc.lon },
    result: validateUTMRoundTrip({ latitude: loc.lat, longitude: loc.lon })
  }));
}
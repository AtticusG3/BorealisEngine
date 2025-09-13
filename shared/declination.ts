/**
 * Magnetic Declination Calculations for Directional Drilling
 * Computes magnetic declination based on location and date using the World Magnetic Model (WMM)
 */

export interface DeclinationRequest {
  latitude: number;    // degrees
  longitude: number;   // degrees
  date: Date;         // calculation date
  elevation?: number;  // meters above sea level (optional)
}

export interface DeclinationResult {
  declination: number;     // magnetic declination in degrees (positive = east, negative = west)
  inclination: number;     // magnetic inclination/dip in degrees
  totalIntensity: number;  // total magnetic field intensity in nT
  horizontalIntensity: number; // horizontal intensity in nT
  verticalIntensity: number;   // vertical intensity in nT
  calculationDate: Date;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  model: string;           // which model was used
  source: string;          // calculation method/source
}

/**
 * Simplified magnetic declination calculation using approximation model
 * Based on IGRF coefficients and spherical harmonic expansion
 * Note: For production use, consider integrating with NOAA/NCEI web services
 */
export function calculateMagneticDeclination(request: DeclinationRequest): DeclinationResult {
  const { latitude, longitude, date, elevation = 0 } = request;
  
  // Convert to radians
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;
  
  // Calculate decimal year
  const year = date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearProgress = (date.getTime() - yearStart.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const decimalYear = year + yearProgress;
  
  // Simplified calculation using dipole model with secular variation
  // This is a basic approximation - production systems should use full IGRF/WMM
  
  // Magnetic dipole coordinates (approximate)
  const dipoleLatRad = (79.74 * Math.PI) / 180;  // North magnetic pole latitude
  const dipoleLonRad = (-71.8 * Math.PI) / 180;  // North magnetic pole longitude
  
  // Calculate magnetic coordinates
  const cosMagLat = Math.cos(dipoleLatRad) * Math.cos(latRad) * Math.cos(lonRad - dipoleLonRad) + 
                    Math.sin(dipoleLatRad) * Math.sin(latRad);
  const magLatRad = Math.asin(cosMagLat);
  
  const sinMagLon = Math.sin(lonRad - dipoleLonRad) * Math.cos(latRad) / Math.cos(magLatRad);
  const cosMagLon = (Math.sin(latRad) - Math.sin(dipoleLatRad) * Math.sin(magLatRad)) / 
                    (Math.cos(dipoleLatRad) * Math.cos(magLatRad));
  const magLonRad = Math.atan2(sinMagLon, cosMagLon);
  
  // Basic declination calculation
  // This uses simplified coefficients - real WMM uses hundreds of terms
  const epochYear = 2020;
  const yearDiff = decimalYear - epochYear;
  
  // Main field components (simplified)
  let declination = Math.atan2(
    Math.sin(magLonRad) * Math.cos(magLatRad),
    Math.cos(magLatRad) * Math.cos(dipoleLatRad) * Math.cos(magLonRad) + 
    Math.sin(magLatRad) * Math.sin(dipoleLatRad)
  ) * (180 / Math.PI);
  
  // Apply secular variation (approximate)
  const secularChange = getSecularVariation(latitude, longitude);
  declination += secularChange * yearDiff;
  
  // Altitude correction (small effect)
  const altitudeCorrection = (elevation / 1000) * 0.001; // very approximate
  declination += altitudeCorrection;
  
  // Calculate other magnetic elements (approximate)
  const inclination = Math.atan2(2 * Math.sin(magLatRad), Math.cos(magLatRad)) * (180 / Math.PI);
  
  // Field intensities (approximate values in nanoTeslas)
  const baseIntensity = 50000; // approximate global average
  const totalIntensity = baseIntensity * (1 + Math.sin(magLatRad));
  const horizontalIntensity = totalIntensity * Math.cos(inclination * Math.PI / 180);
  const verticalIntensity = totalIntensity * Math.sin(inclination * Math.PI / 180);
  
  return {
    declination,
    inclination,
    totalIntensity,
    horizontalIntensity,
    verticalIntensity,
    calculationDate: new Date(date),
    location: {
      latitude,
      longitude,
      elevation
    },
    model: 'Simplified Dipole Model ⚠️ LOW ACCURACY',
    source: 'Internal Calculation - Use NOAA/NCEI for production'
  };
}

/**
 * Get approximate secular variation for location
 * In production, this would use actual IGRF coefficients
 */
function getSecularVariation(latitude: number, longitude: number): number {
  // Very simplified regional secular variation
  // Real implementation would use IGRF model coefficients
  
  if (latitude > 60) {
    return -0.1; // Arctic region
  } else if (latitude > 30) {
    return -0.05; // Northern temperate
  } else if (latitude > -30) {
    return 0.02; // Tropical/equatorial
  } else {
    return 0.05; // Southern regions
  }
}

/**
 * Get magnetic declination from cached/lookup table for common drilling regions
 * This provides faster access for frequently used locations
 */
export function getDeclinationFromLookup(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): DeclinationResult | null {
  // Expanded oil & gas regions with approximate declinations
  const regions = [
    // North American Shale Plays
    {
      name: 'Permian Basin',
      latRange: [31, 33],
      lonRange: [-104, -101],
      baseDeclination: 8.5,
      year: 2020
    },
    {
      name: 'Bakken/Williston',
      latRange: [47, 49],
      lonRange: [-104, -102],
      baseDeclination: 12.8,
      year: 2020
    },
    {
      name: 'Eagle Ford',
      latRange: [28, 30],
      lonRange: [-100, -97],
      baseDeclination: 6.2,
      year: 2020
    },
    {
      name: 'Marcellus/Appalachian',
      latRange: [39, 42],
      lonRange: [-82, -77],
      baseDeclination: -9.5,
      year: 2020
    },
    {
      name: 'Haynesville',
      latRange: [31.5, 33.5],
      lonRange: [-94.5, -93.5],
      baseDeclination: 3.8,
      year: 2020
    },
    {
      name: 'Barnett Shale',
      latRange: [32, 33.5],
      lonRange: [-98, -96.5],
      baseDeclination: 5.1,
      year: 2020
    },
    {
      name: 'SCOOP/STACK (Oklahoma)',
      latRange: [35, 36.5],
      lonRange: [-98.5, -96.5],
      baseDeclination: 4.2,
      year: 2020
    },
    {
      name: 'Utica Shale',
      latRange: [39.5, 41],
      lonRange: [-82, -80],
      baseDeclination: -8.8,
      year: 2020
    },
    {
      name: 'Niobrara',
      latRange: [40, 41.5],
      lonRange: [-105, -102.5],
      baseDeclination: 9.2,
      year: 2020
    },
    {
      name: 'Duvernay (Alberta)',
      latRange: [53, 55],
      lonRange: [-115, -112],
      baseDeclination: 18.5,
      year: 2020
    },
    {
      name: 'Montney (BC/Alberta)',
      latRange: [55, 58],
      lonRange: [-123, -118],
      baseDeclination: 20.8,
      year: 2020
    },
    // International Regions
    {
      name: 'North Sea (Norway)',
      latRange: [58, 62],
      lonRange: [1, 5],
      baseDeclination: 1.2,
      year: 2020
    },
    {
      name: 'North Sea (UK)',
      latRange: [55, 60],
      lonRange: [-1, 3],
      baseDeclination: 0.8,
      year: 2020
    },
    {
      name: 'Vaca Muerta (Argentina)',
      latRange: [-40, -36],
      lonRange: [-70, -68],
      baseDeclination: 2.1,
      year: 2020
    },
    {
      name: 'Santos Basin (Brazil)',
      latRange: [-27, -23],
      lonRange: [-46, -42],
      baseDeclination: -21.5,
      year: 2020
    },
    {
      name: 'Campos Basin (Brazil)',
      latRange: [-23, -20],
      lonRange: [-41, -39],
      baseDeclination: -22.8,
      year: 2020
    },
    {
      name: 'Bass Strait (Australia)',
      latRange: [-40, -38],
      lonRange: [146, 149],
      baseDeclination: 11.5,
      year: 2020
    },
    {
      name: 'Cooper Basin (Australia)',
      latRange: [-28, -26],
      lonRange: [140, 142],
      baseDeclination: 8.2,
      year: 2020
    }
  ];
  
  for (const region of regions) {
    if (latitude >= region.latRange[0] && latitude <= region.latRange[1] &&
        longitude >= region.lonRange[0] && longitude <= region.lonRange[1]) {
      
      const yearDiff = date.getFullYear() - region.year;
      const secularChange = getSecularVariation(latitude, longitude);
      const declination = region.baseDeclination + (secularChange * yearDiff);
      
      return {
        declination,
        inclination: calculateInclination(latitude),
        totalIntensity: 50000,
        horizontalIntensity: 48000,
        verticalIntensity: 15000,
        calculationDate: new Date(date),
        location: { latitude, longitude, elevation: 0 },
        model: `${region.name} Lookup Table (±1-2°)`,
        source: 'Regional Cache - Verify with NOAA/NCEI'
      };
    }
  }
  
  return null; // No cached value found
}

/**
 * Approximate magnetic inclination calculation
 */
function calculateInclination(latitude: number): number {
  // Simplified inclination based on magnetic latitude
  const latRad = (latitude * Math.PI) / 180;
  return Math.atan2(2 * Math.sin(latRad), Math.cos(latRad)) * (180 / Math.PI);
}

/**
 * Format declination for display
 */
export function formatDeclination(
  declination: number,
  format: 'decimal' | 'dms' | 'short' = 'decimal',
  precision: number = 2
): string {
  if (format === 'decimal') {
    return `${declination.toFixed(precision)}°`;
  }
  
  if (format === 'short') {
    const direction = declination >= 0 ? 'E' : 'W';
    return `${Math.abs(declination).toFixed(precision)}°${direction}`;
  }
  
  // DMS format
  const abs = Math.abs(declination);
  const degrees = Math.floor(abs);
  const minutes = Math.floor((abs - degrees) * 60);
  const seconds = ((abs - degrees) * 60 - minutes) * 60;
  const direction = declination >= 0 ? 'E' : 'W';
  
  return `${degrees}°${minutes}'${seconds.toFixed(1)}"${direction}`;
}

/**
 * Get declination source recommendations
 */
export function getDeclinationSources(): Array<{
  name: string;
  accuracy: string;
  url: string;
  description: string;
}> {
  return [
    {
      name: 'NOAA/NCEI Magnetic Declination Calculator',
      accuracy: 'High (±0.2°)',
      url: 'https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml',
      description: 'Official US government calculator using current WMM/IGRF models'
    },
    {
      name: 'BGS Geomagnetic Calculator',
      accuracy: 'High (±0.2°)',
      url: 'https://geomag.bgs.ac.uk/data_service/models_compass/wmm_calc.html',
      description: 'British Geological Survey calculator with WMM model'
    },
    {
      name: 'Survey Software Integration',
      accuracy: 'High',
      url: '',
      description: 'Import directly from survey planning software or MWD systems'
    },
    {
      name: 'Manual Field Measurement',
      accuracy: 'High (±0.1°)',
      url: '',
      description: 'Direct measurement using gyroscopic or solar observations'
    }
  ];
}

/**
 * Validate declination input parameters
 */
export function validateDeclinationRequest(request: DeclinationRequest): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate latitude
  if (request.latitude < -90 || request.latitude > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }
  
  // Validate longitude
  if (request.longitude < -180 || request.longitude > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }
  
  // Validate date
  const now = new Date();
  const minDate = new Date(1900, 0, 1);
  const maxDate = new Date(now.getFullYear() + 5, 11, 31);
  
  if (request.date < minDate || request.date > maxDate) {
    errors.push(`Date must be between ${minDate.getFullYear()} and ${maxDate.getFullYear()}`);
  }
  
  // Warnings for accuracy
  if (request.date.getFullYear() < 2015) {
    warnings.push('Declination accuracy decreases for dates before 2015');
  }
  
  if (request.date > now) {
    warnings.push('Future declination values are predictions and less accurate');
  }
  
  if (Math.abs(request.latitude) > 75) {
    warnings.push('Declination calculations are less accurate near the magnetic poles');
  }
  
  // Enhanced accuracy warnings for the simplified model
  warnings.push('⚠️  SIMPLIFIED MODEL - Accuracy: ±3-5° (production should use NOAA/NCEI WMM)');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate declination results against known reference locations
 */
export function validateDeclinationAgainstReferences(
  result: DeclinationResult,
  tolerance: number = 5.0
): {
  isValid: boolean;
  warnings: string[];
  referenceComparison: {
    location: string;
    expectedDeclination: number;
    calculatedDeclination: number;
    difference: number;
    withinTolerance: boolean;
  } | null;
} {
  const warnings: string[] = [];
  
  // Known reference locations with well-established declination values (2020 epoch)
  const referenceLocations = [
    {
      name: 'Geographic North Pole',
      lat: 90.0,
      lon: 0.0,
      expectedDeclination: 0.0, // By definition
      tolerance: 360 // Special case - any value is acceptable at pole
    },
    {
      name: 'Magnetic North Pole (approx)',
      lat: 86.5,
      lon: -164.0,
      expectedDeclination: 0.0,
      tolerance: 10.0
    },
    {
      name: 'Denver, Colorado',
      lat: 39.7392,
      lon: -104.9903,
      expectedDeclination: 8.23,
      tolerance: 2.0
    },
    {
      name: 'London, UK',
      lat: 51.5074,
      lon: -0.1278,
      expectedDeclination: 0.08,
      tolerance: 2.0
    },
    {
      name: 'Sydney, Australia',
      lat: -33.8688,
      lon: 151.2093,
      expectedDeclination: 12.95,
      tolerance: 2.0
    },
    {
      name: 'Anchorage, Alaska',
      lat: 61.2181,
      lon: -149.9003,
      expectedDeclination: 17.85,
      tolerance: 3.0
    },
    {
      name: 'Singapore',
      lat: 1.3521,
      lon: 103.8198,
      expectedDeclination: 0.15,
      tolerance: 2.0
    },
    {
      name: 'Cape Town, South Africa',
      lat: -33.9249,
      lon: 18.4241,
      expectedDeclination: -25.63,
      tolerance: 2.0
    }
  ];
  
  // Find the closest reference location
  let closestRef = null;
  let minDistance = Infinity;
  
  for (const ref of referenceLocations) {
    const distance = Math.sqrt(
      Math.pow(result.location.latitude - ref.lat, 2) + 
      Math.pow(result.location.longitude - ref.lon, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestRef = ref;
    }
  }
  
  let referenceComparison = null;
  let isValid = true;
  
  // Only compare if we're within 5 degrees of a reference location
  if (closestRef && minDistance < 5.0) {
    const difference = Math.abs(result.declination - closestRef.expectedDeclination);
    const withinTolerance = difference <= Math.max(closestRef.tolerance, tolerance);
    
    referenceComparison = {
      location: closestRef.name,
      expectedDeclination: closestRef.expectedDeclination,
      calculatedDeclination: result.declination,
      difference,
      withinTolerance
    };
    
    if (!withinTolerance) {
      isValid = false;
      warnings.push(`Large deviation from reference: ${difference.toFixed(2)}° difference from ${closestRef.name} (expected: ${closestRef.expectedDeclination}°)`);
    } else if (difference > tolerance / 2) {
      warnings.push(`Moderate deviation from reference: ${difference.toFixed(2)}° difference from ${closestRef.name}`);
    }
  }
  
  // General validation warnings
  if (Math.abs(result.declination) > 45) {
    warnings.push('Very high declination value - verify against authoritative sources');
  }
  
  if (result.source.includes('Internal Calculation')) {
    warnings.push('Result from simplified model - consider using NOAA/NCEI for critical applications');
  }
  
  return {
    isValid,
    warnings,
    referenceComparison
  };
}
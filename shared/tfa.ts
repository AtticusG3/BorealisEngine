/**
 * Total Flow Area (TFA) Calculations for Drill Bits
 * Used in hydraulics calculations for drilling operations
 */

export interface BitNozzle {
  diameter: number; // in 32nds of an inch
  count?: number;   // number of nozzles of this size (default 1)
}

export interface BitConfiguration {
  nozzles: BitNozzle[];
  manufacturer?: string;
  model?: string;
}

export interface TFAResult {
  totalFlowArea: number;  // in square inches
  flowAreaMM2: number;   // in square millimeters
  nozzlesSummary: string; // e.g., "3x12, 2x14"
  individualAreas: Array<{
    diameter: number;
    count: number;
    areaPerNozzle: number;
    totalArea: number;
  }>;
}

/**
 * Calculate Total Flow Area from nozzle configuration
 */
export function calculateTFA(config: BitConfiguration): TFAResult {
  let totalFlowArea = 0;
  const individualAreas: TFAResult['individualAreas'] = [];
  const nozzleSummary: string[] = [];
  
  for (const nozzle of config.nozzles) {
    const count = nozzle.count || 1;
    
    // Convert from 32nds to inches
    const diameterInches = nozzle.diameter / 32;
    
    // Calculate area for one nozzle: π × (d/2)²
    const areaPerNozzle = Math.PI * Math.pow(diameterInches / 2, 2);
    
    // Total area for this nozzle size
    const totalAreaForSize = areaPerNozzle * count;
    
    totalFlowArea += totalAreaForSize;
    
    individualAreas.push({
      diameter: nozzle.diameter,
      count,
      areaPerNozzle,
      totalArea: totalAreaForSize
    });
    
    // Add to summary string
    if (count === 1) {
      nozzleSummary.push(nozzle.diameter.toString());
    } else {
      nozzleSummary.push(`${count}x${nozzle.diameter}`);
    }
  }
  
  // Convert to mm²
  const flowAreaMM2 = totalFlowArea * 645.16; // 1 in² = 645.16 mm²
  
  return {
    totalFlowArea,
    flowAreaMM2,
    nozzlesSummary: nozzleSummary.join(', '),
    individualAreas
  };
}

/**
 * Parse nozzle configuration from comma-separated string
 * Examples: "12,14,16" or "3x12,2x14,16"
 */
export function parseNozzleString(nozzleString: string): BitConfiguration {
  const nozzles: BitNozzle[] = [];
  
  if (!nozzleString?.trim()) {
    return { nozzles };
  }
  
  const parts = nozzleString.split(',').map(s => s.trim()).filter(Boolean);
  
  for (const part of parts) {
    // Check for pattern like "3x12" (count x diameter)
    const match = part.match(/^(\d+)x(\d+)$/);
    
    if (match) {
      const count = parseInt(match[1]);
      const diameter = parseInt(match[2]);
      
      if (!isNaN(count) && !isNaN(diameter) && count > 0 && diameter > 0) {
        nozzles.push({ diameter, count });
      }
    } else {
      // Simple diameter like "12"
      const diameter = parseInt(part);
      
      if (!isNaN(diameter) && diameter > 0) {
        nozzles.push({ diameter, count: 1 });
      }
    }
  }
  
  return { nozzles };
}

/**
 * Format nozzle configuration as string
 */
export function formatNozzleString(config: BitConfiguration): string {
  return config.nozzles
    .map(n => n.count === 1 ? n.diameter.toString() : `${n.count}x${n.diameter}`)
    .join(', ');
}

/**
 * Get hydraulic velocity through nozzles
 */
export function calculateNozzleVelocity(
  flowRate: number, // gallons per minute
  tfa: number       // total flow area in square inches
): number {
  if (tfa <= 0) return 0;
  
  // Convert GPM to cubic inches per minute
  const flowRateInCubes = flowRate * 231; // 1 gallon = 231 cubic inches
  
  // Velocity in inches per minute
  const velocityIPM = flowRateInCubes / tfa;
  
  // Convert to feet per second
  const velocityFPS = velocityIPM / (12 * 60);
  
  return velocityFPS;
}

/**
 * Calculate jet impact force
 */
export function calculateJetImpact(
  flowRate: number, // gallons per minute
  tfa: number,      // total flow area in square inches
  fluidDensity: number = 8.33 // pounds per gallon (water = 8.33)
): number {
  // Input validation and NaN guards
  if (!isFinite(flowRate) || !isFinite(tfa) || !isFinite(fluidDensity)) {
    return NaN;
  }
  
  if (flowRate <= 0 || tfa <= 0 || fluidDensity <= 0) {
    return 0;
  }
  
  const velocity = calculateNozzleVelocity(flowRate, tfa);
  
  if (!isFinite(velocity) || velocity <= 0) {
    return 0;
  }
  
  // Convert flow rate to cubic feet per second
  const flowRateCFS = (flowRate * 231) / (12 * 12 * 12 * 60);
  
  // Convert fluid density from lb/gal to slug/ft³
  // Formula: ρ_slug_per_ft³ = (ρ_lb_per_gal × 7.48052) / 32.174
  // Where: 7.48052 = gal/ft³, 32.174 = lbm/slug conversion
  const fluidDensitySlugFt3 = (fluidDensity * 7.48052) / 32.174;
  
  // Jet impact force using momentum equation: F = ρ * Q * V
  // Where: F = force (lb), ρ = density (slug/ft³), Q = flow rate (ft³/s), V = velocity (ft/s)
  const impactForce = fluidDensitySlugFt3 * flowRateCFS * velocity;
  
  return isFinite(impactForce) ? impactForce : 0;
}

/**
 * Get common nozzle sizes for reference
 */
export function getCommonNozzleSizes(): Array<{ size: number; description: string }> {
  return [
    { size: 8, description: '8/32" (0.25")' },
    { size: 9, description: '9/32" (0.28")' },
    { size: 10, description: '10/32" (0.31")' },
    { size: 11, description: '11/32" (0.34")' },
    { size: 12, description: '12/32" (0.38")' },
    { size: 13, description: '13/32" (0.41")' },
    { size: 14, description: '14/32" (0.44")' },
    { size: 15, description: '15/32" (0.47")' },
    { size: 16, description: '16/32" (0.50")' },
    { size: 17, description: '17/32" (0.53")' },
    { size: 18, description: '18/32" (0.56")' },
    { size: 19, description: '19/32" (0.59")' },
    { size: 20, description: '20/32" (0.63")' }
  ];
}

/**
 * Validate nozzle configuration
 */
export function validateNozzleConfig(config: BitConfiguration): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (config.nozzles.length === 0) {
    errors.push('At least one nozzle must be specified');
    return { isValid: false, errors, warnings };
  }
  
  // Check each nozzle
  for (const nozzle of config.nozzles) {
    if (!isFinite(nozzle.diameter) || nozzle.diameter <= 0 || nozzle.diameter > 32) {
      errors.push(`Invalid nozzle diameter: ${nozzle.diameter}/32"`);
    }
    
    if (nozzle.count !== undefined && (!isFinite(nozzle.count) || nozzle.count <= 0)) {
      errors.push(`Invalid nozzle count: ${nozzle.count}`);
    }
    
    // Common warnings
    if (nozzle.diameter < 8) {
      warnings.push(`Small nozzle size ${nozzle.diameter}/32" may cause plugging`);
    }
    
    if (nozzle.diameter > 20) {
      warnings.push(`Large nozzle size ${nozzle.diameter}/32" may reduce cleaning efficiency`);
    }
  }
  
  // Check total nozzle count
  const totalCount = config.nozzles.reduce((sum, n) => sum + (n.count || 1), 0);
  if (totalCount > 6) {
    warnings.push(`High nozzle count (${totalCount}) may indicate unusual bit configuration`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate hydraulic calculation inputs
 */
export function validateHydraulicInputs(
  flowRate: number,
  tfa: number,
  fluidDensity?: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate flow rate
  if (!isFinite(flowRate)) {
    errors.push('Flow rate must be a finite number');
  } else if (flowRate <= 0) {
    errors.push('Flow rate must be positive');
  } else if (flowRate > 2000) {
    warnings.push('Very high flow rate (>2000 GPM) - verify equipment capacity');
  }
  
  // Validate TFA
  if (!isFinite(tfa)) {
    errors.push('Total Flow Area must be a finite number');
  } else if (tfa <= 0) {
    errors.push('Total Flow Area must be positive');
  } else if (tfa < 0.1) {
    warnings.push('Very small TFA (<0.1 in²) may cause excessive pressure drop');
  } else if (tfa > 5.0) {
    warnings.push('Very large TFA (>5.0 in²) may reduce cleaning effectiveness');
  }
  
  // Validate fluid density if provided
  if (fluidDensity !== undefined) {
    if (!isFinite(fluidDensity)) {
      errors.push('Fluid density must be a finite number');
    } else if (fluidDensity <= 0) {
      errors.push('Fluid density must be positive');
    } else if (fluidDensity < 7.0 || fluidDensity > 20.0) {
      warnings.push('Unusual fluid density - typical drilling fluid range is 7-20 lb/gal');
    }
  }
  
  // Check velocity if inputs are valid
  if (errors.length === 0) {
    const velocity = calculateNozzleVelocity(flowRate, tfa);
    
    if (velocity < 100) {
      warnings.push('Low nozzle velocity (<100 ft/s) may provide poor hole cleaning');
    } else if (velocity > 600) {
      warnings.push('Very high nozzle velocity (>600 ft/s) may cause excessive bit wear');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
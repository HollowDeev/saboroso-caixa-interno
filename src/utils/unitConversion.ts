// Tipos de unidades disponíveis
export type MassUnit = 'kg' | 'g' | 'mg';
export type VolumeUnit = 'L' | 'ml';
export type CountUnit = 'unidade';
export type Unit = MassUnit | VolumeUnit | CountUnit;

// Fatores de conversão para massa (em relação à unidade base)
const massConversionFactors: Record<MassUnit, number> = {
  kg: 1,
  g: 1000,  // 1kg = 1000g
  mg: 1000000,  // 1kg = 1000000mg
};

// Fatores de conversão para volume (em relação à unidade base)
const volumeConversionFactors: Record<VolumeUnit, number> = {
  L: 1,
  ml: 1000,  // 1L = 1000ml
};

// Função para verificar se é unidade de massa
export const isMassUnit = (unit: Unit): unit is MassUnit => {
  return ['kg', 'g', 'mg'].includes(unit);
};

// Função para verificar se é unidade de volume
export const isVolumeUnit = (unit: Unit): unit is VolumeUnit => {
  return ['L', 'ml'].includes(unit);
};

// Função para obter as subunidades disponíveis
export const getAvailableSubunits = (baseUnit: Unit): Unit[] => {
  if (isMassUnit(baseUnit)) {
    return ['kg', 'g', 'mg'];
  }
  if (isVolumeUnit(baseUnit)) {
    return ['L', 'ml'];
  }
  return ['unidade'];
};

// Função para converter valor entre unidades
export const convertValue = (value: number, fromUnit: Unit, toUnit: Unit): number => {
  // Se as unidades são iguais, retorna o mesmo valor
  if (fromUnit === toUnit) return value;

  // Se é unidade, não permite conversão
  if (fromUnit === 'unidade' || toUnit === 'unidade') {
    throw new Error('Não é possível converter unidades para/de unidade');
  }

  // Converte massa
  if (isMassUnit(fromUnit) && isMassUnit(toUnit)) {
    // Se estiver convertendo de uma unidade menor para uma maior (ex: g para kg)
    if (massConversionFactors[fromUnit] > massConversionFactors[toUnit]) {
      return value / (massConversionFactors[fromUnit] / massConversionFactors[toUnit]);
    }
    // Se estiver convertendo de uma unidade maior para uma menor (ex: kg para g)
    else {
      return value * (massConversionFactors[toUnit] / massConversionFactors[fromUnit]);
    }
  }

  // Converte volume
  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    // Se estiver convertendo de uma unidade menor para uma maior (ex: ml para L)
    if (volumeConversionFactors[fromUnit] > volumeConversionFactors[toUnit]) {
      return value / (volumeConversionFactors[fromUnit] / volumeConversionFactors[toUnit]);
    }
    // Se estiver convertendo de uma unidade maior para uma menor (ex: L para ml)
    else {
      return value * (volumeConversionFactors[toUnit] / volumeConversionFactors[fromUnit]);
    }
  }

  throw new Error('Não é possível converter entre diferentes tipos de unidades');
};

// Função para converter para a unidade base
export const convertToBaseUnit = (value: number, fromUnit: Unit, baseUnit: Unit): number => {
  return convertValue(value, fromUnit, baseUnit);
};

// Função para converter da unidade base
export const convertFromBaseUnit = (value: number, baseUnit: Unit, toUnit: Unit): number => {
  return convertValue(value, baseUnit, toUnit);
};

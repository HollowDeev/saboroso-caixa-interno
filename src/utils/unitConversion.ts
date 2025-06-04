// Tipos de unidades disponíveis
export type MassUnit = 'kg' | 'g' | 'mg';
export type VolumeUnit = 'L' | 'ml';
export type Unit = MassUnit | VolumeUnit | 'unidade';

// Fatores de conversão para massa
const massConversionFactors: Record<MassUnit, number> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
};

// Fatores de conversão para volume
const volumeConversionFactors: Record<VolumeUnit, number> = {
  L: 1,
  ml: 0.001,
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
    return (value * massConversionFactors[fromUnit]) / massConversionFactors[toUnit];
  }

  // Converte volume
  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    return (value * volumeConversionFactors[fromUnit]) / volumeConversionFactors[toUnit];
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
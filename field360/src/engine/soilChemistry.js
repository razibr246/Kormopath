// Soil Chemistry, Environmental Physics & Fossil Carbon Balance Engine.
// Models:
//   1. Soil Chemistry & Cation Exchange Capacity (CEC in cmol_c/kg) and Base Saturation (BS%).
//   2. Three-pool Soil Organic Carbon (SOC) fractionation:
//        - Labile / Active biological carbon (turnover 1-2 years)
//        - Slow Humus / Humic aggregate carbon (turnover 20-50 years)
//        - Fossilized / Recalcitrant Mineral-Associated Paleosol carbon (turnover 500-2,000+ years)
//   3. Environmental fossil-fuel diesel displacement from reduced groundwater pumping.
//   4. Net multi-gas Global Warming Potential (GWP_100 in kg CO2e/bigha).

import { BIGHA_HA } from './crops.js';

// Diesel fuel emission factor: 2.68 kg CO2 per liter diesel (IPCC 2006 guidelines, mobile combustion)
export const DIESEL_EMISSION_FACTOR = 2.68;
// Pumping energy requirement for smallholder shallow tube wells (STW): ~0.085 liters diesel per m3 water lifted
export const DIESEL_PER_M3_WATER = 0.085;
// 1 mm of water depth over 1 bigha (1,333 m2) = 1.333 m3 water
export const M3_PER_MM_BIGHA = 1.333;

// Cation Exchange Capacity (CEC) estimation using ISRIC / FAO pedotransfer function:
// CEC (cmol_c/kg) = (0.42 * clay%) + (2.1 * OM%) + pH buffer term
export function calculateCEC({ clayPct = 25, omPct = 1.5, ph = 6.0 }) {
  const c = Math.max(0, Math.min(100, clayPct));
  const om = Math.max(0.1, Math.min(15, omPct));
  const pH = Math.max(3.5, Math.min(9.5, ph));

  // Variable pH-dependent charge component (organic matter carboxyl & phenolic hydroxyl ionization)
  const phCharge = Math.max(0, (pH - 4.5) * 0.85);
  const cec = 0.42 * c + 2.1 * om + phCharge;
  return Math.round(cec * 10) / 10;
}

// Base Saturation percentage (BS%):
// Proportion of CEC occupied by basic cations (Ca2+, Mg2+, K+, Na+) vs acidic cations (H+, Al3+)
export function calculateBaseSaturation({ cec, ph, landform = 'alluvium' }) {
  const pH = Math.max(3.5, Math.min(9.5, ph));
  // Empirical sigmoid curve relating soil pH to base saturation in subtropical soils
  // pH 5.5 is ~50% base saturation, pH 7.0 is ~85-90%
  const bs = 100 / (1 + Math.exp(-1.4 * (pH - 5.5)));
  const boundedBs = Math.max(10, Math.min(98, Math.round(bs * 10) / 10));

  // Partition cations according to typical Bengal delta mineralogy
  // Barind terrace (kaolinite/iron-rich) has lower Ca/Mg ratio than active floodplains (illite/smectite)
  const totalBases = (boundedBs / 100) * cec;
  const isBarind = landform === 'barind';
  const isPeat = landform === 'peat';

  const caRatio = isPeat ? 0.48 : isBarind ? 0.60 : 0.68;
  const mgRatio = isPeat ? 0.28 : isBarind ? 0.25 : 0.22;
  const kRatio = 0.07;
  const naRatio = Math.max(0.01, 1 - (caRatio + mgRatio + kRatio));

  return {
    baseSaturationPct: boundedBs,
    totalBasesCmol: Math.round(totalBases * 10) / 10,
    caCmol: Math.round(totalBases * caRatio * 10) / 10,
    mgCmol: Math.round(totalBases * mgRatio * 10) / 10,
    kCmol: Math.round(totalBases * kRatio * 10) / 10,
    naCmol: Math.round(totalBases * naRatio * 10) / 10,
    acidityCmol: Math.round(Math.max(0, cec - totalBases) * 10) / 10,
  };
}

// Three-Pool Soil Organic Carbon (SOC) Fractionation:
// Separates soil carbon into biological labile, humus aggregate, and fossilized/recalcitrant mineral fractions.
// Soil carbon split three ways by published methods, not by guessed shares:
//   inert  RothC inert organic matter, IOM = 0.049 × SOC^1.139 t C/ha (Falloon et al. 1998, Soil Biol. Biochem.
//          30:1207), carbon that takes no part in the decades a rotation is judged over. Fitted on mineral soils.
//   young / old  the rest at ICBM steady state (Andrén & Kätterer 1997), with the same rates as Field Future
//          (soilfuture.js ICBM: k1 = 0.8, k2 = 0.006 a year, straw humification h = 0.125): young = i/k1, old = h·i/k2,
//          so young : old = k2 : h·k1 = 0.06. Residence times are 1/k at the model's reference climate; Bangladesh's
//          heat runs both faster, by the same factor.
export const CARBON_POOL_PARAMS = { k1: 0.8, k2: 0.006, h: 0.125, iomA: 0.049, iomB: 1.139 };

export function calculateCarbonPools({ totalCarbonTHa = 28, landform = 'alluvium', lang = 'en' }) {
  const { k1, k2, h, iomA, iomB } = CARBON_POOL_PARAMS;
  const cTot = Math.max(5, totalCarbonTHa);
  const inertTHa = Math.min(cTot * 0.5, iomA * cTot ** iomB);
  const active = cTot - inertTHa;
  const youngOverOld = k2 / (h * k1);
  const youngTHa = active * (youngOverOld / (1 + youngOverOld));
  const oldTHa = active - youngTHa;
  const r2 = (x) => Math.round(x * 100) / 100;
  const pct = (x) => Math.round((x / cTot) * 100);
  const isBn = lang === 'bn';
  const inertLabel = { bn: 'শতাব্দী থেকে হাজার বছর (RothC inert)', en: 'Centuries to millennia (RothC inert)' };
  const labileLabel = { bn: '~১.৩ বছর (ICBM young)', en: '~1.3 years (ICBM young)' };
  const humusLabel = { bn: '~১৬৭ বছর (ICBM old, মডেলের মান তাপে)', en: '~167 years (ICBM old, temperature-scaled)' };
  const inert = { tHa: r2(inertTHa), pct: pct(inertTHa), residenceYears: null, turnoverYears: isBn ? inertLabel.bn : inertLabel.en, turnoverLabel: inertLabel };
  return {
    totalTHa: cTot,
    method: 'ICBM steady state (Andrén & Kätterer 1997) + RothC inert pool (Falloon et al. 1998)',
    mineralSoilOnly: landform === 'peat', // Falloon's IOM equation was fitted on mineral soils, not peat
    labile: { tHa: r2(youngTHa), pct: pct(youngTHa), residenceYears: Math.round((1 / k1) * 10) / 10, turnoverYears: isBn ? labileLabel.bn : labileLabel.en, turnoverLabel: labileLabel },
    humus: { tHa: r2(oldTHa), pct: pct(oldTHa), residenceYears: Math.round(1 / k2), turnoverYears: isBn ? humusLabel.bn : humusLabel.en, turnoverLabel: humusLabel },
    inert,
    fossilPaleosol: inert, // older name, still read by the soil profile and the biomechanics lab
  };
}

// Environmental Fossil Fuel (Diesel) Offset from Reduced Groundwater Pumping:
// Pumping 1 mm water over 1 bigha requires ~1.333 m3 water = ~0.113 liters diesel in a shallow tube well.
export function calculateFossilDieselOffset({ waterSavedMm = 120, areaBigha = 1 }) {
  const savedMm = Math.max(0, waterSavedMm);
  const bigha = Math.max(0.1, areaBigha);

  const m3Saved = savedMm * M3_PER_MM_BIGHA * bigha;
  const dieselLitersSaved = Math.round(m3Saved * DIESEL_PER_M3_WATER * 10) / 10;
  const avoidedCo2Kg = Math.round(dieselLitersSaved * DIESEL_EMISSION_FACTOR * 10) / 10;

  return {
    waterSavedMm: savedMm,
    m3Saved: Math.round(m3Saved),
    dieselLitersSaved,
    avoidedCo2Kg,
    dieselCostSavedBdt: Math.round(dieselLitersSaved * 105), // ~105 BDT/liter diesel in Bangladesh
  };
}

// Comprehensive Net Multi-Gas Environmental Footprint:
// Fuses:
//   - ICBM soil organic carbon change (t CO2 sequestered)
//   - Avoided paddy methane emissions (CH4 has 28x GWP100 of CO2)
//   - Avoided diesel burning emissions (fossil fuel CO2)
export function calculateNetEnvironmentalFootprint({
  icbmDeltaC = 0.45,       // t C/ha sequestered
  ch4AvoidedKg = 18,       // kg CH4 avoided per bigha
  waterSavedMm = 140,      // mm irrigation water saved
  areaBigha = 1,
}) {
  const bigha = Math.max(0.1, areaBigha);
  const ha = bigha * BIGHA_HA;

  // 1 t C sequestered = 3.667 t CO2e
  const soilCo2eKg = Math.round(icbmDeltaC * 3667 * ha);

  // CH4 GWP100 = 28 (IPCC AR6)
  const ch4Co2eKg = Math.round(ch4AvoidedKg * 28 * bigha);

  // Avoided fossil fuel diesel
  const dieselOffset = calculateFossilDieselOffset({ waterSavedMm, areaBigha: bigha });
  const dieselCo2eKg = Math.round(dieselOffset.avoidedCo2Kg);

  const netClimateMitigationCo2eKg = soilCo2eKg + ch4Co2eKg + dieselCo2eKg;

  return {
    areaBigha: bigha,
    soilCo2eKg,
    ch4Co2eKg,
    dieselCo2eKg,
    dieselLitersSaved: dieselOffset.dieselLitersSaved,
    dieselCostSavedBdt: dieselOffset.dieselCostSavedBdt,
    netClimateMitigationCo2eKg,
    netTonnesCo2e: Math.round((netClimateMitigationCo2eKg / 1000) * 100) / 100,
  };
}

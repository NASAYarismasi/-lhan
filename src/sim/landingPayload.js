import { CREW_RATES } from '../data/sls.js';

// GAME ASSUMPTION: 1 README supply unit = one day of the corresponding resource for the WHOLE crew.
// Fractional units are retained; quantities are not reset to the README example at landing.
export function buildLandingPayload(state) {
  const count = state.crew.length;
  return {
    crew: state.crew.map(({ id, health }) => ({ id, health })),
    supplies: {
      food: state.supplies.food / (CREW_RATES.food * count),
      water: state.supplies.water / (CREW_RATES.water * count),
      oxygen: state.supplies.oxygen / (CREW_RATES.oxygen * count),
      spareParts: state.spareParts
    },
    modules: [...state.modules], landingSite: state.landingSite, surfaceEnergy: state.surfaceEnergy
  };
}

import { CREW_RATES } from '../data/sls.js';
import { DAY } from './constants.js';

// Mean Mars solar day (sol), s. https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html (24.6597 h)
export const SOL = 24.6597 * 3600;

// GAME ASSUMPTION (architecture after NASA DRA 5.0, https://ntrs.nasa.gov/citations/20090012109):
// consumables for the return trip stay aboard the transit habitat in Mars orbit; the crew lander
// carries only a limited surface stock. Here: 4 sols per crew member, matching the colony's
// example landing (12 units for 3 crew).
export const LANDER_SURFACE_SOLS = 4;

/**
 * Colony supply unit (İhan's colony sim): 1 unit = one crew member's need for one sol.
 * The colony consumes `living crew` units of each resource per sol.
 * @param {number} kg remaining mass of the resource aboard
 * @param {number} ratePerPersonDay kg per person per Earth day (NASA BVAD)
 */
export function kgToPersonSols(kg, ratePerPersonDay) {
  return kg / (ratePerPersonDay * SOL / DAY);
}

/** Builds the README landing JSON from mission state, in colony units. */
export function buildLandingPayload(state) {
  const count = state.crew.length, carried = LANDER_SURFACE_SOLS * count;
  const unit = key => Math.min(carried, Math.max(0, kgToPersonSols(state.supplies[key], CREW_RATES[key])));
  return {
    crew: state.crew.map(({ id, health }) => ({ id, health })),
    supplies: { food: unit('food'), water: unit('water'), oxygen: unit('oxygen'), spareParts: state.spareParts },
    modules: [...state.modules], landingSite: state.landingSite, surfaceEnergy: state.surfaceEnergy
  };
}

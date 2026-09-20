// Terrain generator sanity: land-use mix, population, river heads, landmarks, zones.
const { E, check, finish, worlds } = require('./helpers');
const wp = worlds(), w = wp.fine;
const lu = new Array(7).fill(0); let pop = 0;
for (let c = 0; c < w.N; c++) { lu[w.lu[c]]++; pop += w.pop[c]; }
console.log('grid', w.nx + 'x' + w.ny, 'cell', w.dx, 'm | land use counts', lu.join(' '), '| population', Math.round(pop));
check('grid is 80 x 60 at 550 m', w.nx === 80 && w.ny === 60 && Math.round(w.dx) === 550);
check('sea exists on west edge', lu[0] > 200);
check('every land use class present', lu.slice(1).every(n => n > 0));
check('population between 0.5M and 1.5M', pop > 5e5 && pop < 1.5e6, Math.round(pop));
check('every river has an inflow head', w.heads.length === 3 && w.heads.every(h => h.length > 0), w.heads.map(h => h.length).join(','));
check('gauge and blockage cells found', w.gauge >= 0 && w.blockCells.length >= 3);
check('18 zones, all named', w.zones.length === 18 && w.zones.every(z => z.name));
check('coarse grid shares zones', wp.coarse.zones.length === 18 && wp.coarse.nx === 56);
// Determinism: same seed -> identical terrain
const w2 = E.makeWorldPair(E.DEFAULT_TERRAIN, 80, 80 / 56).fine;
check('same seed gives identical terrain', w.z.every((v, i) => v === w2.z[i]));
const w3 = E.makeWorldPair(Object.assign({}, E.DEFAULT_TERRAIN, { seed: 12 }), 80, 80 / 56).fine;
check('different seed gives different terrain', w.z.some((v, i) => v !== w3.z[i]));
finish();

// DEM round trip: export the generated terrain to CSV, re-import it, and simulate on the derived world.
const { E, check, run, finish, worlds } = require('./helpers');
const w = worlds().fine, dem = E.parseDEM(E.demToCSV(w));
check('CSV parses to 60 x 80', dem.rows === 60 && dem.cols === 80);
const p2 = E.makeWorldPairFromDEM(dem, 550, 80, 80 / 56), w2 = p2.fine;
let sea = 0, ch = 0; for (let c = 0; c < w2.N; c++) { sea += w2.isSea[c]; ch += w2.chan[c]; }
check('sea found by flood fill from the west edge', sea > 200, sea);
check('rivers found by flow accumulation', ch > 100, ch);
check('river inflow heads found', w2.heads[0].length > 0);
check('zones built from DEM', w2.zones.length === 18);
const sc = E.makePresets(w2)[1], res = run(w2, sc), an = E.analyze(w2, res, { dW: 0.25, dC: 0.75, share: 0.1 });
check('heavy rain floods the imported basin', an.sum.peakPopAff > 20000, Math.round(an.sum.peakPopAff));
// Esri ASCII format
const asc = 'ncols 3\nnrows 2\ncellsize 90\nNODATA_value -9999\n1 2 3\n4 5 -9999';
const d2 = E.parseDEM(asc); check('Esri ASCII header parsed', d2.cols === 3 && d2.rows === 2 && d2.cell === 90 && d2.data[5] === 0);
finish();

// Shared helpers for the Node test scripts (no browser needed).
const E = require('../src/engine.js');
let failures = 0;
const check = (name, ok, detail = '') => { console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  (' + detail + ')' : '')); if (!ok) failures++; };
const run = (w, sc, opts) => { const g = E.simulate(w, sc, opts || {}); let r; while (!(r = g.next()).done); return r.value; };
const finish = () => { console.log(failures ? '\n' + failures + ' check(s) failed' : '\nAll checks passed'); process.exit(failures ? 1 : 0); };
const worlds = () => E.makeWorldPair(E.DEFAULT_TERRAIN, 80, 80 / 56);
module.exports = { E, check, run, finish, worlds };

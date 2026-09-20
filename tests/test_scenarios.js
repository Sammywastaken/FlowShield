// Physics regression: scenarios must rank sensibly and every run must conserve water.
const { E, check, run, finish, worlds } = require('./helpers');
const w = worlds().fine, P = E.makePresets(w), th = { dW: 0.25, dC: 0.75, share: 0.1 }, out = {};
for (const sc of P) {
  const t = Date.now(), res = run(w, sc), an = E.analyze(w, res, th), m = res.mass;
  const err = ((m.storeEnd - m.store0) - (m.eff + m.inflow - m.drain - m.sea)) / (m.eff + m.inflow);
  out[sc.id] = { an, err };
  console.log(sc.name.padEnd(26), 'affected', Math.round(an.sum.peakPopAff), '| critical people', Math.round(an.sum.peakPopCrit), '| critical zones', an.sum.critZones, '| balance error', (err * 100).toFixed(4) + '%', '|', Date.now() - t, 'ms');
}
const a = id => out[id].an.sum;
check('water balance closes to <0.1% in every scenario', Object.values(out).every(o => Math.abs(o.err) < 1e-3));
check('normal monsoon is essentially safe', a('normal').peakPopAff < 5000);
check('heavy > normal', a('heavy').peakPopAff > 20 * a('normal').peakPopAff);
check('extreme > heavy', a('extreme').peakPopAff > 2 * a('heavy').peakPopAff);
check('drainage failure worsens heavy rain', a('drainfail').peakPopAff > 1.15 * a('heavy').peakPopAff);
check('blocked channel worsens heavy rain', a('blocked').peakPopAff > a('heavy').peakPopAff);
check('extreme has many critical zones', a('extreme').critZones >= 8);
// Monotonicity: more rain must never mean less flooding
const s1 = E.cloneScenario(P[1]), s2 = E.cloneScenario(P[1]); s2.rain.peak *= 1.5;
const f1 = E.analyze(w, run(w, s1), th).sum.peakPopAff, f2 = E.analyze(w, run(w, s2), th).sum.peakPopAff;
check('1.5x rain floods more people', f2 > f1, Math.round(f1) + ' -> ' + Math.round(f2));
finish();

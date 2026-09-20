// Trains the emulator (about 1 minute) and checks it beats simple baselines on held-out storms.
const { E, check, run, finish, worlds } = require('./helpers');
Object.assign(global, E);                       // ai.js expects the engine functions as globals
const A = require('../src/ai.js');
const wp = worlds(); const gen = A.trainEmulator(wp.coarse, { members: 40 }); let r; while (!(r = gen.next()).done);
const R = r.value; console.log('held-out:', JSON.stringify({ r2: R.eval.r2, auc: R.eval.auc, acc: R.eval.acc, etaMAE: R.eval.etaMAE }));
check('R2 on peak depth > 0.7', R.eval.r2 > 0.7, R.eval.r2.toFixed(2));
check('AUC for critical > 0.9', R.eval.auc > 0.9, R.eval.auc.toFixed(2));
check('accuracy > 85%', R.eval.acc > 0.85, (R.eval.acc * 100).toFixed(0) + '%');
const P = E.makePresets(wp.fine), fc = A.aiForecast(R.model, wp.fine, P[1], 200), fx = A.aiForecast(R.model, wp.fine, P[2], 200);
const mean = f => f.reduce((s, z) => s + z.pCrit, 0) / f.length;
check('AI risk higher for extreme than heavy storm', mean(fx) > mean(fc), mean(fc).toFixed(2) + ' -> ' + mean(fx).toFixed(2));
const fn = A.aiForecast(R.model, wp.fine, P[0], 200);
check('AI risk lowest for normal monsoon', mean(fn) < mean(fc), mean(fn).toFixed(2));
finish();

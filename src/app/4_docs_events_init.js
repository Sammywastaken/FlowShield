/* ---------- method doc ---------- */
$('#methodDoc').innerHTML=`
<h3>What the model does</h3>
<p>FlowShield solves a two-dimensional, physically based flood simulation on a 44 × 33 km grid (550 m cells). Rain becomes runoff, runoff flows across terrain and through rivers, drains remove water, the sea pushes back, and every zone is classified Safe, Warning or Critical with a time to critical.</p>
<h3>1. Water movement: local-inertial shallow-water equations</h3>
<p>The solver uses the local-inertial simplification of the shallow-water equations (Bates et al., 2010), the scheme behind LISFLOOD-FP. Flux q between two neighbouring cells is updated each step:</p>
<span class="eq">q(t+Δt) = [ q − g·h_f·Δt·∂(h+z)/∂x ] / [ 1 + g·Δt·n²·|q| / h_f^(7/3) ]
h_f = max(η_i, η_j) − max(z_i, z_j)         η = z + h</span>
<p>Here z is bed elevation, h is depth, n is Manning roughness (0.035 rivers to 0.12 forest) and g = 9.81. Continuity then updates depth: <code>Δh = (Δt/Δx)·Σ(q_in − q_out) + rain + inflow − drainage</code>. The time step follows the CFL rule <code>Δt = 0.7·Δx/√(g·h_max)</code>. A Froude limit keeps flow subcritical and a donor-cell limiter stops any cell giving away more water than it holds.</p>
<h3>2. Runoff: SCS Curve Number</h3>
<span class="eq">S = 25400/CN − 254        Ia = 0.2·S        Q = (P − Ia)² / (P − Ia + S)</span>
<p>P is cumulative rainfall, Q cumulative runoff. CN comes from land use (urban 92, paddy 88, homestead 80, plantation 72, forest 60). The last five days of rain set antecedent moisture by interpolating CN between dry (AMC I), normal (II) and wet (III) conditions, so a saturated Kerala catchment sheds more water. Rain is stronger on the Ghats slopes by a gain factor <code>1 + k·z/z_max</code>.</p>
<h3>3. Drainage, blockages and failures</h3>
<p>Each land use has a drain capacity in mm/h (urban 25, paddy 8, homestead 6). Removed depth per step is <code>min(h, cap·m·(1−fail)·Δt)</code>, where m is the capacity slider and fail is 0.9 on cells you paint. High sea level reduces outfall on low ground by up to 60%. A river blockage lifts the bed of the chosen cells by 5 m, so water backs up and overtops the banks exactly as a debris jam would force it to.</p>
<h3>4. Boundaries: catchment, dam and sea</h3>
<p>Each river receives flow from the catchment upstream of the map through a linear reservoir, <code>dS/dt = A·Rc·P − S/K</code>, <code>Q = Q_base + S/K</code>, with runoff coefficient Rc rising as the catchment wets up. A dam release adds a trapezoidal hydrograph to the main river. The sea edge is forced to <code>η = −a·cos(2πt/12.42 h) + surge</code>, so high tide and storm surge create backwater that lifts river levels and floods the lowlands.</p>
<h3>5. Risk classification and time to critical</h3>
<p>Each land cell gets a hazard rating from the UK Defra/EA flood-risk method, <code>HR = d·(v + 0.5)</code>, where d is depth above the pre-storm level and v is speed.</p>
<span class="eq">Critical: d ≥ d_crit  or  HR ≥ 1.25        Warning: d ≥ d_warn  or  HR ≥ 0.75</span>
<p>A zone changes level when the chosen share of its area (default 10%) reaches that level. Time to critical is found by linear interpolation of the severity index between 30-minute frames, then shown relative to the time on the slider. People affected are summed from cell populations (land-use density × area).</p>
<h3>6. Water-balance check</h3>
<p>The run tracks every cubic metre: effective rain + river inflow − drainage − sea outflow must equal the change in storage. The value under the Timeline charts is that closing error (typically below 0.01%).</p>
<h3>7. AI: a physics-trained emulator with uncertainty</h3>
<p>The AI does not replace the physics. Forty random storms (Latin-hypercube sampled peak intensity, duration, shape, dam release, surge, antecedent rain, drainage state and Ghats gain) are run through the solver on a coarser grid. A neural network (two hidden layers of 24 tanh units, trained with Adam) learns from zone features and storm features to predict three things: probability of reaching critical (cross-entropy loss), log peak depth, and time to critical. After training it can run in milliseconds, so the sliders give an instant AI preview before the physics finishes, and 300 perturbed versions of the forecast (rain error, surge error, drain state) yield a probability of critical for each zone. Accuracy is scored on storms held out from training, and permutation importance shows what drives the risk.</p>
<h3>Honest limits and the path to real deployment</h3>
<ul>
<li>The terrain is generated from Kerala-style parameters (Ghats relief, midland, backwater lowlands, meandering rivers, beach ridge). It is not a real place until you load a DEM; the import on the Data tab derives rivers, sea, land use and zones from an elevation grid.</li>
<li>Drained water leaves the model instead of being routed through the drain network. The next step is to send it to the nearest river cell.</li>
<li>Roughness, curve numbers and drain capacities are textbook values. To go live they need calibration against the August 2018 high-water marks and CWC gauge records.</li>
<li>Rainfall enters by hourly CSV today. Production feeds would be IMD gridded nowcasts, KSEB reservoir release schedules and tide-gauge data. The bulletin output follows the Common Alerting Protocol used by India's SACHET system.</li>
</ul>`;
/* ---------- bulletin + export ---------- */
function openModal(html){$('#modalBox').innerHTML=html+'<div style="text-align:right;margin-top:10px"><button class="btn" id="mclose">Close</button></div>';$('#modal').classList.add('on');$('#mclose').onclick=()=>$('#modal').classList.remove('on');}
function bulletinData(){
  const r=R(),w=W(),f=Math.min(S.f,r.res.t.length-1),tNow=r.res.t[f]/3600,items=[];
  w.zones.forEach((z,k)=>{if(z.land<1)return;const Z=r.an.zones[k],s=zoneState(r,k,f);
    if(Z.peakClass<1)return;const crit=Z.peakClass===2,rel=crit?(isFinite(s.rel)?s.rel:0):(isFinite(s.relW)?s.relW:0),h=Math.max(0,rel);
    const people=Math.round((crit?Z.peakPopCrit:Z.peakPop)/100)*100;
    items.push({zone:z.name,level:crit?'Critical':'Warning',severity:crit?'Severe':'Moderate',urgency:h<6?'Immediate':'Expected',hours:+h.toFixed(1),people,
      en:(crit?'RED ALERT. ':'YELLOW ALERT. ')+z.name+': '+(crit?'critical flooding':'rising water')+(h>0?' expected in '+fmtH(h):' now')+'. About '+people.toLocaleString('en-IN')+' people in the affected area. '+(crit?'Move to higher ground now and follow local disaster management instructions. Emergency: 112.':'Prepare to move valuables and vulnerable family members to higher ground.'),
      ml:crit?('അതീവ ജാഗ്രത: '+z.name+' പ്രദേശത്ത് '+(h>0?Math.max(1,Math.round(h))+' മണിക്കൂറിനുള്ളിൽ ':'ഇപ്പോൾ ')+'ഗുരുതര വെള്ളപ്പൊക്ക സാധ്യത. ഏകദേശം '+people.toLocaleString('en-IN')+' പേർ അപകടമേഖലയിൽ. '+(h>6?'സുരക്ഷിത സ്ഥലത്തേക്ക് മാറാൻ തയ്യാറായിരിക്കുക.':'ഉടൻ സുരക്ഷിത സ്ഥലത്തേക്ക് മാറുക.')):('ജാഗ്രത: '+z.name+' പ്രദേശത്ത് '+(h>0?Math.max(1,Math.round(h))+' മണിക്കൂറിനുള്ളിൽ ':'')+'വെള്ളം ഉയരാൻ സാധ്യത. തയ്യാറായിരിക്കുക.')});});
  items.sort((a,b)=>(a.level===b.level?0:a.level==='Critical'?-1:1)||a.hours-b.hours);return{items,tNow};
}
$('#btnBulletin').onclick=()=>{
  if(!R())return;const b=bulletinData();
  const cap=JSON.stringify({identifier:'flowshield-'+Date.now(),sender:'flowshield@demo',status:'Exercise',msgType:'Alert',scope:'Public',info:b.items.map(i=>({category:'Met',event:'Flood',urgency:i.urgency,severity:i.severity,certainty:'Likely',headline:i.en.split('.')[0],description:i.en,area:{areaDesc:i.zone}}))},null,1);
  openModal('<h2>Alert bulletin</h2><p class="note">Issued for '+clockStr(b.tNow)+'. Every zone that reaches Warning or Critical in the viewed scenario, in English and Malayalam.</p>'+
   (b.items.length?b.items.map(i=>'<div class="alertitem'+(i.level==='Warning'?' w':'')+'"><b>'+i.zone+'</b> · '+i.level+' · '+i.urgency+'<div class="en">'+i.en+'</div><div class="ml">'+i.ml+'</div></div>').join(''):'<p>No zone reaches Warning in this scenario. No bulletin needed.</p>')+
   '<details><summary style="cursor:pointer;color:var(--vio)">CAP message (JSON)</summary><textarea readonly id="capTxt">'+cap.replace(/</g,'&lt;')+'</textarea></details>');
};
$('#btnExport').onclick=()=>{
  const r=R();if(!r)return;const w=W();let csv='zone,mean_elevation_m,population,peak_people_affected,peak_people_critical,peak_depth_p90_m,class,eta_warning_h,eta_critical_h\n';
  w.zones.forEach((z,k)=>{const Z=r.an.zones[k];csv+=[z.name,z.meanZ.toFixed(1),Math.round(z.pop),Math.round(Z.peakPop),Math.round(Z.peakPopCrit),Z.peakP90.toFixed(2),['Safe','Warning','Critical'][Z.peakClass],isFinite(Z.etaW)?Z.etaW.toFixed(1):'',isFinite(Z.etaC)?Z.etaC.toFixed(1):''].join(',')+'\n';});
  openModal('<h2>Export results</h2><p class="note">Zone table for the viewed scenario. Copy it into a spreadsheet.</p><textarea id="expTxt" readonly>'+csv+'</textarea><button class="btn" id="cpy">Copy to clipboard</button>');
  $('#cpy').onclick=()=>{const t=$('#expTxt');t.select();try{navigator.clipboard.writeText(t.value).then(()=>toast('Copied'),()=>{document.execCommand('copy');toast('Copied');});}catch(e){document.execCommand('copy');toast('Copied');}};
};
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.remove('on');});
/* ---------- imports ---------- */
function reworld(pair,label){
  S.ver++;S.pair=pair;prepMap();S.presets=makePresets(W());S.results={};S.ai=null;S.sel=-1;S.view='custom';
  const p=S.presets.find(x=>x.id==='heavy');setScenario(p);S.sc.name='Custom';S.sc.id='heavy';buildControls();$('#aiMetrics').innerHTML='';$('#aiImp').innerHTML='';
  runCustom().then(()=>runCompare()).then(()=>trainAI());if(label)toast(label);
}
$('#demFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const dem=parseDEM(rd.result),cell=+$('#demCell').value||90;
  const pair=makeWorldPairFromDEM(dem,cell,S.fineNx,S.fineNx/56);$('#demInfo').textContent='Loaded '+dem.cols+' × '+dem.rows+' cells at '+cell+' m. Rivers, sea and land use were derived from the elevations.';reworld(pair,'DEM loaded. Re-running everything.');}catch(err){$('#demInfo').textContent='Import failed: '+err.message;}};rd.readAsText(f);});
$('#btnDemExport').onclick=()=>{openModal('<h2>Current DEM</h2><p class="note">Elevations in metres, 550 m cells, north to south. Save as .csv and load it back with the DEM importer (set cell size to 550).</p><textarea readonly id="demTxt">'+demToCSV(W())+'</textarea>');};
$('#rainFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const v=rd.result.split(/\r?\n/).map(l=>{const p=l.trim().split(/[,;\s]+/);return parseFloat(p[p.length-1]);}).filter(x=>!isNaN(x)&&x>=0);
  if(v.length<3){$('#rainInfo').textContent='Need at least 3 hourly values.';return;}S.sc.rain.series=v;S.sc.horizon=Math.max(S.sc.horizon,Math.min(96,Math.ceil(v.length)));$('#rainInfo').textContent='Loaded '+v.length+' hourly values. Press Run.';buildControls();onEdit();};rd.readAsText(f);});
$('#btnRainClear').onclick=()=>{S.sc.rain.series=null;$('#rainInfo').textContent='Using the storm shape sliders.';onEdit();};
/* ---------- events + init ---------- */
function bindUI(){
  $('#btnRun').onclick=runCustom;$('#btnTrain').onclick=()=>{if(S.aiBusy)return;S.ai=null;for(const k in S.results)S.results[k].aiFc=null;trainAI();};$('#btnAll').onclick=()=>runCompare();
  $('#btnRebuild').onclick=()=>{buildWorld();const p=S.presets.find(x=>x.id==='heavy');setScenario(p);S.sc.name='Custom';S.sc.id='heavy';buildControls();$('#aiMetrics').innerHTML='';$('#aiImp').innerHTML='';runCustom().then(()=>runCompare()).then(()=>trainAI());};
  const lc=$('#layerChips');[['depth','Water depth'],['risk','Risk level'],['eta','Time to critical'],['ai','AI probability'],['speed','Velocity'],['elev','Elevation'],['lu','Land use'],['pop','Population']].forEach(l=>{const b=document.createElement('button');b.className='chip'+(l[0]===S.layer?' on':'');b.textContent=l[1];b.onclick=()=>{S.layer=l[0];[...lc.querySelectorAll('.chip:not(.lbl)')].forEach(x=>x.classList.toggle('on',x===b));drawMap();};lc.appendChild(b);});
  const sp=document.createElement('span');sp.className='sep';lc.appendChild(sp);const lb=document.createElement('button');lb.className='chip lbl on';lb.textContent='Zone names';lb.onclick=()=>{S.labels=!S.labels;lb.classList.toggle('on',S.labels);drawMap();};lc.appendChild(lb);
  $('#tslider').addEventListener('input',e=>{S.f=+e.target.value;updatePanels();drawMap();chartsSoon();});
  $('#speed').onchange=e=>S.speed=+e.target.value;
  $('#btnPlay').onclick=()=>{S.playing=!S.playing;$('#btnPlay').textContent=S.playing?'Pause':'Play';if(S.playing){const r=R();if(r&&S.f>=r.res.t.length-1)S.f=0;S.acc=0;S.last=performance.now();requestAnimationFrame(playTick);}};
  $('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t===b));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('on',p.id===b.dataset.p));chartsSoon();drawAIscatter();});
  $('#zones').addEventListener('click',e=>{const row=e.target.closest('.row');if(!row)return;S.sel=+row.dataset.k;updatePanels();drawMap();chartsSoon();});
  $('#zones').addEventListener('keydown',e=>{if(e.key==='Enter'){const row=e.target.closest('.row');if(row){S.sel=+row.dataset.k;updatePanels();drawMap();chartsSoon();}}});
  $('#scTable').addEventListener('click',e=>{const tr=e.target.closest('tr.clk');if(!tr)return;S.view=tr.dataset.k;S.dirty=false;S.f=Math.min(S.f,R().res.t.length-1);S.sel=-1;afterView();});
  let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{drawMap();chartsSoon();drawAIscatter();},120);});
  bindMap();
}
function playTick(now){
  if(!S.playing)return;const r=R();if(!r){S.playing=false;return;}
  S.acc+=(now-S.last)/1000*6*S.speed;S.last=now;
  if(S.acc>=1){const n=Math.floor(S.acc);S.acc-=n;S.f=Math.min(r.res.t.length-1,S.f+n);updatePanels();drawMap();chartsSoon();
    if(S.f>=r.res.t.length-1){S.playing=false;$('#btnPlay').textContent='Play';return;}}
  requestAnimationFrame(playTick);
}
async function init(){
  buildWorld();const p=S.presets.find(x=>x.id==='heavy');setScenario(p);S.sc.name='Custom';S.sc.id='heavy';
  buildControls();bindUI();$('#presetDesc').textContent=p.desc;$('#presetChips').querySelector('[data-id="heavy"]').classList.add('on');
  await runCustom();
  runCompare().then(()=>trainAI());
}
window.addEventListener('DOMContentLoaded',()=>{init().catch(e=>{console.error(e);document.body.insertAdjacentHTML('afterbegin','<pre style="color:#f88;padding:20px">'+e.stack+'</pre>');});});

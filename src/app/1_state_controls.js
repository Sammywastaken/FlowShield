/* ============ FLOWSHIELD APP ============ */
const $=s=>document.querySelector(s);
const S={tp:Object.assign({},DEFAULT_TERRAIN),pair:null,sc:null,th:{dW:0.25,dC:0.75,share:0.1},results:{},view:'custom',layer:'depth',f:0,playing:false,speed:1,sel:-1,tool:'inspect',
  ai:null,aiBusy:false,ver:0,presets:[],labels:true,hover:null,dirty:false,running:false,failSet:new Set(),blockSet:new Set(),sliders:[],fineNx:80,probe:-1};
const W=()=>S.pair.fine;
const R=()=>S.results[S.view];
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmtN=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e4?Math.round(n/1e3)+'k':n>=1e3?(n/1e3).toFixed(1)+'k':Math.round(n)+'';
const fmtH=h=>h<1?Math.round(h*60)+' min':h<10?h.toFixed(1)+' h':Math.round(h)+' h';
const pad=n=>String(n).padStart(2,'0');
const clockStr=h=>{const d=Math.floor(h/24),hh=Math.floor(h%24),mm=Math.round((h%1)*60);return 'Day '+(d+1)+' · '+pad(hh)+':'+pad(mm%60);};
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3200);}
function drive(gen,onp){return new Promise((res,rej)=>{(function tick(){const t0=performance.now();try{while(performance.now()-t0<22){const r=gen.next();if(r.done){res(r.value);return;}if(onp&&r.value)onp(r.value);}}catch(e){rej(e);return;}setTimeout(tick,0);})();});}
function setProg(id,p){const el=$(id);el.style.display='block';el.firstElementChild.style.width=Math.round(p*100)+'%';}
const massErr=r=>{const m=r.res.mass,inn=m.eff+m.inflow;return inn>0?((m.storeEnd-m.store0)-(m.eff+m.inflow-m.drain-m.sea))/inn:0;};
const CL=()=>[cssv('--safe'),cssv('--warn'),cssv('--crit')];

/* ---------- world + hillshade ---------- */
function prepMap(){
  const w=W(),{nx,ny}=w,hs=new Float32Array(w.N),z=w.z,dx=w.dx;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=j*nx+i,i0=Math.max(0,i-1),i1=Math.min(nx-1,i+1),j0=Math.max(0,j-1),j1=Math.min(ny-1,j+1);
    const v=((z[j*nx+i0]-z[j*nx+i1])+(z[j0*nx+i]-z[j1*nx+i]))/(2*dx);hs[c]=clamp(0.68+26*v,0.38,1.25);}
  S.hs=hs;
  const edges=[];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=j*nx+i,a=w.zone[c];
    if(i<nx-1){const b=w.zone[c+1];if(a!==b&&a>=0&&b>=0)edges.push([i+1,j,i+1,j+1,a,b]);}
    if(j<ny-1){const b=w.zone[c+nx];if(a!==b&&a>=0&&b>=0)edges.push([i,j+1,i+1,j+1,a,b]);}}
  S.edges=edges;
}
function setScenario(sc){S.sc=cloneScenario(sc);S.failSet=new Set(S.sc.failCells);S.blockSet=new Set(S.sc.blocks);}
function buildWorld(){
  S.ver++;S.pair=makeWorldPair(S.tp,S.fineNx,S.fineNx/56);prepMap();S.presets=makePresets(W());S.results={};S.ai=null;S.sel=-1;S.probe=-1;S.view='custom';
}

/* ---------- controls ---------- */
function addSlider(host,o){
  const d=document.createElement('div');d.className='ctl';d.innerHTML='<label>'+o.label+'<span></span></label><input type="range" min="'+o.min+'" max="'+o.max+'" step="'+o.step+'">';
  const inp=d.querySelector('input'),sp=d.querySelector('span');
  const upd=()=>{sp.textContent=o.fmt?o.fmt(+inp.value):inp.value;};
  inp.addEventListener('input',()=>{o.set(+inp.value);upd();if(o.kind==='th')onThresh();else if(o.kind!=='terrain')onEdit();});
  host.appendChild(d);S.sliders.push({sync(){inp.value=o.get();upd();}});
}
function addSelect(host,label,opts,get,set){
  const d=document.createElement('div');d.className='ctl';d.innerHTML='<label>'+label+'</label><select>'+opts.map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join('')+'</select>';
  const sel=d.querySelector('select');sel.addEventListener('change',()=>{set(sel.value);onEdit();});host.appendChild(d);S.sliders.push({sync(){sel.value=get();}});
}
function buildControls(){
  const sc=()=>S.sc,r=$('#c-rain');r.innerHTML='';$('#c-river').innerHTML='';$('#c-sea').innerHTML='';$('#c-drain').innerHTML='';$('#c-th').innerHTML='';$('#c-terrain').innerHTML='';S.sliders=[];
  addSlider(r,{label:'Peak intensity',min:2,max:60,step:1,fmt:v=>v+' mm/h',get:()=>sc().rain.peak,set:v=>sc().rain.peak=v});
  addSlider(r,{label:'Storm duration',min:6,max:72,step:1,fmt:v=>v+' h',get:()=>sc().rain.dur,set:v=>sc().rain.dur=v});
  addSlider(r,{label:'Storm starts at',min:0,max:24,step:1,fmt:v=>'t+'+v+' h',get:()=>sc().rain.start,set:v=>sc().rain.start=v});
  addSelect(r,'Storm shape',[['bell','Single burst'],['front','Front-loaded'],['back','Back-loaded'],['double','Double burst'],['uniform','Steady']],()=>sc().rain.shape,v=>sc().rain.shape=v);
  addSlider(r,{label:'Background drizzle',min:0,max:4,step:0.1,fmt:v=>v.toFixed(1)+' mm/h',get:()=>sc().rain.base,set:v=>sc().rain.base=v});
  addSlider(r,{label:'Ghats rainfall gain',min:0,max:1.2,step:0.05,fmt:v=>'+'+Math.round(v*100)+'%',get:()=>sc().rain.orog,set:v=>sc().rain.orog=v});
  addSlider(r,{label:'Last 5 days rainfall',min:0,max:120,step:1,fmt:v=>v+' mm',get:()=>sc().antecedent,set:v=>sc().antecedent=v});
  addSelect(r,'Forecast horizon',[['48','48 hours'],['72','72 hours'],['96','96 hours']],()=>String(sc().horizon),v=>sc().horizon=+v);
  const rv=$('#c-river');
  addSlider(rv,{label:'Upstream catchment (main river)',min:300,max:4000,step:50,fmt:v=>v+' km²',get:()=>sc().aup,set:v=>sc().aup=v});
  addSlider(rv,{label:'River level at start',min:0,max:2.5,step:0.1,fmt:v=>v.toFixed(1)+' m',get:()=>sc().riverInit,set:v=>sc().riverInit=v});
  addSlider(rv,{label:'Standing water in paddies',min:0,max:0.5,step:0.05,fmt:v=>v.toFixed(2)+' m',get:()=>sc().initWet,set:v=>sc().initWet=v});
  addSlider(rv,{label:'Dam release (peak)',min:0,max:3500,step:50,fmt:v=>v+' m³/s',get:()=>sc().dam.peak,set:v=>sc().dam.peak=v});
  addSlider(rv,{label:'Release starts at',min:0,max:48,step:1,fmt:v=>'t+'+v+' h',get:()=>sc().dam.start,set:v=>sc().dam.start=v});
  addSlider(rv,{label:'Release held for',min:0,max:30,step:1,fmt:v=>v+' h',get:()=>sc().dam.hold,set:v=>sc().dam.hold=v});
  const se=$('#c-sea');
  addSlider(se,{label:'Tidal amplitude',min:0.1,max:0.9,step:0.05,fmt:v=>v.toFixed(2)+' m',get:()=>sc().tide.amp,set:v=>sc().tide.amp=v});
  addSlider(se,{label:'Storm surge',min:0,max:1.8,step:0.1,fmt:v=>v.toFixed(1)+' m',get:()=>sc().tide.surge,set:v=>sc().tide.surge=v});
  addSlider(se,{label:'Surge peaks at',min:0,max:72,step:1,fmt:v=>'t+'+v+' h',get:()=>sc().tide.surgeAt,set:v=>sc().tide.surgeAt=v});
  const dr=$('#c-drain');
  addSlider(dr,{label:'Drainage capacity',min:0,max:200,step:5,fmt:v=>v+'%',get:()=>Math.round(sc().drainMult*100),set:v=>sc().drainMult=v/100});
  const th=$('#c-th');
  addSlider(th,{kind:'th',label:'Warning depth',min:0.05,max:0.5,step:0.01,fmt:v=>v.toFixed(2)+' m',get:()=>S.th.dW,set:v=>S.th.dW=Math.min(v,S.th.dC-0.05)});
  addSlider(th,{kind:'th',label:'Critical depth',min:0.2,max:1.5,step:0.05,fmt:v=>v.toFixed(2)+' m',get:()=>S.th.dC,set:v=>S.th.dC=Math.max(v,S.th.dW+0.05)});
  addSlider(th,{kind:'th',label:'Zone trigger (share of area)',min:2,max:40,step:1,fmt:v=>v+'%',get:()=>Math.round(S.th.share*100),set:v=>S.th.share=v/100});
  const te=$('#c-terrain');
  addSlider(te,{label:'Ghats relief',min:150,max:1200,step:25,fmt:v=>v+' m',get:()=>S.tp.relief,set:v=>S.tp.relief=v,kind:'terrain'});
  addSlider(te,{label:'Backwater lowland',min:0,max:1,step:0.05,fmt:v=>Math.round(v*100)+'%',get:()=>S.tp.lowland,set:v=>S.tp.lowland=v,kind:'terrain'});
  addSlider(te,{label:'Rivers',min:1,max:3,step:1,fmt:v=>v,get:()=>S.tp.nRivers,set:v=>S.tp.nRivers=v,kind:'terrain'});
  addSlider(te,{label:'Terrain seed',min:1,max:60,step:1,fmt:v=>v,get:()=>S.tp.seed,set:v=>S.tp.seed=v,kind:'terrain'});
  S.sliders.forEach(s=>s.sync());
  // preset chips
  const pc=$('#presetChips');pc.innerHTML='';
  S.presets.forEach(p=>{const b=document.createElement('button');b.className='chip';b.textContent=p.name;b.dataset.id=p.id;b.onclick=()=>loadPreset(p.id);pc.appendChild(b);});
  const tc=$('#toolChips');tc.innerHTML='';
  [['inspect','Inspect'],['fail','Fail drains'],['block','Block river'],['erase','Erase']].forEach(t=>{const b=document.createElement('button');b.className='chip tool'+(S.tool===t[0]?' on':'');b.textContent=t[1];b.onclick=()=>{S.tool=t[0];[...tc.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');$('#map').style.cursor=t[0]==='inspect'?'crosshair':'cell';};tc.appendChild(b);});
  const cl=document.createElement('button');cl.className='chip';cl.textContent='Clear all';cl.onclick=()=>{S.failSet.clear();S.blockSet.clear();syncTools();onEdit();};tc.appendChild(cl);
  updateRainStats();syncTools();
}
function syncTools(){S.sc.failCells=[...S.failSet];S.sc.blocks=[...S.blockSet];$('#toolInfo').textContent=S.failSet.size+' cells with failed drains, '+S.blockSet.size+' cells blocked.';drawMap();}
function updateRainStats(){const rs=rainStats(S.sc,S.sc.horizon);$('#rainStats').innerHTML='Total <b>'+Math.round(rs.total)+' mm</b> over '+S.sc.horizon+' h. Wettest 24 h: <b>'+Math.round(rs.max24)+' mm</b>, IMD class <b>'+rs.imd+'</b>.'+(S.sc.rain.series?' Using loaded hourly series.':'');}
function onEdit(){S.dirty=true;$('#btnRun').classList.add('dirty');$('#runInfo').textContent='Inputs changed. Run to update the physics.';updateRainStats();scheduleAiLive();chartsSoon();S.hsel=null;}
function onThresh(){if(S.ai)$('#aiStatus').innerHTML='Thresholds changed since the emulator was trained. Press Retrain to match them.';for(const k in S.results){const r=S.results[k];r.an=analyze(W(),r.res,S.th);r.aiFc=null;}updatePanels();drawMap();}
function loadPreset(id){
  const p=S.presets.find(x=>x.id===id);setScenario(p);S.sc.name='Custom';S.sc.id=id;buildControls();
  $('#presetDesc').textContent=p.desc;[...$('#presetChips').children].forEach(c=>c.classList.toggle('on',c.dataset.id===id));
  if(S.results[id]){S.view=id;S.dirty=false;S.f=Math.min(S.f,S.results[id].res.t.length-1);afterView();}else runCustom();
}

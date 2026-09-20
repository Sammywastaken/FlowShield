'use strict';
/* ============ FLOWSHIELD AI: physics-trained neural emulator + probabilistic forecast ============ */
const AI_HORIZON=72;
const SHAPES=['bell','front','back','double','uniform'];
function lhs(n,d,r){const cols=[];for(let k=0;k<d;k++){const p=[];for(let i=0;i<n;i++)p.push((i+r())/n);for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]];}cols.push(p);}
  return Array.from({length:n},(_,i)=>cols.map(c=>c[i]));}
function designToScenario(u){
  const sc=defaultScenario();
  const pk=Math.exp(Math.log(2)+u[0]*(Math.log(50)-Math.log(2)));
  sc.rain={peak:pk,dur:10+u[1]*62,start:2+u[9]*10,shape:SHAPES[Math.min(4,Math.floor(u[2]*5))],base:u[3]*3,orog:0.2+u[8]*0.8,series:null};
  sc.dam={peak:u[4]<0.35?0:(u[4]-0.35)/0.65*2200,start:8+u[10]*30,hold:6+u[11]*14};
  sc.tide={amp:0.3+0.3*u[12],surge:u[5]<0.5?0:(u[5]-0.5)*2*1.3,surgeAt:10+u[10]*40};
  sc.antecedent=u[6]*100;sc.drainMult=0.2+u[7]*1.1;sc.horizon=AI_HORIZON;
  return sc;
}
function scenarioFeatures(sc){
  const rs=rainStats(sc,AI_HORIZON);
  return [Math.log(1+rs.total)/Math.log(1+800),rs.peak/40,sc.rain.series?Math.min(1,rs.total/Math.max(1,rs.peak)/72):sc.rain.dur/72,sc.dam.peak/2000,sc.tide.surge/1.2,sc.antecedent/100,sc.drainMult,sc.rain.orog,rs.max24/350];
}
const SC_FEAT=['Total rain','Peak intensity','Storm duration','Dam release','Storm surge','Antecedent wetness','Drainage capacity','Orographic gain','Max 24 h rain'];
function zoneFeatures(w){return w.zones.map(z=>[Math.log1p(Math.max(0,z.meanZ))/6,Math.log1p(Math.max(0,z.minZ))/6,z.cnM/100,z.drM/15,z.rdist/6,z.urbF,z.cdist/40,z.dens/3000]);}
const Z_FEAT=['Mean elevation','Min elevation','Curve number','Drain capacity','River distance','Urban share','Coast distance','Pop. density'];
const ALL_FEAT=SC_FEAT.concat(Z_FEAT);

/* ---- tiny MLP with Adam (tanh hidden) ---- */
function mlpInit(sizes,r){const W=[],B=[];for(let l=0;l<sizes.length-1;l++){const fi=sizes[l],fo=sizes[l+1],w=new Float64Array(fi*fo),s=Math.sqrt(6/(fi+fo));for(let k=0;k<w.length;k++)w[k]=(r()*2-1)*s;W.push(w);B.push(new Float64Array(fo));}
  return{sizes,W,B,mW:W.map(a=>new Float64Array(a.length)),vW:W.map(a=>new Float64Array(a.length)),mB:B.map(a=>new Float64Array(a.length)),vB:B.map(a=>new Float64Array(a.length)),t:0};}
function mlpForward(m,x,acts){const L=m.sizes.length-1;let a=x;acts[0]=a;
  for(let l=0;l<L;l++){const fi=m.sizes[l],fo=m.sizes[l+1],W=m.W[l],B=m.B[l],o=acts[l+1]||(acts[l+1]=new Float64Array(fo));
    for(let j=0;j<fo;j++){let s=B[j];const off=j*fi;for(let i=0;i<fi;i++)s+=W[off+i]*a[i];o[j]=l<L-1?Math.tanh(s):s;}a=o;}return a;}
const sig=x=>1/(1+Math.exp(-x));
function mlpStep(m,batch,lr){ // batch: [{x,y:[crit,logd,eta],mk}]
  const L=m.sizes.length-1,gW=m.W.map(a=>new Float64Array(a.length)),gB=m.B.map(a=>new Float64Array(a.length));let loss=0;
  const acts=[];
  for(const s of batch){const o=mlpForward(m,s.x,acts);
    const p=sig(o[0]),d=[p-s.y[0],2*(o[1]-s.y[1])*1.0,s.mk?2*(o[2]-s.y[2])*0.5:0];
    loss+=-(s.y[0]*Math.log(p+1e-9)+(1-s.y[0])*Math.log(1-p+1e-9))+(o[1]-s.y[1])**2+(s.mk?0.5*(o[2]-s.y[2])**2:0);
    let delta=Float64Array.from(d);
    for(let l=L-1;l>=0;l--){const fi=m.sizes[l],fo=m.sizes[l+1],a=acts[l];
      for(let j=0;j<fo;j++){const dj=delta[j];gB[l][j]+=dj;const off=j*fi;for(let i=0;i<fi;i++)gW[l][off+i]+=dj*a[i];}
      if(l>0){const nd=new Float64Array(fi);for(let i=0;i<fi;i++){let sum=0;for(let j=0;j<fo;j++)sum+=m.W[l][j*fi+i]*delta[j];nd[i]=sum*(1-a[i]*a[i]);}delta=nd;}}}
  m.t++;const b1=0.9,b2=0.999,n=batch.length,c1=1-Math.pow(b1,m.t),c2=1-Math.pow(b2,m.t);
  for(let l=0;l<L;l++){for(const [P,G,M,V] of [[m.W[l],gW[l],m.mW[l],m.vW[l]],[m.B[l],gB[l],m.mB[l],m.vB[l]]])
    for(let k=0;k<P.length;k++){const g=G[k]/n+1e-5*P[k];M[k]=b1*M[k]+(1-b1)*g;V[k]=b2*V[k]+(1-b2)*g*g;P[k]-=lr*(M[k]/c1)/(Math.sqrt(V[k]/c2)+1e-8);}}
  return loss/n;
}
function auc(scores,labels){const idx=scores.map((s,i)=>i).sort((a,b)=>scores[a]-scores[b]);let rs=0,np=0,nn=0;idx.forEach((i,r)=>{if(labels[i]){rs+=r+1;np++;}else nn++;});return np&&nn?(rs-np*(np+1)/2)/(np*nn):NaN;}

/* ---- ensemble generation + training (generator: yields progress) ---- */
function* trainEmulator(wc,opts){
  opts=opts||{};const nMem=opts.members||44,r=rng(opts.seed||2024),th=opts.th||{dW:0.15,dC:0.5,share:0.1};
  const design=lhs(nMem,13,r),zf=zoneFeatures(wc),K=wc.zones.length,rows=[];
  for(let m=0;m<nMem;m++){
    const sc=designToScenario(design[m]),g=simulate(wc,sc,{frameH:1,spinH:6,dtMax:150});let it;while(!(it=g.next()).done){yield{stage:'ensemble',progress:(m+it.value.progress)/nMem*0.85,member:m+1,of:nMem};}
    const an=analyze(wc,it.value,th),sf=scenarioFeatures(sc);
    for(let k=0;k<K;k++){const Z=an.zones[k];if(Z.land<1)continue;const crit=isFinite(Z.etaC)?1:0;
      rows.push({m,x:sf.concat(zf[k]),y:[crit,Math.log(0.02+Z.peakP90),Math.min(1,(crit?Z.etaC:AI_HORIZON)/AI_HORIZON)],mk:crit});}
    yield{stage:'ensemble',progress:(m+1)/nMem*0.85,member:m+1,of:nMem};
  }
  const nf=rows[0].x.length,mean=new Float64Array(nf),std=new Float64Array(nf);
  for(const s of rows)for(let i=0;i<nf;i++)mean[i]+=s.x[i]/rows.length;
  for(const s of rows)for(let i=0;i<nf;i++)std[i]+=(s.x[i]-mean[i])**2/rows.length;
  for(let i=0;i<nf;i++)std[i]=Math.sqrt(std[i])+1e-6;
  for(const s of rows)s.xn=s.x.map((v,i)=>(v-mean[i])/std[i]);
  const hold=new Set();for(let m=0;m<nMem;m++)if(m%5===2)hold.add(m);
  const tr=rows.filter(s=>!hold.has(s.m)),va=rows.filter(s=>hold.has(s.m));
  const model=mlpInit([nf,24,24,3],r),loss=[],valLoss=[];
  const E=opts.epochs||220;
  for(let e=0;e<E;e++){
    for(let i=tr.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[tr[i],tr[j]]=[tr[j],tr[i]];}
    let el=0,nb=0;for(let b=0;b<tr.length;b+=32){el+=mlpStep(model,tr.slice(b,b+32).map(s=>({x:s.xn,y:s.y,mk:s.mk})),0.006*(1-0.7*e/E));nb++;}
    loss.push(el/nb);
    if(e%5===0){let vl=0;const acts=[];for(const s of va){const o=mlpForward(model,s.xn,acts);const p=sig(o[0]);vl+=-(s.y[0]*Math.log(p+1e-9)+(1-s.y[0])*Math.log(1-p+1e-9))+(o[1]-s.y[1])**2;}valLoss.push([e,vl/Math.max(1,va.length)]);}
    if(e%10===0)yield{stage:'train',progress:0.85+0.15*e/E};
  }
  const model_={model,mean,std,nf};
  const ev=evalModel(model_,va);
  const imp=permImportance(model_,va);
  return{model:model_,loss,valLoss,eval:ev,importance:imp,nTrain:tr.length,nVal:va.length,nMem,points:ev.points};
}
function predictRow(M,x){const xn=x.map((v,i)=>(v-M.mean[i])/M.std[i]);const o=mlpForward(M.model,xn,[]);return{p:sig(o[0]),depth:Math.max(0,Math.exp(o[1])-0.02),eta:clamp(o[2],0,1)*AI_HORIZON};}
function evalModel(M,va){
  let sse=0,sst=0,mean=0;const pts=[];for(const s of va)mean+=s.y[1]/va.length;
  const sc=[],lb=[];let tp=0,tn=0,fp=0,fn=0,ae=0,ne=0;
  for(const s of va){const o=mlpForward(M.model,s.xn,[]);const d=Math.exp(o[1])-0.02,dt=Math.exp(s.y[1])-0.02;
    sse+=(o[1]-s.y[1])**2;sst+=(s.y[1]-mean)**2;pts.push([dt,Math.max(0,d)]);
    const p=sig(o[0]);sc.push(p);lb.push(s.y[0]);if(p>=0.5&&s.y[0])tp++;else if(p<0.5&&!s.y[0])tn++;else if(p>=0.5)fp++;else fn++;
    if(s.mk){ae+=Math.abs(o[2]-s.y[2])*AI_HORIZON;ne++;}}
  return{r2:1-sse/sst,auc:auc(sc,lb),acc:(tp+tn)/va.length,etaMAE:ne?ae/ne:NaN,tp,tn,fp,fn,points:pts};
}
function permImportance(M,va){
  const base=evalLoss(M,va),r=rng(5),imp=[];
  for(let f=0;f<M.nf;f++){const sh=va.map(s=>s.xn.slice());const col=sh.map(x=>x[f]);for(let i=col.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[col[i],col[j]]=[col[j],col[i]];}
    sh.forEach((x,i)=>x[f]=col[i]);imp.push(Math.max(0,evalLoss(M,va,sh)-base));}
  const mx=Math.max(...imp,1e-9);return imp.map((v,i)=>({name:ALL_FEAT[i],v:v/mx,group:i<SC_FEAT.length?'Weather / operations':'Terrain / land'}));
}
function evalLoss(M,va,xs){let l=0;for(let i=0;i<va.length;i++){const s=va[i],o=mlpForward(M.model,xs?xs[i]:s.xn,[]);const p=sig(o[0]);l+=-(s.y[0]*Math.log(p+1e-9)+(1-s.y[0])*Math.log(1-p+1e-9))+(o[1]-s.y[1])**2;}return l/va.length;}
function gauss(r){return Math.sqrt(-2*Math.log(r()+1e-12))*Math.cos(6.2832*r());}
/* Monte-Carlo forecast: perturb the current scenario (forecast error) and push through the emulator */
function aiForecast(M,w,sc,n,seed){
  n=n||300;const r=rng(seed||7),zf=zoneFeatures(w),K=w.zones.length;
  const acc=Array.from({length:K},()=>({p:0,depth:0,etas:[],cnt:0}));
  for(let i=0;i<n;i++){
    const s=cloneScenario(sc),f=Math.exp(0.28*gauss(r));
    if(s.rain.series)s.rain.series=s.rain.series.map(v=>v*f);else{s.rain.peak*=f;s.rain.base*=f;s.rain.dur*=clamp(1+0.12*gauss(r),0.7,1.3);}
    s.tide.surge=Math.max(0,s.tide.surge+0.15*gauss(r));s.antecedent=clamp(s.antecedent+12*gauss(r),0,100);
    s.drainMult=clamp(s.drainMult*(0.85+0.2*r()),0.05,1.5);s.dam.peak=Math.max(0,s.dam.peak*Math.exp(0.2*gauss(r)));
    const sf=scenarioFeatures(s);
    for(let k=0;k<K;k++){if(w.zones[k].land<1)continue;const o=predictRow(M,sf.concat(zf[k]));const a=acc[k];a.p+=o.p;a.depth+=o.depth;a.cnt++;if(o.p>0.5)a.etas.push(o.eta);}
  }
  const q=(a,p)=>{if(!a.length)return NaN;const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(p*(s.length-1))];};
  return acc.map(a=>({pCrit:a.cnt?a.p/a.cnt:0,depth:a.cnt?a.depth/a.cnt:0,eta10:q(a.etas,0.1),eta50:q(a.etas,0.5),eta90:q(a.etas,0.9),nCrit:a.etas.length}));
}
function aiPointForecast(M,w,sc){const zf=zoneFeatures(w),sf=scenarioFeatures(sc);return w.zones.map((z,k)=>z.land<1?{p:0,depth:0,eta:AI_HORIZON}:predictRow(M,sf.concat(zf[k])));}
if(typeof module!=='undefined')module.exports={trainEmulator,aiForecast,aiPointForecast,designToScenario,scenarioFeatures,AI_HORIZON,ALL_FEAT};

'use strict';
/* ============ FLOWSHIELD ENGINE (pure JS, no DOM) ============ */
const G = 9.81;
const LU = [
  {id:0,name:'Sea',cn:100,n:0.025,drain:0,pop:0},
  {id:1,name:'River / backwater',cn:100,n:0.035,drain:0,pop:0},
  {id:2,name:'Urban',cn:92,n:0.05,drain:25,pop:5200},
  {id:3,name:'Homestead',cn:80,n:0.07,drain:6,pop:1100},
  {id:4,name:'Paddy / wetland',cn:88,n:0.08,drain:8,pop:320},
  {id:5,name:'Plantation',cn:72,n:0.09,drain:1.5,pop:220},
  {id:6,name:'Forest',cn:60,n:0.12,drain:0,pop:12},
];
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const sstep=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeNoise(seed){
  const r=rng(seed),perm=new Uint8Array(512),val=new Float32Array(256);
  for(let i=0;i<256;i++){perm[i]=i;val[i]=r()*2-1;}
  for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));const t=perm[i];perm[i]=perm[j];perm[j]=t;}
  for(let i=0;i<256;i++)perm[i+256]=perm[i];
  const fade=t=>t*t*(3-2*t);
  function n2(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,X=xi&255,Y=yi&255;
    const a=val[perm[perm[X]+Y]],b=val[perm[perm[X+1]+Y]],c=val[perm[perm[X]+Y+1]],d=val[perm[perm[X+1]+Y+1]];
    const u=fade(xf),v=fade(yf);return(a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;}
  function fbm(x,y,o){o=o||4;let s=0,a=0.5,f=1,n=0;for(let i=0;i<o;i++){s+=a*n2(x*f+i*17.3,y*f+i*9.1);n+=a;a*=0.5;f*=2.03;}return s/n;}
  return{n2,fbm};
}

/* ---------- Procedural Kerala-like basin: Ghats (east) -> midland -> lowland/backwaters -> Arabian Sea (west) ---------- */
const DEFAULT_TERRAIN={seed:11,W:44,H:33,coast:3,relief:450,lowland:0.75,nRivers:3};
function makeTerrain(P){
  const {W,H,coast,relief,lowland,nRivers,seed}=P, L=W-coast;
  const nz=makeNoise(seed),nz2=makeNoise(seed*7+13),nz3=makeNoise(seed+99),r=rng(seed*31+7);
  const zbase=xl=>relief*Math.pow(xl/L,2.3)+0.35;
  const mainK=Math.floor(nRivers/2), rivers=[];
  for(let k=0;k<nRivers;k++){
    const frac=nRivers===1?0.5:0.2+0.6*k/(nRivers-1);
    const rv={size:k===mainK?1:0.7,y0:H*frac+(r()-0.5)*2,amp:0.8+r()*1.4,lam:7+r()*6,ph:r()*6.283,tilt:(r()-0.5)*0.16,px:[],py:[],pxl:[]};
    for(let x=coast;x<=W+0.3;x+=0.2){const xl=x-coast;
      const y=rv.y0+rv.amp*Math.sin(6.2832*xl/rv.lam+rv.ph)*(0.25+0.75*xl/L)+rv.tilt*xl;
      rv.px.push(x);rv.py.push(clamp(y,1.2,H-1.2));rv.pxl.push(xl);}
    rivers.push(rv);
  }
  function sample(x,y,dx,o){
    o.sea=false;o.chan=false;o.lagoon=false;o.k=-1;o.cd=0;o.d=99;o.low=0;o.zfp=0;
    if(x<coast){o.z=-2.5*Math.pow((coast-x)/coast,0.7);o.sea=true;return o;}
    const xl=x-coast,zb=zbase(xl),A=1.2+0.11*zb;
    let zt=zb+A*nz.fbm(x/4.5,y/4.5,4);
    const rh=1.4+1.2*(nz2.n2(y/2.5,3.3)*0.5+0.5);
    zt+=rh*Math.exp(-Math.pow((x-(coast+0.55))/0.45,2));
    const yy=y+2.5*nz3.n2(x/6,1.7);
    const by=sstep(0.10*H,0.28*H,yy)*(1-sstep(0.62*H,0.88*H,yy));
    let m=lowland*by*(1-sstep(3,10,xl))*(0.65+0.35*(nz3.n2(x/3,y/3)*0.5+0.5));
    if(m>0){
      let zl=0.25+0.3*(nz3.n2(x/2,y/2)*0.5+0.5);
      if(m>0.45&&nz2.fbm(x/3,y/3,3)>0.12){zl=-2;o.lagoon=true;zt=zl;}else zt=zt*(1-m)+zl*m;
    }
    o.low=m;
    let best=1e9,bk=-1,bi=0;
    for(let k=0;k<nRivers;k++){const rv=rivers[k];
      for(let i=0;i<rv.px.length;i++){const ddx=rv.px[i]-x,ddy=rv.py[i]-y,d2=ddx*ddx+ddy*ddy;if(d2<best){best=d2;bk=k;bi=i;}}}
    const d=Math.sqrt(best),rv=rivers[bk],xr=rv.pxl[bi];
    const cd=rv.size*(1.5+2.6*Math.pow(xr/L,0.7)),Wv=rv.size*(0.8+2.4*(1-xr/L)),wc=0.9*dx;
    const zfp=zbase(xr);
    o.d=d;o.k=bk;o.zfp=zfp;
    let z=zt;
    if(d<wc+Wv){const s=sstep(0,1,(d-wc)/Wv);z=zfp*(1-s)+zt*s;
      if(d<wc){z=zfp-cd+cd*Math.pow(d/wc,4);o.chan=true;o.cd=cd*(1-Math.pow(d/wc,4));o.lagoon=false;}}
    o.z=z;return o;
  }
  return{P,sample,rivers,mainK,noise:nz,noise2:nz2,noise3:nz3,zbase};
}

/* ---------- World (grid) construction ---------- */
function buildWorldFromTerrain(T,nx,ny,meta){
  const P=T.P,dxk=P.W/nx,dx=dxk*1000,N=nx*ny,o={};
  const w={nx,ny,N,dx,dxk,W:P.W,H:P.H,coast:P.coast,relief:P.relief,
    z:new Float32Array(N),lu:new Uint8Array(N),chan:new Uint8Array(N),isSea:new Uint8Array(N),
    n:new Float32Array(N),cn:new Float32Array(N),drain:new Float32Array(N),pop:new Float32Array(N),
    zone:new Int16Array(N).fill(-1),cd:new Float32Array(N),kr:new Int8Array(N).fill(-1),dr:new Float32Array(N),urb:new Float32Array(N),
    heads:[],source:'synthetic',mainK:T.mainK,nRivers:P.nRivers};
  const cities=meta?meta.cities:null;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const c=j*nx+i,x=(i+0.5)*dxk,y=(j+0.5)*dxk;T.sample(x,y,dxk,o);
    w.z[c]=o.z;w.dr[c]=Math.min(o.d,30);
    let urb=0;if(cities)for(const ct of cities){const dd=((x-ct.x)**2+(y-ct.y)**2)/(ct.rc*ct.rc);urb+=Math.exp(-dd);}
    w.urb[c]=urb;
    let lu;
    if(o.sea){lu=0;w.isSea[c]=1;}
    else if(o.chan||o.lagoon){lu=1;if(o.chan){w.chan[c]=1;w.cd[c]=o.cd;w.kr[c]=o.k;}}
    else{
      const zz=o.z,nn=T.noise2.fbm(x/1.5,y/1.5,3);
      if(cities&&urb+0.25*nn>0.36&&zz<60)lu=2;
      else if(zz<2.5&&o.low>0.3)lu=4;
      else if(o.d<1.4&&zz<12&&T.noise3.fbm(x/2,y/2,3)>0.05)lu=4;
      else if(zz>0.42*P.relief*(0.85+0.3*T.noise3.fbm(x/3,y/3,3)))lu=6;
      else if(zz>0.10*P.relief)lu=5;
      else lu=3;
    }
    w.lu[c]=lu;
  }
  finishWorld(w,T.noise2);
  return w;
}
function finishWorld(w,noise){
  const {nx,ny,N,dxk}=w;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=j*nx+i,L=LU[w.lu[c]];
    w.n[c]=L.n;w.cn[c]=L.cn;w.drain[c]=L.drain;
    const v=noise?noise.n2((i+0.5)*dxk*2.3,(j+0.5)*dxk*2.3)*0.5+0.5:0.5;
    w.pop[c]=L.pop*dxk*dxk*(0.7+0.6*v)*(w.lu[c]===2?(0.8+0.6*Math.min(1,w.urb[c]||1)):1);
  }
  w.heads=[];for(let k=0;k<w.nRivers;k++)w.heads.push([]);
  for(let j=0;j<ny;j++)for(let i=nx-2;i<nx;i++){const c=j*nx+i;if(w.chan[c]&&w.kr[c]>=0&&w.kr[c]<w.nRivers)w.heads[w.kr[c]].push(c);}
}
function pickCities(w,r,count){
  const {nx,ny,dxk,coast}=w,cand=[];
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(w.isSea[c]||w.lu[c]===1)continue;
    const x=(i+0.5)*dxk,y=(j+0.5)*dxk,z=w.z[c];if(z<1||z>45)continue;
    const s=Math.exp(-(x-coast)/14)*Math.exp(-w.dr[c]/1.8)*(0.6+0.4*r());cand.push({x,y,s});}
  cand.sort((a,b)=>b.s-a.s);const out=[];
  for(const c of cand){if(out.length>=count)break;if(out.every(o=>Math.hypot(o.x-c.x,o.y-c.y)>8))out.push({x:c.x,y:c.y,rc:out.length===0?3.3:1.9+r()*0.6});}
  return out;
}
function makeZoneSeeds(w,K,r){
  const land=[];for(let c=0;c<w.N;c++)if(!w.isSea[c])land.push([(c%w.nx+0.5)*w.dxk,(Math.floor(c/w.nx)+0.5)*w.dxk]);
  let seeds=[land[Math.floor(r()*land.length)]];
  while(seeds.length<K){let bi=0,bd=-1;for(let i=0;i<land.length;i+=3){let md=1e9;for(const s of seeds){const d=(land[i][0]-s[0])**2+(land[i][1]-s[1])**2;if(d<md)md=d;}if(md>bd){bd=md;bi=i;}}seeds.push(land[bi]);}
  for(let it=0;it<7;it++){const sx=new Float64Array(K),sy=new Float64Array(K),cn=new Float64Array(K);
    for(const p of land){let b=0,bd=1e9;for(let k=0;k<K;k++){const d=(p[0]-seeds[k][0])**2+(p[1]-seeds[k][1])**2;if(d<bd){bd=d;b=k;}}sx[b]+=p[0];sy[b]+=p[1];cn[b]++;}
    seeds=seeds.map((s,k)=>cn[k]?[sx[k]/cn[k],sy[k]/cn[k]]:s);}
  return seeds;
}
function assignZones(w,seeds){
  const K=seeds.length;
  for(let c=0;c<w.N;c++){if(w.isSea[c]){w.zone[c]=-1;continue;}
    const x=(c%w.nx+0.5)*w.dxk,y=(Math.floor(c/w.nx)+0.5)*w.dxk;let b=0,bd=1e9;
    for(let k=0;k<K;k++){const d=(x-seeds[k][0])**2+(y-seeds[k][1])**2;if(d<bd){bd=d;b=k;}}w.zone[c]=b;}
  const Z=[];for(let k=0;k<K;k++)Z.push({id:k,cx:seeds[k][0],cy:seeds[k][1],cells:0,land:0,pop:0,sz:0,mz:1e9,cn:0,dr:0,drn:0,urb:0,luc:new Array(7).fill(0)});
  for(let c=0;c<w.N;c++){const k=w.zone[c];if(k<0)continue;const Zk=Z[k];Zk.cells++;Zk.pop+=w.pop[c];Zk.luc[w.lu[c]]++;
    if(w.lu[c]>=2){Zk.land++;Zk.sz+=w.z[c];if(w.z[c]<Zk.mz)Zk.mz=w.z[c];Zk.cn+=w.cn[c];Zk.dr+=w.dr[c];Zk.drn+=w.drain[c];if(w.lu[c]===2)Zk.urb++;}}
  for(const Zk of Z){const l=Math.max(1,Zk.land);Zk.area=Zk.cells*w.dxk*w.dxk;Zk.meanZ=Zk.sz/l;Zk.minZ=Zk.mz===1e9?0:Zk.mz;Zk.cnM=Zk.cn/l;Zk.drM=Zk.drn/l;Zk.rdist=Zk.dr/l;Zk.urbF=Zk.urb/l;
    Zk.cdist=Math.max(0,Zk.cx-w.coast);Zk.dens=Zk.pop/Math.max(0.01,Zk.area);
    let bl=2,bm=-1;for(let q=2;q<7;q++)if(Zk.luc[q]>bm){bm=Zk.luc[q];bl=q;}Zk.dom=bl;}
  w.zones=Z;return Z;
}
function nameZones(Z,seed){
  const r=rng(seed*13+5),used=new Set();
  const pre=['Ka','Cha','Pe','Ko','Man','Ala','Thi','Ku','Ni','Pa','Mu','Va','Ari','Ma','Vai','Ran','Tha','Ede','Aan','Mee','Nedu','Puth','Chen','Vela'];
  const mid=['','','ra','va','na','li','ka','ma','ni','la'];
  for(const z of Z){
    let suf;
    if(z.meanZ>90)suf=['mala','malai'];else if(z.minZ<1.2&&z.dom===4)suf=['kandam','kayal'];else if(z.urbF>0.3)suf=['puram','ur','nagar'];
    else if(z.rdist<1.2)suf=['puzha','kadavu'];else if(z.cdist<8)suf=['kara','thura'];else suf=['pally','kulam','mangalam'];
    let nm,tries=0;do{nm=pre[Math.floor(r()*pre.length)]+mid[Math.floor(r()*mid.length)]+suf[Math.floor(r()*suf.length)];tries++;}while(used.has(nm)&&tries<40);
    used.add(nm);z.name=nm;
  }
}
function pickLandmarks(w,meta){
  // gauge and blockage on main river near the metro city
  const ct=meta.cities&&meta.cities[0]?meta.cities[0]:{x:w.coast+8,y:w.H/2};
  const mk=w.mainK;let bestG=-1,bg=1e9;
  for(let c=0;c<w.N;c++){if(!w.chan[c]||w.kr[c]!==mk)continue;const x=(c%w.nx+0.5)*w.dxk,y=(Math.floor(c/w.nx)+0.5)*w.dxk;
    const d=Math.abs(x-ct.x)*2+Math.abs(y-ct.y)*0.2;if(d<bg){bg=d;bestG=c;}}
  w.gauge=bestG;
  const gi=bestG>=0?bestG%w.nx:0,bi=Math.min(w.nx-3,gi+Math.round(2.5/w.dxk));
  const blk=[];let jc=-1;for(let j=0;j<w.ny;j++){const c=j*w.nx+bi;if(w.chan[c]&&w.kr[c]===mk){jc=j;break;}}
  if(jc>=0)for(let j=Math.max(0,jc-2);j<=Math.min(w.ny-1,jc+3);j++){const c=j*w.nx+bi;if(!w.isSea[c])blk.push(c);}
  w.blockCells=blk;
}
function makeWorldPair(terrainP,nxF,factor){
  const T=makeTerrain(terrainP),r=rng(terrainP.seed*5+1);
  const w0=buildWorldFromTerrain(T,nxF,Math.round(nxF*terrainP.H/terrainP.W),null);
  const cities=pickCities(w0,r,4);
  {const rv=T.rivers[T.mainK];const dm=ct=>{let b=1e9;for(let i=0;i<rv.px.length;i++){const d=Math.hypot(rv.px[i]-ct.x,rv.py[i]-ct.y);if(d<b)b=d;}return b;};
   cities.sort((a,b)=>dm(a)-dm(b));cities[0].rc=3.3;for(let i=1;i<cities.length;i++)cities[i].rc=Math.min(cities[i].rc,2.4);}
  const meta={cities};
  const fine=buildWorldFromTerrain(T,nxF,Math.round(nxF*terrainP.H/terrainP.W),meta);
  meta.seeds=makeZoneSeeds(fine,18,r);
  const Z=assignZones(fine,meta.seeds);nameZones(Z,terrainP.seed);
  pickLandmarks(fine,meta);
  const nxC=Math.round(nxF/factor),coarse=buildWorldFromTerrain(T,nxC,Math.round(nxC*terrainP.H/terrainP.W),meta);
  const Zc=assignZones(coarse,meta.seeds);Zc.forEach((z,k)=>z.name=Z[k].name);
  return{T,meta,fine,coarse};
}

/* ---------- Forcing functions ---------- */
function shapeFn(s,tau){
  switch(s){
    case 'uniform':return 1;
    case 'front':{const a=0.25,x=tau/a;return x*Math.exp(1-x);}
    case 'back':{const a=0.25,x=(1-tau)/a;return x*Math.exp(1-x);}
    case 'double':return Math.min(1,Math.exp(-0.5*Math.pow((tau-0.25)/0.1,2))+Math.exp(-0.5*Math.pow((tau-0.75)/0.1,2)));
    default:return Math.exp(-0.5*Math.pow((tau-0.5)/0.2,2));
  }
}
function rainRate(sc,t){
  const r=sc.rain;
  if(r.series){const i=Math.floor(t);return t<0||i>=r.series.length?0:r.series[i];}
  let v=r.base;const tau=(t-r.start)/r.dur;if(tau>=0&&tau<=1)v+=r.peak*shapeFn(r.shape,tau);return v;
}
function tideLevel(sc,t){const td=sc.tide;return -td.amp*Math.cos(6.2832*t/12.42)+td.surge*Math.exp(-Math.pow((t-td.surgeAt)/6,2));}
function damFlow(sc,t){const d=sc.dam;if(!d||d.peak<=0)return 0;const a=t-d.start;if(a<0)return 0;if(a<3)return d.peak*a/3;if(a<3+d.hold)return d.peak;if(a<6+d.hold)return d.peak*(1-(a-3-d.hold)/3);return 0;}
function rainStats(sc,horizon){
  const n=Math.ceil(horizon),h=new Float64Array(n);let tot=0,pk=0;
  for(let i=0;i<n;i++){h[i]=rainRate(sc,i+0.5);tot+=h[i];if(h[i]>pk)pk=h[i];}
  let m24=0;for(let i=0;i<n;i++){let s=0;for(let k=i;k<Math.min(n,i+24);k++)s+=h[k];if(s>m24)m24=s;}
  return{total:tot,peak:pk,max24:m24,hourly:h,imd:imdClass(m24)};
}
function imdClass(mm){if(mm<2.5)return'No rain';if(mm<15.6)return'Light';if(mm<64.5)return'Moderate';if(mm<115.6)return'Heavy';if(mm<204.5)return'Very heavy';return'Extremely heavy';}

function defaultScenario(){return{name:'Custom',
  rain:{peak:18,dur:24,start:6,shape:'bell',base:1,orog:0.7,series:null},
  antecedent:50,aup:1800,K:12,riverInit:1.0,initWet:0.1,
  dam:{peak:0,start:20,hold:12},tide:{amp:0.4,surge:0,surgeAt:30},
  drainMult:1,failFactor:0.9,failCells:[],blocks:[],blockH:4,horizon:72};}
function cloneScenario(s){const c=JSON.parse(JSON.stringify(s));if(s.rain.series)c.rain.series=s.rain.series.slice();return c;}

/* ---------- Scenario presets (built from the world so blockage/failure sites are computed, not hard-coded) ---------- */
function makePresets(w){
  const base=defaultScenario();
  const mk=(id,name,desc,f)=>{const s=cloneScenario(base);s.id=id;s.name=name;s.desc=desc;f(s);return s;};
  const drainable=[];for(let c=0;c<w.N;c++)if((w.lu[c]===2||w.lu[c]===3||w.lu[c]===4)&&w.z[c]<40)drainable.push(c);
  return[
    mk('normal','Normal monsoon','Routine June-July spell, drains coping',s=>{s.rain={peak:4,dur:24,start:6,shape:'bell',base:0.4,orog:0.7,series:null};s.antecedent=30;}),
    mk('heavy','Heavy rainfall','Orange-alert day, wet catchment',s=>{s.rain={peak:14,dur:24,start:6,shape:'bell',base:1,orog:0.7,series:null};s.antecedent=50;}),
    mk('extreme','Extreme event (2018-like)','Three-day double burst, dam release, storm surge',s=>{s.rain={peak:22,dur:54,start:4,shape:'double',base:2,orog:0.8,series:null};s.antecedent=90;s.dam={peak:1800,start:22,hold:14};s.tide={amp:0.45,surge:0.6,surgeAt:40};s.drainMult=0.85;}),
    mk('drainfail','Drainage failure','Heavy rain, urban drains clogged',s=>{s.rain={peak:14,dur:24,start:6,shape:'bell',base:1,orog:0.7,series:null};s.antecedent=50;s.drainMult=1;s.failCells=drainable.slice();s.failFactor=0.92;}),
    mk('blocked','Blocked river channel','Heavy rain, debris jam on the main river',s=>{s.rain={peak:14,dur:24,start:6,shape:'bell',base:1,orog:0.7,series:null};s.antecedent=50;s.blocks=(w.blockCells||[]).slice();s.blockH=8;}),
  ];
}
/* ---------- Simulation core: local-inertial (Bates 2010) 2-D shallow-water + SCS-CN + drainage + tide + upstream inflow ---------- */
function* simulate(w,sc,opts){
  opts=opts||{};const t0=Date.now();
  const {nx,ny,N,dx}=w,dx2=dx*dx,HMIN=1e-3,TH=0.85,HTH=0.5*(1-TH);
  const frameS=(opts.frameH||0.5)*3600,Tend=sc.horizon*3600,spin=(opts.spinH===undefined?8:opts.spinH)*3600;
  const z=new Float64Array(N),h=new Float64Array(N),eta=new Float64Array(N),dh=new Float64Array(N),out=new Float64Array(N),scl=new Float64Array(N),rin=new Float64Array(N);
  for(let c=0;c<N;c++)z[c]=w.z[c];
  for(const c of sc.blocks)z[c]+=sc.blockH;
  const nm=w.n,isSea=w.isSea,qx=new Float64Array((nx+1)*ny),qy=new Float64Array(nx*(ny+1));
  // curve numbers with antecedent moisture interpolation (AMC I -> II -> III)
  const S=new Float64Array(N),Ia=new Float64Array(N),Pc=new Float64Array(N),Qc=new Float64Array(N),oro=new Float64Array(N),dcap=new Float64Array(N),wLow=new Float64Array(N);
  const wet=clamp(sc.antecedent/80,0,1);
  const failSet=new Float32Array(N);for(const c of sc.failCells)failSet[c]=sc.failFactor;
  for(let c=0;c<N;c++){
    const c2=w.cn[c];let cn;
    if(c2>=100)cn=100;else{const c1=4.2*c2/(10-0.058*c2),c3=23*c2/(10+0.13*c2);cn=wet<0.5?c1+(c2-c1)*(wet/0.5):c2+(c3-c2)*((wet-0.5)/0.5);}
    S[c]=cn>=100?0:25400/cn-254;Ia[c]=0.2*S[c];
    oro[c]=1+sc.rain.orog*Math.max(0,w.z[c])/w.relief;
    dcap[c]=w.drain[c]*sc.drainMult*(1-failSet[c])/1000/3600;
    wLow[c]=clamp((8-w.z[c])/6,0,1);
  }
  // initial water
  const tide0=tideLevel(sc,0);
  for(let c=0;c<N;c++){
    if(isSea[c])h[c]=Math.max(0,tide0-z[c]);
    else if(w.lu[c]===1){h[c]=w.chan[c]?sc.riverInit:Math.max(0,-z[c]);}
    else if(w.lu[c]===4&&z[c]<3)h[c]=sc.initWet;
  }
  // upstream catchments (linear reservoir per river)
  const nR=w.nRivers,Sres=new Float64Array(nR),Aup=[],Qb=[];
  for(let k=0;k<nR;k++){const sz=k===w.mainK?1:0.7*0.7*0.6;Aup.push(sc.aup*sz);Qb.push(0.028*Aup[k]*(0.5+0.8*wet));}
  const mass={rain:0,eff:0,inflow:0,drain:0,sea:0,dam:0};
  let t=-spin,nextFrame=0,refSet=false,hmax=3,steps=0;
  const href=new Float32Array(N),T=[],D=[],V=[],tideS=[],rainS=[];
  let Pdom=0;
  const surface=()=>{let s=0;for(let c=0;c<N;c++)if(!isSea[c])s+=h[c];return s*dx2;};
  let store0=0;
  while(true){
    if(!refSet&&t>=-1e-6){href.set(h);refSet=true;t=Math.max(t,0);store0=surface();}
    if(refSet&&t>=nextFrame-1e-6){
      const d=new Float32Array(N),v=new Float32Array(N);
      for(let c=0;c<N;c++){d[c]=h[c];const hh=h[c];if(hh>0.03&&!isSea[c]){const i=c%nx,j=(c-i)/nx,f=j*(nx+1)+i;
        const u=0.5*(qx[f]+qx[f+1])/hh,vv=0.5*(qy[c]+qy[c+nx])/hh;v[c]=Math.min(6,Math.sqrt(u*u+vv*vv));}}
      T.push(t);D.push(d);V.push(v);
      const th=t/3600;tideS.push(tideLevel(sc,th));rainS.push(rainRate(sc,th));
      nextFrame+=frameS;if(t>=Tend-1e-6)break;
    }
    const live=refSet;
    let dt=Math.min(opts.dtMax||120,0.7*dx/Math.sqrt(G*Math.max(hmax,0.05)));
    const lim=live?nextFrame:0;if(t+dt>lim)dt=lim-t;if(dt<=0)dt=0.5;
    const tm=(t+dt/2)/3600;
    // rainfall -> effective rainfall (SCS-CN, cumulative)
    const pmm=live?rainRate(sc,tm):0;
    if(pmm>0){const dth=dt/3600;
      for(let c=0;c<N;c++){if(isSea[c]){rin[c]=0;continue;}
        const p=pmm*oro[c]*dth;Pc[c]+=p;mass.rain+=p;
        const e=Pc[c]-Ia[c],Q=e>0?e*e/(e+S[c]):0;rin[c]=(Q-Qc[c])/1000;Qc[c]=Q;}
      Pdom+=pmm*dth;
    }else rin.fill(0);
    for(let c=0;c<N;c++)eta[c]=z[c]+h[c];
    out.fill(0);
    for(let j=0;j<ny;j++){const row=j*nx,fr=j*(nx+1);
      for(let i=1;i<nx;i++){const a=row+i-1,b=row+i,f=fr+i,ea=eta[a],eb=eta[b],za=z[a],zb=z[b];
        const hf=(ea>eb?ea:eb)-(za>zb?za:zb);
        if(hf>HMIN){let q=qx[f];if(i>1&&i<nx-1)q=TH*q+HTH*(qx[f-1]+qx[f+1]);
          const nf=0.5*(nm[a]+nm[b]);
          q=(q-G*hf*dt*(eb-ea)/dx)/(1+G*dt*nf*nf*Math.abs(q)/(hf*hf*Math.cbrt(hf)));
          const qm=hf*Math.sqrt(G*hf);if(q>qm)q=qm;else if(q<-qm)q=-qm;
          qx[f]=q;if(q>0)out[a]+=q;else out[b]-=q;}else qx[f]=0;}}
    for(let j=1;j<ny;j++){const row=j*nx;
      for(let i=0;i<nx;i++){const b=row+i,a=b-nx,f=b,ea=eta[a],eb=eta[b],za=z[a],zb=z[b];
        const hf=(ea>eb?ea:eb)-(za>zb?za:zb);
        if(hf>HMIN){let q=qy[f];if(j>1&&j<ny-1)q=TH*q+HTH*(qy[f-nx]+qy[f+nx]);
          const nf=0.5*(nm[a]+nm[b]);
          q=(q-G*hf*dt*(eb-ea)/dx)/(1+G*dt*nf*nf*Math.abs(q)/(hf*hf*Math.cbrt(hf)));
          const qm=hf*Math.sqrt(G*hf);if(q>qm)q=qm;else if(q<-qm)q=-qm;
          qy[f]=q;if(q>0)out[a]+=q;else out[b]-=q;}else qy[f]=0;}}
    const k1=dt/dx;
    for(let c=0;c<N;c++){const o=out[c]*k1;scl[c]=o>1e-12?Math.min(1,(h[c]+rin[c])/o):1;}
    for(let j=0;j<ny;j++){const row=j*nx,fr=j*(nx+1);
      for(let i=1;i<nx;i++){const f=fr+i;let q=qx[f];if(q!==0){const a=row+i-1,b=a+1;q*=q>0?scl[a]:scl[b];qx[f]=q;const dv=q*k1;dh[a]-=dv;dh[b]+=dv;}}}
    for(let j=1;j<ny;j++){const row=j*nx;
      for(let i=0;i<nx;i++){const f=row+i;let q=qy[f];if(q!==0){const b=f,a=f-nx;q*=q>0?scl[a]:scl[b];qy[f]=q;const dv=q*k1;dh[a]-=dv;dh[b]+=dv;}}}
    // upstream inflow + dam
    if(nR>0){
      const rmm=live?rainRate(sc,tm):0,Rc=Math.min(0.85,0.15+0.45*wet+0.35*(1-Math.exp(-Pdom/250)));
      for(let k=0;k<nR;k++){
        if(live)Sres[k]+=(Aup[k]*1e6*Rc*rmm*(1+sc.rain.orog*0.9)/1000/3600-Sres[k]/(sc.K*3600))*dt;
        let Q=Qb[k]+Math.max(0,Sres[k])/(sc.K*3600);
        if(live&&k===w.mainK){const dq=damFlow(sc,tm);Q+=dq;mass.dam+=dq*dt;}
        const hd=w.heads[k];if(hd.length){const add=Q*dt/dx2/hd.length;for(const c of hd)dh[c]+=add;if(live)mass.inflow+=Q*dt;}
      }
    }
    const tideZ=tideLevel(sc,live?tm:tm),tf=clamp(tideZ/0.9,0,1);
    hmax=0.05;let vd=0,vs=0,ve=0;
    for(let c=0;c<N;c++){let hv=h[c]+dh[c];
      if(isSea[c]){vs+=dh[c];dh[c]=0;let hn=tideZ-z[c];if(hn<0)hn=0;h[c]=hn;if(hn>hmax)hmax=hn;continue;}
      dh[c]=0;const r=rin[c];hv+=r;ve+=r;
      if(live&&hv>1e-5){let dr=dcap[c]*(1-0.6*tf*wLow[c])*dt;if(dr>hv)dr=hv;hv-=dr;vd+=dr;}
      if(hv<0)hv=0;h[c]=hv;if(hv>hmax)hmax=hv;}
    if(live){mass.drain+=vd*dx2;mass.sea+=vs*dx2;mass.eff+=ve*dx2;}
    else{ /* spin-up: track sea exchange so balance starts clean */ }
    t+=dt;steps++;
    if(steps%50===0)yield {progress:Math.max(0,t)/Tend};
  }
  const storeEnd=surface();
  mass.rain*=dx2/1000;mass.store0=store0;mass.storeEnd=storeEnd;
  mass.infil=mass.rain-mass.eff;
  // mass in: eff rain + river inflow (only live part approximated by total incl. spin-up baseflow) - track separately below
  return{t:T,depth:D,speed:V,href,tide:tideS,rain:rainS,mass,steps,ms:Date.now()-t0,sc};
}

/* ---------- Analysis: hazard classification, ETA, zone stats, affected population ---------- */
function analyze(w,res,th){
  th=th||{dW:0.15,dC:0.5,share:0.1};
  const F=res.t.length,N=w.N,K=w.zones.length,HRw=0.75,HRc=1.25;
  const cls=[],etaC=new Float32Array(N).fill(1e9),etaW=new Float32Array(N).fill(1e9),peakD=new Float32Array(N);
  const prevC=new Float32Array(N),prevW=new Float32Array(N);
  const g={popAff:new Float64Array(F),popCrit:new Float64Array(F),areaAff:new Float64Array(F),areaCrit:new Float64Array(F),maxD:new Float64Array(F)};
  const zn=[];for(let k=0;k<K;k++)zn.push({id:k,fracC:new Float32Array(F),fracW:new Float32Array(F),popAff:new Float64Array(F),popCrit:new Float64Array(F),meanD:new Float32Array(F),etaC:Infinity,etaW:Infinity,peakP90:0,peakMax:0,land:0});
  const zl=new Int32Array(K),zc=new Float64Array(K),zw=new Float64Array(K),zpa=new Float64Array(K),zpc=new Float64Array(K),zd=new Float64Array(K);
  for(let c=0;c<N;c++){if(w.zone[c]>=0&&w.lu[c]>=2)zl[w.zone[c]]++;}
  for(let k=0;k<K;k++)zn[k].land=zl[k];
  const cellArea=w.dxk*w.dxk;
  for(let f=0;f<F;f++){
    const cl=new Uint8Array(N),D=res.depth[f],V=res.speed[f],time=res.t[f]/3600;
    zc.fill(0);zw.fill(0);zpa.fill(0);zpc.fill(0);zd.fill(0);
    let pa=0,pc=0,aa=0,ac=0,md=0;
    for(let c=0;c<N;c++){
      if(w.lu[c]<2)continue;
      let d=D[c]-res.href[c];if(d<0.005)d=0;
      const v=V[c],HR=d*(v+0.5);
      const Sc=Math.max(d/th.dC,HR/HRc),Sw=Math.max(d/th.dW,HR/HRw);
      const k=w.zone[c];
      if(d>peakD[c])peakD[c]=d;
      if(f>0){
        if(etaC[c]>=1e9&&Sc>=1){const p=prevC[c];etaC[c]=(res.t[f-1]+(1-p)/(Sc-p)*(res.t[f]-res.t[f-1]))/3600;}
        if(etaW[c]>=1e9&&Sw>=1){const p=prevW[c];etaW[c]=(res.t[f-1]+(1-p)/(Sw-p)*(res.t[f]-res.t[f-1]))/3600;}
      }
      prevC[c]=Sc;prevW[c]=Sw;
      let q=0;if(Sc>=1)q=2;else if(Sw>=1)q=1;cl[c]=q;
      if(d>md)md=d;
      if(k>=0)zd[k]+=d;
      if(q>=1){pa+=w.pop[c];aa+=cellArea;if(k>=0){zw[k]++;zpa[k]+=w.pop[c];}}
      if(q===2){pc+=w.pop[c];ac+=cellArea;if(k>=0){zc[k]++;zpc[k]+=w.pop[c];}}
    }
    cls.push(cl);g.popAff[f]=pa;g.popCrit[f]=pc;g.areaAff[f]=aa;g.areaCrit[f]=ac;g.maxD[f]=md;
    for(let k=0;k<K;k++){const Z=zn[k],L=Math.max(1,zl[k]);Z.fracC[f]=zc[k]/L;Z.fracW[f]=zw[k]/L;Z.popAff[f]=zpa[k];Z.popCrit[f]=zpc[k];Z.meanD[f]=zd[k]/L;
      if(f>0){
        if(Z.etaC===Infinity&&Z.fracC[f]>=th.share&&zc[k]>0){const p=Z.fracC[f-1],c=Z.fracC[f];Z.etaC=(res.t[f-1]+(th.share-p)/(c-p)*(res.t[f]-res.t[f-1]))/3600;}
        if(Z.etaW===Infinity&&Z.fracW[f]>=th.share&&zw[k]>0){const p=Z.fracW[f-1],c=Z.fracW[f];Z.etaW=(res.t[f-1]+(th.share-p)/(c-p)*(res.t[f]-res.t[f-1]))/3600;}
      }}
  }
  const lists=Array.from({length:K},()=>[]);
  for(let c=0;c<N;c++){if(w.lu[c]>=2&&w.zone[c]>=0)lists[w.zone[c]].push(peakD[c]);}
  for(let k=0;k<K;k++){const a=lists[k].sort((x,y)=>x-y);zn[k].peakP90=a.length?a[Math.floor(0.9*(a.length-1))]:0;zn[k].peakMax=a.length?a[a.length-1]:0;
    let pk=0,pkC=0;for(let f=0;f<F;f++){if(zn[k].popAff[f]>pk)pk=zn[k].popAff[f];if(zn[k].popCrit[f]>pkC)pkC=zn[k].popCrit[f];}zn[k].peakPop=pk;zn[k].peakPopCrit=pkC;
    let mx=0;for(let f=0;f<F;f++)mx=Math.max(mx,zn[k].fracC[f]>=th.share?2:zn[k].fracW[f]>=th.share?1:0);zn[k].peakClass=mx;}
  const sum={peakPopAff:Math.max(...g.popAff),peakPopCrit:Math.max(...g.popCrit),areaAff:Math.max(...g.areaAff),areaCrit:Math.max(...g.areaCrit),maxD:Math.max(...g.maxD),
    critZones:zn.filter(z=>z.peakClass===2).length,warnZones:zn.filter(z=>z.peakClass===1).length,
    firstCrit:Math.min(...zn.map(z=>z.etaC)),firstWarn:Math.min(...zn.map(z=>z.etaW))};
  return{cls,etaC,etaW,peakD,g,zones:zn,sum,th};
}
function zoneClassAt(Z,f,th){return Z.fracC[f]>=th.share?2:Z.fracW[f]>=th.share?1:0;}

if(typeof module!=='undefined')module.exports={makePresets,LU,DEFAULT_TERRAIN,makeWorldPair,defaultScenario,cloneScenario,simulate,analyze,rainStats,rainRate,tideLevel,damFlow,shapeFn,imdClass,rng,clamp,sstep,makeNoise,zoneClassAt,buildWorldFromTerrain,assignZones,nameZones,finishWorld,pickCities,makeZoneSeeds,pickLandmarks,makeTerrain};

/* ---------- Real DEM import: derive sea, rivers, land use, zones from an elevation grid ---------- */
function parseDEM(text){
  const t=text.trim();let rows,cols,cell=null,nod=-9999,data;
  if(/^ncols/i.test(t)){const lines=t.split(/\r?\n/);const h={};let i=0;for(;i<lines.length;i++){const m=lines[i].trim().match(/^([A-Za-z_]+)\s+(\S+)/);if(!m||!/^[A-Za-z_]+$/.test(m[1])||!isNaN(+m[1]))break;h[m[1].toLowerCase()]=+m[2];}
    cols=h.ncols;rows=h.nrows;if(h.cellsize)cell=h.cellsize;if(h.nodata_value!==undefined)nod=h.nodata_value;
    data=Float32Array.from(lines.slice(i).join(' ').trim().split(/[\s,;]+/).map(Number));}
  else{const lines=t.split(/\r?\n/).filter(l=>l.trim().length);const arr=lines.map(l=>l.trim().split(/[,;\s]+/).map(Number));rows=arr.length;cols=arr[0].length;data=new Float32Array(rows*cols);
    arr.forEach((a,j)=>{for(let i=0;i<cols;i++){const v=a[i];data[j*cols+i]=isNaN(v)?nod:v;}});}
  if(!rows||!cols||data.length<rows*cols)throw new Error('Could not read a '+cols+'×'+rows+' grid from that file.');
  for(let i=0;i<data.length;i++)if(data[i]===nod||isNaN(data[i]))data[i]=0;
  return{rows,cols,data,cell};
}
function worldFromDEM(dem,cellM,nx,ny,seeds){
  const Wkm=dem.cols*cellM/1000,dxk=Wkm/nx,N=nx*ny,r=rng(4242);
  const w={nx,ny,N,dx:dxk*1000,dxk,W:Wkm,H:ny*dxk,coast:0,relief:1,z:new Float32Array(N),lu:new Uint8Array(N),chan:new Uint8Array(N),isSea:new Uint8Array(N),n:new Float32Array(N),cn:new Float32Array(N),drain:new Float32Array(N),pop:new Float32Array(N),
    zone:new Int16Array(N).fill(-1),cd:new Float32Array(N),kr:new Int8Array(N).fill(-1),dr:new Float32Array(N),urb:new Float32Array(N),heads:[],source:'dem',mainK:0,nRivers:1};
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const gx=clamp((i+0.5)*dxk/Wkm*dem.cols-0.5,0,dem.cols-1),gy=clamp((j+0.5)*dxk/(ny*dxk)*dem.rows-0.5,0,dem.rows-1);
    const i0=gx|0,j0=gy|0,i1=Math.min(dem.cols-1,i0+1),j1=Math.min(dem.rows-1,j0+1),fx=gx-i0,fy=gy-j0,D=dem.data,c=dem.cols;
    w.z[j*nx+i]=(D[j0*c+i0]*(1-fx)+D[j0*c+i1]*fx)*(1-fy)+(D[j1*c+i0]*(1-fx)+D[j1*c+i1]*fx)*fy;}
  // sea = low cells connected to the west edge
  const q=[];for(let j=0;j<ny;j++)if(w.z[j*nx]<=0.3){w.isSea[j*nx]=1;q.push(j*nx);}
  while(q.length){const c=q.pop(),i=c%nx,j=(c-i)/nx;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const d=jj*nx+ii;if(!w.isSea[d]&&w.z[d]<=0.3){w.isSea[d]=1;q.push(d);}}}
  let maxc=0;for(let c=0;c<N;c++){if(w.isSea[c]&&c%nx>maxc)maxc=c%nx;}w.coast=w.isSea.some(v=>v)?(maxc+1)*dxk:0;
  let zm=0;for(let c=0;c<N;c++)if(!w.isSea[c]&&w.z[c]>zm)zm=w.z[c];w.relief=Math.max(50,zm);
  // D8 flow accumulation -> channels
  const order=[];for(let c=0;c<N;c++)if(!w.isSea[c])order.push(c);order.sort((a,b)=>w.z[b]-w.z[a]);
  const acc=new Float32Array(N).fill(1);
  for(const c of order){const i=c%nx,j=(c-i)/nx;let best=-1,bz=w.z[c];
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const d=jj*nx+ii;if(w.z[d]<bz){bz=w.z[d];best=d;}}
    if(best>=0)acc[best]+=acc[c];}
  const thr=Math.max(20,N*0.007);
  for(const c of order){if(acc[c]>=thr){w.chan[c]=1;w.kr[c]=0;w.cd[c]=clamp(1.2+0.8*Math.log2(acc[c]/thr+1),1.2,4.5);w.z[c]-=w.cd[c];}}
  // distance to river (BFS, km)
  const dist=new Float32Array(N).fill(1e9),qq=[];for(let c=0;c<N;c++)if(w.chan[c]){dist[c]=0;qq.push(c);}
  for(let h=0;h<qq.length;h++){const c=qq[h],i=c%nx,j=(c-i)/nx;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const d=jj*nx+ii;if(dist[d]>dist[c]+1){dist[d]=dist[c]+1;qq.push(d);}}}
  for(let c=0;c<N;c++)w.dr[c]=Math.min(30,dist[c]*dxk);
  for(let c=0;c<N;c++){const z=w.z[c];
    if(w.isSea[c])w.lu[c]=0;else if(w.chan[c])w.lu[c]=1;else if(z<2.5&&w.dr[c]<4)w.lu[c]=4;else if(z>0.42*w.relief)w.lu[c]=6;else if(z>0.10*w.relief)w.lu[c]=5;else w.lu[c]=3;}
  const cities=pickCities(w,r,3);
  for(let c=0;c<N;c++){const x=(c%nx+0.5)*dxk,y=(Math.floor(c/nx)+0.5)*dxk;let u=0;cities.forEach((ct,k)=>{const rc=k?2.2:3.3;u+=Math.exp(-((x-ct.x)**2+(y-ct.y)**2)/(rc*rc));});w.urb[c]=u;
    if(w.lu[c]>=3&&u>0.36&&w.z[c]<60)w.lu[c]=2;}
  finishWorld(w,null);
  // river heads: channel cells on the east edge (or the highest channel cells)
  w.heads=[[]];for(let j=0;j<ny;j++)for(let i=nx-2;i<nx;i++){const c=j*nx+i;if(w.chan[c])w.heads[0].push(c);}
  if(!w.heads[0].length){const ch=[];for(let c=0;c<N;c++)if(w.chan[c])ch.push(c);ch.sort((a,b)=>w.z[b]-w.z[a]);w.heads[0]=ch.slice(0,3);}
  return{w,cities};
}
function makeWorldPairFromDEM(dem,cellM,nxF,factor){
  const Wkm=dem.cols*cellM/1000,dxk=Wkm/nxF,ny=Math.max(8,Math.round(dem.rows*cellM/1000/dxk));
  const a=worldFromDEM(dem,cellM,nxF,ny),fine=a.w,r=rng(9),meta={cities:a.cities};
  meta.seeds=makeZoneSeeds(fine,18,r);const Z=assignZones(fine,meta.seeds);nameZones(Z,7);pickLandmarks(fine,meta);
  const nxC=Math.round(nxF/factor),nyC=Math.max(8,Math.round(dem.rows*cellM/1000/(Wkm/nxC)));
  const coarse=worldFromDEM(dem,cellM,nxC,nyC).w;const Zc=assignZones(coarse,meta.seeds);Zc.forEach((z,k)=>z.name=Z[k].name);
  return{T:null,meta,fine,coarse};
}
function demToCSV(w){const rows=[];for(let j=0;j<w.ny;j++){const a=[];for(let i=0;i<w.nx;i++){const c=j*w.nx+i;a.push((w.z[c]+(w.chan[c]?w.cd[c]:0)).toFixed(1));}rows.push(a.join(','));}return rows.join('\n');}
if(typeof module!=='undefined')Object.assign(module.exports,{parseDEM,makeWorldPairFromDEM,demToCSV});

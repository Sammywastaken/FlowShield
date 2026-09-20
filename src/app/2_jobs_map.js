/* ---------- run jobs ---------- */
async function runCustom(){
  if(S.running)return;S.running=true;const ver=S.ver,w=W();$('#btnRun').disabled=true;$('#btnRun').textContent='Simulating…';setProg('#prog',0);
  try{
    const sc=cloneScenario(S.sc);sc.name='Custom';
    const res=await drive(simulate(w,sc),p=>setProg('#prog',p.progress));
    if(ver!==S.ver)return;
    const an=analyze(w,res,S.th);S.results.custom={res,an,sc,rs:rainStats(sc,sc.horizon),ms:res.ms};
    S.view='custom';S.dirty=false;S.sel=-1;{let bi=0,bv=0;an.g.popAff.forEach((v,i)=>{if(v>bv){bv=v;bi=i;}});S.f=bi;}
    $('#btnRun').classList.remove('dirty');$('#runInfo').textContent='Simulated '+res.steps.toLocaleString()+' steps in '+(res.ms/1000).toFixed(1)+' s.';
    $('#tslider').max=res.t.length-1;afterView();
  }catch(e){console.error(e);toast('Simulation failed: '+e.message);}
  finally{S.running=false;$('#btnRun').disabled=false;$('#btnRun').textContent='Run simulation';$('#prog').style.display='none';}
}
async function runCompare(){
  const ver=S.ver,w=W();$('#btnAll').disabled=true;
  for(const p of S.presets){
    if(S.results[p.id])continue;if(ver!==S.ver)return;
    const sc=cloneScenario(p);const res=await drive(simulate(w,sc));if(ver!==S.ver)return;
    S.results[p.id]={res,an:analyze(w,res,S.th),sc,rs:rainStats(sc,sc.horizon),ms:res.ms};renderScen();
  }
  $('#btnAll').disabled=false;
}
async function trainAI(){
  if(S.aiBusy)return;S.aiBusy=true;const ver=S.ver;$('#aiStatus').textContent='Training the emulator: running physics ensemble on the coarse grid…';
  try{
    const out=await drive(trainEmulator(S.pair.coarse,{members:40,th:Object.assign({},S.th)}),p=>{setProg('#aiprog',p.progress);$('#aiStatus').textContent=p.stage==='ensemble'?'Ensemble run '+p.member+' of '+p.of+' (random storms, dam releases, surges, drain states)…':'Fitting the neural network…';});
    if(ver!==S.ver)return;S.ai=out;for(const k in S.results)S.results[k].aiFc=null;
    $('#aiprog').style.display='none';$('#aiStatus').innerHTML='Emulator ready. It learned from <b>'+out.nMem+'</b> physics runs ('+out.nTrain+' zone samples) and now answers what-if questions in milliseconds.';
    renderAI();updatePanels();drawMap();
  }catch(e){console.error(e);$('#aiStatus').textContent='AI training failed: '+e.message;}
  finally{S.aiBusy=false;}
}
let aiLiveT=null;
function scheduleAiLive(){if(!S.ai)return;clearTimeout(aiLiveT);aiLiveT=setTimeout(()=>{S.liveFc=aiForecast(S.ai.model,W(),S.sc,240,3);S.livePt=aiPointForecast(S.ai.model,W(),S.sc);updatePanels();drawMap();},120);}
function aiFcFor(){
  if(!S.ai)return null;
  if(S.view==='custom'&&S.dirty){if(!S.liveFc)S.liveFc=aiForecast(S.ai.model,W(),S.sc,240,3);return{fc:S.liveFc,live:true};}
  const r=R();if(!r)return null;if(!r.aiFc)r.aiFc=aiForecast(S.ai.model,W(),r.sc,300,7);return{fc:r.aiFc,live:false};
}
function afterView(){
  const r=R();$('#tslider').max=r.res.t.length-1;if(S.sel<0){let b=0,bp=-1;r.an.zones.forEach((z,k)=>{const s=(z.peakClass*1e7)+z.peakPopCrit+z.peakPop*0.01;if(s>bp){bp=s;b=k;}});S.sel=b;}
  updatePanels();drawMap();chartsSoon();renderScen();
}

/* ---------- map rendering ---------- */
const HYP=[[0,[58,84,100]],[6,[68,106,108]],[60,[100,122,98]],[220,[138,132,104]],[600,[168,156,140]]];
function lerpc(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function hyp(z){for(let i=1;i<HYP.length;i++)if(z<=HYP[i][0]){return lerpc(HYP[i-1][1],HYP[i][1],clamp((z-HYP[i-1][0])/(HYP[i][0]-HYP[i-1][0]),0,1));}return HYP[HYP.length-1][1];}
function ramp(st,v){if(v<=st[0][0])return st[0][1];for(let i=1;i<st.length;i++)if(v<=st[i][0]){const t=(v-st[i-1][0])/(st[i][0]-st[i-1][0]);const a=st[i-1][1],b=st[i][1];return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t];}return st[st.length-1][1];}
const RAMPS={
  depth:[[0.03,[110,215,255,0]],[0.12,[110,215,255,0.3]],[0.5,[50,150,255,0.72]],[1.5,[85,85,235,0.86]],[3,[160,60,210,0.94]]],
  speed:[[0.05,[120,220,255,0]],[0.4,[120,220,255,0.5]],[1.5,[255,220,120,0.8]],[3.5,[255,80,110,0.92]]],
  eta:[[0,[255,77,109,0.9]],[6,[255,140,60,0.85]],[18,[255,205,80,0.8]],[48,[70,210,190,0.7]]],
  ai:[[0,[61,220,151,0.16]],[0.5,[255,184,77,0.6]],[1,[255,77,109,0.88]]],
  pop:[[20,[120,100,255,0]],[300,[120,100,255,0.4]],[1800,[200,120,255,0.7]],[5000,[255,210,240,0.92]]]};
const LUC=[[14,38,88],[36,110,200],[214,180,120],[150,140,100],[120,180,110],[70,120,80],[34,84,62]];
const LEG={depth:['0','1.5','3+ m','linear-gradient(90deg,#6ed7ff,#3296ff,#5555eb,#a03cd2)'],speed:['0','2','4+ m/s','linear-gradient(90deg,#78dcff,#ffdc78,#ff506e)'],eta:['now','18 h','48 h+','linear-gradient(90deg,#ff4d6d,#ff8c3c,#ffcd50,#46d2be)'],
  ai:['0%','50%','100%','linear-gradient(90deg,#3ddc97,#ffb84d,#ff4d6d)'],pop:['0','1,800','5,000+ /km²','linear-gradient(90deg,#241c55,#7864ff,#c878ff,#ffd2f0)'],elev:['0 m','200','450+ m','linear-gradient(90deg,#28404c,#4a5c4e,#68665 4,#80786e)']};
LEG.elev[3]='linear-gradient(90deg,#28404c,#4a5c4e,#686654,#80786e)';
function drawMap(){
  const cv=$('#map');if(!S.pair||!cv)return;const w=W(),{nx,ny}=w,r=R(),sf=3;
  const cw=cv.clientWidth,ch=cv.clientHeight,dpr=window.devicePixelRatio||1;if(!cw)return;
  if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
  if(!S.off||S.off.width!==nx*sf){S.off=document.createElement('canvas');S.off.width=nx*sf;S.off.height=ny*sf;}
  const oc=S.off.getContext('2d'),img=oc.createImageData(nx*sf,ny*sf),d=img.data,f=Math.min(S.f,r?r.res.t.length-1:0);
  const D=r?r.res.depth[f]:null,V=r?r.res.speed[f]:null,href=r?r.res.href:null,cls=r?r.an.cls[f]:null,tNow=r?r.res.t[f]/3600:0,hs=S.hs,layer=S.layer;
  const dl=new Float32Array(w.N),cf=new Float32Array(w.N);
  if(r)for(let c=0;c<w.N;c++){if(w.lu[c]>=2){let x=D[c]-href[c];dl[c]=x>0?x:0;}cf[c]=cls[c];}
  const ai=(layer==='ai'||layer==='risk')?aiFcFor():null,cellA=w.dxk*w.dxk;
  const bil=(a,gx,gy)=>{gx=clamp(gx,0,nx-1);gy=clamp(gy,0,ny-1);const i0=gx|0,j0=gy|0,i1=Math.min(nx-1,i0+1),j1=Math.min(ny-1,j0+1),fx=gx-i0,fy=gy-j0;
    return(a[j0*nx+i0]*(1-fx)+a[j0*nx+i1]*fx)*(1-fy)+(a[j1*nx+i0]*(1-fx)+a[j1*nx+i1]*fx)*fy;};
  for(let py=0;py<ny*sf;py++)for(let px=0;px<nx*sf;px++){
    const gx=(px+0.5)/sf-0.5,gy=(py+0.5)/sf-0.5,ci=clamp(Math.round(gx),0,nx-1),cj=clamp(Math.round(gy),0,ny-1),c=cj*nx+ci,lu=w.lu[c];
    let col,o=(py*nx*sf+px)*4;
    if(lu===0){const dd=r?D[c]:1;col=lerpc([10,26,66],[16,44,98],clamp(dd/2.5,0,1));}
    else if(lu===1){const st=r?clamp(D[c]/(w.cd[c]+1.2),0,1.2):0.3;col=lerpc([24,86,170],[92,170,255],Math.min(1,st));if(layer==='lu')col=LUC[1];}
    else{
      const sh=bil(hs,gx,gy);col=hyp(bil(w.z,gx,gy));const tl=LUC[lu];col=[(col[0]*0.8+tl[0]*0.2)*sh,(col[1]*0.8+tl[1]*0.2)*sh,(col[2]*0.8+tl[2]*0.2)*sh];
      let ov=null;
      if(layer==='depth'&&r)ov=ramp(RAMPS.depth,bil(dl,gx,gy));
      else if(layer==='risk'&&r){const v=bil(cf,gx,gy);ov=v>1.5?[255,77,109,0.86]:v>0.5?lerpc([255,184,77],[255,77,109],clamp(v-1,0,1)).concat(0.78):[61,220,151,0.09+0.4*clamp(v*2,0,1)];}
      else if(layer==='eta'&&r){const e=r.an.etaC[c];if(e<1e9){const rel=e-tNow;ov=rel<=0?[170,20,55,0.92]:ramp(RAMPS.eta,rel);}}
      else if(layer==='ai'){const k=w.zone[c];if(ai&&k>=0)ov=ramp(RAMPS.ai,ai.fc[k].pCrit);else ov=[120,120,160,0.12];}
      else if(layer==='speed'&&r)ov=ramp(RAMPS.speed,bil(V,gx,gy));
      else if(layer==='lu'){const q=LUC[lu];ov=[q[0],q[1],q[2],0.88];}
      else if(layer==='pop')ov=ramp(RAMPS.pop,w.pop[c]/cellA);
      if(ov&&ov[3]>0){const a=ov[3];col=[col[0]*(1-a)+ov[0]*a,col[1]*(1-a)+ov[1]*a,col[2]*(1-a)+ov[2]*a];}
    }
    d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=255;
  }
  oc.putImageData(img,0,0);
  const c2=cv.getContext('2d');c2.setTransform(dpr,0,0,dpr,0,0);c2.imageSmoothingEnabled=true;c2.imageSmoothingQuality='high';c2.drawImage(S.off,0,0,cw,ch);
  const px=cw/nx,py=ch/ny;
  c2.lineWidth=1;c2.strokeStyle='rgba(255,255,255,0.13)';c2.beginPath();
  for(const e of S.edges){c2.moveTo(e[0]*px,e[1]*py);c2.lineTo(e[2]*px,e[3]*py);}c2.stroke();
  if(S.sel>=0){c2.strokeStyle='#a99bff';c2.lineWidth=2.4;c2.beginPath();
    for(const e of S.edges)if(e[4]===S.sel||e[5]===S.sel){c2.moveTo(e[0]*px,e[1]*py);c2.lineTo(e[2]*px,e[3]*py);}
    // outer boundary of selected zone against sea/edge
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(w.zone[c]!==S.sel)continue;
      if(i===0||w.zone[c-1]<0){c2.moveTo(i*px,j*py);c2.lineTo(i*px,(j+1)*py);}if(i===nx-1||w.zone[c+1]<0){c2.moveTo((i+1)*px,j*py);c2.lineTo((i+1)*px,(j+1)*py);}
      if(j===0||w.zone[c-nx]<0){c2.moveTo(i*px,j*py);c2.lineTo((i+1)*px,j*py);}if(j===ny-1||w.zone[c+nx]<0){c2.moveTo(i*px,(j+1)*py);c2.lineTo((i+1)*px,(j+1)*py);}}
    c2.stroke();}
  // tool markers
  c2.fillStyle='rgba(255,150,60,0.75)';for(const c of S.failSet){c2.beginPath();c2.arc(((c%nx)+0.5)*px,(Math.floor(c/nx)+0.5)*py,Math.max(1.2,px*0.16),0,6.283);c2.fill();}
  c2.strokeStyle='#ff4d6d';c2.lineWidth=2;for(const c of S.blockSet){const x=(c%nx)*px,y=Math.floor(c/nx)*py;c2.strokeRect(x+1,y+1,px-2,py-2);c2.beginPath();c2.moveTo(x+3,y+3);c2.lineTo(x+px-3,y+py-3);c2.moveTo(x+px-3,y+3);c2.lineTo(x+3,y+py-3);c2.stroke();}
  if(w.gauge>=0){const gx=((w.gauge%nx)+0.5)*px,gy=(Math.floor(w.gauge/nx)+0.5)*py;c2.fillStyle='#fff';c2.strokeStyle='#07071a';c2.lineWidth=1.5;c2.beginPath();c2.moveTo(gx,gy-6);c2.lineTo(gx+5,gy);c2.lineTo(gx,gy+6);c2.lineTo(gx-5,gy);c2.closePath();c2.fill();c2.stroke();}
  if(S.labels){c2.font='600 11px '+cssv('--sans');c2.textAlign='center';c2.lineJoin='round';const CLc=CL();
    w.zones.forEach((z,k)=>{if(z.land<3)return;const x=z.cx/w.W*cw,y=z.cy/w.H*ch;let q=0;if(r)q=zoneClassAt(r.an.zones[k],f,S.th);
      c2.lineWidth=3;c2.strokeStyle='rgba(6,6,24,0.85)';c2.strokeText(z.name,x,y);c2.fillStyle=q===2?'#ff8fa5':q===1?'#ffd08a':'#e6e3ff';c2.fillText(z.name,x,y);});}
  if(S.hover!=null){const c=S.hover;c2.strokeStyle='#fff';c2.lineWidth=1.2;c2.strokeRect((c%nx)*px,Math.floor(c/nx)*py,px,py);}
  drawLegend();
}
function drawLegend(){
  const el=$('#legend'),L=S.layer;
  if(L==='risk'){el.innerHTML='<span class="sw" style="background:#3ddc97"></span>Safe <span class="sw" style="background:#ffb84d;margin-left:8px"></span>Warning <span class="sw" style="background:#ff4d6d;margin-left:8px"></span>Critical';return;}
  if(L==='lu'){el.innerHTML=LU.slice(2).map((l,i)=>'<span class="sw" style="background:rgb('+LUC[i+2]+')"></span>'+l.name).join('<br>');return;}
  const g=LEG[L];el.innerHTML='<div>'+({depth:'Flood depth',speed:'Flow speed',eta:'Hours to critical from now',ai:'AI chance of critical',pop:'People per km²',elev:'Elevation'})[L]+'</div><div class="bar" style="background:'+g[3]+'"></div><div class="ends"><span>'+g[0]+'</span><span>'+g[1]+'</span><span>'+g[2]+'</span></div>';
}
function cellAt(ev){const cv=$('#map'),b=cv.getBoundingClientRect(),w=W();const i=Math.floor((ev.clientX-b.left)/b.width*w.nx),j=Math.floor((ev.clientY-b.top)/b.height*w.ny);if(i<0||j<0||i>=w.nx||j>=w.ny)return-1;return j*w.nx+i;}
function tipHtml(c){
  const w=W(),r=R(),f=Math.min(S.f,r.res.t.length-1),k=w.zone[c],tNow=r.res.t[f]/3600;
  let s='<b>'+(k>=0?w.zones[k].name:'Arabian Sea')+'</b><br>'+LU[w.lu[c]].name+' · '+w.z[c].toFixed(1)+' m';
  if(w.lu[c]>=2){const d=Math.max(0,r.res.depth[f][c]-r.res.href[c]),v=r.res.speed[f][c],q=r.an.cls[f][c];
    s+='<br>Depth now <b>'+d.toFixed(2)+' m</b>, '+v.toFixed(1)+' m/s<br>Level: <b style="color:'+CL()[q]+'">'+['Safe','Warning','Critical'][q]+'</b><br>Peak depth '+r.an.peakD[c].toFixed(2)+' m<br>People here ≈ '+Math.round(w.pop[c]);
    const e=r.an.etaC[c];s+='<br>Critical: '+(e<1e9?(e<=tNow?'reached at t+'+e.toFixed(1)+' h':'in '+fmtH(e-tNow)):'not expected');}
  else if(w.lu[c]===1)s+='<br>Water depth '+r.res.depth[f][c].toFixed(2)+' m (bank-full ≈ '+w.cd[c].toFixed(1)+' m)';
  return s;
}
function paintTool(c,down){
  const w=W(),{nx}=w,ci=c%nx,cj=Math.floor(c/nx);let ch=false;
  const rad=S.tool==='block'?1.6:S.tool==='fail'?2.4:2.4;
  for(let j=Math.floor(cj-rad);j<=cj+rad;j++)for(let i=Math.floor(ci-rad);i<=ci+rad;i++){if(i<0||j<0||i>=nx||j>=w.ny)continue;if((i-ci)**2+(j-cj)**2>rad*rad)continue;const q=j*nx+i;
    if(S.tool==='fail'&&w.lu[q]>=2&&!S.failSet.has(q)){S.failSet.add(q);ch=true;}
    else if(S.tool==='block'&&!w.isSea[q]&&!S.blockSet.has(q)){S.blockSet.add(q);ch=true;}
    else if(S.tool==='erase'&&(S.failSet.delete(q)|S.blockSet.delete(q)))ch=true;}
  if(ch){S.sc.blockH=Math.max(S.sc.blockH,8);syncTools();onEdit();}
}
function bindMap(){
  const cv=$('#map'),tip=$('#tip');let down=false;
  cv.addEventListener('pointermove',e=>{const c=cellAt(e);if(c<0)return;if(c!==S.hover){S.hover=c;if(down&&(S.tool==='fail'||S.tool==='erase'))paintTool(c);else drawMap();}
    if(R()){tip.innerHTML=tipHtml(c);tip.style.display='block';const b=cv.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;tip.style.left=Math.min(b.width-190,x+14)+'px';tip.style.top=Math.max(4,Math.min(b.height-150,y+10))+'px';}});
  cv.addEventListener('pointerleave',()=>{tip.style.display='none';S.hover=null;drawMap();down=false;});
  cv.addEventListener('pointerdown',e=>{const c=cellAt(e);if(c<0)return;down=true;
    if(S.tool==='inspect'){const k=W().zone[c];if(k>=0){S.sel=k;S.probe=c;updatePanels();drawMap();chartsSoon();}}else paintTool(c,true);});
  window.addEventListener('pointerup',()=>down=false);
}

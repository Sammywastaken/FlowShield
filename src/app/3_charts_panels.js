/* ---------- charts ---------- */
const niceMax=v=>{if(v<=0)return 1;const e=Math.pow(10,Math.floor(Math.log10(v))),m=v/e;return(m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*e;};
function chart(cv,cfg){
  const dpr=window.devicePixelRatio||1,Wd=cv.clientWidth,Ht=cv.clientHeight;if(!Wd||!Ht)return;
  cv.width=Math.round(Wd*dpr);cv.height=Math.round(Ht*dpr);const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,Wd,Ht);
  const mut=cssv('--mut'),line=cssv('--line'),ink=cssv('--ink'),ax2=cfg.series.some(s=>s.axis===2),L=40,Rr=ax2?40:10,T=22,B=20,pw=Wd-L-Rr,ph=Ht-T-B;
  const ym=[0,0],yl=[0,0];for(const s of cfg.series){const a=(s.axis||1)-1;for(const v of s.y){if(v>ym[a])ym[a]=v;if(v<yl[a])yl[a]=v;}}for(const m of cfg.marks||[]){const a=(m.axis||1)-1;if(m.y>ym[a])ym[a]=m.y;}
  ym[0]=cfg.ymax1||niceMax(ym[0]*1.05);ym[1]=cfg.ymax2||niceMax(ym[1]*1.05);yl[0]=yl[0]<0?-niceMax(-yl[0]*1.05):0;yl[1]=yl[1]<0?-niceMax(-yl[1]*1.05):0;const xm=cfg.xMax,X=x=>L+x/xm*pw,Y=(y,a)=>T+ph-(y-yl[a||0])/(ym[a||0]-yl[a||0])*ph;
  c.font='11px '+cssv('--sans');c.textBaseline='middle';c.lineWidth=1;
  for(let i=0;i<=4;i++){const yy=T+ph*i/4;c.strokeStyle=line;c.beginPath();c.moveTo(L,yy);c.lineTo(L+pw,yy);c.stroke();c.fillStyle=mut;c.textAlign='right';{const v0=yl[0]+(ym[0]-yl[0])*(4-i)/4;c.fillText(cfg.f1?cfg.f1(v0):+v0.toPrecision(2),L-5,yy);}
    if(ax2){c.textAlign='left';c.fillText(+(yl[1]+(ym[1]-yl[1])*(4-i)/4).toPrecision(2),L+pw+5,yy);}}
  c.textAlign='center';const stepX=xm>60?24:12;for(let x=0;x<=xm;x+=stepX){c.fillStyle=mut;c.fillText(x+'h',X(x),Ht-8);}
  for(const s of cfg.series){const a=(s.axis||1)-1;c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=s.width||2;
    if(s.type==='bar'){const bw=Math.max(1,pw/s.y.length*0.9);s.y.forEach((v,i)=>{c.globalAlpha=0.75;c.fillRect(X(s.x[i])-bw/2,Y(v,a),bw,Y(Math.max(0,yl[a]),a)-Y(v,a));});c.globalAlpha=1;}
    else{c.beginPath();s.y.forEach((v,i)=>{const px=X(s.x[i]),py=Y(v,a);i?c.lineTo(px,py):c.moveTo(px,py);});
      if(s.type==='area'){c.stroke();c.lineTo(X(s.x[s.x.length-1]),Y(yl[a],a));c.lineTo(X(s.x[0]),Y(yl[a],a));c.closePath();c.globalAlpha=0.18;c.fill();c.globalAlpha=1;}else c.stroke();}}
  for(const m of cfg.marks||[]){c.strokeStyle=m.color;c.lineWidth=1.2;c.setLineDash([5,4]);const yy=Y(m.y,(m.axis||1)-1);c.beginPath();c.moveTo(L,yy);c.lineTo(L+pw,yy);c.stroke();c.setLineDash([]);if(m.label){c.fillStyle=m.color;c.textAlign='right';c.fillText(m.label,L+pw-3,yy-7);}}
  if(cfg.cursor!=null){c.strokeStyle=cssv('--vio');c.lineWidth=1.5;c.beginPath();c.moveTo(X(cfg.cursor),T);c.lineTo(X(cfg.cursor),T+ph);c.stroke();}
  let lx=L+4;c.textAlign='left';c.font='11px '+cssv('--sans');for(const s of cfg.series){if(!s.label)continue;c.fillStyle=s.color;c.fillRect(lx,7,9,9);c.fillStyle=ink;c.fillText(s.label,lx+13,12);lx+=c.measureText(s.label).width+28;}
}
const smooth=a=>a.map((v,i)=>{const p=a[Math.max(0,i-1)],n=a[Math.min(a.length-1,i+1)];return(p+v+n)/3;});
function scatter(cv,pts){
  const dpr=window.devicePixelRatio||1,Wd=cv.clientWidth,Ht=cv.clientHeight;if(!Wd)return;cv.width=Wd*dpr;cv.height=Ht*dpr;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  const mx=niceMax(Math.max(0.5,...pts.map(p=>Math.max(p[0],p[1])))*1.05),L=36,B=22,T=8,R=10,pw=Wd-L-R,ph=Ht-T-B,X=v=>L+v/mx*pw,Y=v=>T+ph-v/mx*ph;
  c.strokeStyle=cssv('--line');c.strokeRect(L,T,pw,ph);c.setLineDash([4,4]);c.strokeStyle=cssv('--mut');c.beginPath();c.moveTo(X(0),Y(0));c.lineTo(X(mx),Y(mx));c.stroke();c.setLineDash([]);
  c.fillStyle=cssv('--vio');c.globalAlpha=0.7;for(const p of pts){c.beginPath();c.arc(X(p[0]),Y(p[1]),3,0,6.283);c.fill();}c.globalAlpha=1;
  c.fillStyle=cssv('--mut');c.font='11px '+cssv('--sans');c.textAlign='center';c.fillText('physics peak depth (m) →',L+pw/2,Ht-6);c.save();c.translate(10,T+ph/2);c.rotate(-Math.PI/2);c.fillText('emulator (m)',0,0);c.restore();
  c.textAlign='right';c.fillText(mx,L-4,T+6);c.fillText('0',L-4,T+ph);
}
let chartRaf=0;function chartsSoon(){cancelAnimationFrame(chartRaf);chartRaf=requestAnimationFrame(drawCharts);}
const PAL=['#a99bff','#3ddc97','#ffb84d','#ff4d6d','#4fc3ff','#f78bd6'];
function drawCharts(){
  const r=R(),w=W();if(!r)return;
  if($('#p-time').classList.contains('on')){
    const T=r.res.t.map(t=>t/3600),f=Math.min(S.f,T.length-1),cur=T[f],hz=r.sc.horizon;
    $('#s1').textContent='Domain-mean rain before Ghats gain. Tide includes surge.'+(S.dirty&&S.view==='custom'?' (Showing last run.)':'');
    chart($('#ch1'),{xMax:hz,series:[{x:T,y:r.res.rain,color:cssv('--water'),type:'bar',label:'rain mm/h'},{x:T,y:r.res.tide,color:cssv('--warn'),axis:2,label:'sea level m'}],cursor:cur});
    chart($('#ch3'),{xMax:hz,f1:v=>fmtN(v),series:[{x:T,y:Array.from(r.an.g.popAff),color:cssv('--warn'),type:'area',label:'warning or worse'},{x:T,y:Array.from(r.an.g.popCrit),color:cssv('--crit'),type:'area',label:'critical'}],cursor:cur});
    const k=S.sel,Z=k>=0?r.an.zones[k]:null;$('#h2').textContent=k>=0?w.zones[k].name:'Selected zone';
    if(Z)chart($('#ch2'),{xMax:hz,ymax1:100,series:[{x:T,y:Array.from(Z.fracW,v=>v*100),color:cssv('--warn'),type:'area',label:'warning or worse %'},{x:T,y:Array.from(Z.fracC,v=>v*100),color:cssv('--crit'),type:'area',label:'critical %'}],marks:[{y:S.th.share*100,color:cssv('--vio'),label:'trigger'}],cursor:cur});
    const g=w.gauge;if(g>=0)chart($('#ch4'),{xMax:hz,series:[{x:T,y:smooth(r.res.depth.map(d=>d[g])),color:cssv('--water'),type:'area',label:'stage m'}],marks:[{y:w.cd[g],color:cssv('--crit'),label:'bank-full'}],cursor:cur});
    const me=massErr(r);$('#massNote').innerHTML='Water balance check: rainfall runoff + river inflow − drainage − sea outflow vs change in storage closes to <b>'+(Math.abs(me)*100).toFixed(3)+'%</b>. Infiltrated: '+(r.res.mass.infil/1e6).toFixed(0)+' million m³ of '+(r.res.mass.rain/1e6).toFixed(0)+' million m³ rain.';
  }
  if($('#p-scen').classList.contains('on'))drawScenChart();
}
function drawScenChart(){
  const keys=['custom'].concat(S.presets.map(p=>p.id)).filter(k=>S.results[k]);const ser=keys.map((k,i)=>({x:S.results[k].res.t.map(t=>t/3600),y:Array.from(S.results[k].an.g.popAff),color:PAL[i%PAL.length],label:k==='custom'?'Custom':({normal:'Normal',heavy:'Heavy',extreme:'Extreme',drainfail:'Drain fail',blocked:'Blocked'})[k]||k}));
  if(ser.length)chart($('#ch5'),{xMax:Math.max(...keys.map(k=>S.results[k].sc.horizon)),f1:v=>fmtN(v),series:ser});
}

/* ---------- panels ---------- */
function zoneState(r,k,f){const Z=r.an.zones[k],q=zoneClassAt(Z,f,S.th),tNow=r.res.t[f]/3600;return{q,rel:isFinite(Z.etaC)?Z.etaC-tNow:Infinity,relW:isFinite(Z.etaW)?Z.etaW-tNow:Infinity};}
function updatePanels(){
  const r=R();if(!r)return;const w=W(),f=Math.min(S.f,r.res.t.length-1),an=r.an,tNow=r.res.t[f]/3600,CLc=CL();
  $('#clock').innerHTML='<b>'+clockStr(tNow)+'</b><br>t = '+tNow.toFixed(1)+' h of '+r.sc.horizon+' h';$('#tslider').value=f;
  // kpis
  const st=w.zones.map((z,k)=>Object.assign({k},zoneState(r,k,f)));
  const nowC=st.filter(s=>s.q===2).length,fut=st.filter(s=>s.q<2&&s.rel>0&&isFinite(s.rel)).sort((a,b)=>a.rel-b.rel)[0];
  const lead=fut?fut:null,scenName=S.view==='custom'?'Custom run':S.presets.find(p=>p.id===S.view).name;
  $('#kpis').innerHTML=
   kpi(fmtN(an.g.popAff[f]),'People affected now','peak '+fmtN(an.sum.peakPopAff))+
   kpi('<span style="color:var(--crit)">'+fmtN(an.g.popCrit[f])+'</span>','At critical level now','peak '+fmtN(an.sum.peakPopCrit))+
   kpi(lead?fmtH(lead.rel):(nowC?'now':'None'),'Next zone to turn critical',lead?w.zones[lead.k].name:(nowC?nowC+' zones already critical':'within '+r.sc.horizon+' h'))+
   kpi(an.g.areaAff[f].toFixed(0)+' km²','Flooded area now','peak '+an.sum.areaAff.toFixed(0)+' km²')+
   kpi(an.g.maxD[f].toFixed(2)+' m','Deepest water now','peak '+an.sum.maxD.toFixed(2)+' m')+
   kpi(r.rs.imd,'Rain class (IMD)',Math.round(r.rs.max24)+' mm in wettest 24 h');
  // alert bar
  const bar=$('#alertbar');
  const anyC=nowC>0;
  if(anyC){bar.className='alertbar crit';bar.innerHTML='<span class="dot"></span><span><b>Red alert.</b> '+nowC+' zone'+(nowC>1?'s are':' is')+' at critical level now, '+fmtN(an.g.popCrit[f])+' people in critical cells. <span style="color:var(--mut)">Viewing: '+scenName+'.</span></span>';}
  else if(lead&&lead.rel<=48){const z=w.zones[lead.k],pp=an.zones[lead.k].peakPopCrit;bar.className='alertbar '+(lead.rel<12?'crit':'warn');bar.innerHTML='<span class="dot"></span><span><b>'+(lead.rel<12?'Red alert.':'Orange alert.')+'</b> '+z.name+' is expected to reach critical level in '+fmtH(lead.rel)+', about '+fmtN(pp)+' people in the critical footprint. <span style="color:var(--mut)">Viewing: '+scenName+'.</span></span>';}
  else if(an.sum.critZones>0){bar.className='alertbar warn';bar.innerHTML='<span class="dot"></span><span><b>Orange alert.</b> '+an.sum.critZones+' zone'+(an.sum.critZones>1?'s reach':' reaches')+' critical level during this scenario (up to '+fmtN(an.sum.peakPopCrit)+' people in critical cells); none is critical at this moment. <span style="color:var(--mut)">Viewing: '+scenName+'.</span></span>';}
  else if(an.g.popAff[f]>0||an.sum.peakPopAff>0){bar.className='alertbar warn';bar.innerHTML='<span class="dot"></span><span><b>Yellow alert.</b> Shallow flooding possible ('+fmtN(an.sum.peakPopAff)+' people at peak) but no zone reaches critical level. <span style="color:var(--mut)">Viewing: '+scenName+'.</span></span>';}
  else{bar.className='alertbar safe';bar.innerHTML='<span class="dot"></span><span><b>Green.</b> No flood risk expected in this scenario. <span style="color:var(--mut)">Viewing: '+scenName+'.</span></span>';}
  // zones
  const aif=aiFcFor();
  st.sort((a,b)=>(b.q-a.q)||((a.rel>0?a.rel:-1)-(b.rel>0?b.rel:-1))||(an.zones[b.k].peakPop-an.zones[a.k].peakPop));
  const order=st.slice().sort((a,b)=>{const ka=a.q*1e3+(isFinite(a.rel)?500-Math.min(500,Math.max(0,a.rel)):0)+an.zones[a.k].peakPop/1e6,kb=b.q*1e3+(isFinite(b.rel)?500-Math.min(500,Math.max(0,b.rel)):0)+an.zones[b.k].peakPop/1e6;return kb-ka;});
  let html='';
  for(const s of order){const z=w.zones[s.k],Z=an.zones[s.k],name=z.name;if(z.land<1)continue;
    let sub;if(s.q===2)sub='<b style="color:var(--crit)">Critical</b> now';else if(s.q===1)sub='<b style="color:var(--warn)">Warning</b>'+(isFinite(s.rel)&&s.rel>0?' · critical in '+fmtH(s.rel):(Z.peakClass===2?' · critical earlier':''));
    else sub=isFinite(s.rel)&&s.rel>0?'Safe now · <b style="color:var(--crit)">critical in '+fmtH(s.rel)+'</b>':isFinite(s.relW)&&s.relW>0?'Safe now · warning in '+fmtH(s.relW):(Z.peakClass>0?'Safe again':'Safe');
    let ai='';if(aif){const p=aif.fc[s.k].pCrit;ai='<small>'+(aif.live?'AI preview ':'AI ')+Math.round(p*100)+'% critical</small>';}
    html+='<div class="row'+(s.k===S.sel?' sel':'')+'" tabindex="0" data-k="'+s.k+'"><span class="pill" style="background:'+CLc[s.q]+'"></span><div><div class="n">'+name+'</div><div class="s">'+sub+' · '+z.meanZ.toFixed(0)+' m</div></div><div class="p">'+fmtN(Z.popAff[f])+ai+'</div></div>';}
  $('#zones').innerHTML=evacHtml(r,f)+html;
  $('#zsub').textContent='people affected · '+w.zones.filter(z=>z.land>0).length+' zones';
}
const kpi=(v,l,s)=>'<div class="kpi"><div class="v">'+v+'</div><div class="l">'+l+'</div><div class="s">'+s+'</div></div>';
function compass(dx,dy){const a=Math.atan2(-dy,dx)*180/Math.PI;const n=['east','north-east','north','north-west','west','south-west','south','south-east'];return n[Math.round(((a+360)%360)/45)%8];}
function evacHtml(r,f){
  const w=W(),k=S.sel;if(k<0)return'';const Z=r.an.zones[k],z=w.zones[k];if(Z.peakClass<1||z.meanZ>150)return'';
  let best=-1,bd=1e9;w.zones.forEach((q,j)=>{if(j===k||q.land<3)return;const A=r.an.zones[j];if(A.peakClass>0||q.meanZ<z.meanZ+6)return;const d=Math.hypot(q.cx-z.cx,q.cy-z.cy);if(d<bd){bd=d;best=j;}});
  if(best<0)return'<div class="evac"><b>'+z.name+'</b>: no dry zone found nearby in this scenario. Coordinate relief camps regionally.</div>';
  const q=w.zones[best];return'<div class="evac"><b>'+z.name+'</b> evacuation: move about '+bd.toFixed(1)+' km '+compass(q.cx-z.cx,q.cy-z.cy)+' to higher, dry ground near <b>'+q.name+'</b> ('+q.meanZ.toFixed(0)+' m, stays safe in this scenario). About '+fmtN(Z.peakPop)+' people are affected at peak.</div>';
}
function renderScen(){
  const keys=['custom'].concat(S.presets.map(p=>p.id));
  let h='<tr><th>Scenario</th><th>Rain</th><th>People affected</th><th>Critical people</th><th>Critical zones</th><th>First critical</th><th>Area km²</th><th>Deepest</th></tr>';
  for(const k of keys){const nm=k==='custom'?'Custom (your inputs)':S.presets.find(p=>p.id===k).name,r=S.results[k];
    if(!r){h+='<tr><td>'+nm+'</td><td colspan="7" style="text-align:left;color:var(--dim)">'+(k==='custom'?'Run the simulation':'Queued…')+'</td></tr>';continue;}
    const a=r.an.sum;h+='<tr class="clk'+(S.view===k?' on':'')+'" data-k="'+k+'"><td>'+nm+'</td><td>'+Math.round(r.rs.total)+' mm · '+r.rs.imd+'</td><td>'+fmtN(a.peakPopAff)+'</td><td>'+fmtN(a.peakPopCrit)+'</td><td>'+a.critZones+'</td><td>'+(isFinite(a.firstCrit)?'t+'+a.firstCrit.toFixed(1)+' h':'none')+'</td><td>'+a.areaAff.toFixed(0)+'</td><td>'+a.maxD.toFixed(2)+' m</td></tr>';}
  $('#scTable').innerHTML=h;if($('#p-scen').classList.contains('on'))drawScenChart();
}
function renderAI(){
  const A=S.ai;if(!A)return;const e=A.eval;
  $('#aiMetrics').innerHTML='<div><b>'+(e.r2).toFixed(2)+'</b><span>R² on peak depth (held-out storms)</span></div><div><b>'+(e.auc).toFixed(2)+'</b><span>AUC for critical yes/no</span></div><div><b>'+Math.round(e.acc*100)+'%</b><span>critical-zone accuracy</span></div><div><b>'+(isNaN(e.etaMAE)?'–':e.etaMAE.toFixed(1)+' h')+'</b><span>mean error in time to critical</span></div>';
  const imp=A.importance.slice().sort((a,b)=>b.v-a.v).slice(0,10);
  $('#aiImp').innerHTML=imp.map(i=>'<div class="b"><span>'+i.name+'</span><i class="'+(i.group[0]==='W'?'':'t')+'" style="width:'+Math.round(i.v*100)+'%"></i><span>'+Math.round(i.v*100)+'</span></div>').join('')+'<p class="note"><span class="sw" style="background:var(--vio2)"></span>weather and operations <span class="sw" style="background:var(--water);margin-left:8px"></span>terrain and land</p>';
  drawAIscatter();updateAiCheck();
}
function drawAIscatter(){if(S.ai&&$('#p-ai').classList.contains('on'))scatter($('#ch6'),S.ai.points);}
function updateAiCheck(){
  const r=R();if(!S.ai||!r)return;const pt=aiFcFor();if(!pt)return;const w=W();let agree=0,n=0;
  w.zones.forEach((z,k)=>{if(z.land<1)return;n++;const phys=r.an.zones[k].peakClass===2,ai=pt.fc[k].pCrit>=0.5;if(phys===ai)agree++;});
  $('#aiCheck').innerHTML='Cross-check on the current view: the emulator and the full-resolution physics agree on <b>'+agree+' of '+n+'</b> zones (critical or not). The emulator learns from a coarser grid for speed, so treat it as a fast second opinion and the physics run as the reference.';
}

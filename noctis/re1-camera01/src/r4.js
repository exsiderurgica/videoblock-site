/* ===== Runtime ===== */
const $=id=>document.getElementById(id),cvs=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c};
const cam=new THREE.PerspectiveCamera();cam.position.set(0,CAL.ch,0);
{const n=.3,fa=400,W=IW,H=IH,P=new THREE.Matrix4().set(2*CAL.f/W,0,1-2*CAL.cx/W,0, 0,2*CAL.f/H,2*CAL.cy/H-1,0, 0,0,-(fa+n)/(fa-n),-2*fa*n/(fa-n), 0,0,-1,0);cam.projectionMatrix.copy(P);cam.projectionMatrixInverse.copy(P).invert()}
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x14181b,.019);scene.add(actor.root);
scene.add(new THREE.HemisphereLight(0x5d7088,0x1c1a18,.34));
const rim=new THREE.DirectionalLight(0xf0a878,.48);rim.position.set(3,4,-30);scene.add(rim);
const fill=new THREE.DirectionalLight(0x6f819a,.3);fill.position.set(-4,6,5);scene.add(fill);
const R=new THREE.WebGLRenderer({canvas:$('gl'),alpha:true,antialias:true});R.setPixelRatio(Math.min(devicePixelRatio||1,2));R.setSize(IW,IH,false);R.outputEncoding=THREE.sRGBEncoding;R.setClearColor(0,0);
const state={g:false,p:false,done:false};
function say(t,ms=3800){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(say.t);say.t=setTimeout(()=>e.classList.remove('on'),ms)}
function resolve(prev){
  const p={x:actor.x,z:actor.z};let hit=false;
  for(let i=0;i<3;i++){if(pushPoly(p,.3,GUG))hit=true;for(const b of BCIRC){const dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz),m=b.r+.28;if(d<m){const k=(m-d)/(d||1);p.x+=dx*k;p.z+=dz*k;hit=true}}}
  if(!inPoly(p.x,p.z,WALKG)){hit=true;if(inPoly(p.x,prev.z,WALKG)){p.z=prev.z}else if(inPoly(prev.x,p.z,WALKG)){p.x=prev.x}else{p.x=prev.x;p.z=prev.z}}
  actor.x=p.x;actor.z=p.z;return hit}
const inp={keys:{},use:false};let runHold=false,sp=null;const sv={x:0,y:0};
addEventListener('keydown',e=>{inp.keys[e.code]=true;if(e.code==='KeyE'||e.code==='Space')inp.use=true;if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault()});
addEventListener('keyup',e=>{inp.keys[e.code]=false});
// Non lasciare tasti o corsa virtuale premuti quando Android cambia app o la finestra perde il focus.
addEventListener('blur',()=>{inp.keys={};inp.use=false;runHold=false;sv.x=sv.y=0;knob.style.transform='';$('run').classList.remove('on')});
const stick=$('stick'),knob=$('knob');
function sm(e){const b=stick.getBoundingClientRect(),r=b.width/2;let x=(e.clientX-b.left-r)/r,y=(e.clientY-b.top-r)/r;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}sv.x=x;sv.y=y;knob.style.transform='translate('+x*r*.55+'px,'+y*r*.55+'px)'}
stick.addEventListener('pointerdown',e=>{sp=e.pointerId;stick.setPointerCapture(sp);sm(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===sp)sm(e)});
const se=e=>{if(e.pointerId===sp){sp=null;sv.x=sv.y=0;knob.style.transform=''}};stick.addEventListener('pointerup',se);stick.addEventListener('pointercancel',se);
const rb=$('run');rb.addEventListener('pointerdown',e=>{runHold=true;rb.classList.add('on');rb.setPointerCapture(e.pointerId)});['pointerup','pointercancel'].forEach(t=>rb.addEventListener(t,()=>{runHold=false;rb.classList.remove('on')}));
$('use').addEventListener('pointerdown',()=>{inp.use=true});
function nearSpot(){let best=null,bd=1e9;for(const s of SPOTS){const d=Math.hypot(s.x-actor.x,s.z-actor.z);if(d<s.r&&d<bd){bd=d;best=s}}return best}
function useSpot(){if(combatAction())return;const s=nearSpot();if(!s){say('Niente da fare qui.',1400);return}
  if(s.id==='guglia'){state.g=true;say('La base è bagnata e annerita. In alto, la Madonna dorata guarda un punto della piazza che da qui non vedi.',4800)}
  else if(s.id==='portal'){state.p=true;say('Il portone è chiuso dall’interno. Dietro i battenti, un rumore come di catene.',4600)}
  else say('Il lampione è spento. Il vetro è pieno di insetti morti.',3800);
  $('task').textContent=state.g&&state.p?'Camera 01 completata (prova)':state.g?'Esamina il portone della chiesa':state.p?'Esamina la guglia':'Raggiungi la guglia'}
function update(dt){
  const k=inp.keys;let f=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),t=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0);
  if(Math.abs(sv.x)>.18||Math.abs(sv.y)>.18){f=-sv.y;t=sv.x;if(Math.abs(f)<.25)f=0;if(Math.abs(t)<.25)t=0}
  if(COMBAT.picking){f=0;t=0}
  const run=!!(k.ShiftLeft||k.ShiftRight||runHold);
  const target=f>0?(run?RUN:WALK*Math.min(1,f)):f<0?-1.0:0,acc=Math.abs(target)>Math.abs(actor.speed)?6.5:11;actor.speed+=cl(target-actor.speed,-acc*dt,acc*dt);
  const tr=(run&&f>0?3.0:2.2)*t;actor.turn+=(tr-actor.turn)*Math.min(1,dt*12);actor.yaw+=actor.turn*dt;
  const prev={x:actor.x,z:actor.z};actor.x+=Math.sin(actor.yaw)*actor.speed*dt;actor.z+=-Math.cos(actor.yaw)*actor.speed*dt;
  if(resolve(prev)){const mv=Math.hypot(actor.x-prev.x,actor.z-prev.z)/Math.max(dt,1e-4);actor.speed=Math.sign(actor.speed)*Math.min(Math.abs(actor.speed),mv+.2)}
  (actor.hero?heroAnim:poseActor)(dt,Math.abs(actor.speed),actor.turn,actor.speed<-.05);
  combatPose(dt);
  audioFootsteps(dt,Math.abs(actor.speed),Math.abs(actor.speed)>2.4);
  updateZombie(dt);
  combatUpdate(dt);
  actor.root.position.set(actor.x,0,actor.z);actor.root.rotation.y=-actor.yaw;
  if(inp.use){inp.use=false;useSpot()}
}
/* Occlusori 3D nella stessa proiezione del render fotografico.
   Invece di coprire indiscriminatamente tutto il canvas WebGL in base alla posizione
   di un solo personaggio, ogni superficie scrive nel depth buffer: protagonista e
   Pulcinella possono passare davanti/dietro alla stessa guglia o agli stessi paletti. */
const foregroundMeshes=[];
function foregroundFromMask(poly,base){
  // Lo sfondo fotografico contiene gia' guglia e paletti.
  // Queste sagome scrivono SOLO nel depth buffer, senza alterare colore o alpha:
  // i personaggi dietro vengono nascosti, ma non appare alcun poligono nero.
  const depth=CAL.f*CAL.ch/(base-CAL.cy),px=depth/CAL.f;
  const points=poly.map(([u,v])=>new THREE.Vector2(u,v));
  const triangles=THREE.ShapeUtils.triangulateShape(points,[]);
  if(!triangles.length){
    console.error('NOCTIS: maschera non triangolata',triangles.length,points.length);
    return false;
  }
  const positions=[];
  triangles.forEach(tri=>tri.forEach(i=>{
    const u=poly[i][0],v=poly[i][1];
    positions.push((u-CAL.cx)*px,CAL.ch+(CAL.cy-v)*px,-depth);
  }));
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const material=new THREE.MeshBasicMaterial({color:0xffffff,colorWrite:false,
    depthTest:true,depthWrite:true,side:THREE.DoubleSide,fog:false,toneMapped:false});
  const mesh=new THREE.Mesh(geometry,material);
  // Va disegnato PRIMA dei personaggi: altrimenti la profondita' non li copre.
  mesh.renderOrder=-100;
  mesh.frustumCulled=false;
  scene.add(mesh);foregroundMeshes.push(mesh);
  return true;
}
function render(){R.render(scene,cam)}
function drawDebug(){const c=$('dbg').getContext('2d');c.clearRect(0,0,IW,IH);
  const poly=(P,col)=>{c.strokeStyle=col;c.lineWidth=2;c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.stroke()};
  poly(WALK_IMG,'#3f3');poly(GUG_BASE,'#f44');poly(GUG_MASK,'#48f');MASKS.slice(1).forEach(m=>poly(m.poly,'#48f'));
  for(const b of BCIRC){c.strokeStyle='#f84';c.beginPath();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,q=g2img(b.x+Math.cos(a)*b.r,b.z+Math.sin(a)*b.r);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])}c.stroke()}
  c.strokeStyle='#ff0';c.beginPath();c.moveTo(0,CAL.cy);c.lineTo(IW,CAL.cy);c.stroke();
  for(const v of [540,620,720,840,920]){const h=1.8*ppm(v);c.strokeStyle='#0ff';c.beginPath();c.moveTo(60,v);c.lineTo(60,v-h);c.stroke();c.fillStyle='#0ff';c.fillText('1.8m@'+v,66,v-4)}
  for(const s of SPOTS){const q=g2img(s.x,s.z);c.strokeStyle='#f0f';c.strokeRect(q[0]-8,q[1]-8,16,16)}
  const f=g2img(actor.x,actor.z);c.fillStyle='#ff0';c.fillRect(f[0]-3,f[1]-3,6,6)}
let running=false,last=0,dbgOn=false;
const VW={s:1,portrait:false};
function fit(){const fr=$('frame');VW.portrait=innerHeight>innerWidth;
  if(VW.portrait){VW.s=innerHeight/IH;fr.style.width='100vw';fr.style.height='100vh';fr.style.maxHeight='none';fr.style.aspectRatio='auto'}
  else{fr.style.width=fr.style.height=fr.style.aspectRatio=fr.style.maxHeight='';VW.s=fr.clientWidth/IW}
  pan()}
function pan(){let x=0;if(VW.portrait){const u=g2img(actor.x,actor.z)[0]*VW.s,max=Math.max(0,IW*VW.s-innerWidth);x=Math.max(0,Math.min(max,u-innerWidth/2))}
  $('stage').style.transform='translate('+(-x)+'px,0) scale('+VW.s+')'}
const ready={bg:false,hero:false,zombie:false,error:false};
function assetStatus(key,ok){
  const st=$('start');
  if(!ok){ready.error=true;st.disabled=true;st.textContent=({hero:'ERRORE PERSONAGGIO 3D',zombie:'ERRORE ZOMBIE 3D',bg:'ERRORE SFONDO'})[key];return}
  ready[key]=true;
  if(!ready.error&&ready.bg&&ready.hero&&ready.zombie){st.disabled=false;st.textContent='INIZIA'}
}
function boot(){
  fit();addEventListener('resize',fit);
  try{const nz=cvs(192,192,(c,w,h)=>{const id=c.createImageData(w,h);for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}c.putImageData(id,0,0)});$('grain').style.background='url('+nz.toDataURL()+')';
    const mk=()=>cvs(512,512,(c,w,h)=>{for(let i=0;i<70;i++){const x=Math.random()*w,y=Math.random()*h,r=50+Math.random()*110,g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,'rgba(150,170,175,.35)');g.addColorStop(1,'rgba(150,170,175,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}}).toDataURL();
    const fu='url('+mk()+')';$('fog1').style.backgroundImage=fu;$('fog2').style.backgroundImage=fu;$('fog1').style.backgroundRepeat=$('fog2').style.backgroundRepeat='repeat-x';$('fog1').style.backgroundSize=$('fog2').style.backgroundSize='982px 941px'}catch(e){}
  for(const g of [[535,412,150],[232,436,110],[42,440,90]]){const d=document.createElement('div');d.className='glow';d.style.cssText='left:'+(g[0]-g[2]/2)+'px;top:'+(g[1]-g[2]/2)+'px;width:'+g[2]+'px;height:'+g[2]+'px;animation-delay:'+(-Math.random()*3)+'s';$('glows').appendChild(d)}
  loadHero(ok=>{window.__heroOk=ok;assetStatus('hero',ok)});
  buildZombie(ok=>{window.__zomOk=ok;assetStatus('zombie',ok)});
  const img=new Image();img.onload=()=>{
    $('bg').getContext('2d').drawImage(img,0,0);
    // Lo sfondo e' disegnato solo sul canvas 2D. Le sagome sono invisibili
    // e servono esclusivamente come test di profondita' nel canvas WebGL.
    const cutoutsOK=MASKS.every(m=>foregroundFromMask(m.poly,m.base));
    if(!cutoutsOK){assetStatus('bg',false);return}
    assetStatus('bg',true);render()};
  img.onerror=()=>assetStatus('bg',false);img.src='bg.jpg';
  $('start').addEventListener('click',()=>{if($('start').disabled)return;$('intro').style.display='none';running=true;last=performance.now();audioStart();say('Qualcosa si muove nella piazza.',3400)});
  const home=()=>{const g=img2g(330,790);actor.x=g[0];actor.z=g[1];actor.yaw=.3;actor.speed=0};home();
  combatInit();
  $('reset').addEventListener('click',home);
  $('aud').addEventListener('click',()=>{const on=audioToggle();$('aud').textContent=on?'♪ AUDIO':'♪ MUTO'});$('dbgb').addEventListener('click',()=>{dbgOn=!dbgOn;$('dbg').hidden=!dbgOn;if(dbgOn)drawDebug()});
  (function loop(now){requestAnimationFrame(loop);if(!running)return;const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);render();pan();if(dbgOn)drawDebug()})(performance.now());
}
window.__noctis={combat:combatProbe,probe:()=>({x:actor.x,z:actor.z,yaw:actor.yaw,speed:actor.speed,feet:g2img(actor.x,actor.z),depthOccluders:foregroundMeshes.length,occlusionMode:'depth-only'}),
  setImg:(u,v,yaw=actor.yaw)=>{const g=img2g(u,v);actor.x=g[0];actor.z=g[1];actor.yaw=yaw;actor.speed=0;resolve({x:actor.x,z:actor.z});update(.016);render();return window.__noctis.probe()},
  step:(n,f,t,run)=>{for(let i=0;i<n;i++){inp.keys={KeyW:f>0,KeyS:f<0,KeyA:t<0,KeyD:t>0,ShiftLeft:!!run};update(1/60)}inp.keys={};render();return window.__noctis.probe()},
  use:()=>{inp.use=true;update(.016)},start:()=>{if($('start').disabled)return false;$('intro').style.display='none';running=true;last=performance.now()},debug:(on)=>{dbgOn=on;$('dbg').hidden=!on;if(on)drawDebug()}};
boot();

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const game=$('game'),stage=$('stage'),renderLayer=$('renderLayer');const state=$('state');const start=$('start');let started=false,sprint=false;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(41,1,.05,50);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
renderer.setClearColor(0,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
renderer.domElement.style.zIndex='0';
renderLayer.appendChild(renderer.domElement);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;
scene.add(new THREE.HemisphereLight(0x7585aa,0x776c5c,1.25));
const keyLight=new THREE.DirectionalLight(0xffc18c,1.05); keyLight.position.set(-2,6,5);scene.add(keyLight);
const bounce=new THREE.DirectionalLight(0xa3b6de,.35);bounce.position.set(4,5,-5);scene.add(bounce);
const hero=new THREE.Group();scene.add(hero);
let mixer=null, actions={},activeAction=null,modelReady=false;
const shadowC=document.createElement('canvas');shadowC.width=shadowC.height=128;const shadowCtx=shadowC.getContext('2d'),rad=shadowCtx.createRadialGradient(64,64,5,64,64,63);
rad.addColorStop(0,'rgba(5,5,8,.58)');rad.addColorStop(.45,'rgba(5,5,8,.25)');rad.addColorStop(1,'rgba(5,5,8,0)');shadowCtx.fillStyle=rad;shadowCtx.fillRect(0,0,128,128);
const silhouetteShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowC),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
silhouetteShadow.rotation.x=-Math.PI/2;silhouetteShadow.position.y=.01;hero.add(silhouetteShadow);
const goal=new THREE.Group();scene.add(goal);goal.position.set(-1.05,.06,-.7);
const ring=new THREE.Group();goal.add(ring); // collision target, no uncalibrated floating ring
const glow=new THREE.PointLight(0xf2c679,1.8,1.8);glow.position.y=.5;goal.add(glow);
let gotKey=false,door=false;
const STAGE_W=1050,STAGE_H=590;let projectedX=620;
camera.aspect=STAGE_W/STAGE_H;camera.fov=40;camera.position.set(0,2.6,7.5);camera.lookAt(0,1.52,.35);camera.updateProjectionMatrix();
const masks=[
 {name:'guglia',z:-1.92,polygon:'polygon(37% 19%, 38% 21%, 38.5% 47%, 41% 51%, 42% 70%, 45% 75%, 45% 79%, 31% 79%, 31% 74%, 34% 71%, 35% 53%, 36% 48%)'},
 {name:'lampione',z:-.25,polygon:'polygon(46% 56%, 48.2% 56%, 48.2% 78%, 46.5% 78%)'},
 {name:'paletto1',z:1.2,polygon:'polygon(25.2% 72%, 27.2% 72%, 27.8% 85%, 25.7% 85%)'},
 {name:'paletto2',z:1.2,polygon:'polygon(45.2% 72%, 47% 72%, 47.6% 85%, 45.3% 85%)'},
 {name:'paletto3',z:1.2,polygon:'polygon(58% 72%, 59.7% 72%, 60% 83%, 58% 83%)'},
 {name:'paletto4',z:1.2,polygon:'polygon(69% 73%, 71.1% 73%, 72% 87%, 69.5% 87%)'}
].map(m=>{const el=document.createElement('div');el.className='foregroundMatte';el.style.clipPath=m.polygon;el.dataset.mask=m.name;stage.appendChild(el);return {...m,el};});
function footPixel(){const p=new THREE.Vector3(player.x,0,player.z).project(camera);return {x:(p.x+1)*STAGE_W/2,y:(1-p.y)*STAGE_H/2};}
function updateFraming(){const w=game.clientWidth,h=game.clientHeight,s=Math.max(w/STAGE_W,h/STAGE_H);let left=(w-STAGE_W*s)/2;
 if(h>w)left=Math.max(w-STAGE_W*s,Math.min(0,w/2-projectedX*s));
 stage.style.left=left+'px';stage.style.top=((h-STAGE_H*s)/2)+'px';stage.style.transform='scale('+s+')';}
function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));renderer.setSize(STAGE_W,STAGE_H,false);updateFraming();}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);resize();
function updateMattes(){for(const m of masks)m.el.style.display=player.z<m.z?'block':'none';}
if(new URLSearchParams(location.search).has('debug')){const grid=new THREE.GridHelper(12,12,0x00ff80,0x00ff80);grid.position.y=.015;scene.add(grid);}
const loader=new GLTFLoader();
loader.load('../re1-civilian/assets/civilian_animated.glb',data=>{
  const actor=data.scene;
  // The CC0 humanoid is still temporary. Place the actual soles at world y=0.
  const bounds=new THREE.Box3().setFromObject(actor),size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.01)throw Error('Dimensioni GLB non valide');
  const f=1.74/size.y;actor.scale.setScalar(f);
  actor.position.set(-.5*(bounds.min.x+bounds.max.x)*f,-bounds.min.y*f,-.5*(bounds.min.z+bounds.max.z)*f);
  actor.traverse(n=>{
    if(/^(Phone|Original held accessory)$/i.test(n.name)) n.visible=false;
    if(!n.isMesh)return;
    n.frustumCulled=false;
    const mats=Array.isArray(n.material)?n.material:[n.material];
    const newMats=mats.map(m=>{
      let mat=m.clone();
      const label=(n.name+' '+(m.name||'')).toLowerCase();
      let tint=null;
      if(label.includes('original bottom')) tint=[.14,.23,.36]; // denim: retain texture details; do not tint as hoodie
      else if(label.includes('original top')||label.includes('casualsuit')) tint=[.25,.045,.065]; // darker burgundy; source mesh is a sweater, not yet a hoodie
      else if(label.includes('shoes')||label.includes('ankle lining')) tint=[.34,.27,.21];
      if(tint){
        mat.color.set(0xffffff);
        mat.onBeforeCompile=shader=>{
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n  diffuseColor.rgb *= vec3('+tint.join(',')+');');
        };
        mat.customProgramCacheKey=()=> 'noctis-cloth-'+tint.join('-');
      }
      if('roughness' in mat)mat.roughness=.93;
      if('metalness' in mat)mat.metalness=0;
      return mat;
    });
    n.material=Array.isArray(n.material)?newMats:newMats[0];
  });
  hero.add(actor);
  mixer=new THREE.AnimationMixer(actor);
  const clipByName={Idle:'Idle_Standing',Walk:'Walk_Brisk',Run:'Jog'};
  for (const [short,name] of Object.entries(clipByName)){
    const clip=data.animations.find(x=>x.name===name);
    if(clip)actions[short]=mixer.clipAction(clip);
  }
  if(!actions.Idle||!actions.Walk||!actions.Run)throw new Error('Modello senza Idle_Standing / Walk_Brisk / Jog');actions.Walk.timeScale=.85;actions.Run.timeScale=.9;
  activate('Idle');
  modelReady=true;start.disabled=false;start.textContent='INIZIA IL TEST';state.textContent='Modello civile 3D pronto · Idle / Walk / Run';
},p=>{if(p.total>0)state.textContent='Caricamento personaggio '+Math.round(100*p.loaded/p.total)+'%…';},err=>{start.textContent='IMPOSSIBILE AVVIARE';state.textContent='Errore caricamento GLB: '+String(err?.message||err);console.error(err);});
function activate(type){if(activeAction===actions[type])return;const prev=activeAction;activeAction=actions[type];if(prev)prev.fadeOut(.28);activeAction.reset().fadeIn(.28).play();}
let last=performance.now(),time=0;
let keys={},joystick={x:0,y:0},stickId=null,stickRadius=52;
const startX=()=>1.0;
let player={x:startX(),z:-.45,dir:Math.PI};
hero.position.set(player.x,0,player.z);
// Invisible physical barriers approximate the photographed stonework and bollards.
const blockers=[
 {x:-1.85,z:-2.05,w:1.65,d:1.3},
 {x:3.8,z:-1.5,w:1,d:5},
 {x:-3.8,z:-1.6,w:1,d:4},
 {x:-2.8,z:1,r:.23},{x:-.4,z:1.05,r:.23},{x:1.5,z:1.05,r:.23},{x:3,z:1.05,r:.23}
];
function blocked(x,z){if(x< -3.45||x>3.55||z< -2.45||z>3)return true;
 for(const b of blockers){
 if(b.r){if(Math.hypot(x-b.x,z-b.z)<b.r+.24)return true;}
 else if(Math.hypot(Math.max(Math.abs(x-b.x)-b.w/2,0),Math.max(Math.abs(z-b.z)-b.d/2,0))<.22)return true;
 }return false;
}
function move(dt){
 const f=(keys.w||keys.ArrowUp?1:0)-(keys.s||keys.ArrowDown?1:0)-joystick.y;
 const turn=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0)+joystick.x;
 player.dir+=Math.max(-1,Math.min(1,turn))*dt*2.55;
 let moved=false;
 if(Math.abs(f)>.08){let speed=(sprint||keys.Shift?2.85:1.65)*Math.min(1,Math.abs(f)),distance=Math.sign(f)*dt*speed;
  const dx=Math.sin(player.dir)*distance,dz=Math.cos(player.dir)*distance;
  if(!blocked(player.x+dx,player.z)){player.x+=dx;moved=true;}
  if(!blocked(player.x,player.z+dz)){player.z+=dz;moved=true;}
 }
 hero.position.set(player.x,0,player.z);hero.rotation.y=player.dir;
 activate(moved?(sprint||keys.Shift?'Run':'Walk'):'Idle');
 updateMattes();projectedX=footPixel().x;if(innerHeight>innerWidth)updateFraming();
}
window.__noctisProbe=()=>({ready:modelReady,playing:started,feet:footPixel(),player:{...player},collisions:blocked(-1.85,-2.05),occlusion:masks.map(m=>({name:m.name,visible:m.el.style.display==='block'}))});
function show(msg){const e=$('toast');e.textContent=msg;e.classList.add('on');clearTimeout(show._t);show._t=setTimeout(()=>e.classList.remove('on'),2300);}
function action(){if(!started||!modelReady)return;
  if(!gotKey&&Math.hypot(player.x-goal.position.x,player.z-goal.position.z)<1.05){gotKey=true;goal.visible=false;$('task').textContent='Raggiungi il portone della chiesa';show('HAI TROVATO LA CHIAVE');return;}
  if(gotKey&&player.x>2.5&&player.z<-.6){door=true;show('PORTONE APERTO · FINE DEL TEST');$('task').textContent='Test completato — Piazza del Gesù';return;}
  show(gotKey?'Avvicinati al portone a destra':'Cerca la chiave oltre la guglia');
}
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;
  if(started&&modelReady){move(dt);mixer?.update(dt);}renderer.render(scene,camera);
}
requestAnimationFrame(loop);
const stick=$('stick'),knob=$('knob');function stickMove(e){const r=stick.getBoundingClientRect();let x=(e.clientX-(r.left+r.width/2))/stickRadius;let y=(e.clientY-(r.top+r.height/2))/stickRadius;const mag=Math.hypot(x,y);if(mag>1){x/=mag;y/=mag;}joystick.x=x;joystick.y=y;knob.style.transform=`translate(${x*stickRadius}px,${y*stickRadius}px)`;}
stick.addEventListener('pointerdown',e=>{if(stickId!==null)return;stickId=e.pointerId;stick.setPointerCapture(stickId);stickMove(e);e.preventDefault()});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId){stickMove(e);e.preventDefault()}});
function stickUp(e){if(e.pointerId!==stickId)return;stickId=null;joystick={x:0,y:0};knob.style.transform='translate(0,0)';}
stick.addEventListener('pointerup',stickUp);stick.addEventListener('pointercancel',stickUp);
$('run').addEventListener('pointerdown',e=>{sprint=true;$('run').style.background='#baa270';$('run').setPointerCapture(e.pointerId);e.preventDefault()});
function runUp(){sprint=false;$('run').style.background=''}$('run').addEventListener('pointerup',runUp);$('run').addEventListener('pointercancel',runUp);
$('use').addEventListener('click',action);
window.addEventListener('keydown',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=true;if(e.key==='e'||e.key===' ')action();if(e.key.startsWith('Arrow'))e.preventDefault();});window.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false});window.addEventListener('blur',()=>{keys={};joystick={x:0,y:0};sprint=false;knob.style.transform='translate(0,0)'});
$('restart').addEventListener('click',()=>{player={x:startX(),z:-.45,dir:Math.PI};gotKey=false;door=false;goal.visible=true;$('task').textContent='Trova la chiave vicino alla guglia';show('SCENA RIPRISTINATA')});
$('full').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else game.requestFullscreen?.().catch(()=>{})});
const audio=$('bgm'); audio.volume=.42;let blobUrl='',audioReady=false,loadAudioPromise=null;
async function loadAudio(){if(loadAudioPromise)return loadAudioPromise;loadAudioPromise=(async()=>{try{const chunks=await Promise.all(Array.from({length:6},(_,i)=>fetch('../music/p'+i+'.bin').then(r=>{if(!r.ok)throw new Error('Audio HTTP '+r.status);return r.arrayBuffer();})));const track=new Blob(chunks,{type:'audio/ogg'});if(track.size<1500000)throw new Error('Audio incompleto');blobUrl=URL.createObjectURL(track);audio.src=blobUrl;audioReady=true;return true;}catch(e){console.warn('Audio non disponibile',e);return false;}})();return loadAudioPromise;}
loadAudio();function playAudio(){if(!audioReady){show('Audio in caricamento');return;}audio.play().then(()=>$('music').textContent='Ⅱ MUSICA').catch(()=>show('Tocca ♫ AUDIO per attivare'));}
$('music').addEventListener('click',()=>{if(audio.paused)playAudio();else{audio.pause();$('music').textContent='♫ AUDIO'}});
$('pick').addEventListener('click',()=>$('track').click());$('track').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(f);audio.src=blobUrl;audioReady=true;playAudio();});
start.addEventListener('click',()=>{if(!modelReady)return;started=true;$('intro').style.display='none';if(audioReady)playAudio();else loadAudio().then(ok=>{if(ok&&started)playAudio()})});
window.addEventListener('pagehide',()=>{audio.pause();if(blobUrl)URL.revokeObjectURL(blobUrl)});
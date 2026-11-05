import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const game=$('game'); const state=$('state');const start=$('start');let started=false, sprint=false;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(41,1,.05,50);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
renderer.setClearColor(0,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
renderer.domElement.style.zIndex='0';
game.insertBefore(renderer.domElement,game.firstChild);
scene.add(new THREE.HemisphereLight(0x8398c9,0xb7a080,2.6));
const keyLight=new THREE.DirectionalLight(0xffd3a1,2.1); keyLight.position.set(-2,6,5);scene.add(keyLight);
const bounce=new THREE.DirectionalLight(0xa3b6de,.7);bounce.position.set(4,5,-5);scene.add(bounce);
const hero=new THREE.Group();scene.add(hero);
let mixer=null, actions={},activeAction=null,modelReady=false;
const silhouetteShadow=new THREE.Mesh(new THREE.CircleGeometry(.5,20),new THREE.MeshBasicMaterial({color:0x060506,transparent:true,opacity:.42,depthWrite:false}));silhouetteShadow.rotation.x=-Math.PI/2;silhouetteShadow.position.y=.02;hero.add(silhouetteShadow);
const goal=new THREE.Group();scene.add(goal);goal.position.set(.7,.05,-2.15);
const ring=new THREE.Group();goal.add(ring); // collision target, no uncalibrated floating ring
const glow=new THREE.PointLight(0xf2c679,1.8,1.8);glow.position.y=.5;goal.add(glow);
let gotKey=false,door=false;
function resize(){let w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const portrait=h>w;camera.fov=portrait?47:40;camera.position.set(0,portrait?2.65:2.5,portrait?9.6:7.5);camera.lookAt(0,portrait?1.15:1.1,.35);camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);resize();
const loader=new GLTFLoader();
loader.load('./assets/civilian_animated.glb',data=>{
  const actor=data.scene;
  // This is an actual CC0 civilian skinned animation mesh. Face and clothes still require customization to match the photographs.
  actor.traverse(n=>{
    if(/^(Phone|Original held accessory)$/i.test(n.name)) n.visible=false;
    if(!n.isMesh)return;
    n.frustumCulled=false;
    const mats=Array.isArray(n.material)?n.material:[n.material];
    const newMats=mats.map(m=>{
      let mat=m.clone();
      const label=(n.name+' '+(m.name||'')).toLowerCase();
      let tint=null;
      if(label.includes('original bottom')) tint=[.08,.16,.28]; // denim first: avoid tinting jeans as hoodie
      else if(label.includes('original top')||label.includes('casualsuit')) tint=[.40,.09,.14]; // burgundy hoodie palette
      else if(label.includes('shoes')||label.includes('ankle lining')) tint=[.24,.20,.16];
      if(tint){
        mat.color.set(0xffffff);
        mat.onBeforeCompile=shader=>{
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3('+tint.join(',')+'), 0.53);');
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
  const clipByName={Idle:'Idle_Standing',Walk:'Walk_Relaxed',Run:'Run'};
  for (const [short,name] of Object.entries(clipByName)){
    const clip=data.animations.find(x=>x.name===name);
    if(clip)actions[short]=mixer.clipAction(clip);
  }
  if(!actions.Idle||!actions.Walk||!actions.Run)throw new Error('Modello senza Idle_Standing / Walk_Relaxed / Run');
  activate('Idle');
  modelReady=true;start.disabled=false;start.textContent='INIZIA IL TEST';state.textContent='Modello civile 3D pronto · Idle / Walk / Run';
},p=>{if(p.total>0)state.textContent='Caricamento personaggio '+Math.round(100*p.loaded/p.total)+'%…';},err=>{start.textContent='IMPOSSIBILE AVVIARE';state.textContent='Errore caricamento GLB: '+String(err?.message||err);console.error(err);});
function activate(type){if(activeAction===actions[type])return;const prev=activeAction;activeAction=actions[type];if(prev)prev.fadeOut(.18);activeAction.reset().fadeIn(.18).play();}
let last=performance.now(),time=0;
let keys={},joystick={x:0,y:0},stickId=null,stickRadius=52;
const startX=()=>window.innerHeight>window.innerWidth?0:-1.15;
let player={x:startX(),z:2.1,dir:Math.PI};
hero.position.set(player.x,0,player.z);
function move(dt){let dx=joystick.x,dy=joystick.y;if(keys.ArrowLeft||keys.a)dx-=1;if(keys.ArrowRight||keys.d)dx+=1;if(keys.ArrowUp||keys.w)dy-=1;if(keys.ArrowDown||keys.s)dy+=1;
  const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}if(len>.08){
    let speed=(sprint||keys.Shift?2.8:1.45);const maxX=window.innerHeight>window.innerWidth?1.0:3.0;player.x=Math.max(-maxX,Math.min(maxX,player.x+dx*dt*speed));player.z=Math.max(-2.7,Math.min(3.3,player.z+dy*dt*speed));
    let desired=Math.atan2(dx,dy);let d=(desired-player.dir+Math.PI*3)%(Math.PI*2)-Math.PI;player.dir+=d*Math.min(1,dt*11);
    activate(sprint||keys.Shift?'Run':'Walk');
  }else activate('Idle');
  hero.position.set(player.x,0,player.z);hero.rotation.y=player.dir;
  if(!gotKey){ring.rotation.z+=dt*.8;ring.position.y=.12+Math.sin(time*3)*.035;}
}
function show(msg){const e=$('toast');e.textContent=msg;e.classList.add('on');clearTimeout(show._t);show._t=setTimeout(()=>e.classList.remove('on'),2300);}
function action(){if(!started||!modelReady)return;
  if(!gotKey&&Math.hypot(player.x-goal.position.x,player.z-goal.position.z)<1.5){gotKey=true;goal.visible=false;$('task').textContent='Raggiungi il portone della chiesa';show('HAI TROVATO LA CHIAVE');return;}
  if(gotKey&&player.x>1.6&&player.z<-1.2){door=true;show('PORTONE APERTO · FINE DEL TEST');$('task').textContent='Test completato — Piazza del Gesù';return;}
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
$('restart').addEventListener('click',()=>{player={x:startX(),z:2.1,dir:Math.PI};gotKey=false;door=false;goal.visible=true;$('task').textContent='Trova la chiave vicino alla guglia';show('SCENA RIPRISTINATA')});
$('full').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else game.requestFullscreen?.().catch(()=>{})});
const audio=$('bgm'); audio.volume=.42;let blobUrl='',audioReady=false,loadAudioPromise=null;
async function loadAudio(){if(loadAudioPromise)return loadAudioPromise;loadAudioPromise=(async()=>{try{const chunks=await Promise.all(Array.from({length:6},(_,i)=>fetch('../music/p'+i+'.bin').then(r=>{if(!r.ok)throw new Error('Audio HTTP '+r.status);return r.arrayBuffer();})));const track=new Blob(chunks,{type:'audio/ogg'});if(track.size<1500000)throw new Error('Audio incompleto');blobUrl=URL.createObjectURL(track);audio.src=blobUrl;audioReady=true;return true;}catch(e){console.warn('Audio non disponibile',e);return false;}})();return loadAudioPromise;}
loadAudio();function playAudio(){if(!audioReady){show('Audio in caricamento');return;}audio.play().then(()=>$('music').textContent='Ⅱ MUSICA').catch(()=>show('Tocca ♫ AUDIO per attivare'));}
$('music').addEventListener('click',()=>{if(audio.paused)playAudio();else{audio.pause();$('music').textContent='♫ AUDIO'}});
$('pick').addEventListener('click',()=>$('track').click());$('track').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(f);audio.src=blobUrl;audioReady=true;playAudio();});
start.addEventListener('click',()=>{if(!modelReady)return;started=true;$('intro').style.display='none';if(audioReady)playAudio();else loadAudio().then(ok=>{if(ok&&started)playAudio()})});
window.addEventListener('pagehide',()=>{audio.pause();if(blobUrl)URL.revokeObjectURL(blobUrl)});
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeWorld} from './world.js';

const $=id=>document.getElementById(id);
const W=1280,H=720,game=$('game'),stage=$('stage'),background=$('background');
const status=$('status'),start=$('start');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setSize(W,H,false);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
renderer.setClearColor(0x08121e,1);
renderer.domElement.style.pointerEvents='none';
$('actorLayer').appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(51,W/H,.1,160);
camera.position.set(-4,7.1,45);
camera.lookAt(-1.5,12.6,-13);
camera.updateProjectionMatrix();
const {world,depthMeshes,colliders,guglia,mat}=makeWorld(scene);
let mixer=null,actions={},active=null,modelReady=false,bakedReady=false,playing=false,sprint=false;
let sourceModel=null;
const actorRoot=new THREE.Group();scene.add(actorRoot);
actorRoot.visible=false;
const debug=new URLSearchParams(location.search).has('debug');
const show=(m)=>{const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(show.timer);show.timer=setTimeout(()=>t.classList.remove('on'),2200)};
let player={x:3.4,z:19.8,yaw:Math.PI},hasKey=false,finished=false;
actorRoot.position.set(player.x,0,player.z);actorRoot.rotation.y=player.yaw;

// Ground contact shadow: projected on common world plane.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
const ctx=shadowCanvas.getContext('2d');const g=ctx.createRadialGradient(64,64,2,64,64,63);
g.addColorStop(0,'rgba(0,0,0,.64)');g.addColorStop(.35,'rgba(0,0,0,.29)');g.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.25,.82),new THREE.MeshBasicMaterial({
 map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,side:THREE.DoubleSide
}));
shadow.rotation.x=-Math.PI/2;shadow.position.y=.014;actorRoot.add(shadow);

// A single bake with the REAL scene, using EXACTLY this camera.
function bakeScene(){
 if(bakedReady)return;
 actorRoot.visible=false;world.visible=true;
 renderer.setClearColor(0x07111e,1);
 renderer.render(scene,camera);
 let url;
 try{url=renderer.domElement.toDataURL('image/png');}
 catch(err){status.textContent='Errore sfondo prerenderizzato: '+err.message;return;}
 background.src=url;
 // Leave only depth-writing proxies and the separate animated mesh in WebGL.
 world.visible=false;
 scene.background=null;scene.fog=null;
 const depthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
 // This happens ONLY once. Models, masks, collision boxes all came from one world.
 for(const src of depthMeshes){
   const proxy=new THREE.Mesh(src.geometry,depthMaterial);
   proxy.position.copy(src.position);proxy.quaternion.copy(src.quaternion);proxy.scale.copy(src.scale);
   proxy.renderOrder=-2;proxy.userData.mask=true;scene.add(proxy);
   maskInstances.push(proxy);
 }
 renderer.setClearColor(0,0);
 actorRoot.visible=true;
 bakedReady=true;
 updateFraming();
 tryStart();
}
const maskInstances=[];
const loader=new GLTFLoader();
loader.load('../re1-civilian/assets/civilian_animated.glb',gltf=>{
 try{
   sourceModel=gltf.scene;
   // Unlike the old prototype, remove the GLB origin offset before gameplay.
   const box=new THREE.Box3().setFromObject(sourceModel);
   const extent=box.getSize(new THREE.Vector3());
   if(!Number.isFinite(extent.y)||extent.y<.1)throw Error('Modello di dimensioni non valide');
   const scale=1.77/extent.y;
   sourceModel.scale.setScalar(scale);
   sourceModel.position.set(-.5*(box.min.x+box.max.x)*scale,-box.min.y*scale,-.5*(box.min.z+box.max.z)*scale);
   sourceModel.traverse(node=>{
     if(/^(Phone|Original held accessory)$/i.test(node.name))node.visible=false;
     if(!node.isMesh)return;
     node.frustumCulled=false;
     const original=Array.isArray(node.material)?node.material:[node.material];
     const recolor=original.map(m=>{
       const copy=m.clone(),label=(node.name+' '+(m.name||'')).toLowerCase();
       let tint=null;
       if(label.includes('original bottom'))tint=[.23,.29,.38];
       else if(label.includes('original top')||label.includes('casualsuit'))tint=[.19,.19,.20];
       else if(label.includes('shoes')||label.includes('ankle lining'))tint=[.31,.28,.22];
       if(tint){
         copy.color.set(0xffffff);
         copy.onBeforeCompile=shader=>{
           shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
             '#include <map_fragment>\n diffuseColor.rgb *= vec3('+tint.join(',')+');');
         };
         copy.customProgramCacheKey=()=>'noctis-v2-cloth-'+tint.join('-');
       }
       if('roughness' in copy)copy.roughness=.91;
       if('metalness' in copy)copy.metalness=0;
       return copy;
     });
     node.material=Array.isArray(node.material)?recolor:recolor[0];
   });
   actorRoot.add(sourceModel);mixer=new THREE.AnimationMixer(sourceModel);
   for(const [key,clipName] of Object.entries({Idle:'Idle_Standing',Walk:'Walk_Brisk',Run:'Jog'})){
     const clip=gltf.animations.find(c=>c.name===clipName);
     if(!clip)throw Error('Clip non disponibile: '+clipName);
     actions[key]=mixer.clipAction(clip);
     actions[key].setEffectiveTimeScale(key==='Walk'?.80:key==='Run'?.90:1);
   }
   activate('Idle');modelReady=true;tryStart();
 }catch(e){status.textContent='Errore personaggio: '+e.message;console.error(e);}
},p=>{if(p.total>0&&!modelReady)status.textContent='Caricamento personaggio '+Math.round(p.loaded*100/p.total)+'%';},
 e=>{status.textContent='Errore GLB: '+e.message;console.error(e)});
function tryStart(){
 if(!modelReady||!bakedReady)return;
 status.textContent='Camera 01 pronta · sfondo originale 3D + maschere 3D';
 start.disabled=false;start.textContent='INIZIA CAMERA 01';
}
function activate(type){
 if(!actions[type]||actions[type]===active)return;
 const previous=active;active=actions[type];
 if(previous)previous.fadeOut(.24);
 active.reset().fadeIn(.24).play();
}
function blocked(x,z){
 const radius=.38;
 if(x< -30||x>34||z< -23||z>29)return true;
 for(const b of colliders){
  if(b.type==='circle'){if(Math.hypot(x-b.x,z-b.z)<radius+b.r)return true;}
  if(b.type==='aabb'){
   const dx=Math.max(Math.abs(x-b.x)-b.w/2,0),dz=Math.max(Math.abs(z-b.z)-b.d/2,0);
   if(Math.hypot(dx,dz)<radius)return true;
  }
 }
 return false;
}
let keys={},stick={x:0,y:0},stickId=null;
const k=(n)=>keys[n]||false;
function update(dt){
 let forward=(k('w')||k('ArrowUp')?1:0)-(k('s')||k('ArrowDown')?1:0)-stick.y;
 let turn=(k('d')||k('ArrowRight')?1:0)-(k('a')||k('ArrowLeft')?1:0)+stick.x;
 forward=Math.max(-1,Math.min(1,forward));
 turn=Math.max(-1,Math.min(1,turn));
 player.yaw+=turn*dt*2.15;
 let moving=false;
 if(Math.abs(forward)>.09){
   const speed=(sprint||k('Shift')?4.2:2.45)*Math.abs(forward);
   const d=dt*speed*Math.sign(forward),dx=Math.sin(player.yaw)*d,dz=Math.cos(player.yaw)*d;
   if(!blocked(player.x+dx,player.z)){player.x+=dx;moving=true;}
   if(!blocked(player.x,player.z+dz)){player.z+=dz;moving=true;}
 }
 actorRoot.position.set(player.x,0,player.z);actorRoot.rotation.y=player.yaw;
 activate(moving?(sprint||k('Shift')?'Run':'Walk'):'Idle');
 // Actual metric depth. Only proxies in front of the hero need rasterization.
 for(const mask of maskInstances){
   mask.visible=(mask.position.z>player.z-1.5);
 }
 if(innerHeight>innerWidth)updateFraming();
}
function action(){
 if(!playing||!modelReady)return;
 const d=Math.hypot(player.x-guglia.x,player.z-guglia.z);
 if(!hasKey&&d<9){hasKey=true;$('task').textContent='Ora raggiungi la porta del Gesù Nuovo';show('UN SIGILLO TRA LE PIETRE');return;}
 if(hasKey&&player.x>12&&player.z< -14){finished=true;$('task').textContent='Camera 01 completata';show('PORTA SBLOCCATA — FINE TEST');return;}
 show(hasKey?'Dirigiti verso la facciata della chiesa':'Avvicinati alla guglia');
}
function projectFoot(){
 const v=new THREE.Vector3(player.x,0,player.z).project(camera);
 return {x:(v.x+1)*W/2,y:(1-v.y)*H/2};
}
function updateFraming(){
 const scale=Math.max(game.clientWidth/W,game.clientHeight/H);
 const w=W*scale,h=H*scale;
 let left=(game.clientWidth-w)/2;
 // Portrait uses a cropped RE1 fixed camera, following the actor within the prerender.
 if(game.clientHeight>game.clientWidth){
   const feet=projectFoot();
   left=Math.max(game.clientWidth-w,Math.min(0,game.clientWidth/2-feet.x*scale));
 }
 stage.style.transform='translate('+left+'px,'+((game.clientHeight-h)/2)+'px) scale('+scale+')';
}
window.addEventListener('resize',updateFraming);window.addEventListener('orientationchange',updateFraming);
updateFraming();
// Baking is done only after init, before player is shown. The screen is a PNG
// generated by the same Three.js camera, not a photograph or the old fake render.
requestAnimationFrame(()=>{try{bakeScene();}catch(e){status.textContent='Render scena fallito: '+e.message;console.error(e);}});
let last=performance.now();
function frame(now){
 requestAnimationFrame(frame);
 let dt=Math.min(.05,(now-last)/1000);last=now;
 if(playing&&modelReady&&bakedReady){update(dt);mixer?.update(dt);}
 if(bakedReady){renderer.clear();renderer.render(scene,camera);}
}
requestAnimationFrame(frame);

const stickEl=$('stick'),knob=$('knob');
function moveStick(e){
 const r=stickEl.getBoundingClientRect(),max=r.width*.34;
 let x=(e.clientX-r.left-r.width/2)/max,y=(e.clientY-r.top-r.height/2)/max;
 let len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}
 stick.x=x;stick.y=y;knob.style.transform='translate('+(x*max)+'px,'+(y*max)+'px)';
}
stickEl.addEventListener('pointerdown',e=>{if(stickId!==null)return;stickId=e.pointerId;stickEl.setPointerCapture(stickId);moveStick(e);e.preventDefault()});
stickEl.addEventListener('pointermove',e=>{if(e.pointerId===stickId){moveStick(e);e.preventDefault()}});
function stickUp(e){if(e.pointerId!==stickId)return;stickId=null;stick={x:0,y:0};knob.style.transform='translate(0,0)';}
stickEl.addEventListener('pointerup',stickUp);stickEl.addEventListener('pointercancel',stickUp);
const run=$('run');
run.addEventListener('pointerdown',e=>{e.preventDefault();sprint=true;run.setPointerCapture(e.pointerId)});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])run.addEventListener(ev,()=>sprint=false);
$('use').addEventListener('click',action);
window.addEventListener('keydown',e=>{
 const key=e.key.length===1?e.key.toLowerCase():e.key;keys[key]=true;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(key))e.preventDefault();
 if((key==='e'||key===' ')&&!e.repeat)action();
});
window.addEventListener('keyup',e=>keys[e.key.length===1?e.key.toLowerCase():e.key]=false);
window.addEventListener('blur',()=>{keys={};stick={x:0,y:0};sprint=false;knob.style.transform='translate(0,0)'});
$('reset').addEventListener('click',()=>{player={x:3.4,z:19.8,yaw:Math.PI};hasKey=false;finished=false;$('task').textContent='Raggiungi la base della guglia';show('CAMERA RIPRISTINATA')});
$('full').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else game.requestFullscreen?.().catch(()=>{})});
const audio=$('bgm');audio.volume=.38;let audioBlob='',audioLoaded=false,audioPromise=null;
async function loadSound(){
 if(audioPromise)return audioPromise;
 audioPromise=(async()=>{
  try{
   const chunks=await Promise.all(Array.from({length:6},(_,i)=>fetch('../music/p'+i+'.bin').then(x=>{if(!x.ok)throw Error('Audio '+x.status);return x.arrayBuffer()})));
   audioBlob=URL.createObjectURL(new Blob(chunks,{type:'audio/ogg'}));
   audio.src=audioBlob;audioLoaded=true;return true;
  }catch(err){console.warn('Musica non disponibile:',err);return false;}
 })();return audioPromise;
}
function playSound(){if(audioLoaded)audio.play().then(()=>$('music').textContent='Ⅱ MUSICA').catch(()=>{});}
$('music').addEventListener('click',()=>{if(audio.paused){if(audioLoaded)playSound();else loadSound().then(ok=>ok&&playSound());}else{audio.pause();$('music').textContent='♫ AUDIO'}});
$('pick').addEventListener('click',()=>$('track').click());
$('track').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(audioBlob)URL.revokeObjectURL(audioBlob);audioBlob=URL.createObjectURL(file);audio.src=audioBlob;audioLoaded=true;playSound()});
start.addEventListener('click',()=>{
 if(!modelReady||!bakedReady)return;playing=true;$('intro').style.display='none';loadSound().then(ok=>{if(ok&&playing)playSound()});
});
window.addEventListener('pagehide',()=>{audio.pause();if(audioBlob)URL.revokeObjectURL(audioBlob)});
window.__noctisProbe=()=>({
 modelReady,bakedReady,playing,maskCount:maskInstances.length,backgroundReady:!!background.naturalWidth,
 monument:guglia,feet:projectFoot(),player:{...player},groundBlocked:blocked(guglia.x,guglia.z),
 canMove:!blocked(3.4,18),worldIsHidden:!world.visible,
 rect:stage.getBoundingClientRect().toJSON()
});

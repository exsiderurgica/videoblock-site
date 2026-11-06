/* ===== Camera 01 · pistola, interazioni e ferite fisiche (esperimento isolato) ===== */
const COMBAT={hasGun:false,picking:false,pickupT:0,given:false,cooldown:0,recoil:0,
  shots:0,hits:0,shotOrder:[],severed:[],gun:null,gunHand:null,gunPos:null,
  mesh:null,faces:null,detached:[],drops:[],blood:[],fallT:0};
const CB_V=()=>new THREE.Vector3();
function combatPistol(){
  const g=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color:0x1d2326,metalness:.7,roughness:.43});
  const edge=new THREE.MeshStandardMaterial({color:0x596164,metalness:.68,roughness:.5});
  const grip=new THREE.MeshStandardMaterial({color:0x19181a,metalness:.14,roughness:.94});
  const part=(geo,mat,x,y,z,rx=0)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.x=rx;g.add(o);return o};
  part(new THREE.BoxGeometry(.095,.093,.29),metal,0,.064,-.035);
  part(new THREE.BoxGeometry(.104,.033,.24),edge,0,.115,-.04);
  part(new THREE.BoxGeometry(.083,.19,.10),grip,0,-.06,.055,-.23);
  part(new THREE.BoxGeometry(.028,.048,.075),metal,0,-.045,-.016);
  part(new THREE.CylinderGeometry(.025,.025,.04,9),edge,0,.065,-.19,Math.PI/2);
  part(new THREE.BoxGeometry(.058,.025,.026),edge,0,.141,.048);
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false}});
  return g;
}
function combatSound(type){
  if(!AUD.ctx||!AUD.master)return;
  const c=AUD.ctx,t=c.currentTime;
  const env=(node,amount,dur,delay=0)=>{
    const gain=c.createGain();gain.gain.setValueAtTime(.0001,t+delay);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amount),t+delay+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,t+delay+dur);
    node.connect(gain).connect(AUD.master);return gain;
  };
  if(type==='shot'){
    const n=c.createBufferSource();n.buffer=AUD.noise;n.playbackRate.value=1.3;
    const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=820;f.Q.value=.65;
    n.connect(f);env(f,.84,.24);n.start(t);n.stop(t+.3);
    const o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(136,t);
    o.frequency.exponentialRampToValueAtTime(42,t+.25);env(o,.72,.27);o.start(t);o.stop(t+.29);
    const tail=c.createBufferSource();tail.buffer=AUD.noise;tail.playbackRate.value=.55;
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=250;
    tail.connect(lp);env(lp,.13,.58,.09);tail.start(t+.09);tail.stop(t+.69);
  }else if(type==='pick'){
    const o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(950,t);
    o.frequency.exponentialRampToValueAtTime(460,t+.12);
    env(o,.055,.15);o.start(t);o.stop(t+.18);
  }else if(type==='hit'||type==='groan'){
    const n=c.createBufferSource();n.buffer=AUD.noise;n.playbackRate.value=.45;
    const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=type==='hit'?870:310;
    n.connect(f);env(f,type==='hit'?.32:.2,type==='hit'?.25:.65);n.start(t);n.stop(t+.75);
    const o=c.createOscillator();o.type='sawtooth';
    o.frequency.setValueAtTime(type==='hit'?145:102,t);
    o.frequency.exponentialRampToValueAtTime(type==='hit'?74:61,t+.57);
    const filt=c.createBiquadFilter();filt.type='lowpass';filt.frequency.value=400;
    o.connect(filt);env(filt,type==='hit'?.16:.24,.64);o.start(t);o.stop(t+.7);
  }else if(type==='body'){
    const n=c.createBufferSource();n.buffer=AUD.noise;n.playbackRate.value=.52;
    const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=250;
    n.connect(f);env(f,.5,.45);n.start(t);n.stop(t+.48);
  }
}
function combatInit(){
  const w=img2g(336,758);COMBAT.gunPos={x:w[0],z:w[1]};
  COMBAT.gun=combatPistol();COMBAT.gun.position.set(w[0],.055,w[1]);
  COMBAT.gun.rotation.set(-.22,.38,.11);scene.add(COMBAT.gun);
  const halo=new THREE.Mesh(new THREE.RingGeometry(.17,.245,24),new THREE.MeshBasicMaterial({
    color:0xbda66e,transparent:true,opacity:.30,depthWrite:false,side:THREE.DoubleSide}));
  halo.rotation.x=-Math.PI/2;halo.position.y=-.038;COMBAT.gun.add(halo);
  const first=Math.random()<.5?'arm_r':'arm_l';
  COMBAT.shotOrder=[first,first==='arm_r'?'arm_l':'arm_r','head'];
  COMBAT.mesh=null;
  $('task').textContent='Raccogli la pistola';
}
function combatNearGun(){
  return !COMBAT.hasGun && !!COMBAT.gunPos &&
   Math.hypot(actor.x-COMBAT.gunPos.x,actor.z-COMBAT.gunPos.z)<1.5;
}
function combatTake(){
  COMBAT.picking=true;COMBAT.pickupT=0;COMBAT.given=false;actor.speed=0;
  say('Raccogli la pistola…',1000);
}
function combatEquip(){
  if(COMBAT.given)return;
  COMBAT.given=true;COMBAT.hasGun=true;
  if(COMBAT.gun){scene.remove(COMBAT.gun);COMBAT.gun.visible=false}
  const gun=combatPistol();
  const hand=actor.hero?.bn?.hand_r;
  if(hand){hand.add(gun);gun.position.set(0,-.105,-.048);gun.rotation.set(-.3,Math.PI,Math.PI/2)}
  else{actor.root.add(gun);gun.position.set(-.3,1.16,-.24);gun.rotation.y=Math.PI}
  COMBAT.gunHand=gun;combatSound('pick');
  $('task').textContent='Girati verso Pulcinella e premi AZIONE';
  say('Pistola raccolta. AZIONE per sparare.',2400);
}
function combatAction(){
  if(COMBAT.picking)return true;
  if(!COMBAT.hasGun){
    if(combatNearGun()){combatTake();return true}
    return false;
  }
  combatShoot();return true;
}
function combatAim(){
  if(!ZOM.root||ZOM.dead)return false;
  const dx=ZOM.x-actor.x,dz=ZOM.z-actor.z,dist=Math.hypot(dx,dz);
  if(!Number.isFinite(dist)||dist<=.15)return false;
  // Solo direzione: nessuna distanza massima nascosta.
  const forwardX=Math.sin(actor.yaw),forwardZ=-Math.cos(actor.yaw);
  return Number.isFinite(forwardX) && forwardX*dx+forwardZ*dz>=.75*dist;
}
function combatPrepareMesh(){
  if(COMBAT.faces)return !!COMBAT.mesh;
  const H=ZOM.H;if(!H?.m)return false;
  let mesh=null;H.m.traverse(o=>{if(o.isSkinnedMesh&&!mesh)mesh=o});
  if(!mesh||!mesh.geometry?.index||!mesh.geometry.getAttribute('skinIndex'))return false;
  COMBAT.mesh=mesh;
  const geom=mesh.geometry,indices=Array.from(geom.index.array),
    joint=geom.getAttribute('skinIndex'),weight=geom.getAttribute('skinWeight');
  const parts=new Array(joint.count);
  const slots=(a,i)=>[a.getX(i),a.getY(i),a.getZ(i),a.getW(i)];
  for(let i=0;i<parts.length;i++){
    const w=slots(weight,i),j=slots(joint,i);
    let win=0;for(let k=1;k<4;k++)if(w[k]>w[win])win=k;
    const name=mesh.skeleton.bones[j[win]]?.name||'';
    parts[i]=/^(upperarm_r|lowerarm_r|hand_r)$/.test(name)?'arm_r':
      /^(upperarm_l|lowerarm_l|hand_l)$/.test(name)?'arm_l':
      /^(neck_01|head)$/.test(name)?'head':'body';
  }
  const areas={arm_r:[],arm_l:[],head:[]},faces=[];
  for(let i=0;i<indices.length;i+=3){
    const tri=indices.slice(i,i+3);
    const counts={arm_r:0,arm_l:0,head:0};
    tri.forEach(v=>{if(parts[v]!=='body')counts[parts[v]]++});
    const selected=['arm_r','arm_l','head'].find(key=>counts[key]>=2)||'body';
    const rec={tri,part:selected};
    faces.push(rec);if(areas[selected])areas[selected].push(rec);
  }
  COMBAT.faces={all:faces,areas};
  return true;
}
function combatDrop(part){
  if(!combatPrepareMesh())return false;
  const m=COMBAT.mesh,H=ZOM.H, faces=COMBAT.faces.areas[part];
  if(!faces?.length)return false;
  ZOM.root.updateMatrixWorld(true);H.m.updateMatrixWorld(true);
  if(m.skeleton?.update)m.skeleton.update();
  const bone=H.bn[part==='head'?'head':part==='arm_l'?'upperarm_l':'upperarm_r'];
  const center=bone?bone.getWorldPosition(CB_V()):new THREE.Vector3(ZOM.x,1.25,ZOM.z);
  const positions=[],uvs=[],original=m.geometry.getAttribute('position'),uv=m.geometry.getAttribute('uv');
  const cached=new Map();
  for(const face of faces){
    for(const i of face.tri){
      let v=cached.get(i);
      if(!v){
        v=new THREE.Vector3().fromBufferAttribute(original,i);
        if(m.boneTransform)m.boneTransform(i,v);
        v.applyMatrix4(m.matrixWorld).sub(center);
        cached.set(i,v);
      }
      positions.push(v.x,v.y,v.z);
      if(uv)uvs.push(uv.getX(i),uv.getY(i));
    }
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(uv)geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geom.computeVertexNormals();
  const mat=m.material.clone();mat.skinning=false;mat.side=THREE.DoubleSide;mat.needsUpdate=true;
  const piece=new THREE.Mesh(geom,mat);piece.position.copy(center);
  piece.frustumCulled=false;scene.add(piece);
  COMBAT.drops.push({mesh:piece,vel:new THREE.Vector3((Math.random()-.5)*2.6,1.4+Math.random(),(Math.random()-.5)*2.2),
    rot:new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*5,(Math.random()-.5)*8),
    floor:part==='head'?.16:.19,settled:false,part});
  COMBAT.severed.push(part);
  const remaining=[];
  for(const f of COMBAT.faces.all)if(!COMBAT.severed.includes(f.part))remaining.push(...f.tri);
  m.geometry.setIndex(remaining);
  m.geometry.computeBoundingSphere();
  return true;
}
function combatBlood(pos,count=25){
  const red=[0x660009,0x8c0710,0x3f050b,0xaf1019];
  const geo=new THREE.SphereGeometry(.022,5,4);
  for(let i=0;i<count;i++){
    const drop=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:red[i%red.length]}));
    drop.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*.18,(Math.random()-.5)*.15,(Math.random()-.5)*.14));
    scene.add(drop);
    COMBAT.blood.push({mesh:drop,vel:new THREE.Vector3((Math.random()-.5)*3.1,.25+Math.random()*3.4,(Math.random()-.5)*3.4),
      time:0,settled:false});
  }
  // Chiazze di sangue persistenti sui sampietrini.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const g=canvas.getContext('2d');g.translate(48,48);
  for(let i=0;i<29;i++){
    const a=Math.random()*Math.PI*2,r=Math.random()*40;
    g.fillStyle=i%3?'rgba(90,0,5,.64)':'rgba(158,8,11,.5)';
    g.beginPath();g.ellipse(Math.cos(a)*r,Math.sin(a)*r,2+Math.random()*13,2+Math.random()*5,a,0,Math.PI*2);g.fill();
  }
  const tex=new THREE.CanvasTexture(canvas);tex.encoding=THREE.sRGBEncoding;
  const pool=new THREE.Mesh(new THREE.PlaneGeometry(1.35,1.1),new THREE.MeshBasicMaterial({
    map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,opacity:.82}));
  pool.rotation.x=-Math.PI/2;pool.position.set(ZOM.x,.019,ZOM.z);
  scene.add(pool);COMBAT.detached.push(pool);
}
function combatShoot(){
  if(COMBAT.cooldown>0||COMBAT.picking)return;
  COMBAT.cooldown=.5;COMBAT.recoil=.3;COMBAT.shots++;
  audioStart();combatSound('shot');
  if(!combatAim()){say('Nessun bersaglio davanti a te.',1200);return}
  const part=COMBAT.shotOrder[COMBAT.hits];
  if(!part||ZOM.dead)return;
  COMBAT.hits++;
  const bn=ZOM.H?.bn?.[part==='head'?'head':part==='arm_r'?'upperarm_r':'upperarm_l'];
  const pos=bn?bn.getWorldPosition(CB_V()):new THREE.Vector3(ZOM.x,1.3,ZOM.z);
  const cut=combatDrop(part);
  combatBlood(pos,part==='head'?42:25);
  combatSound('hit');combatSound('groan');
  const label=part==='head'?'testa':part==='arm_l'?'braccio sinistro':'braccio destro';
  say('Colpito! Si stacca '+(part==='head'?'la ':'il ')+label+'.',1800);
  ZOM.hitReact=.3;
  if(COMBAT.hits>=3){
    ZOM.dead=true;ZOM.speed=0;COMBAT.fallT=0;
    $('task').textContent='Pulcinella è a terra';
    say('Pulcinella si accascia. Non si muove più.',3100);
  }else{
    $('task').textContent='Pulcinella ferito · '+COMBAT.hits+'/3 colpi';
  }
  if(!cut)console.warn('NOCTIS: il pezzo del modello non è stato isolato',part);
}
function combatPose(dt){
  COMBAT.cooldown=Math.max(0,COMBAT.cooldown-dt);
  COMBAT.recoil=Math.max(0,COMBAT.recoil-dt);
  if(COMBAT.picking){
    COMBAT.pickupT+=dt;
    if(COMBAT.pickupT>.48)combatEquip();
    if(COMBAT.pickupT>1.05){COMBAT.picking=false;COMBAT.pickupT=0}
  }
  const bn=actor.hero?.bn;
  if(!bn)return;
  const rotate=(b,x,y,z)=>{if(!b)return;b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)))};
  if(COMBAT.picking){
    const t=Math.sin(Math.PI*Math.min(1,COMBAT.pickupT/1.05));
    rotate(bn.spine_01,.42*t,0,0);rotate(bn.spine_02,.20*t,0,0);
    rotate(bn.upperarm_r,-1.04*t,.14*t,-.20*t);
    rotate(bn.thigh_r,.20*t,0,0);rotate(bn.thigh_l,.22*t,0,0);
    if(bn.pelvis)bn.pelvis.position.y-=.22*t;
  }else if(COMBAT.hasGun){
    // Una mano pronta a sparare senza sostituire il modello o alterarne la camminata.
    rotate(bn.upperarm_r,-.72-COMBAT.recoil*.8,.08,-.12);
    rotate(bn.lowerarm_r,-.45,0,0);
    rotate(bn.hand_r,-.22,0,0);
  }
}
function combatUpdate(dt){
  for(const d of COMBAT.drops){
    if(d.settled)continue;
    d.vel.y-=7.8*dt;d.mesh.position.addScaledVector(d.vel,dt);
    d.mesh.rotation.x+=d.rot.x*dt;d.mesh.rotation.y+=d.rot.y*dt;d.mesh.rotation.z+=d.rot.z*dt;
    if(d.mesh.position.y<=d.floor){
      d.mesh.position.y=d.floor;d.vel.multiplyScalar(.16);d.rot.multiplyScalar(.3);d.settled=true;
    }
  }
  for(const d of COMBAT.blood){
    if(d.settled)continue;
    d.time+=dt;d.vel.y-=7.7*dt;d.mesh.position.addScaledVector(d.vel,dt);
    if(d.mesh.position.y<=.022 || d.time>1.7){
      d.mesh.position.y=.022;d.mesh.scale.set(1.6,.24,1.6);d.settled=true;
    }
  }
  if(ZOM.dead&&ZOM.root){
    COMBAT.fallT=Math.min(1.5,COMBAT.fallT+dt);
    const x=Math.min(1,COMBAT.fallT/1.05),s=x*x*(3-2*x);
    ZOM.root.rotation.x=-1.5*s;
    ZOM.root.position.y=.04*s;
    if(COMBAT.fallT>1.02&&!COMBAT.fallSound){combatSound('body');COMBAT.fallSound=true}
  }else if(ZOM.root&&ZOM.hitReact>0){
    ZOM.hitReact=Math.max(0,ZOM.hitReact-dt);
    ZOM.root.rotation.z=.12*Math.sin((.3-ZOM.hitReact)*14)*ZOM.hitReact/.3;
    if(ZOM.hitReact===0)ZOM.root.rotation.z=0;
  }
  if(COMBAT.gun&&!COMBAT.hasGun)
    COMBAT.gun.rotation.y+=dt*.15;
}
function combatProbe(){
  return {gun:COMBAT.hasGun,picking:COMBAT.picking,hits:COMBAT.hits,shots:COMBAT.shots,
    order:COMBAT.shotOrder.slice(),severed:COMBAT.severed.slice(),
    corpse:!!ZOM.dead,fall:COMBAT.fallT,fragments:COMBAT.drops.length,blood:COMBAT.blood.length,
    visible:!!COMBAT.gun&&COMBAT.gun.visible,actualZombieSpeed:ZOM.actualSpeed||0};
}

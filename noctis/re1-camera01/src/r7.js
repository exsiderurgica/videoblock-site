/* ===== Zombie Pulcinella: stessa pipeline del protagonista (mesh skinnata + animazioni Mixamo rallentate e scoordinate) ===== */
const ZOM={root:null,x:0,z:0,yaw:0,ph:0,t:0,next:4,speed:0,H:null,lastHalf:-1};
function buildZombie(done){
  const finish=ok=>{window.__zomOk=ok;if(done)done(ok)};
  const g=img2g(430,600);ZOM.x=g[0];ZOM.z=g[1];ZOM.yaw=Math.PI;
  if(!THREE.GLTFLoader){finish(false);return}
  fetch('zombie.txt').then(r=>{if(!r.ok)throw Error('zombie.txt: HTTP '+r.status);return r.text()}).then(t=>{const bin=Uint8Array.from(atob(t),c=>c.charCodeAt(0));
    new THREE.GLTFLoader().parse(bin.buffer,'',gl=>{
      const root=new THREE.Group();scene.add(root);ZOM.root=root;
      // Ombra di contatto che segue i piedi di Pulcinella (stessa luce del protagonista).
      const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.78),actor.blob.material);
      contact.rotation.x=-Math.PI/2;contact.position.y=.018;
      root.add(contact);
      const m=gl.scene,grp=new THREE.Group();grp.add(m);grp.rotation.y=Math.PI;root.add(grp);
      m.traverse(o=>{if(o.isMesh){o.frustumCulled=false;const mt=o.material;mt.metalness=0;mt.roughness=.95;if(mt.map)mt.map.anisotropy=4}});
      const bn={};m.traverse(o=>{if(o.isBone)bn[o.name]=o});
      const H={photo:true,grp,m,bn,mirrored:false};ZOM.H=H;
      root.position.set(ZOM.x,0,ZOM.z);
      loadSrc(H).then(()=>finish(true),e=>{console.error('Animazioni di Pulcinella non caricate:',e);finish(false)});
    },e=>{console.error('Modello Pulcinella non valido:',e);finish(false)})}).catch(e=>{console.error('zombie.txt non caricato:',e);finish(false)});
}
/* sopra l'animazione: inclinazione, testa penzoloni, spalle storte, rumore lento = camminata scoordinata */
function zShamble(H,t,sp){
  const bn=H.bn,e=new THREE.Euler(),q=new THREE.Quaternion();
  const r=(b,x,y,z)=>{if(!b)return;q.setFromEuler(e.set(x,y,z));b.quaternion.multiply(q)};
  const I=new THREE.Quaternion();
  const gait=t*(1.7+sp*2.0);
  const n1=Math.sin(gait*.55),n2=Math.sin(gait*.31+1.3),n3=Math.sin(gait*.89+2.1),n4=Math.sin(gait*.17+.6);
  const lurch=Math.max(0,Math.sin(gait-.35)),limp=Math.max(0,Math.sin(gait+Math.PI*.92));
  const sway=Math.min(1,sp/.42);
  // Camminata squilibrata, senza cambiare lo scheletro o il modello originale.
  if(bn.thigh_l)bn.thigh_l.quaternion.slerp(I,.58);
  if(bn.thigh_r)bn.thigh_r.quaternion.slerp(I,.52);
  if(bn.calf_l)bn.calf_l.quaternion.slerp(I,.72);
  if(bn.calf_r)bn.calf_r.quaternion.slerp(I,.66);
  // Torso sbilanciato e testa ciondolante, con frequenze non perfettamente periodiche.
  r(bn.pelvis,.12+.04*n2,.11*n4,.08*n1+.03*limp);
  r(bn.spine_01,.20+.05*n1,.07*n2,.06*n3);
  r(bn.spine_02,.16+.04*n3,.03*n4,-.08*n1);
  r(bn.spine_03,.12+.05*n3,-.10*n4,.12*n2);
  r(bn.neck_01,-.12+.03*n4,.08*n1,-.13*n3);
  r(bn.head,.28+.08*n2,.17*n4,.20*n1);
  // Braccia molli e asimmetriche, una più avanti dell'altra.
  r(bn.clavicle_l,.09,.03,.18+.04*n2);r(bn.clavicle_r,.05,-.02,-.15+.04*n3);
  r(bn.upperarm_l,-.40+.10*n1,.02,.32+.09*n3);
  r(bn.upperarm_r,-.30+.09*n3,-.02,-.27+.08*n1);
  r(bn.lowerarm_l,-.78+.16*n2,.03,.05*n1);r(bn.lowerarm_r,-.86+.12*n4,-.03,-.04*n2);
  // Zoppia con maggiore trascinamento del piede sinistro.
  r(bn.thigh_l,.10*lurch+.03*n2,.06*n1,.10);
  r(bn.thigh_r,.05*limp-.03*n3,-.05*n4,-.08);
  r(bn.calf_l,.12*lurch,0,0);r(bn.calf_r,.05*limp,0,0);
  r(bn.foot_l,-.30+.08*lurch,.01,.03);
  r(bn.foot_r,-.24+.03*limp,-.02,-.02);
  const idleHang=(1-sway)*.12;
  r(bn.upperarm_l,idleHang*Math.sin(t*.8),0,0);
  r(bn.upperarm_r,-idleHang*Math.sin(t*.75+1.1),0,0);
}
function zCollide(prev){
  const p={x:ZOM.x,z:ZOM.z};let hit=false;
  if(!inPoly(p.x,p.z,WALKG)){p.x=prev.x;p.z=prev.z;hit=true}
  if(pushPoly(p,.45,GUG))hit=true;
  for(const b of BCIRC){const d=Math.hypot(p.x-b.x,p.z-b.z);if(d<b.r+.35){const k=(b.r+.35-d)/(d||1);p.x+=(p.x-b.x)*k;p.z+=(p.z-b.z)*k;hit=true}}
  ZOM.x=p.x;ZOM.z=p.z;return hit;
}
function updateZombie(dt){
  if(!ZOM.root||ZOM.dead)return;
  ZOM.t+=dt;
  const dx=actor.x-ZOM.x,dz=actor.z-ZOM.z,dist=Math.hypot(dx,dz);
  const want=Math.atan2(dx,-dz);
  let d=want-ZOM.yaw;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  const wobble=Math.sin(ZOM.t*1.3)*.08+Math.sin(ZOM.t*.47+1.2)*.04;
  const turn=Math.max(-.28*dt,Math.min(.28*dt,d+wobble*.12));ZOM.yaw+=turn;
  const lurch=1+.16*Math.max(0,Math.sin(ZOM.t*1.45-.35));
  const target=dist>1.55?(.34*lurch):dist>.95?(.21*lurch):.06;
  ZOM.speed+=Math.max(-.38*dt,Math.min(.22*dt,target-ZOM.speed));
  const prev={x:ZOM.x,z:ZOM.z};
  ZOM.x+=Math.sin(ZOM.yaw)*ZOM.speed*dt;ZOM.z+=-Math.cos(ZOM.yaw)*ZOM.speed*dt;
  zCollide(prev);
  // Distanza effettiva percorsa: su collisione non animare piedi fermi.
  const walked=Math.hypot(ZOM.x-prev.x,ZOM.z-prev.z);
  ZOM.actualSpeed=walked/Math.max(dt,.0001);
  if(walked<.0005)ZOM.speed*=.72;
  ZOM.walkPhase=(ZOM.walkPhase||0)+walked*3.1;
  ZOM.root.position.set(ZOM.x,0,ZOM.z);ZOM.root.rotation.y=-ZOM.yaw;
  if(ZOM.H&&ZOM.H.src){
    const strideSpeed=ZOM.actualSpeed*SRC_SPEED.Walk/.95;
    srcAnim(ZOM.H,dt,strideSpeed,turn/Math.max(dt,1e-3),false);
    zShamble(ZOM.H,ZOM.walkPhase,ZOM.actualSpeed);
    ZOM.H.m.updateMatrixWorld(true)
  }
  /* audio: passi sincronizzati con i metri anziche' con il tempo */
  ZOM.ph+=walked*(Math.PI/.36);
  const u=g2img(ZOM.x,ZOM.z)[0],pan=Math.max(-1,Math.min(1,(u-IW/2)/(IW/2)));
  const vol=Math.max(0,Math.min(1,3.4/(1+dist*dist*.1)));
  const half=Math.floor(ZOM.ph/Math.PI);
  if(ZOM.speed>.12&&half!==ZOM.lastHalf){ZOM.lastHalf=half;sfxDrag(pan,vol)}
  ZOM.next-=dt;
  if(ZOM.next<=0){ZOM.next=5.5+Math.random()*6;sfxMoan(pan,Math.min(1,vol*1.3))}
}

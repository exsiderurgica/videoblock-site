/* ===== Zombie Pulcinella: stessa pipeline del protagonista (mesh skinnata + animazioni Mixamo rallentate e scoordinate) ===== */
const ZOM={root:null,x:0,z:0,yaw:0,ph:0,t:0,next:4,speed:0,H:null,lastHalf:-1};
function buildZombie(){
  const g=img2g(430,600);ZOM.x=g[0];ZOM.z=g[1];ZOM.yaw=Math.PI;
  if(!THREE.GLTFLoader)return;
  fetch('zombie.txt').then(r=>r.text()).then(t=>{const bin=Uint8Array.from(atob(t),c=>c.charCodeAt(0));
    new THREE.GLTFLoader().parse(bin.buffer,'',gl=>{
      const root=new THREE.Group();scene.add(root);ZOM.root=root;
      const m=gl.scene,grp=new THREE.Group();grp.add(m);grp.rotation.y=Math.PI;root.add(grp);
      m.traverse(o=>{if(o.isMesh){o.frustumCulled=false;const mt=o.material;mt.metalness=0;mt.roughness=.95;if(mt.map)mt.map.anisotropy=4}});
      const bn={};m.traverse(o=>{if(o.isBone)bn[o.name]=o});
      const H={photo:true,grp,m,bn,mirrored:false};ZOM.H=H;
      root.position.set(ZOM.x,0,ZOM.z);
      loadSrc(H).then(()=>{window.__zomOk=true},e=>{console.error(e)});
    },e=>console.error(e))}).catch(e=>console.error(e));
}
/* sopra l'animazione: inclinazione, testa penzoloni, spalle storte, rumore lento = camminata scoordinata */
function zShamble(H,t,sp){
  const bn=H.bn,e=new THREE.Euler(),q=new THREE.Quaternion();
  const r=(b,x,y,z)=>{if(!b)return;q.setFromEuler(e.set(x,y,z));b.quaternion.multiply(q)};
  const I=new THREE.Quaternion();
  if(bn.thigh_l)bn.thigh_l.quaternion.slerp(I,.42);if(bn.thigh_r)bn.thigh_r.quaternion.slerp(I,.42);
  const n1=Math.sin(t*.47),n2=Math.sin(t*.31+1.3),n3=Math.sin(t*.73+2.1),n4=Math.sin(t*.19+.6);
  r(bn.pelvis,.06+.03*n2,.07*n4,.05*n1);
  r(bn.spine_01,.10+.03*n1,.05*n2,.04*n3);
  r(bn.spine_02,.09,.04*n3,-.05*n1);
  r(bn.spine_03,.07+.02*n3,-.06*n4,.06*n2);
  r(bn.neck_01,-.06,.05*n1,-.07*n3);
  r(bn.head,.17+.05*n2,.20*n4,.16*n1);
  r(bn.clavicle_l,.04,0,.10*n2);r(bn.clavicle_r,.03,0,-.08*n3);
  r(bn.upperarm_l,-.22+.07*n1,0,.16+.05*n3);
  r(bn.upperarm_r,-.16+.06*n3,0,-.13+.04*n1);
  r(bn.lowerarm_l,-.55+.10*n2,0,0);r(bn.lowerarm_r,-.62+.09*n4,0,0);
  r(bn.thigh_l,.03*n2,.04*n1,.05);r(bn.thigh_r,-.02*n3,-.03*n4,-.04);
  // i piedi restano bassi: meno flessione del ginocchio, punte che strisciano
  if(bn.calf_l)bn.calf_l.quaternion.slerp(I,.5);
  if(bn.calf_r)bn.calf_r.quaternion.slerp(I,.45);
  r(bn.foot_l,-.14,0,0);r(bn.foot_r,-.12,0,0);
}
function zCollide(prev){
  const p={x:ZOM.x,z:ZOM.z};let hit=false;
  if(!inPoly(p.x,p.z,WALKG)){p.x=prev.x;p.z=prev.z;hit=true}
  if(pushPoly(p,.45,GUG))hit=true;
  for(const b of BCIRC){const d=Math.hypot(p.x-b.x,p.z-b.z);if(d<b.r+.35){const k=(b.r+.35-d)/(d||1);p.x+=(p.x-b.x)*k;p.z+=(p.z-b.z)*k;hit=true}}
  ZOM.x=p.x;ZOM.z=p.z;return hit;
}
function updateZombie(dt){
  if(!ZOM.root)return;
  ZOM.t+=dt;
  const dx=actor.x-ZOM.x,dz=actor.z-ZOM.z,dist=Math.hypot(dx,dz);
  const want=Math.atan2(dx,-dz);
  let d=want-ZOM.yaw;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  const turn=Math.max(-.42*dt,Math.min(.42*dt,d));ZOM.yaw+=turn;
  const target=dist>1.25?.44:.10;
  ZOM.speed+=Math.max(-.5*dt,Math.min(.3*dt,target-ZOM.speed));
  const prev={x:ZOM.x,z:ZOM.z};
  ZOM.x+=Math.sin(ZOM.yaw)*ZOM.speed*dt;ZOM.z+=-Math.cos(ZOM.yaw)*ZOM.speed*dt;
  zCollide(prev);
  ZOM.root.position.set(ZOM.x,0,ZOM.z);ZOM.root.rotation.y=-ZOM.yaw;
  if(ZOM.H&&ZOM.H.src){srcAnim(ZOM.H,dt,Math.max(ZOM.speed,.16),turn/Math.max(dt,1e-3),false);zShamble(ZOM.H,ZOM.t,ZOM.speed);ZOM.H.m.updateMatrixWorld(true)}
  /* audio: strascico a ogni mezzo passo, lamento a intervalli */
  ZOM.ph+=dt*ZOM.speed*2.6;
  const u=g2img(ZOM.x,ZOM.z)[0],pan=Math.max(-1,Math.min(1,(u-IW/2)/(IW/2)));
  const vol=Math.max(0,Math.min(1,3.4/(1+dist*dist*.1)));
  const half=Math.floor(ZOM.ph/Math.PI);
  if(ZOM.speed>.12&&half!==ZOM.lastHalf){ZOM.lastHalf=half;sfxDrag(pan,vol)}
  ZOM.next-=dt;
  if(ZOM.next<=0){ZOM.next=5.5+Math.random()*6;sfxMoan(pan,Math.min(1,vol*1.3))}
}

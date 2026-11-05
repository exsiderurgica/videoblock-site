/* ===== Protagonista scheletrico (modello umano CC0 "Sam", animazioni idle/camminata/corsa) ===== */
actor.hero=null;
const HERO_SPEED={Walk_Relaxed:1.25,Walk_Brisk:1.75,Jog:2.9,Run:4.3};   // m/s stimati per clip (da calibrare)
/* Protagonista costruito dalle 4 foto (sagome + texture fotografica), scheletro proprio con nomi compatibili col retarget Mixamo */
function loadHero(done){
  if(!THREE.GLTFLoader){done&&done(false);return}
  fetch('hero2.txt').then(r=>{if(!r.ok)throw Error('hero2.txt: HTTP '+r.status);return r.text()}).then(t=>{const bin=Uint8Array.from(atob(t),c=>c.charCodeAt(0));new THREE.GLTFLoader().parse(bin.buffer,'',g=>{
    const m=g.scene,grp=new THREE.Group();grp.add(m);grp.rotation.y=Math.PI;actor.root.add(grp);
    m.traverse(o=>{if(o.isMesh){o.frustumCulled=false;const mt=o.material;mt.metalness=0;mt.roughness=.9;mt.vertexColors=!!o.geometry.attributes.color;mt.color.setRGB(1,1,1);mt.needsUpdate=true;if(mt.map){mt.map.anisotropy=4}}});
    actor.root.children.forEach(c=>{if(c!==grp&&c!==actor.blob)c.visible=false});
    const bn={};m.traverse(o=>{if(o.isBone)bn[o.name]=o});
    const H={photo:true,grp,m,bn,mirrored:false};actor.hero=H;window.__heroBones=Object.keys(bn).length;
    loadSrc(H).then(()=>done&&done(true),e=>{console.error('Animazioni del protagonista non caricate:',e);done&&done(false)})},e=>{console.error('Errore nel modello del protagonista:',e);done&&done(false)})}).catch(e=>{console.error('hero2.txt non caricato:',e);done&&done(false)});
}
function photoTex(mt,url,rep){const t=new THREE.TextureLoader().load(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.encoding=THREE.sRGBEncoding;mt.map=t;mt.color.setRGB(.8,.8,.8);mt.normalMap=null;mt.needsUpdate=true}
function loadSamHero(done){
  if(!THREE.GLTFLoader){done&&done(false);return}
  fetch('hero.txt').then(r=>r.text()).then(t=>{const bin=Uint8Array.from(atob(t),c=>c.charCodeAt(0));new THREE.GLTFLoader().parse(bin.buffer,'',g=>{
    const m=g.scene,grp=new THREE.Group();grp.add(m);
    m.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;const mt=o.material,n=mt.name||'';
      if(/accessory|ankle lining/i.test(n)){o.visible=false;return}
      if(/original top/.test(n)){photoTex(mt,TEX_HOODIE,3);mt.roughness=1;inflate(o,.006)}
      if(/original bottom/.test(n)){photoTex(mt,TEX_JEANS,3);mt.roughness=1;inflate(o,.008)}
      if(/short01/.test(n)){mt.color.setRGB(.2,.17,.15)}
      if(/shoes01$/.test(n)){mt.map=null;mt.color.set(0x6a5e52).convertSRGBToLinear();mt.needsUpdate=true}
      if(/eyebrow|eyelash/.test(n)){mt.alphaTest=.5;mt.transparent=false}
      mt.metalness=0;if(mt.roughness<.5)mt.roughness=.7});
    // altezza reale dal rig: scala a 1.82 m e piedi a terra
    const box=new THREE.Box3();m.traverse(o=>{if(o.isMesh&&o.visible){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone();box.union(b)}});
    const h=box.max.y-box.min.y;window.__heroBox={min:box.min.toArray(),max:box.max.toArray()};
    const s=1.82/h;grp.scale.set(s*.88,s,s*.88);m.position.y=-box.min.y;
    grp.rotation.y=Math.PI;actor.root.add(grp);
    addAccessories(m,box);m.traverse(o=>{if(o.isSkinnedMesh&&o.material&&/\.body$/.test(o.material.name)){const g=o.geometry,p=g.attributes.position,ix=g.index,n=[];if(ix){for(let k=0;k<ix.count;k+=3){const a=ix.getX(k),b=ix.getX(k+1),c=ix.getX(k+2);if(p.getY(a)<.6&&p.getY(b)<.6&&p.getY(c)<.6)continue;n.push(a,b,c)}g.setIndex(n)}}});
    actor.root.children.forEach(c=>{if(c!==grp&&c!==actor.blob)c.visible=false});
    const mixer=new THREE.AnimationMixer(m),acts={};const bn={};m.traverse(o=>{if(o.isBone)bn[o.name]=o});
    g.animations.forEach(a=>{acts[a.name]=mixer.clipAction(a)});
    actor.hero={mixer,acts,cur:null,grp,m,bn};loadSrc(actor.hero).then(()=>done&&done(true),()=>done&&done(true))},()=>done&&done(false))}).catch(()=>done&&done(false));
}

function inflate(o,d){const g=o.geometry;if(g.__inf)return;g.__inf=1;const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){p.setXYZ(i,p.getX(i)+n.getX(i)*d,p.getY(i)+n.getY(i)*d,p.getZ(i)+n.getZ(i)*d)}p.needsUpdate=true}
/* aduzione di cosce e braccia (rotazione nello spazio del modello attorno all'asse avanti) per togliere la posa "da gorilla" */
const _q=new THREE.Quaternion(),_r=new THREE.Quaternion(),_pq=new THREE.Quaternion(),_qm=new THREE.Quaternion(),_ax=new THREE.Vector3(0,0,1);
window.STANCE={thigh:.15,arm:.16,toe:.3};const _ay=new THREE.Vector3(0,1,0);
function fixStance(H){const m=H.m,bn=H.bn;m.updateMatrixWorld(true);m.getWorldQuaternion(_qm);_qm.invert();
  const adj=(name,ang,ax)=>{ax=ax||_ax;const b=bn[name];if(!b||!b.parent)return;b.parent.getWorldQuaternion(_pq);_pq.premultiply(_qm);_r.setFromAxisAngle(ax,ang);
    _q.copy(_pq).invert().multiply(_r).multiply(_pq).multiply(b.quaternion);b.quaternion.copy(_q)};
  adj('thigh_l',STANCE.toe,_ay);adj('thigh_r',-STANCE.toe,_ay);adj('thigh_l',-STANCE.thigh);adj('thigh_r',STANCE.thigh);adj('calf_l',-.03);adj('calf_r',.03);adj('foot_l',-.2);adj('foot_r',.2);adj('upperarm_l',-STANCE.arm);adj('upperarm_r',STANCE.arm)}
let _ph=0;
function lively(H,name,spd,dt){const bn=H.bn,a=H.acts[name],moving=spd>.15;_ph+=dt*(moving?Math.min(spd,4.3)*2.6:.9);
  const k=moving?Math.min(1,spd/1.8):0,run=spd>2.4?1:0;
  const rot=(b,x,y,z)=>{if(!b)return;b.rotation.x+=x;b.rotation.y+=y;b.rotation.z+=z};
  rot(bn.spine_01,.05*k+.05*run,Math.sin(_ph)*.09*k,Math.sin(_ph)*.03*k);
  rot(bn.spine_03,.03*k+.07*run,-Math.sin(_ph)*.12*k,0);
  rot(bn.head,-.04*k,Math.sin(_ph)*.05*k,0);
  if(!moving){rot(bn.spine_03,Math.sin(_ph)*.012,0,0);rot(bn.head,0,Math.sin(_ph*.5)*.03,0)}
  rot(bn.upperarm_l,0,0,0);
  if(bn.pelvis){bn.pelvis.position.y+=Math.abs(Math.sin(_ph))*.012*k}}
function heroPlay(name,fade=.25){const H=actor.hero;if(H.cur===name)return;const n=H.acts[name],o=H.cur&&H.acts[H.cur];n.reset().setEffectiveWeight(1).play();if(o)o.crossFadeTo(n,fade,false);H.cur=name}
function heroAnim(dt,spd,turnRate,back){
  const H=actor.hero;if(H.photo){if(H.src)srcAnim(H,dt,spd,turnRate,back);return}let name='Idle_Standing',ts=1;
  if(spd>.15){name=spd<1.5?'Walk_Relaxed':spd<2.4?'Walk_Brisk':spd<3.5?'Jog':'Run';ts=spd/HERO_SPEED[name]}
  else if(Math.abs(turnRate)>.3){name='Walk_Relaxed';ts=.45}
  heroPlay(name);H.acts[name].timeScale=back?-Math.max(.6,ts):ts;if(H.src){srcAnim(H,dt,spd,turnRate,back)}else{H.mixer.update(dt);fixStance(H);lively(H,name,spd,dt)}
  if(actor.blob)actor.blob.scale.set(1.1,1.1,1)}

/* Accessori sul volto e sulla testa, agganciati all'osso della testa mantenendo la posizione nel mondo */
function addAccessories(m,box){
  m.updateMatrixWorld(true);let head=null,neck=null;m.traverse(o=>{if(o.isBone){if(o.name==='head')head=o;if(o.name==='neck_01')neck=o}});if(!head)return;
  const body=[];m.traverse(o=>{if(o.isMesh&&/\.body$/.test(o.material.name))body.push(o)});
  const hy=new THREE.Vector3().setFromMatrixPosition(head.matrixWorld).y-.03;let mn=new THREE.Vector3(1e9,1e9,1e9),mx=new THREE.Vector3(-1e9,-1e9,-1e9);
  const v=new THREE.Vector3();body.forEach(o=>{const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(v.y>hy){mn.min(v);mx.max(v)}}});
  mn.y=mx.y-.235;const cx=(mn.x+mx.x)/2,H=mx.y-mn.y,front=mx.z,back=mn.z;window.__head={mn:mn.toArray(),mx:mx.toArray(),hy};
  const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(c).convertSRGBToLinear(),roughness:.95},o));
  const add=(geo,mt,x,y,z,sc)=>{const o=new THREE.Mesh(geo,mt);o.position.set(x,y,z);if(sc)o.scale.set(...sc);m.add(o);o.updateMatrixWorld(true);head.attach(o);return o};
  const eyeY=mn.y+H*.57;
  const frame=mat(0xc9ced1,{metalness:.8,roughness:.3});
  for(const s of [-1,1]){const r=add(new THREE.TorusGeometry(.031,.0032,5,16),frame,cx+s*.034,eyeY,front-.012);r.rotation.x=0}
  add(new THREE.BoxGeometry(.02,.002,.002),frame,cx,eyeY+.006,front-.014);
  const grey=mat(0x77726c,{roughness:1});
  body.forEach(bm=>{if(bm.isSkinnedMesh){makeBeard(bm,{cx,mn,H,front,back,hy});makeChest(bm)}});
  if(neck){const o=new THREE.Mesh(new THREE.TorusGeometry(.078,.036,8,18),mat(0x6e282c,{roughness:1}));const w=new THREE.Vector3().setFromMatrixPosition(neck.matrixWorld);o.position.set(cx,w.y-.035,(front+back)/2-.005);o.rotation.x=Math.PI/2+.25;m.add(o);o.updateMatrixWorld(true);neck.attach(o)}
  add(new THREE.SphereGeometry(.05,10,8),mat(0x3d3228),cx,mx.y-.008,back+.05);            // chignon
  const hood=mat(0x30090f,{roughness:1});
  add(new THREE.SphereGeometry(1,12,9),hood,cx,hy-.045,back+.075,[.12,.07,.075]);          // cappuccio ripiegato dietro il collo
  for(const s of [-1,1])add(new THREE.SphereGeometry(1,9,7),hood,cx+s*.085,hy-.06,front-.12,[.04,.045,.075]);
}

/* Barba: guscio skinnato ricavato dai triangoli di mento/guance/baffi della testa, segue l'animazione */
function makeBeard(bm,P){
  const g=bm.geometry,p=g.attributes.position,nr=g.attributes.normal,uv=g.attributes.uv,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ix=g.index;
  const cz=(P.front+P.back)/2,y0=P.mn.y,H=P.H,ok=new Uint8Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i)-P.cx,y=p.getY(i),z=p.getZ(i);
    if(y<y0-.005||y>y0+H*.4||z<cz+.005)continue;
    const ax=Math.abs(x);let top=y0+H*(ax<.03?.28:ax<.055?.34:.37);
    if(y>top)continue;
    if(ax<.022&&y>y0+H*.19&&y<y0+H*.245)continue;   // apertura della bocca
    ok[i]=1}
  const map=new Int32Array(p.count).fill(-1),pos=[],nor=[],uvs=[],sid=[],swt=[],col=[],idx=[];let c=0;
  const gv=i=>{if(map[i]>=0)return map[i];map[i]=c++;const y=p.getY(i),x=p.getX(i)-P.cx,t=Math.max(0,1-(y-y0)/(H*.22)),d=.012+.006*t;
    pos.push(p.getX(i)+nr.getX(i)*d,p.getY(i)+nr.getY(i)*d-.012*t*(1-Math.min(1,Math.abs(x)/.06)),p.getZ(i)+nr.getZ(i)*d);
    nor.push(nr.getX(i),nr.getY(i),nr.getZ(i));uvs.push(uv.getX(i),uv.getY(i));sid.push(si.getX(i),si.getY(i),si.getZ(i),si.getW(i));swt.push(sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i));
    const j=.85+.3*Math.random(),gr=Math.min(1,Math.max(0,(t-.35)*1.6))*(1-Math.min(1,Math.abs(x)/.045));
    col.push((.2+.35*gr)*j,(.15+.33*gr)*j,(.11+.3*gr)*j);return map[i]};
  const n=ix?ix.count:p.count;
  for(let k=0;k<n;k+=3){const a=ix?ix.getX(k):k,b=ix?ix.getX(k+1):k+1,d=ix?ix.getX(k+2):k+2;if(ok[a]&&ok[b]&&ok[d])idx.push(gv(a),gv(b),gv(d))}
  if(!idx.length)return;
  const bg=new THREE.BufferGeometry();
  bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));bg.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  bg.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(sid,4));bg.setAttribute('skinWeight',new THREE.Float32BufferAttribute(swt,4));bg.setAttribute('color',new THREE.Float32BufferAttribute(col.map(v=>v*v),3));bg.setIndex(idx);
  const mt=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,skinning:true});window.__bmt=mt;
  const sm=new THREE.SkinnedMesh(bg,mt);sm.frustumCulled=false;sm.position.copy(bm.position);sm.quaternion.copy(bm.quaternion);sm.scale.copy(bm.scale);bm.parent.add(sm);sm.updateMatrixWorld(true);sm.bind(bm.skeleton,bm.bindMatrix);window.__beard=idx.length/3}

function makeChest(bm){
  const g=bm.geometry,p=g.attributes.position,nr=g.attributes.normal,uv=g.attributes.uv,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ix=g.index;
  const ok=new Uint8Array(p.count);for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>1.3&&y<1.545&&Math.abs(x)<.2&&z>-.03)ok[i]=1}
  const map=new Int32Array(p.count).fill(-1),pos=[],nor=[],uvs=[],sid=[],swt=[],idx=[];let c=0;
  const gv=i=>{if(map[i]>=0)return map[i];map[i]=c++;const d=.012;pos.push(p.getX(i)+nr.getX(i)*d,p.getY(i)+nr.getY(i)*d,p.getZ(i)+nr.getZ(i)*d);nor.push(nr.getX(i),nr.getY(i),nr.getZ(i));uvs.push(uv.getX(i),uv.getY(i));sid.push(si.getX(i),si.getY(i),si.getZ(i),si.getW(i));swt.push(sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i));return map[i]};
  const n=ix?ix.count:p.count;for(let k=0;k<n;k+=3){const a=ix?ix.getX(k):k,b=ix?ix.getX(k+1):k+1,d=ix?ix.getX(k+2):k+2;if(ok[a]&&ok[b]&&ok[d])idx.push(gv(a),gv(b),gv(d))}
  if(!idx.length)return;const bg=new THREE.BufferGeometry();
  bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));bg.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  bg.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(sid,4));bg.setAttribute('skinWeight',new THREE.Float32BufferAttribute(swt,4));bg.setIndex(idx);
  const sm=new THREE.SkinnedMesh(bg,new THREE.MeshStandardMaterial({color:new THREE.Color(0x7a2f33).convertSRGBToLinear(),roughness:1,metalness:0,skinning:true}));
  sm.frustumCulled=false;sm.position.copy(bm.position);sm.quaternion.copy(bm.quaternion);sm.scale.copy(bm.scale);bm.parent.add(sm);sm.updateMatrixWorld(true);sm.bind(bm.skeleton,bm.bindMatrix)}

/* ===== Retarget: animazioni Mixamo (Idle/Walk/Run, rig "Vanguard") applicate allo scheletro di Sam copiando la direzione di ogni osso ===== */
const PAIRS=[['pelvis','Hips','spine_01','Spine'],['spine_01','Spine','spine_02','Spine1'],['spine_02','Spine1','spine_03','Spine2'],['spine_03','Spine2','neck_01','Neck'],['neck_01','Neck','head','Head'],
 ['clavicle_l','LeftShoulder','upperarm_l','LeftArm'],['upperarm_l','LeftArm','lowerarm_l','LeftForeArm'],['lowerarm_l','LeftForeArm','hand_l','LeftHand'],
 ['clavicle_r','RightShoulder','upperarm_r','RightArm'],['upperarm_r','RightArm','lowerarm_r','RightForeArm'],['lowerarm_r','RightForeArm','hand_r','RightHand'],
 ['thigh_l','LeftUpLeg','calf_l','LeftLeg'],['calf_l','LeftLeg','foot_l','LeftFoot'],
 ['thigh_r','RightUpLeg','calf_r','RightLeg'],['calf_r','RightLeg','foot_r','RightFoot']];
const SRC_SPEED={Walk:1.35,Run:3.9};
function loadSrc(H){return fetch('soldier.txt').then(r=>r.text()).then(t=>{const bin=Uint8Array.from(atob(t),c=>c.charCodeAt(0));
  return new Promise((res,rej)=>new THREE.GLTFLoader().parse(bin.buffer,'',g=>{
    const sc=g.scene,sb={};sc.traverse(o=>{if(o.isBone){sb[o.name.replace(/^mixamorig:?/,'')]=o}});sc.traverse(o=>{if(o.isMesh)o.visible=false});
    const mixer=new THREE.AnimationMixer(sc),acts={};g.animations.forEach(a=>{acts[a.name]=mixer.clipAction(a)});
    sc.updateMatrixWorld(true);
    const rest={};Object.values(H.bn).forEach(b=>{rest[b.name]=b.quaternion.clone()});
    const hipsS=new THREE.Vector3().setFromMatrixPosition(sb.Hips.matrixWorld).y,hipsT=new THREE.Vector3().setFromMatrixPosition(H.bn.pelvis.matrixWorld).y;
    const prest=H.bn.pelvis.position.clone();
    H.mirrored=false;window.__mir=H.mirrored;H.m.updateWorldMatrix(true,true);const Bs=canonBasis(sb.LeftUpLeg,sb.RightUpLeg,sb.Hips,sb.Spine2,false);
    const Bt0=canonBasis(H.bn.thigh_l,H.bn.thigh_r,H.bn.pelvis,H.bn.spine_03,H.mirrored);
    const hipsY=wpos(sb.Hips,new THREE.Vector3()).applyMatrix4(Bs.clone().invert()).y,hipsT2=wpos(H.bn.pelvis,new THREE.Vector3()).applyMatrix4(Bt0.clone().invert()).y;
    const off={};H.m.updateWorldMatrix(true,true);for(const [t,,tc] of PAIRS){if(H.bn[t]&&H.bn[tc])off[t]=H.bn[t].worldToLocal(wpos(H.bn[tc],new THREE.Vector3()))}off.foot_l=H.bn.calf_l.worldToLocal(wpos(H.bn.foot_l,new THREE.Vector3()));off.foot_r=H.bn.calf_r.worldToLocal(wpos(H.bn.foot_r,new THREE.Vector3()));const wq=o=>o.getWorldQuaternion(new THREE.Quaternion());const fr={foot_l:[wq(H.bn.foot_l),wq(sb.LeftFoot),'LeftFoot'],foot_r:[wq(H.bn.foot_r),wq(sb.RightFoot),'RightFoot'],head:[wq(H.bn.head),wq(sb.Head),'Head']};H.src={off,fr,sc,sb,mixer,acts,cur:null,rest,k:hipsT2/hipsY,hipsY,prest,Bt0,Bs,Qm0i:H.m.getWorldQuaternion(new THREE.Quaternion()).invert(),mir:H.mirrored?-1:1};res()},rej))})}
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3(),_q1=new THREE.Quaternion(),_qa=new THREE.Quaternion();
function wpos(o,t){return t.setFromMatrixPosition(o.matrixWorld)}
/* base canonica (x=sinistra, y=su, z=avanti) ricavata dalla posa di riposo di uno scheletro */
function canonBasis(L,R,Hp,Sp,mir){const up=wpos(Sp,new THREE.Vector3()).sub(wpos(Hp,new THREE.Vector3())).normalize(),lat=wpos(L,new THREE.Vector3()).sub(wpos(R,new THREE.Vector3()));
  lat.addScaledVector(up,-lat.dot(up)).normalize();const fw=new THREE.Vector3().crossVectors(lat,up).normalize();if(mir)fw.negate();
  return new THREE.Matrix4().makeBasis(lat,up,fw)}
function srcAnim(H,dt,spd,turnRate,back){
  const S=H.src;let nm='Idle',ts=1;
  if(spd>.15){if(spd<2.6){nm='Walk';ts=spd/SRC_SPEED.Walk}else{nm='Run';ts=spd/SRC_SPEED.Run}}
  else if(Math.abs(turnRate)>.3){nm='Walk';ts=.5}
  // fermo: niente idle "da soldato"; si sfuma verso la posa naturale delle foto con respiro
  const idle=nm==='Idle';S.idleW=(S.idleW??1)+((idle?1:0)-(S.idleW??1))*Math.min(1,dt*(idle?4:7));
  if(idle)nm=S.cur&&S.cur!=='Idle'?S.cur:'Walk';
  if(S.cur!==nm){const n=S.acts[nm],o=S.cur&&S.acts[S.cur];n.reset().setEffectiveWeight(1).play();if(o)o.crossFadeTo(n,.22,false);S.cur=nm}
  S.acts[nm].timeScale=idle?0:(back?-Math.max(.6,ts):ts);S.mixer.update(dt);S.sc.updateMatrixWorld(true);
  S.t=(S.t||0)+dt;
  if(S.idleW>.995&&H.photo){const bn=H.bn;Object.values(bn).forEach(b=>{if(S.rest[b.name])b.quaternion.copy(S.rest[b.name])});bn.pelvis.position.copy(S.prest);breathe(H,1,S.t);if(actor.blob)actor.blob.scale.set(1.1,1.1,1);return}
  H.m.updateMatrixWorld(true);const Bt=new THREE.Matrix4().makeRotationFromQuaternion(H.m.getWorldQuaternion(new THREE.Quaternion()).multiply(S.Qm0i)).multiply(S.Bt0),Bti=Bt.clone().invert();const bn=H.bn,sb=S.sb,Bs=S.Bs,Bsi=Bs.clone().invert();
  Object.values(bn).forEach(b=>{if(S.rest[b.name])b.quaternion.copy(S.rest[b.name])});bn.pelvis.position.copy(S.prest);
  H.m.updateMatrixWorld(true);
  const ang=(v,Bi)=>{v=v.clone().applyMatrix4(Bi);return Math.atan2(v.x,v.z)};
  for(const [t,ms,tc,mc] of PAIRS){const b=bn[t],c=bn[tc],sbn=sb[ms],sc=sb[mc];if(!b||!c||!sbn||!sc)continue;
    b.localToWorld(_v1.copy(S.off[t])).sub(wpos(b,_v2)).normalize();             // direzione attuale (mondo Sam), anche se il figlio non è nella gerarchia
    wpos(sc,_v3).sub(wpos(sbn,_v2)).normalize().applyMatrix4(Bsi).applyMatrix4(Bt);  // direzione sorgente -> canonica -> mondo Sam
    if(/^foot_/.test(t)){_v2.set(0,-.22,1).applyMatrix4(Bt).normalize();_v3.multiplyScalar(.4).addScaledVector(_v2,.6).normalize()}
    _q1.setFromUnitVectors(_v1,_v3);b.getWorldQuaternion(_qa).premultiply(_q1);
    const yawFix=(a,bb,sa,sbb)=>{const ls=wpos(sb[sa],new THREE.Vector3()).sub(wpos(sb[sbb],new THREE.Vector3())),lt=wpos(bn[a],new THREE.Vector3()).sub(wpos(bn[bb],new THREE.Vector3()));
      _q1.setFromAxisAngle(new THREE.Vector3(0,1,0).applyMatrix4(Bt).normalize(),S.mir*(ang(ls,Bsi)-ang(lt,Bti)));_qa.premultiply(_q1)};
    if(t==='pelvis')yawFix('thigh_l','thigh_r','LeftUpLeg','RightUpLeg');
    if(t==='spine_03')yawFix('upperarm_l','upperarm_r','LeftArm','RightArm');
    b.parent.getWorldQuaternion(_q1).invert();b.quaternion.copy(_q1.multiply(_qa));b.updateMatrixWorld(true)}
  for(const [f,c] of [['foot_l','calf_l'],['foot_r','calf_r']]){const fb=bn[f];if(!fb)continue;const w=bn[c].localToWorld(_v1.copy(S.off[f]));fb.position.copy(fb.parent.worldToLocal(w));fb.updateMatrixWorld(true)}
  const Qy=H.m.getWorldQuaternion(new THREE.Quaternion()).multiply(S.Qm0i),M=new THREE.Matrix4(),R=new THREE.Matrix4();
  for(const t of ['head','foot_l','foot_r']){const [qt0,qs0,sn]=S.fr[t],b=bn[t];if(!b)continue;
    const d=sb[sn].getWorldQuaternion(new THREE.Quaternion()).multiply(qs0.clone().invert());
    R.makeRotationFromQuaternion(d);M.copy(Bt).multiply(Bsi).multiply(R).multiply(Bs).multiply(Bti);   // delta sorgente -> spazio Sam
    const dq=new THREE.Quaternion().setFromRotationMatrix(M);const qw=dq.multiply(Qy.clone().multiply(qt0));
    b.parent.getWorldQuaternion(_q1).invert();b.quaternion.copy(_q1.multiply(qw));b.updateMatrixWorld(true)}
  const dy=wpos(sb.Hips,_v1).applyMatrix4(Bsi).y-S.hipsY;_v1.set(0,dy*S.k,0).applyMatrix4(Bt);bn.pelvis.parent.getWorldQuaternion(_q1).invert();_v1.applyQuaternion(_q1);bn.pelvis.position.copy(S.prest).add(_v1);
  if(S.idleW>.001&&H.photo){Object.values(bn).forEach(b=>{if(S.rest[b.name])b.quaternion.slerp(S.rest[b.name],S.idleW)});bn.pelvis.position.lerp(S.prest,S.idleW);breathe(H,S.idleW,S.t)}
  if(actor.blob)actor.blob.scale.set(1.1,1.1,1)}

/* respiro e piccolo ondeggiare da fermo */
const _qb=new THREE.Quaternion(),_eb=new THREE.Euler();
function breathe(H,w,t){const bn=H.bn,r=(b,x,y,z)=>{if(!b)return;_qb.setFromEuler(_eb.set(x*w,y*w,z*w));b.quaternion.multiply(_qb)};
  const br=Math.sin(t*1.7);r(bn.spine_02,br*.012,0,0);r(bn.spine_03,br*.01,0,0);r(bn.neck_01,-br*.008,Math.sin(t*.35)*.05,0);
  r(bn.pelvis,0,0,Math.sin(t*.45)*.012);r(bn.upperarm_l,0,0,br*.01);r(bn.upperarm_r,0,0,-br*.01)}

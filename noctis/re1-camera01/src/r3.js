/* ===== Protagonista: low-poly sfaccettato in stile PS1/RE2, texture dipinte 64px a pixel netti ===== */
const actor={root:new THREE.Group(),yaw:.2,x:0,z:-8,speed:0,phase:0,turn:0,t:0};
let _s=91;const rnd=()=>((_s=(Math.imul(_s,1664525)+1013904223)>>>0)/4294967296);
function paint(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.encoding=THREE.sRGBEncoding;return t}
function speck(c,w,h,n,a){for(let i=0;i<n;i++){c.fillStyle='rgba('+(rnd()>.5?'200,190,170':'0,0,0')+','+rnd()*a+')';c.fillRect(rnd()*w|0,rnd()*h|0,1,1)}}
(function(){
  const M=(map,o={})=>new THREE.MeshStandardMaterial(Object.assign({map,roughness:1,metalness:0,flatShading:true},o));
  const flat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.9,flatShading:true},o));
  const hoodT=paint(64,64,(c,w,h)=>{c.fillStyle='#4a1a22';c.fillRect(0,0,w,h);for(let i=0;i<9;i++){c.strokeStyle='rgba(0,0,0,'+(.2+rnd()*.25)+')';c.beginPath();c.moveTo(rnd()*w,0);c.lineTo(rnd()*w,h);c.stroke()}
    for(let i=0;i<5;i++){c.strokeStyle='rgba(150,70,70,.18)';c.beginPath();c.moveTo(0,rnd()*h);c.lineTo(w,rnd()*h);c.stroke()}
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=g;c.fillRect(0,0,w,h);speck(c,w,h,260,.3)});
  const jeanT=paint(64,64,(c,w,h)=>{c.fillStyle='#1d2c42';c.fillRect(0,0,w,h);c.fillStyle='rgba(120,150,180,.25)';c.fillRect(0,h*.3,w,h*.18);c.fillRect(0,h*.78,w,h*.05);
    c.strokeStyle='rgba(150,170,190,.45)';c.beginPath();c.moveTo(w*.2,0);c.lineTo(w*.5,h*.5);c.lineTo(w*.4,h);c.stroke();
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,.1)');g.addColorStop(1,'rgba(0,0,0,.5)');c.fillStyle=g;c.fillRect(0,0,w,h);speck(c,w,h,320,.28)});
  const hood=M(hoodT),rib=flat(0x3a141a),jeans=M(jeanT),cuff=flat(0x44566b),skin=flat(0xa07c64,{roughness:.8}),hairTop=flat(0x40362c),hairSide=flat(0x6e6a64),beardM=flat(0x54463a),beardChin=flat(0x8c8782),shoe=flat(0x3d362f),sole=flat(0x18161a),frame=flat(0xc0c4c7,{metalness:.7,roughness:.35}),blk=flat(0x0b0b0d);
  const pc=(rt,rb,h,mat,seg=7)=>{const g=new THREE.CylinderGeometry(rt,rb,h,seg);g.translate(0,-h/2,0);return new THREE.Mesh(g,mat)};
  const grp=(p)=>{const g=new THREE.Group();p&&p.add(g);return g};
  const R=actor.root;actor.pelvis=grp(R);actor.torso=grp(actor.pelvis);
  const chest=new THREE.Mesh(new THREE.CylinderGeometry(.21,.19,.56,8),hood);chest.scale.z=.7;chest.position.y=.29;actor.torso.add(chest);
  const hem=new THREE.Mesh(new THREE.CylinderGeometry(.205,.2,.1,8),rib);hem.scale.z=.72;actor.torso.add(hem);
  const hoodB=new THREE.Mesh(new THREE.DodecahedronGeometry(.13,0),hood);hoodB.scale.set(1.3,.85,.95);hoodB.position.set(0,.59,.08);actor.torso.add(hoodB);
  for(const s of [-1,1]){const sd=new THREE.Mesh(new THREE.DodecahedronGeometry(.085,0),hood);sd.scale.set(.8,.9,1.15);sd.position.set(s*.115,.59,-.01);actor.torso.add(sd)}
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,.12,6),skin);neck.position.y=.62;actor.torso.add(neck);
  actor.head=grp(actor.torso);actor.head.position.y=.74;
  const hd=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),skin);hd.scale.set(.092,.123,.105);actor.head.add(hd);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(1,8,6,0,Math.PI*2,0,Math.PI*.52),hairSide);cap.scale.set(.1,.13,.114);cap.position.set(0,.012,.008);cap.rotation.x=-.28;actor.head.add(cap);
  const top=new THREE.Mesh(new THREE.SphereGeometry(1,7,5,0,Math.PI*2,0,Math.PI*.4),hairTop);top.scale.set(.086,.12,.11);top.position.set(0,.03,.012);top.rotation.x=-.4;actor.head.add(top);
  const bun=new THREE.Mesh(new THREE.IcosahedronGeometry(.056,0),hairTop);bun.position.set(0,.125,.092);actor.head.add(bun);
  const beard=new THREE.Mesh(new THREE.SphereGeometry(1,9,6,0,Math.PI*2,Math.PI*.42,Math.PI*.5),beardM);beard.scale.set(.096,.1,.107);beard.position.set(0,-.04,-.01);actor.head.add(beard);
  const chin=new THREE.Mesh(new THREE.IcosahedronGeometry(.05,0),beardChin);chin.scale.set(.9,1.4,.9);chin.position.set(0,-.125,-.08);actor.head.add(chin);
  for(const s of [-1,1]){const gl=new THREE.Mesh(new THREE.TorusGeometry(.034,.004,4,10),frame);gl.position.set(s*.043,.015,-.106);actor.head.add(gl);const ey=new THREE.Mesh(new THREE.SphereGeometry(.009,5,4),blk);ey.position.set(s*.042,.014,-.1);actor.head.add(ey)}
  actor.arm=[];for(const s of [-1,1]){
    const sh=grp(actor.torso);sh.position.set(s*.235,.52,0);sh.add(pc(.058,.05,.3,hood));
    const el=grp(sh);el.position.y=-.3;el.add(pc(.05,.042,.27,hood));const cf=pc(.046,.046,.045,rib);cf.position.y=-.245;el.add(cf);
    const hand=new THREE.Mesh(new THREE.IcosahedronGeometry(.046,0),skin);hand.position.y=-.33;hand.scale.set(.85,1.35,.7);el.add(hand);actor.arm.push({sh,el,s})}
  const sho=new THREE.Mesh(new THREE.CylinderGeometry(.056,.056,.46,6),hood);sho.rotation.z=Math.PI/2;sho.position.y=.525;actor.torso.add(sho);
  actor.pelvis.position.y=.99;
  const hips=new THREE.Mesh(new THREE.CylinderGeometry(.18,.19,.2,8),jeans);hips.scale.z=.78;hips.position.y=-.03;actor.pelvis.add(hips);
  actor.leg=[];for(const s of [-1,1]){
    const hp=grp(actor.pelvis);hp.position.set(s*.1,-.08,0);hp.add(pc(.105,.092,.46,jeans,7));
    const kn=grp(hp);kn.position.y=-.46;kn.add(pc(.092,.088,.46,jeans,7));
    const an=grp(kn);an.position.y=-.46;const cu=pc(.096,.096,.05,cuff,7);cu.position.y=.07;an.add(cu);
    const ft=new THREE.Mesh(new THREE.BoxGeometry(.105,.07,.29),shoe);ft.position.set(0,-.03,-.065);an.add(ft);
    const so=new THREE.Mesh(new THREE.BoxGeometry(.11,.02,.3),sole);so.position.set(0,-.07,-.065);an.add(so);actor.leg.push({hp,kn,an,s})}
  const sc=document.createElement('canvas');sc.width=sc.height=128;{const c=sc.getContext('2d'),g=c.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'rgba(0,0,0,.8)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128)}
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false}));
  blob.rotation.x=-Math.PI/2;blob.position.y=.02;R.add(blob);actor.blob=blob;
})();
const lerp=(a,b,t)=>a+(b-a)*t, cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const WALK=1.55,RUN=3.9,L1=.46,L2=.46;
function poseActor(dt,spd,turnRate,back){
  const A=actor;A.t+=dt;
  const shuffle=Math.abs(turnRate)>.1&&spd<.2?.6:0;                    // piccolo passo sul posto quando ruota
  const eff=Math.max(spd,shuffle),r=cl((eff-WALK)/(RUN-WALK),0,1),mv=cl(eff/WALK,0,1);
  const stride=lerp(1.45,2.9,r);
  A.phase+=dt*(eff/stride)*(back?-1:1);
  const p=A.phase*Math.PI*2;
  const amp=lerp(.42,.8,r)*mv, kneeMax=lerp(.85,1.55,r)*mv, armS=lerp(.5,1.0,r)*mv, elb=lerp(.25,1.45,r)*mv+.15, lean=(lerp(.03,.2,r))*mv, bob=lerp(.02,.05,r);
  let reach=[0,0];
  A.leg.forEach((L,i)=>{const o=i?Math.PI:0,th=amp*Math.sin(p+o);
    const kf=kneeMax*Math.max(0,Math.cos(p+o-.35))+.1*mv*Math.max(0,-Math.sin(p+o))+.05*mv;
    L.hp.rotation.x=th;L.hp.rotation.z=.02*L.s;L.kn.rotation.x=-kf;L.an.rotation.x=-(th-kf)*.9+(Math.max(0,Math.cos(p+o-.35))*0);
    reach[i]=L1*Math.cos(th)+L2*Math.cos(th-kf)});
  A.pelvis.position.y=Math.max(reach[0],reach[1])+.08+.012*Math.sin(A.t*1.6)*(1-mv);
  A.pelvis.position.x=Math.sin(p)*.018*mv;A.pelvis.rotation.y=-Math.sin(p)*.12*mv;A.pelvis.rotation.z=Math.sin(p)*.035*mv;
  A.torso.rotation.y=Math.sin(p)*.16*mv;A.torso.rotation.x=-lean-.01*Math.sin(A.t*1.4);A.torso.rotation.z=-Math.sin(p)*.03*mv;
  A.torso.scale.y=1+.006*Math.sin(A.t*1.6);A.head.rotation.x=lean*.6;A.head.rotation.y=-A.torso.rotation.y*.6;
  A.arm.forEach((a,i)=>{const o=i?0:Math.PI;a.sh.rotation.x=armS*Math.sin(p+o)*.8+.02*Math.sin(A.t*1.3+i);a.sh.rotation.z=a.s*(.1+.02*Math.sin(A.t*1.1));
    a.el.rotation.x=elb*(.55+.45*Math.max(0,Math.sin(p+o+.5)))+.1;});
  A.blob.scale.set(.95+.2*r,.95+.2*r,1);
}

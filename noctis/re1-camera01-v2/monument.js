// Rebuilt baroque Guglia dell'Immacolata for Camera 01: no reused old geometry.
// Working height ~30 m, source photos define tier silhouette and proportions.
// Not a photogrammetric copy; finer sculptural details remain an art task.
export function makeGuglia({THREE,world,mat,add,box,cylinder,ball,curve,colliders,depthMeshes,material}){
  const X=-8.7,Z=-10.4, H=30.0;
  const ivory=material(0xcac4b9),cream=material(0xe4ded1),
        aged=material(0x88837d),shade=material(0x716e6b),
        copper=mat.copper;
  // In-house procedural weathered marble map: no external photo, consistent UV.
  const surface=document.createElement('canvas');surface.width=surface.height=512;
  const painter=surface.getContext('2d');painter.fillStyle='#d7d0bf';painter.fillRect(0,0,512,512);
  let seed=556177;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let k=0;k<32000;k++){
    const x=random()*512,y=random()*512,rad=.3+random()*2.3;
    painter.fillStyle=random()<.57?'rgba(69,56,49,'+(random()*.075)+')':'rgba(252,242,225,'+(random()*.12)+')';
    painter.fillRect(x,y,rad*2,rad*.9);
  }
  for(let k=0;k<390;k++){
    let x=random()*512,y=random()*512;
    painter.strokeStyle='rgba(66,59,55,'+(.015+random()*.08)+')';
    painter.lineWidth=.4+random()*1.3;painter.beginPath();painter.moveTo(x,y);
    painter.bezierCurveTo(x-2,y+4,x+5,y+12,x+(random()-.5)*13,y+9+random()*25);
    painter.stroke();
  }
  const stoneMap=new THREE.CanvasTexture(surface);stoneMap.colorSpace=THREE.SRGBColorSpace;
  stoneMap.wrapS=stoneMap.wrapT=THREE.RepeatWrapping;stoneMap.repeat.set(2,3);
  for(const m of [ivory,cream,aged,shade]){m.map=stoneMap;m.roughness=.94;m.needsUpdate=true;}
  const b=(y,w,h,d,m=ivory)=>box(X,y,Z,w,h,d,m,true);
  const co=(y,rTop,rBottom,h,m=ivory,n=10)=>cylinder(X,y,Z,rTop,rBottom,h,m,n,true);
  const globe=(x,y,z,rx,ry,rz,m=ivory)=>ball(x,y,z,rx,ry,rz,m,true);
  const scroll=(pts,r,m=ivory)=>curve(pts,r,m,true);
  function cornice(y,w,depth=.48){b(y,w,depth,w,cream);b(y+depth,w-.25,.13,w-.25,aged);}
  function flutedColumn(x,y,z,height,r=.16){
    cylinder(x,y,z,r,r*1.25,height,ivory,10,true);
    cylinder(x,y,z,r*1.45,r*1.5,.20,cream,10,true);
    cylinder(x,y+height-.18,z,r*1.5,r*1.45,.24,cream,10,true);
  }
  // Base: broad rail and bas-relief pedestal, not a needle on small cube.
  b(0,8.6,.22,8.6,aged);
  b(.22,8.05,.28,8.05,cream);
  b(.5,7.34,.38,7.34,ivory);
  b(.88,6.22,2.42,6.22,cream);
  cornice(3.30,6.95,.35);
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const x=X+sx*2.86,z=Z+sz*2.86;
    box(x,1.02,z,.44,2.25,.44,ivory,true);
    globe(x,3.56,z,.35,.33,.35,cream);
  }
  // Relief niches mounted on all four pedestal faces.
  for(let side=0;side<4;side++){
    const a=side*Math.PI/2,dx=Math.sin(a),dz=Math.cos(a);
    const px=X+dx*3.12,pz=Z+dz*3.12;
    globe(px,2.15,pz,dx? .25:.68, .85, dz?.25:.68,aged);
    globe(px,2.1,pz,dx? .31:.52,.61,dz?.31:.52,cream);
    globe(px,2.92,pz,.29,.29,.29,ivory);
  }
  // Large broken scrolls at the shoulders of the lower stage.
  for(const sx of [-1,1])for(const sz of [-1,1]){
    scroll([[X+sx*2.25,4.0,Z+sz*2.28],[X+sx*3.1,4.06,Z+sz*2.3],
      [X+sx*3.65,3.62,Z+sz*2.3],[X+sx*3.44,3.17,Z+sz*2.3],
      [X+sx*3.02,3.25,Z+sz*2.3]],.19,cream);
    globe(X+sx*3.14,3.35,Z+sz*2.30,.26,.26,.26,ivory);
  }
  // Central deeply carved relief shaft.
  b(3.82,5.44,3.65,5.44,ivory);
  b(4.0,5.72,.15,5.72,aged);
  for(let face=0;face<4;face++){
    const a=face*Math.PI/2,dx=Math.sin(a),dz=Math.cos(a);
    const xx=X+dx*2.82,zz=Z+dz*2.82;
    globe(xx,5.32,zz,dx?.26:.82,1.24,dz?.26:.82,cream);
    globe(xx,5.19,zz,dx?.33:.49,.78,dz?.33:.49,aged);
    globe(xx,6.32,zz,.23,.25,.23,ivory);
    // columns around each niche
    for(const offset of [-1.34,1.34]){
      const ox=xx+(dx?0:offset),oz=zz+(dz?0:offset);
      flutedColumn(ox,4.32,oz,2.78,.13);
    }
  }
  cornice(7.48,6.3,.40);
  b(8.01,5.16,3.26,5.16,cream);
  // Historical layered cornices, broad lower frieze, then larger statuary zone.
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2,dx=Math.sin(a),dz=Math.cos(a);
    const px=X+dx*2.59,pz=Z+dz*2.59;
    globe(px,9.18,pz,dx?.34:.63,1.05,dz?.34:.63,aged);
    globe(px,9.42,pz,.30,.31,.30,ivory);
    for(const offset of [-1.32,1.32]){
      flutedColumn(px+(dx?0:offset),8.30,pz+(dz?0:offset),2.51,.14);
    }
  }
  // Protruding marble figures and rounded deep niches break up the profile.
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2,dx=Math.sin(a),dz=Math.cos(a),x=X+dx*3.1,z=Z+dz*3.1;
    cylinder(x,7.97,z,.43,.61,1.46,aged,8,true);
    globe(x,9.55,z,.35,.36,.32,ivory);
    scroll([[x-.30,8.9,z],[x-.65,8.49,z],[x-.9,8.46,z+.06]],.12,cream);
    scroll([[x+.3,8.90,z],[x+.70,8.54,z],[x+.80,8.32,z]],.12,cream);
    globe(x,7.80,z,.65,.17,.52,cream);
  }
  cornice(11.26,6.38,.37);
  b(11.77,5.54,.32,5.54,shade);
  // Four saint statues rise from the corners.
  function saint(x,y,z,scale=.9){
    const cloak=add(new THREE.CylinderGeometry(.28*scale,.64*scale,1.95*scale,9),x,y+1.04*scale,z,ivory,true);
    cloak.rotation.z=(x>X?-.09:.09);
    globe(x,y+2.25*scale,z,.29*scale,.33*scale,.27*scale,ivory);
    scroll([[x-.22*scale,y+1.64*scale,z],[x-.56*scale,y+1.43*scale,z+.05],[x-.70*scale,y+1.55*scale,z+.08]],.13*scale,cream);
    scroll([[x+.20*scale,y+1.72*scale,z],[x+.43*scale,y+1.52*scale,z],[x+.44*scale,y+1.31*scale,z]],.12*scale,cream);
  }
  for(const sx of [-1,1])for(const sz of [-1,1]){
    box(X+sx*2.12,12.09,Z+sz*2.12,.9,.52,.9,cream,true);
    saint(X+sx*2.12,12.60,Z+sz*2.12,1.0);
  }
  // Tall upper body with lower/upper pyramidal drums and carved volutes.
  co(12.04,2.10,2.43,3.18,ivory,10);
  cornice(15.22,4.80,.35);
  co(15.71,1.49,1.92,3.72,cream,10);
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a);
    scroll([[X+dx*1.59,15.5,Z+dz*1.59],[X+dx*2.00,16.5,Z+dz*1.95],
      [X+dx*1.75,17.9,Z+dz*1.74],[X+dx*1.24,19.22,Z+dz*1.25]],.12,ivory);
  }
  cornice(19.48,3.80,.33);
  co(19.90,1.12,1.48,3.2,ivory,10);
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a);
    scroll([[X+dx*1.28,19.96,Z+dz*1.27],[X+dx*1.55,21.30,Z+dz*1.54],[X+dx*1.10,22.93,Z+dz*1.1]],.11,cream);
  }
  cornice(23.16,3.12,.28);
  co(23.58,.77,1.05,2.00,cream,12);
  co(25.59,.58,.85,.43,ivory,12);
  b(26.03,1.70,.30,1.70,aged);
  // Sculptural crowning Madonna 26.4-30, intentionally oxidized copper.
  cylinder(X,26.34,Z,.38,.60,2.10,copper,10,true); // tapering drapery
  globe(X,28.43,Z,.43,.50,.37,copper);
  globe(X,29.13,Z,.33,.39,.31,copper);
  // Veil and arms with non-symmetrical pose.
  scroll([[X-.35,28.43,Z],[X-.86,28.12,Z+.08],[X-1.05,28.37,Z+.05]],.12,copper);
  scroll([[X+.32,28.45,Z],[X+.78,28.66,Z],[X+1.08,28.89,Z]],.12,copper);
  globe(X-.19,29.18,Z-.14,.26,.43,.23,copper);
  // Crown stars.
  for(let k=0;k<9;k++){
    const a=(k/9)*Math.PI*2;
    globe(X+Math.cos(a)*.59,29.20+Math.sin(a)*.60,Z,.06,.075,.06,cream);
  }
  // 30m calibrated datum, uppermost star.
  globe(X,30.0,Z,.075,.075,.075,cream);
  // Perimeter wrought iron balustrade and decorated stone posts.
  for(let k=0;k<18;k++){
    const q=-4.6+(9.2*k/17);
    for(const z of [Z-4.60,Z+4.60]){
      cylinder(X+q,.40,z,.042,.05,1.07,mat.metal,6,true);
      globe(X+q,1.51,z,.075,.10,.075,mat.metal);
    }
    for(const x of [X-4.60,X+4.60]){
      cylinder(x,.40,Z+q,.042,.05,1.07,mat.metal,6,true);
      globe(x,1.51,Z+q,.075,.10,.075,mat.metal);
    }
  }
  for(const side of [-1,1]){
    box(X,.95,Z+side*4.62,9.3,.045,.055,mat.metal);
    box(X+side*4.62,.95,Z,.055,.045,9.3,mat.metal);
  }
  for(const sx of [-1,1])for(const sz of [-1,1]){
    box(X+sx*4.60,0,Z+sz*4.60,.72,1.10,.72,cream,true);
    globe(X+sx*4.60,1.24,Z+sz*4.60,.24,.24,.24,ivory);
  }
  // One collision volume wraps the stone base & railing, from same metric dimensions.
  colliders.push({type:'aabb',x:X,z:Z,w:9.7,d:9.7});
  return {x:X,z:Z,height:H,baseWidth:9.7,modelType:'baroque-tiered'};
}
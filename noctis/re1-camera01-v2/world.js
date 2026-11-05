import * as THREE from 'three';
import {makeGuglia} from './monument.js';

// All architecture, occlusion proxies and collisions share METRIC WORLD UNITS.
// This is a handmade architectural blockout, not a measured survey.
export function makeWorld(scene){
  const world=new THREE.Group(); scene.add(world);
  const depthMeshes=[],colliders=[];
  let seed=862403;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const material=(hex,rough=.9)=>new THREE.MeshStandardMaterial({color:hex,roughness:rough});
  const mat={
    chalk:material(0xcac4b4),marble:material(0xbeb9b0),marbleLite:material(0xe1d7c5),
    piperno:material(0x4b5158),pipernoDark:material(0x30363c),pipernoLite:material(0x6c6b69),
    plasterRed:material(0x996e62),plasterGold:material(0xb8997b),plasterBeige:material(0xb4a28d),
    metal:new THREE.MeshStandardMaterial({color:0x1c2426,metalness:.5,roughness:.55}),
    copper:new THREE.MeshStandardMaterial({color:0x477c74,metalness:.35,roughness:.71}),
    glass:material(0x191f26,.42),lamp:new THREE.MeshBasicMaterial({color:0xffdca4}),
    roof:material(0x705e50),windowGlow:new THREE.MeshBasicMaterial({color:0xe4ab70})
  };
  const add=(geometry,x,y,z,m,occlude=false,rotation)=>{const v=new THREE.Mesh(geometry,m);v.position.set(x,y,z);if(rotation)v.rotation.set(...rotation);world.add(v);if(occlude)depthMeshes.push(v);return v;};
  const box=(x,y,z,w,h,d,m=mat.marble,occ=false)=>add(new THREE.BoxGeometry(w,h,d),x,y+h/2,z,m,occ);
  const cylinder=(x,y,z,rt,rb,h,m=mat.marble,segments=10,occ=false)=>add(new THREE.CylinderGeometry(rt,rb,h,segments),x,y+h/2,z,m,occ);
  const ball=(x,y,z,rx,ry,rz,m=mat.marble,occ=false)=>{let v=add(new THREE.SphereGeometry(1,10,7),x,y,z,m,occ);v.scale.set(rx,ry,rz);return v;};
  const curve=(points,r,m=mat.marble,occ=false)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a))),Math.max(10,points.length*6),r,7,false),0,0,0,m,occ);
  const light=(x,y,z,power,distance,color)=>{const l=new THREE.PointLight(color,power,distance,2);l.position.set(x,y,z);scene.add(l);return l;};
  scene.background=new THREE.Color(0x0c1524);
  scene.fog=new THREE.Fog(0x121925,65,160);
  scene.add(new THREE.HemisphereLight(0x9aaed1,0x5f6058,1.35));
  const moon=new THREE.DirectionalLight(0xc7d3eb,1.25);moon.position.set(-18,34,15);scene.add(moon);
  const warm=new THREE.DirectionalLight(0xffbd83,.55);warm.position.set(25,22,2);scene.add(warm);

  function tileTex(){
    const can=document.createElement('canvas');can.width=can.height=512;const ctx=can.getContext('2d');
    ctx.fillStyle='#303942';ctx.fillRect(0,0,512,512);
    const bw=68,bh=32;
    for(let row=-1;row<18;row++)for(let col=-1;col<9;col++){
      const x=col*bw+(row&1)*bw/2,y=row*bh;
      const grey=48+Math.floor(rnd()*34),blue=grey+Math.floor(rnd()*5);
      ctx.fillStyle='rgb('+grey+','+(grey+3)+','+blue+')';ctx.fillRect(x+2,y+2,bw-4,bh-4);
      ctx.fillStyle='rgba(15,20,23,.7)';ctx.fillRect(x,y,bw,2);ctx.fillRect(x,y,2,bh);
      ctx.fillStyle='rgba(218,184,124,.11)';ctx.fillRect(x+5,y+5,bw*.55,2);
    }
    for(let i=0;i<10000;i++){
      const v=rnd()>.5?'238,204,159':'10,17,26';
      ctx.fillStyle='rgba('+v+','+(rnd()*.12)+')';ctx.fillRect(rnd()*512,rnd()*512,1+rnd()*2,1+rnd()*2);
    }
    const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(7,8);return tex;
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({map:tileTex(),roughness:.78,metalness:.05}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.055;world.add(ground);
  function stoneSteps(x,z,w,depth){box(x,0,z,w,.16,depth,mat.piperno);box(x,.16,z,w-.20,.13,depth-.2,mat.marble);}
  // Warm pool stains on rainy paving, baked into the background with geometry.
  for(let i=0;i<16;i++){
    const x=-34+rnd()*73,z=-5+rnd()*34;
    const mesh=add(new THREE.CircleGeometry(1,22),x,-.049,z,new THREE.MeshBasicMaterial({color:0x9f7145,transparent:true,opacity:.02+rnd()*.05,depthWrite:false}),false,[-Math.PI/2,0,0]);
    mesh.scale.set(.5+rnd()*3.5,.4+rnd()*1.5,1);
  }
  function palace(x,z,w,h,skin){
    box(x,0,z-3,w,h,6,skin,true);
    box(x,0,z+.15,w+.25,.65,.3,mat.piperno);
    box(x,h-.55,z+.35,w+.65,.68,.9,mat.marbleLite);
    box(x,h-1.4,z+.3,w,.18,.4,mat.marble);
    const count=Math.max(3,Math.floor(w/3.5));
    for(let y=4.9;y<h-1.6;y+=4.3){
      box(x,y-.25,z+.28,w,.19,.55,mat.marbleLite);
      for(let k=0;k<count;k++){
        const xx=x-w/2+(k+.5)*w/count;
        const g=rnd()<.19;
        box(xx,y+.42,z+.39,1.58,2.25,.18,mat.marbleLite);
        box(xx,y+.51,z+.49,1.2,2.02,.12,g?mat.windowGlow:mat.glass);
        box(xx,y+.49,z+.60,.07,2.03,.07,mat.metal);
        box(xx-.82,y+.42,z+.53,.16,2.25,.15,mat.pipernoLite);
        box(xx+.82,y+.42,z+.53,.16,2.25,.15,mat.pipernoLite);
        box(xx,y+.22,z+.70,1.85,.13,.73,mat.marble);
        for(let r=0;r<5;r++)box(xx-.7+r*.35,y-.32,z+.94,.045,.62,.05,mat.metal);
        box(xx,y-.37,z+.93,1.75,.08,.07,mat.metal);
      }
    }
    for(let i=0;i<count;i++){
      const xx=x-w/2+(i+.5)*w/count;
      box(xx,.2,z+.32,1.6,2.65,.15,mat.piperno);
      box(xx,.4,z+.43,1.0,2.25,.12,mat.glass);
    }
    box(x,h,z-2.8,w,1.3,5.7,mat.roof);
  }
  palace(-29,-39,34,19,mat.plasterRed);
  palace(-49,-51,26,17,mat.plasterBeige);
  palace(40,-38,22,20,mat.plasterGold);
  palace(51,-49,20,18,mat.plasterRed);
  // Piazza's Gesù Nuovo facade, distinctive actual raised diamond piperno.
  // City coordinate system: church front = -29.8 world z.
  const CHX=17,FRONT=-29.8,CHW=34,CHH=23;
  box(CHX,0,FRONT-4,CHW,CHH,8,mat.pipernoDark,true);
  box(CHX,CHH-.45,FRONT+.35,CHW+.8,.7,1.2,mat.pipernoLite);
  const pos=[],norm=[],cols=[];
  const faces=[
    [[-1,-1],[1,-1],[0,0]],
    [[1,-1],[1,1],[0,0]],
    [[1,1],[-1,1],[0,0]],
    [[-1,1],[-1,-1],[0,0]]
  ];
  const faceColors=[0x68696b,0x454950,0x383b44,0x565961];
  const cc=new THREE.Color();
  for(let row=0;row<24;row++)for(let col=0;col<35;col++){
    const xx=CHX-CHW/2+col*.975,yy=.5+row*.94;
    if(Math.abs(xx-CHX)<3.5&&yy<7.1)continue;
    if((Math.abs(xx-CHX-9)<1.5 ||Math.abs(xx-CHX+9)<1.5)&&yy>13&&yy<18)continue;
    const front=FRONT+.08,apex=front+.32;
    for(let f=0;f<4;f++){
      const fp=faces[f];const tri=fp.map(([u,v])=>u===0&&v===0?[xx,yy,apex]:[xx+u*.45,yy+v*.44,front]);
      const A=new THREE.Vector3(...tri[0]),B=new THREE.Vector3(...tri[1]),C=new THREE.Vector3(...tri[2]);
      const n=new THREE.Vector3().subVectors(B,A).cross(new THREE.Vector3().subVectors(C,A)).normalize();
      cc.setHex(faceColors[f]);
      for(const pt of tri){pos.push(...pt);norm.push(n.x,n.y,n.z);cols.push(cc.r,cc.g,cc.b);}
    }
  }
  const bosses=new THREE.BufferGeometry();
  bosses.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  bosses.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
  bosses.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  add(bosses,0,0,0,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.92}),true);
  // Marble portal, cornices and paired pilasters.
  box(CHX,0,FRONT+.35,6.55,7.4,.42,mat.marbleLite,true);
  box(CHX,0,FRONT+.67,4.65,5.88,.18,new THREE.MeshStandardMaterial({color:0x201b1b,roughness:.92}),true);
  for(let k of [-1,1]){
    box(CHX+k*3.13,.3,FRONT+.98,.72,6.82,.78,mat.marbleLite,true);
    box(CHX+k*3.13,6.49,FRONT+1.15,1.02,.44,1.08,mat.marble);
    box(CHX+k*2.24,.35,FRONT+.8,.14,5.6,.21,mat.piperno);
  }
  box(CHX,6.88,FRONT+.90,8.05,.7,1.22,mat.marbleLite);
  box(CHX,7.48,FRONT+.75,8.5,.33,.8,mat.piperno);
  ball(CHX,8.42,FRONT+.82,1.58,.72,.26,mat.marbleLite);
  for(let k of [-1,1]){
    const xx=CHX+k*9.7;
    box(xx,13.6,FRONT+.3,3.5,5.2,.45,mat.marbleLite);
    box(xx,13.85,FRONT+.6,2.5,4.5,.2,mat.glass);
    box(xx,13.86,FRONT+.73,.15,4.5,.14,mat.piperno);
    box(xx,13.85,FRONT+.73,2.5,.13,.14,mat.piperno);
  }
  // Recognisable baroque pediment and angular facade line.
  box(CHX,CHH-.08,FRONT+.4,8,1.05,1.3,mat.pipernoLite);
  ball(CHX,CHH+1.08,FRONT+.52,1.15,.85,.22,mat.marble);
  stoneSteps(CHX,FRONT+1.38,7.9,2.8);
  // Street lamps and scene lighting, 3D-backed not painted on an old backdrop.
  function lampPost(x,z){
    cylinder(x,0,z,.12,.2,5.8,mat.metal,10,true);
    box(x,5.6,z,.78,.66,.78,mat.metal,true);
    box(x,5.68,z,.55,.43,.55,mat.lamp);
    cylinder(x,6.22,z,.20,.36,.25,mat.metal,8);
    const lamp=light(x,5.8,z,70,19,0xffbe7a);
    return lamp;
  }
  lampPost(-27,2);lampPost(34,-4);
  light(CHX+3.2,9,FRONT+10,44,25,0xffc792);
  light(-8,10,-7,35,23,0xffd2aa);
  for(const xx of [-24,-17,-1,8,19,29]){
    cylinder(xx,0,13,.23,.3,.85,mat.pipernoLite,9,true);
    cylinder(xx,.84,13,.30,.27,.17,mat.marble,9,true);
    ball(xx,1.06,13,.17,.12,.17,mat.pipernoDark,true);
    colliders.push({type:'circle',x:xx,z:13,r:.52});
  }
  // Ground mask/walk corridors used in world units by the game logic.
  colliders.push({type:'aabb',x:CHX,z:FRONT-4,w:CHW+1,d:8});
  colliders.push({type:'aabb',x:-29,z:-42,w:34,d:6});
  colliders.push({type:'aabb',x:40,z:-41,w:22,d:6});
  const guglia=makeGuglia({THREE,world,mat,add,box,cylinder,ball,curve,colliders,depthMeshes,material});
  return {world,depthMeshes,colliders,guglia,mat};
}
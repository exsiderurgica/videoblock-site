'use strict';(()=>{
const $=s=>document.getElementById(s), frame=$('frame');let canvas=$('view'),ctx=canvas.getContext('2d',{alpha:false});
let mode='map',geo=null,scene=null,gl=null,glProgram=null,buf=null,linesBuf=null,vertexCount=0,lineCount=0;
let texP=null,textureFacade=null,texturePaving=null,facadeBuf=null,groundBuf=null,gugliaBuf=null,gugliaCount=0,facadeCount=6,photoReady=false;
let zoom=1,pan=[-32,0],yaw=-.51,pitch=.17,distance=65,drag=null,viewW=1,viewH=1;
const roadColor='#b3a37d',gold='#d4b278';
function height(){return Math.max(1,frame.getBoundingClientRect().height)}
function resize(){const r=frame.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);viewW=Math.max(2,Math.floor(r.width*dpr));viewH=Math.max(2,Math.floor(r.height*dpr));canvas.width=viewW;canvas.height=viewH;if(gl)gl.viewport(0,0,viewW,viewH);draw();}
function project(x,z){const size=Math.min(viewW,viewH)/300*zoom;return [viewW/2+(x-pan[0])*size,viewH/2+(z-pan[1])*size]}
function drawMap(){if(!geo)return;ctx.fillStyle='#101821';ctx.fillRect(0,0,viewW,viewH);ctx.strokeStyle='#34434b';ctx.lineWidth=1;
 const step=50;for(let x=-400;x<=400;x+=step){ctx.beginPath();let a=project(x,-400),b=project(x,400);ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke()};for(let z=-400;z<=400;z+=step){ctx.beginPath();let a=project(-400,z),b=project(400,z);ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke()}
 const w=Math.max(.6,Math.min(2.6,1.1*zoom));for(const f of geo.features){const g=f.geometry,p=f.properties;if(g.type==='Polygon'){const ring=g.coordinates[0];const key=p.name||'';const special=key==='Chiesa del Gesù Nuovo',chiara=key==='Basilica di Santa Chiara';ctx.fillStyle=special?'#ba9868':chiara?'#837c69':'#405360';ctx.strokeStyle=special?'#f5d5a3':'#697781';ctx.lineWidth=special?2*w:.6*w;ctx.beginPath();ring.forEach(([x,z],i)=>{const k=project(x,z);if(i===0)ctx.moveTo(...k);else ctx.lineTo(...k)});ctx.closePath();ctx.fill();ctx.stroke();}else if(g.type==='LineString'){ctx.strokeStyle=p.highway==='pedestrian'?'#a08c66':'#718897';ctx.lineWidth=w*1.45;ctx.beginPath();g.coordinates.forEach(([x,z],i)=>{const k=project(x,z);if(i===0)ctx.moveTo(...k);else ctx.lineTo(...k)});ctx.stroke();}}
ctx.fillStyle='#e6d4b2';ctx.font=`${Math.max(13,15*viewW/900)}px monospace`;
for(const f of geo.features){if(f.geometry.type!=='Polygon')continue;const n=f.properties.name;if(n!=='Chiesa del Gesù Nuovo'&&n!=='Basilica di Santa Chiara')continue;const p=f.geometry.coordinates[0],x=p.reduce((s,t)=>s+t[0],0)/p.length,z=p.reduce((s,t)=>s+t[1],0)/p.length;const k=project(x,z);ctx.fillText(n==='Chiesa del Gesù Nuovo'?'GESÙ NUOVO':'SANTA CHIARA',k[0]+8,k[1]);}
ctx.fillStyle='#d8b884';ctx.font='14px monospace';ctx.fillText('N ↑',viewW-54,40);}
function matrixMul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function normalize(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l)}
function subtract(a,b){return a.map((v,i)=>v-b[i])}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function lookAt(e,a){const z=normalize(subtract(e,a)),x=normalize(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*e[i],0),-y.reduce((s,v,i)=>s+v*e[i],0),-z.reduce((s,v,i)=>s+v*e[i],0),1]}
function perspective(fov,a,n,f){const q=1/Math.tan(fov/2);return[q/a,0,0,0,0,q,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]}
function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function setupGL(){// A separate WebGL context cannot coexist with the 2D context on one canvas; swap canvas on mode change.
 gl=canvas.getContext('webgl',{alpha:false,antialias:false});if(!gl)throw Error('WebGL non disponibile');
 const vs='attribute vec3 p;attribute vec3 c;uniform mat4 vp;varying vec3 col;varying float dist;void main(){vec4 q=vp*vec4(p,1.);gl_Position=q;col=c;dist=clamp((q.w-80.)/330.,0.,.66);}';
 const fs='precision mediump float;varying vec3 col;varying float dist;void main(){gl_FragColor=vec4(mix(col,vec3(.055,.08,.11),dist),1.);}';
 glProgram=gl.createProgram();gl.attachShader(glProgram,shader(gl.VERTEX_SHADER,vs));gl.attachShader(glProgram,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(glProgram);if(!gl.getProgramParameter(glProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(glProgram));
 gl.useProgram(glProgram);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(.05,.075,.10,1);
 const a=gl.getAttribLocation(glProgram,'p'),b=gl.getAttribLocation(glProgram,'c');gl.enableVertexAttribArray(a);gl.enableVertexAttribArray(b);gl._p=a;gl._c=b;gl._vp=gl.getUniformLocation(glProgram,'vp');
 compileTextured();textureFacade=loadTexture('./facade_256.png',false);texturePaving=loadTexture('./wet_paving.jpg',true);
 buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,scene,gl.STATIC_DRAW);vertexCount=scene.length/6;
 let lineVerts=[];geo.features.forEach(f=>{if(f.geometry.type!=='LineString')return;const pts=f.geometry.coordinates;for(let i=1;i<pts.length;i++){for(let p of [pts[i-1],pts[i]]){lineVerts.push(p[0],.15,p[1],.83,.69,.42)}}});linesBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,linesBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lineVerts),gl.STATIC_DRAW);lineCount=lineVerts.length/6;
}

function compileTextured(){
 const vs='attribute vec3 pos;attribute vec2 uv;uniform mat4 vp;varying vec2 texuv;varying float fog;void main(){vec4 p=vp*vec4(pos,1.);gl_Position=p;texuv=uv;fog=clamp((p.w-95.)/270.,0.,.70);}';
 const fs='precision mediump float;uniform sampler2D image;uniform vec3 mist;varying vec2 texuv;varying float fog;void main(){vec4 c=texture2D(image,texuv);if(c.a<.1)discard;gl_FragColor=vec4(mix(c.rgb,mist,fog),c.a);}';
 texP=gl.createProgram();gl.attachShader(texP,shader(gl.VERTEX_SHADER,vs));gl.attachShader(texP,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(texP);
 if(!gl.getProgramParameter(texP,gl.LINK_STATUS))throw Error('Shader texture: '+gl.getProgramInfoLog(texP));
 texP._pos=gl.getAttribLocation(texP,'pos');texP._uv=gl.getAttribLocation(texP,'uv');texP._vp=gl.getUniformLocation(texP,'vp');texP._tex=gl.getUniformLocation(texP,'image');texP._mist=gl.getUniformLocation(texP,'mist');
 const l=[-37.51,4.68],r=[-11.33,-6.43],n=[.39,.92],shift=.55;
 const A=[l[0]+n[0]*shift,.12,l[1]+n[1]*shift],B=[r[0]+n[0]*shift,.12,r[1]+n[1]*shift];
 const h=21.2;
 // A photo-textured 3D surface: subtle diamond relief, not a screen-facing sprite.
 const verts=[];const w=48,rows=30;
 function P(t,y,depth){return [A[0]+(B[0]-A[0])*t+n[0]*depth,y,A[2]+(B[2]-A[2])*t+n[1]*depth]}
 function V(pt,u,v){return [...pt,u,v]}
 function triangle(a,b,c){verts.push(...a,...b,...c)}
 for(let row=0;row<rows;row++)for(let col=0;col<w;col++){
   const u0=col/w,u1=(col+1)/w, v0=row/rows,v1=(row+1)/rows;
   const p0=V(P(u0,h*v0,0),u0,1-v0),p1=V(P(u1,h*v0,0),u1,1-v0);
   const p2=V(P(u1,h*v1,0),u1,1-v1),p3=V(P(u0,h*v1,0),u0,1-v1);
   const centerU=(u0+u1)/2,centerV=(v0+v1)/2;
   // Diamond-point stone protrusion, reduced where arches and marble portal exist.
   const doorway=(centerU>.47&&centerU<.70&&centerV<.60)||(centerU>.46&&centerU<.75&&centerV>.65);
   const bump=doorway?0.01:0.09;
   const apex=V(P(centerU,h*centerV,bump),centerU,1-centerV);
   triangle(p0,p1,apex);triangle(p1,p2,apex);triangle(p2,p3,apex);triangle(p3,p0,apex);
 }
 facadeCount=verts.length/5;
 facadeBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,facadeBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
 const g=[-132,-.14,-137,0,0, 145,-.14,-137,18,0, 145,-.14,154,18,18, -132,-.14,-137,0,0,145,-.14,154,18,18,-132,-.14,154,0,18];
 groundBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,groundBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g),gl.STATIC_DRAW);
 // The Immacolata spire is a separately modeled 30m vertical 3D landmark.
 // Its placement within the square is an artistic estimate pending a surveyed point.
 const v=[];const c1=[.42,.37,.29],c2=[.63,.56,.44],dark=[.24,.26,.28];
 function tri(a,b,c,col){for(const p of [a,b,c])v.push(...p,...col)}
 function tier(cx,cz,y0,y1,r0,r1,sides,color){for(let j=0;j<sides;j++){const a=j*2*Math.PI/sides,b=(j+1)*2*Math.PI/sides;const q0=[cx+Math.cos(a)*r0,y0,cz+Math.sin(a)*r0],q1=[cx+Math.cos(b)*r0,y0,cz+Math.sin(b)*r0],q2=[cx+Math.cos(b)*r1,y1,cz+Math.sin(b)*r1],q3=[cx+Math.cos(a)*r1,y1,cz+Math.sin(a)*r1];tri(q0,q1,q2,color);tri(q0,q2,q3,color)}}
 const gx=-47,gz=21;
 for(const t of [[0,.6,2.5,2.5,c2],[.6,1.3,2.38,2.24,c1],[1.3,3.8,2.2,1.98,c2],[3.8,4.1,2.24,2.23,c1],[4.1,7.9,1.92,1.77,c2],[7.9,8.3,1.95,1.95,c1],[8.3,12.8,1.55,1.36,c2],[12.8,13.1,1.66,1.64,c1],[13.1,18.3,1.28,1.07,c2],[18.3,18.7,1.40,1.32,c1],[18.7,24.0,.91,.65,c2],[24,24.3,.92,.90,c1],[24.3,29.5,.55,.19,c2],[29.5,30.4,.27,.04,c1]])tier(gx,gz,...t.slice(0,4),12,t[4]);
 // Narrow relief pillars with actual silhouette in perspective
 for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){const xx=gx+2.12*Math.cos(angle),zz=gz+2.12*Math.sin(angle);tier(xx,zz,2.6,6,.16,.10,8,c1);tier(xx,zz,6,6.35,.33,.06,8,c2)}
 gugliaCount=v.length/6;gugliaBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gugliaBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
 }
function loadTexture(url,wrapping){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([15,18,28,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrapping?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrapping?gl.REPEAT:gl.CLAMP_TO_EDGE);
 const im=new Image();im.onload=()=>{if(!gl)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);if((im.width&(im.width-1))===0&&(im.height&(im.height-1))===0){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)}photoReady=true;draw()};im.onerror=()=>{$('status').textContent='Texture non disponibile: '+url};im.src=url;return texture;}
function renderTextures(vp){if(!texP)return;gl.useProgram(texP);gl.uniformMatrix4fv(texP._vp,false,new Float32Array(vp));gl.uniform1i(texP._tex,0);gl.uniform3f(texP._mist,.065,.09,.13);gl.enableVertexAttribArray(texP._pos);gl.enableVertexAttribArray(texP._uv);gl.activeTexture(gl.TEXTURE0);
 function render(buffer,tex,count=6){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(texP._pos,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(texP._uv,2,gl.FLOAT,false,20,12);gl.bindTexture(gl.TEXTURE_2D,tex);gl.drawArrays(gl.TRIANGLES,0,count)}
 gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 render(groundBuf,texturePaving);render(facadeBuf,textureFacade,facadeCount);
 gl.disable(gl.BLEND);gl.depthMask(true);gl.disableVertexAttribArray(texP._pos);gl.disableVertexAttribArray(texP._uv);
}

function draw3D(){if(!gl||!scene)return;gl.useProgram(glProgram);gl.enableVertexAttribArray(gl._p);gl.enableVertexAttribArray(gl._c);gl.viewport(0,0,viewW,viewH);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
const target=[pan[0],7,pan[1]],e=[pan[0]+Math.sin(yaw)*Math.cos(pitch)*distance,7+Math.sin(pitch)*distance,pan[1]+Math.cos(yaw)*Math.cos(pitch)*distance];const vp=matrixMul(perspective(.92,viewW/viewH,1,1500),lookAt(e,target));gl.uniformMatrix4fv(gl._vp,false,new Float32Array(vp));
function render(buffer,count,mode){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(gl._p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(gl._c,3,gl.FLOAT,false,24,12);gl.drawArrays(mode,0,count)}
render(buf,vertexCount,gl.TRIANGLES);render(linesBuf,lineCount,gl.LINES);if(gugliaBuf)render(gugliaBuf,gugliaCount,gl.TRIANGLES);renderTextures(vp);
}
function draw(){if(mode==='map')drawMap();else draw3D()}
function reset(){pan=[-32,0];zoom=1;yaw=-.51;pitch=.17;distance=65;draw()}
async function select(m){if(mode===m)return;const old=$('view'),c=document.createElement('canvas');c.id='view';c.setAttribute('aria-label','Atlante cartografico e volumetrico');old.replaceWith(c); // fresh canvas to switch WebGL/2D contexts
 mode=m;gl=null;ctx=null;canvas=c;ctx=mode==='map'?canvas.getContext('2d',{alpha:false}):null;try{if(mode==='3d'){if(!scene){const r=await fetch('../atlas/assets/geo3d.bin');if(!r.ok)throw Error('Mesh non disponibile');scene=new Float32Array(await r.arrayBuffer())}setupGL()}$('status').textContent=mode==='map'?'Pianta da OpenStreetMap':'Vista con facciata fotografica · altre altezze stimate';$('hint').textContent=mode==='map'?'Trascina per spostare · rotellina per zoom':'Trascina per ruotare · rotellina per zoom';$('mapButton').classList.toggle('selected',mode==='map');$('viewButton').classList.toggle('selected',mode==='3d');registerGestures();resize()}catch(e){$('status').textContent='Errore vista 3D: '+e.message;select('map')}}
function registerGestures(){const c=$('view');let prior=null,down=false,pointer=null;c.addEventListener('pointerdown',e=>{e.preventDefault();c.setPointerCapture(e.pointerId);down=true;pointer=e.pointerId;prior=[e.clientX,e.clientY]});c.addEventListener('pointermove',e=>{if(!down||pointer!==e.pointerId)return;let dx=e.clientX-prior[0],dy=e.clientY-prior[1];prior=[e.clientX,e.clientY];if(mode==='map'){const sc=Math.min(viewW,viewH)/300*zoom;pan[0]-=dx*(viewW/c.getBoundingClientRect().width)/sc;pan[1]-=dy*(viewH/c.getBoundingClientRect().height)/sc}else{yaw-=dx*.007;pitch=Math.max(.12,Math.min(1.35,pitch+dy*.007))}draw()});function stop(e){if(pointer===e.pointerId){down=false;pointer=null}}c.addEventListener('pointerup',stop);c.addEventListener('pointercancel',stop);c.addEventListener('wheel',e=>{e.preventDefault();if(mode==='map')zoom=Math.max(.5,Math.min(7,zoom*Math.exp(-e.deltaY*.001)));else distance=Math.max(16,Math.min(650,distance*Math.exp(e.deltaY*.001)));draw()},{passive:false})}
$('mapButton').addEventListener('click',()=>select('map'));$('viewButton').addEventListener('click',()=>select('3d'));$('resetButton').addEventListener('click',reset);
Promise.all([fetch('../atlas/assets/piazza_del_gesu_footprints.geojson').then(r=>{if(!r.ok)throw Error('GeoJSON HTTP '+r.status);return r.json()})]).then(([d])=>{geo=d;$('status').textContent='Geometrie OSM caricate · 121 edifici · 47 strade';registerGestures();resize();select('3d')}).catch(e=>{$('status').textContent='Errore dati: '+e.message});window.addEventListener('resize',resize);
})();
'use strict';(()=>{
const $=s=>document.getElementById(s), frame=$('frame');let canvas=$('view'),ctx=canvas.getContext('2d',{alpha:false});
let mode='map',geo=null,scene=null,gl=null,glProgram=null,buf=null,linesBuf=null,vertexCount=0,lineCount=0;
let zoom=1,pan=[0,0],yaw=.68,pitch=.55,distance=175,drag=null,viewW=1,viewH=1;
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
 buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,scene,gl.STATIC_DRAW);vertexCount=scene.length/6;
 let lineVerts=[];geo.features.forEach(f=>{if(f.geometry.type!=='LineString')return;const pts=f.geometry.coordinates;for(let i=1;i<pts.length;i++){for(let p of [pts[i-1],pts[i]]){lineVerts.push(p[0],.15,p[1],.83,.69,.42)}}});linesBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,linesBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lineVerts),gl.STATIC_DRAW);lineCount=lineVerts.length/6;
}
function draw3D(){if(!gl||!scene)return;gl.viewport(0,0,viewW,viewH);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
const target=[pan[0],0,pan[1]],e=[pan[0]+Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,pan[1]+Math.cos(yaw)*Math.cos(pitch)*distance];const vp=matrixMul(perspective(.92,viewW/viewH,1,1500),lookAt(e,target));gl.uniformMatrix4fv(gl._vp,false,new Float32Array(vp));
function render(buffer,count,mode){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(gl._p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(gl._c,3,gl.FLOAT,false,24,12);gl.drawArrays(mode,0,count)}
render(buf,vertexCount,gl.TRIANGLES);render(linesBuf,lineCount,gl.LINES);
}
function draw(){if(mode==='map')drawMap();else draw3D()}
function reset(){pan=[0,0];zoom=1;yaw=.68;pitch=.55;distance=175;draw()}
async function select(m){if(mode===m)return;const old=$('view'),c=document.createElement('canvas');c.id='view';c.setAttribute('aria-label','Atlante cartografico e volumetrico');old.replaceWith(c); // fresh canvas to switch WebGL/2D contexts
 mode=m;gl=null;ctx=null;canvas=c;ctx=mode==='map'?canvas.getContext('2d',{alpha:false}):null;try{if(mode==='3d'){if(!scene){const r=await fetch('./assets/geo3d.bin');if(!r.ok)throw Error('Mesh non disponibile');scene=new Float32Array(await r.arrayBuffer())}setupGL()}$('status').textContent=mode==='map'?'Pianta da OpenStreetMap':'Volumetrie tecniche · altezze in parte stimate';$('hint').textContent=mode==='map'?'Trascina per spostare · rotellina per zoom':'Trascina per ruotare · rotellina per zoom';$('mapButton').classList.toggle('selected',mode==='map');$('viewButton').classList.toggle('selected',mode==='3d');registerGestures();resize()}catch(e){$('status').textContent='Errore vista 3D: '+e.message;select('map')}}
function registerGestures(){const c=$('view');let prior=null,down=false,pointer=null;c.addEventListener('pointerdown',e=>{e.preventDefault();c.setPointerCapture(e.pointerId);down=true;pointer=e.pointerId;prior=[e.clientX,e.clientY]});c.addEventListener('pointermove',e=>{if(!down||pointer!==e.pointerId)return;let dx=e.clientX-prior[0],dy=e.clientY-prior[1];prior=[e.clientX,e.clientY];if(mode==='map'){const sc=Math.min(viewW,viewH)/300*zoom;pan[0]-=dx*(viewW/c.getBoundingClientRect().width)/sc;pan[1]-=dy*(viewH/c.getBoundingClientRect().height)/sc}else{yaw-=dx*.007;pitch=Math.max(.12,Math.min(1.35,pitch+dy*.007))}draw()});function stop(e){if(pointer===e.pointerId){down=false;pointer=null}}c.addEventListener('pointerup',stop);c.addEventListener('pointercancel',stop);c.addEventListener('wheel',e=>{e.preventDefault();if(mode==='map')zoom=Math.max(.5,Math.min(7,zoom*Math.exp(-e.deltaY*.001)));else distance=Math.max(30,Math.min(650,distance*Math.exp(e.deltaY*.001)));draw()},{passive:false})}
$('mapButton').addEventListener('click',()=>select('map'));$('viewButton').addEventListener('click',()=>select('3d'));$('resetButton').addEventListener('click',reset);
Promise.all([fetch('./assets/piazza_del_gesu_footprints.geojson').then(r=>{if(!r.ok)throw Error('GeoJSON HTTP '+r.status);return r.json()})]).then(([d])=>{geo=d;$('status').textContent='Geometrie OSM caricate · 121 edifici · 47 strade';registerGestures();resize()}).catch(e=>{$('status').textContent='Errore dati: '+e.message});window.addEventListener('resize',resize);
})();
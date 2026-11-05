/* NOCTIS — Night Walk 1.0. Browser-native WebGL1 art prototype.
 * Procedural textured 3D. No PS1 emulation, sprites, background photographs or remote JS dependencies.
 * Architecture is an artistic reconstruction, not photogrammetry/survey data. */
(()=>{'use strict';
const $=id=>document.getElementById(id), gl=$('screen').getContext('webgl',{antialias:false,alpha:false,depth:true,powerPreference:'default'});
const status=$('status');if(!gl){status.textContent='ERRORE: WebGL non disponibile su questo browser';$('start').disabled=true;return;}
const VS=`attribute vec3 aPos;attribute vec3 aNormal;attribute vec2 aUv;attribute vec3 aTint;attribute float aMat;
uniform mat4 uVP;varying vec3 wPos;varying vec3 wNormal;varying vec2 tUv;varying vec3 tTint;varying float tMat;varying float dist;
void main(){wPos=aPos;wNormal=aNormal;tUv=aUv;tTint=aTint;tMat=aMat;vec4 v=uVP*vec4(aPos,1.);gl_Position=v;dist=v.w;}`;
const FS=`precision mediump float;
varying vec3 wPos;varying vec3 wNormal;varying vec2 tUv;varying vec3 tTint;varying float tMat;varying float dist;
uniform sampler2D uAtlas;uniform vec3 uEye;uniform float uClock;
vec3 matColor(float kind){
  vec2 grid=vec2(mod(kind,4.),floor(kind/4.));
  vec2 tileUv=(grid+vec2(.012)+fract(tUv)*.976)/4.;
  return texture2D(uAtlas,tileUv).rgb;
}
vec3 lamp(vec3 p,vec3 n,vec3 eye,vec3 source,float radius){
  vec3 delta=source-p;float dd=dot(delta,delta);vec3 l=normalize(delta);
  float falloff=radius*radius/(radius*radius+dd*2.4);
  float diffuse=max(.09,dot(n,l));
  return vec3(1.0,.69,.37)*diffuse*falloff*2.65;
}
void main(){
  if(tMat>15.5){gl_FragColor=vec4(tTint,1.);return;}
  vec3 n=normalize(wNormal);vec3 c=matColor(floor(tMat+.5))*tTint;
  vec3 ambient=vec3(.31,.36,.52)*(.73+.27*max(0.,n.y));
  vec3 warm=lamp(wPos,n,uEye,vec3(-20.,5.4,-11.),8.5)+lamp(wPos,n,uEye,vec3(21.,5.5,-18.),8.5)
      +lamp(wPos,n,uEye,vec3(-6.,5.4,9.),9.5)+lamp(wPos,n,uEye,vec3(7.,5.4,-9.),8.);
  if(tMat>12.5&&tMat<14.5) {c*=1.34;ambient=vec3(.99,.75,.51);warm*=.4;}
  if(tMat>14.5&&tMat<15.5){ ambient=vec3(.90,.68,.41); }
  vec3 outcol=c*(ambient+warm);
  if(tMat<.5){
    float puddle=smoothstep(.28,.67,sin(wPos.x*.85+sin(wPos.z*1.27))*.37+sin(wPos.z*.39+wPos.x*.18)*.33+.44);
    float d0=length(wPos.xz-vec2(-20.,-11.));float d1=length(wPos.xz-vec2(21.,-18.));float d2=length(wPos.xz-vec2(-6.,9.));
    float wet=(puddle*.22+.15)*(.6+.4*sin(wPos.x*.39));
    outcol+=vec3(.53,.29,.13)*wet*(exp(-d0*d0/140.)+exp(-d1*d1/130.)+exp(-d2*d2/180.));
    outcol+=vec3(.027,.04,.065)*puddle;
  }
  float fog=clamp((dist-28.)/105.,0.,.57);outcol=mix(outcol,vec3(.062,.087,.13),fog);
  float pattern=mod(gl_FragCoord.x+gl_FragCoord.y*2.,4.);outcol*=.965+.011*pattern;
  outcol=pow(max(outcol,vec3(0.)),vec3(.93));
  gl_FragColor=vec4(outcol,1.);
}`;
function compile(t,source){const s=gl.createShader(t);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
let program;try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,VS));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}catch(e){status.textContent='Shader error: '+e.message;$('start').disabled=true;return;}
gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
const attrs=['aPos','aNormal','aUv','aTint','aMat'].map(n=>gl.getAttribLocation(program,n));attrs.forEach(k=>gl.enableVertexAttribArray(k));const locVP=gl.getUniformLocation(program,'uVP'),locEye=gl.getUniformLocation(program,'uEye'),locClock=gl.getUniformLocation(program,'uClock');gl.uniform1i(gl.getUniformLocation(program,'uAtlas'),0);
const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([110,105,95,255]));
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
const image=new Image();image.src='./assets/materials.png?v=20261105';image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);status.textContent='Texture caricate. Premi INIZIA.';$('start').disabled=false;};image.onerror=()=>{status.textContent='Texture non trovate, errore nella pubblicazione.';$('start').disabled=true;};$('start').disabled=true;
// Vertices: 3 coordinates, 3 face normal, 2 UV, 3 color tint, 1 atlas index.
const STRIDE=12,staticData=[],dynamicData=[];let target=staticData;
const V=(a,b,c)=>[a,b,c];const SUB=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const CROSS=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const NORM=a=>{let q=Math.hypot(...a)||1;return a.map(n=>n/q)};
const T=(r=1,g=r,b=r)=>[r,g,b];
function tri(a,b,c,tint=T(),mat=3,uv){const n=NORM(CROSS(SUB(b,a),SUB(c,a)));const u=uv||[[0,0],[1,0],[1,1]];for(let k=0;k<3;k++)target.push(...[a,b,c][k],...n,...u[k],...tint,mat);}
function quad(a,b,c,d,tint=T(),mat=3,uv){const u=uv||[[0,0],[1,0],[1,1],[0,1]];tri(a,b,c,tint,mat,u.slice(0,3));tri(a,c,d,tint,mat,[u[0],u[2],u[3]]);}
function cuboid(x,y,z,w,h,d,mat=3,tint=T(),stretch=1){const l=x-w/2,r=x+w/2,b=y,t=y+h,n=z-d/2,f=z+d/2;quad(V(l,b,f),V(r,b,f),V(r,t,f),V(l,t,f),tint,mat,[[0,0],[w/stretch,0],[w/stretch,h/stretch],[0,h/stretch]]);quad(V(r,b,n),V(l,b,n),V(l,t,n),V(r,t,n),T(tint[0]*.83,tint[1]*.83,tint[2]*.83),mat,[[0,0],[w/stretch,0],[w/stretch,h/stretch],[0,h/stretch]]);quad(V(r,b,f),V(r,b,n),V(r,t,n),V(r,t,f),tint,mat,[[0,0],[d/stretch,0],[d/stretch,h/stretch],[0,h/stretch]]);quad(V(l,b,n),V(l,b,f),V(l,t,f),V(l,t,n),tint,mat,[[0,0],[d/stretch,0],[d/stretch,h/stretch],[0,h/stretch]]);quad(V(l,t,f),V(r,t,f),V(r,t,n),V(l,t,n),tint,mat);quad(V(l,b,n),V(r,b,n),V(r,b,f),V(l,b,f),tint,mat);}
function cyl(x,y,z,height,r0,r1,mat=3,tint=T(),sides=8){for(let k=0;k<sides;k++){let a=k*2*Math.PI/sides,b=(k+1)*2*Math.PI/sides;let A=V(x+Math.cos(a)*r0,y,z+Math.sin(a)*r0),B=V(x+Math.cos(b)*r0,y,z+Math.sin(b)*r0),C=V(x+Math.cos(b)*r1,y+height,z+Math.sin(b)*r1),D=V(x+Math.cos(a)*r1,y+height,z+Math.sin(a)*r1);quad(A,B,C,D,tint,mat,[[0,0],[1/sides,0],[1/sides,height*.4],[0,height*.4]]);}}
function rod(a,b,rad,mat=12,tint=T(),side=6){const dir=NORM(SUB(b,a)),crossAxis=Math.abs(dir[1])>.9?[1,0,0]:[0,1,0];const x=NORM(CROSS(dir,crossAxis)),z=NORM(CROSS(dir,x));for(let k=0;k<side;k++){let aa=k*2*Math.PI/side,bb=(k+1)*2*Math.PI/side;const ring=(o,ang)=>V(o[0]+rad*(Math.cos(ang)*x[0]+Math.sin(ang)*z[0]),o[1]+rad*(Math.cos(ang)*x[1]+Math.sin(ang)*z[1]),o[2]+rad*(Math.cos(ang)*x[2]+Math.sin(ang)*z[2]));quad(ring(a,aa),ring(a,bb),ring(b,bb),ring(b,aa),tint,mat);}}
function ball(x,y,z,rx,ry,rz,mat=3,tint=T(),rings=6,sides=9){for(let i=0;i<rings;i++){let a=-Math.PI/2+i*Math.PI/rings,b=-Math.PI/2+(i+1)*Math.PI/rings;for(let j=0;j<sides;j++){let aa=j*Math.PI*2/sides,bb=(j+1)*Math.PI*2/sides;const p=(alt,az)=>V(x+rx*Math.cos(alt)*Math.cos(az),y+ry*Math.sin(alt),z+rz*Math.cos(alt)*Math.sin(az));quad(p(a,aa),p(a,bb),p(b,bb),p(b,aa),tint,mat,[[0,0],[1,0],[1,1],[0,1]]);}}}
function band(x,y,z,radx,radz,height,mat=3,tint=T()){for(let j=0;j<12;j++){let a=j*Math.PI/6,b=(j+1)*Math.PI/6;quad(V(x+radx*Math.cos(a),y,z+radz*Math.sin(a)),V(x+radx*Math.cos(b),y,z+radz*Math.sin(b)),V(x+radx*Math.cos(b),y+height,z+radz*Math.sin(b)),V(x+radx*Math.cos(a),y+height,z+radz*Math.sin(a)),tint,mat);}}
// Ground: actually tiled low-poly stone street, not a flat untextured plane.
quad(V(-74,-.08,57),V(74,-.08,57),V(74,-.08,-66),V(-74,-.08,-66),T(.92,.93,.98),0,[[0,0],[25,0],[25,20],[0,20]]);
// pavements at entrance edges
cuboid(-35,-.055,-6,1,.12,48,3,T(.76,.75,.72),3);cuboid(38,-.05,-7,1,.12,45,3,T(.75,.74,.72),3);
// Faceted deep night sky, gradient and moon. Art-direction from the supplied night-city clip.
quad(V(-180,-1,-110),V(180,-1,-110),V(180,30,-110),V(-180,30,-110),T(.12,.14,.20),16);
quad(V(-180,30,-110),V(180,30,-110),V(180,90,-110),V(-180,90,-110),T(.065,.076,.12),16);
for(let i=0;i<8;i++){let x=-35+i*15,z=-108+(i%3)*.01,y=38+(i%4)*1;ball(x,y,z,9,1.8,.1,16,T(.067,.073,.114),2,6);}
// Church (Gesù Nuovo): artistic reconstruction with textured raised diamonds, not a cube mosaic.
function church(){const x=12,z=-34,w=28,dep=6.8,h=21.7,front=z+dep/2+.05;
 cuboid(x,-.08,z,w,h,dep,2,T(.86,.89,.93),3.1);cuboid(x,h-.5,z,w+.9,.67,dep+.95,3,T(.76,.76,.73));
 // diamond-cut basalt stone faceted surface
 for(let yy=.15;yy<h-.9;yy+=.98)for(let xx=x-w/2+.14;xx<x+w/2-.95;xx+=.98){const p=.96;let Q=[xx+p*.5,yy+p*.50,front+.27],a=[xx,yy,front],b=[xx+p,yy,front],c=[xx+p,yy+p,front],d=[xx,yy+p,front];
  tri(a,b,Q,T(.80,.82,.84),2);tri(b,c,Q,T(.62,.66,.68),2);tri(c,d,Q,T(.52,.55,.60),2);tri(d,a,Q,T(.92,.95,.97),2);
 }
 // Portal: monumental staircase + layered baroque pediment, corbels, decorated lintels.
 for(let s=0;s<3;s++)cuboid(x,-.05+s*.11,front+1.5-s*.6,10-s*.65,.15,3.9-s*.56,3,T(.97,.89,.78));
 cuboid(x,.0,front+.35,7.5,9.45,.42,3,T(1.0,.94,.84));cuboid(x,.12,front+.60,6.06,8.28,.48,8,T(.64,.66,.72));
 for(let f of [-1,1]){
  cuboid(x+f*3.35,0,front+.78,.69,9.5,.68,3,T(1.05,.97,.85));
  cyl(x+f*3.53,.45,front+1.15,7.65,.27,.25,3,T(1.05,.99,.87),9);
  for(let j=1;j<6;j++)band(x+f*3.53,.50+j*1.2,front+1.15,.28,.29,.10,3,T(.95,.9,.75));
 }
 cuboid(x,8.95,front+.8,9.4,.53,1.35,3,T(1.07,.99,.84));cuboid(x,9.48,front+.75,8.85,.35,1.2,3,T(.88,.83,.76));
 // triangular broken pediment and tracery relief (actual sloped geometry)
 tri(V(x-5.5,10.0,front+.73),V(x+5.5,10,front+.73),V(x,13.4,front+.73),T(1.02,.96,.87),3);
 rod(V(x-5.5,10.05,front+1.1),V(x,13.38,front+1.1),.23,3);rod(V(x,13.38,front+1.1),V(x+5.5,10.05,front+1.1),.23,3);
 ball(x,12.2,front+1.08,.54,.58,.32,3,T(.84,.78,.70),4,7);for(let q=-2;q<=2;q++)ball(x+q*.78,10.8+Math.abs(q)*.30,front+1.16,.25,.25,.22,3,T(.9,.82,.72),4,6);
 // tall stained / shuttered central window
 cuboid(x,14.4,front+.35,4.9,5.42,.56,3,T(.93,.88,.76));cuboid(x,14.64,front+.67,3.65,4.68,.19,15,T(.17,.23,.28));
 for(let j=0;j<4;j++)rod(V(x-1.55+j*1.03,14.65,front+.78),V(x-1.55+j*1.03,19.17,front+.78),.045,12);
 for(let j=0;j<6;j++)rod(V(x-1.66,14.85+j*.71,front+.80),V(x+1.66,14.85+j*.71,front+.80),.03,12);
 // wooden leaves and metal decorative studs
 cuboid(x-1.49,.28,front+.94,2.9,7.46,.1,8,T(.74,.76,.77));cuboid(x+1.49,.28,front+.94,2.9,7.46,.1,8,T(.79,.81,.82));
 for(let y=1;y<7.5;y+=1.2){for(let xx of [-2.4,-1.5,-.6,.6,1.5,2.4]){ball(x+xx,y,front+1.05,.065,.065,.05,12,T(.75,.61,.42),3,5);}}
}
church();
// Baroque obelisk / Guglia dell'Immacolata silhouette — stacked carved stone profiles.
function guglia(x,z){let y=0;
 for(let [w,h,d] of [[5.1,.38,5.1],[4.7,.44,4.7],[4.22,.70,4.22],[3.6,.32,3.6]]){cuboid(x,y,z,w,h,d,3,T(.96,.9,.82));y+=h;}
 for(let side of [-1,1])for(let axis of [-1,1]){
   let sx=x+side*1.35,sz=z+axis*1.35;
   cyl(sx,y,sz,2.7,.19,.15,3,T(.97,.91,.79));band(sx,y+.16,sz,.27,.27,.16,3);
   ball(sx,y+2.55,sz,.34,.39,.31,3,T(.93,.88,.78),4,7);
 }
 cuboid(x,y,z,3.25,3.1,3.25,3,T(.96,.90,.82));y+=3.1;
 for(let face of [-1,1]){cuboid(x+face*1.67,y-3.05,z,.16,2.76,1.58,3,T(.90,.84,.74));cuboid(x,y-3.05,z+face*1.67,1.6,2.76,.15,3,T(.9,.84,.74));}
 for(let i=0;i<4;i++){cuboid(x,y,z,3.85,.26,3.85,3,T(1.,.92,.80));y+=.26;}
 cyl(x,y,z,5.1,1.52,1.03,3,T(.96,.91,.82),8);y+=5.1;
 cuboid(x,y,z,2.85,.35,2.85,3);y+=.35;
 cyl(x,y,z,4.5,1.18,.59,3,T(.96,.91,.82),8);y+=4.5;
 for(let i=0;i<2;i++){cuboid(x,y,z,2.2-i*.36,.36,2.2-i*.36,3);y+=.36;}
 cyl(x,y,z,3.0,.48,.10,3,T(1.,.93,.82),8);y+=3.0;
 ball(x,y+.25,z,.52,.78,.45,3,T(.91,.85,.76),5,8);y+=.9;
 cyl(x,y,z,1.0,.17,.09,12,T(.88,.70,.43),6);ball(x,y+1.13,z,.24,.26,.22,12,T(.85,.72,.49),4,7);
}
guglia(-5.7,-7.5);
// Palace facades: trim, real window geometry/recesses, wrought iron balconies, painted plaster, not bare cubes.
function palazzo(x,z,w,d,h,material=1,front='south',seed=0){
 const by=0.0; cuboid(x,by,z,w,h,d,material,T(.94,.96,1.0),5);
 cuboid(x,0,z,w,1.05,d,3,T(.82,.78,.73),4);cuboid(x,h-.75,z,w+.58,.75,d+.45,3,T(.89,.86,.78),4);
 // cornices
 for(let f of [1,2,3]){let yy=f*4.1; if(yy<h-1){cuboid(x,yy,z,w+.42,.18,d+.44,3,T(.87,.87,.80));cuboid(x,yy+.19,z,w+.20,.14,d+.25,3,T(.91,.90,.84));}}
 const n=Math.max(2,Math.floor((w-2)/3.1)),zFront=z+(front==='south'?d/2+.05:-d/2-.05);
 for(let f=0;f<Math.min(4,Math.floor((h-2)/3.75));f++)for(let i=0;i<n;i++){
 const wx=x-w/2+(i+.5)*w/n,wy=1.4+f*3.75;
 const open=(f+i+seed)%6===0;
 cuboid(wx,wy,zFront+.085,1.54,2.46,.15,7,T(.75,.81,.88));
 cuboid(wx,wy+.25,zFront+.21,1.28,1.92,.10,open?13:15,open?T(.78,.74,.66):T(.52,.57,.63));
 for(let frame of [-1,1])cuboid(wx+frame*.82,wy-.10,zFront+.27,.18,2.72,.25,3,T(1.05,1.0,.91));
 cuboid(wx,wy+2.47,zFront+.27,2.1,.25,.40,3,T(.97,.92,.84));cuboid(wx,wy-.20,zFront+.31,2.0,.17,.5,3,T(.97,.92,.84));
 if(f>0){cuboid(wx,wy-.35,zFront+.81,1.85,.18,1.15,3,T(.80,.77,.71));for(let j=0;j<7;j++)rod(V(wx-.9+j*.30,wy-.18,zFront+1.38),V(wx-.9+j*.30,wy+.86,zFront+1.38),.035,12,T(.88,.9,.87));rod(V(wx-1.05,wy+.86,zFront+1.38),V(wx+1.05,wy+.86,zFront+1.38),.055,12);}
 if(f===0&&i%4===1) {cuboid(wx,.03,zFront+.17,2.2,2.6,.15,8,T(.77,.75,.72));}
 }
 // drainage pipes, irregular stucco patches, illuminated shop light, shuttered entrances
 for(let p of [-w/2+.27,w/2-.38])rod(V(x+p,0,zFront+.47),V(x+p,h-.65,zFront+.47),.10,12,T(.73,.71,.67));
 for(let i=0;i<4;i++){let pos=x-w/2+1.8+i*(w-3)/4;
 quad(V(pos,1.08,zFront+.11),V(pos+.60,1.08,zFront+.11),V(pos+.55,3,zFront+.11),V(pos+.18,3.25,zFront+.11),T(.72+.04*i,.75,.81),material);}
}
// Surrounding buildings form a walkable Piazza del Gesù, approximate positions.
palazzo(-28,-26,17,16,19,1,'south',0);palazzo(-30,-3,13,26,17,4,'south',2);
palazzo(-28,26,21,12,18,1,'south',1);palazzo(-2,30,29,12,19,4,'south',5);
palazzo(24,29,22,12,16,1,'south',2);palazzo(34,9,13,18,19,4,'south',3);
palazzo(36,-25,12,15,18,1,'south',1);palazzo(-4,-39,19,7,18,4,'south',4);
// Moon from distant polygon fan
function disk(x,y,z,r,color){const center=V(x,y,z);for(let i=0;i<18;i++){let a=i*2*Math.PI/18,b=(i+1)*2*Math.PI/18;tri(center,V(x+r*Math.cos(a),y+r*Math.sin(a),z),V(x+r*Math.cos(b),y+r*Math.sin(b),z),color,16);}}
disk(-27,31,-105,1.80,T(.70,.72,.81));disk(-27.2,31.2,-104.99,.94,T(.83,.83,.85));
// Wrought lamps and warm amber light. Lanterns have faceted shades and wrought brackets.
function lamp(x,z,wall=false){cyl(x,0,z,5.35,.12,.10,12,T(.73,.72,.69),8);cyl(x,5.27,z,.38,.21,.17,12);cuboid(x,5.36,z,.77,.65,.77,13,T(1.,.88,.67));cyl(x,5.95,z,.23,.46,.24,12);cyl(x,6.17,z,.37,.30,.02,12);for(let a=0;a<4;a++){const A=a*Math.PI/2;rod(V(x+Math.cos(A)*.35,5.31,z+Math.sin(A)*.35),V(x+Math.cos(A)*.22,6.04,z+Math.sin(A)*.22),.034,12);}
}
for(const [x,z] of [[-20,-11],[21,-18],[-6,9],[7,-9],[-23,18],[20,11]])lamp(x,z);
// chains between bollards, roads and iron gate
function bollard(x,z){cyl(x,0,z,.78,.18,.12,12,T(.63,.66,.68),9);ball(x,.8,z,.17,.19,.17,12,T(.72,.72,.70),4,8)}
let chainPoints=[];for(let xx=-20;xx<16;xx+=3.1){bollard(xx,10);chainPoints.push(xx)}
for(let i=1;i<chainPoints.length;i++){let a=chainPoints[i-1],b=chainPoints[i];let last=V(a,.55,10);for(let j=1;j<=8;j++){let t=j/8,p=V(a+(b-a)*t,.55-.22*Math.sin(Math.PI*t),10);rod(last,p,.025,12,T(.7,.68,.61),5);last=p;}}
// low-poly leafless tree in near-left corner: atmospheric, does not dominate architecture
function tree(x,z){cyl(x,0,z,6.1,.42,.24,5,T(.48,.45,.42),7);let nodes=[[x,6,z,1]];
 for(let depth=0;depth<4;depth++){const next=[];for(let q=0;q<nodes.length;q++){const [px,py,pz,sz]=nodes[q];for(let k=0;k<2;k++){let ang=(q*7+k*3+depth*1.1)*1.6;let A=V(px,py,pz),B=V(px+Math.cos(ang)*(1.4-depth*.22)*sz,py+(1.6-depth*.12)*sz,pz+Math.sin(ang)*(1.0-depth*.12)*sz);rod(A,B,.12*Math.pow(.53,depth),5,T(.54,.50,.44),5);next.push([...B,sz*.74]);}}nodes=next;}
}
tree(-35,7);
// Iron rails and dark shutters near the narrow east alley entrance.
let exitOpen=false;
function gate(){if(exitOpen)return;const prev=target;target=dynamicData;for(let t=-9;t<1;t+=.45)rod(V(31,0,t),V(31,4.2,t),.07,12,T(.72,.68,.64));rod(V(31,4.05,-9.5),V(31,4.05,1),.15,12);target=prev;}
// Small parked scooter / stone planters contribute visual scale.
function scooter(x,z){ball(x,.42,z-.56,.36,.36,.20,12,T(.15,.15,.16),6,10);ball(x,.42,z+.73,.36,.36,.20,12,T(.15,.15,.16),6,10);rod(V(x,.58,z-.47),V(x,.64,z+.65),.15,12);rod(V(x,.6,z),V(x,1.3,z-.17),.10,12);cuboid(x,.8,z+.1,.55,.38,1.3,7,T(.52,.46,.38));rod(V(x-.38,1.27,z-.31),V(x+.38,1.27,z-.31),.05,12);}
scooter(22,8);
// Ground decals / irregular puddle facets along the stone surface.
for(let k=0;k<55;k++){let xx=-30+(k*17%67),zz=-22+((k*31+7)%49);let r=.36+(k%7)*.19;let y=-.078+(k%3)*.0005;
 quad(V(xx-r,y,zz-r*.4),V(xx+r,y,zz-r*.36),V(xx+r*.9,y,zz+r*.49),V(xx-r*.8,y,zz+r*.46),T(.40,.44,.55),0,[[0,0],[.8,0],[.8,.8],[0,.8]]);}
// All geometry above is static. Dynamic mesh is the actor, key and door gate.
const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer(),staticCount=staticData.length/STRIDE;
gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(staticData),gl.STATIC_DRAW);
function draw(buffer,n){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);let stride=STRIDE*4;const offsets=[0,12,24,32,44],sizes=[3,3,2,3,1];for(let i=0;i<attrs.length;i++)gl.vertexAttribPointer(attrs[i],sizes[i],gl.FLOAT,false,stride,offsets[i]);gl.drawArrays(gl.TRIANGLES,0,n);}
function matmul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function perspective(fovy,a,n,f){let t=1/Math.tan(fovy/2);return new Float32Array([t/a,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function lookAt(eye,at){let z=NORM(SUB(eye,at)),x=NORM(CROSS([0,1,0],z)),y=CROSS(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);}
let keys={},playing=false,time=0,last=0,hasKey=false,won=false,run=false,sprint=false,toastUntil=0,stick={x:0,y:0},pointerLook=null,pointerStick=null,lookX=0,lookY=0;
const actorPos={x:-10,z:13,yaw:0},cam={yaw:0,pitch:.05};
const obstacles=[[12,-34,28,6.8],[-28,-26,17,16],[-30,-3,13,26],[-28,26,21,12],[-2,30,29,12],[24,29,22,12],[34,9,13,18],[36,-25,12,15],[-4,-39,19,7],[-5.7,-7.5,5,5]];
function blocked(x,z){if(x<-41||x>42||z<-46||z>43)return true;for(let [xx,zz,w,h]of obstacles){let dx=Math.max(Math.abs(x-xx)-w/2,0),dz=Math.max(Math.abs(z-zz)-h/2,0);if(Math.hypot(dx,dz)<.36)return true;}if(!exitOpen&&x>29.6&&x<32.0&&z>-9.5&&z<1)return true;return false;}
// Character: continuous tapered polygon surfaces, hinged legs, cloth folds, hair bun, head, hands and shoes; never a billboard.
function actor(){const local=[];let old=target;target=local;let wave=run?Math.sin(time*(sprint?11.5:8.5)):0;let sway=run?.5*Math.sin(time*(sprint?11.5:8.5)):0;let bob=run?.045*Math.abs(wave):0;
 const jacket=T(.83,.85,.92),dark=T(.60,.64,.74),pants=T(.88,.89,.94),leather=T(.70,.68,.64),skin=T(.98,.89,.82),hair=T(.66,.60,.55);
 // loose hoodie, tapered torso from hips to shoulders; faceted organic loft, with alternating fabric shades
 function coat(){const rings=[[.68,.42,.28],[.81,.44,.30],[1.14,.39,.27],[1.42,.44,.28],[1.63,.46,.30],[1.76,.30,.25]];for(let i=0;i<rings.length-1;i++){
 let [y,rx,rz]=rings[i],[yy,rr,rrz]=rings[i+1];for(let j=0;j<12;j++){let a=j*Math.PI/6,b=(j+1)*Math.PI/6;const p=(ang,h,r,s)=>V(Math.cos(ang)*r+(Math.sin(ang*4)*.014),h+bob,Math.sin(ang)*s);
 quad(p(a,y,rx,rz),p(b,y,rx,rz),p(b,yy,rr,rrz),p(a,yy,rr,rrz),i%2?jacket:dark,9,[[j/12,i/5],[(j+1)/12,i/5],[(j+1)/12,(i+1)/5],[j/12,(i+1)/5]]);
 }} }
 coat();
 // hood over the back of the neck, folded fabric behind scalp
 ball(0,1.71+bob,.19,.34,.29,.21,9,dark,5,9);band(0,1.53+bob,.13,.36,.25,.07,9,jacket);
 // face and head, cheek and nose, ears, beard, hairline, topknot
 cyl(0,1.67+bob,0,.22,.115,.12,11,skin,8);
 ball(0,1.91+bob,-.015,.23,.27,.21,11,skin,7,11);
 ball(0,1.79+bob,-.19,.14,.085,.11,14,hair,4,8);
 ball(0,2.09+bob,.025,.245,.135,.23,14,hair,5,11);
 ball(0,2.16+bob,.045,.15,.11,.14,14,hair,4,7);
 ball(0,2.28+bob,.11,.11,.115,.11,14,hair,4,8);
 ball(-.235,1.95+bob,0,.047,.095,.065,11,skin,4,7);ball(.235,1.95+bob,0,.047,.095,.065,11,skin,4,7);
 // hood drawstrings / seam lines
 rod(V(-.1,1.58+bob,-.28),V(-.11,1.19+bob,-.29),.010,12,T(.61,.63,.66));rod(V(.1,1.58+bob,-.28),V(.1,1.16+bob,-.28),.010,12,T(.61,.63,.66));
 // pant legs follow stepped hips, knees and ankles with loose tapered silhouette and subtle folded cloth.
 for(let side of [-1,1]){
 const lift=run?Math.max(0,wave*side)*.23:0,step=run?wave*side*.32:0;
 const hip=V(side*.24,.79+bob,.02),knee=V(side*.25,.42+bob,step*.42),ankle=V(side*.25,.12+bob+lift,step);
 rod(hip,knee,.227,10,pants,9);rod(knee,ankle,.202,10,side===-1?dark:pants,9);
 ball(ankle[0],ankle[1]-.04,ankle[2]-.14,.22,.13,.37,12,leather,4,9);
 // garment crease
 rod(V(side*.38,.58+bob,step*.20),V(side*.36,.26+bob+lift*.3,step*.65),.012,10,T(.75,.77,.83),4);
 }
 // articulated arms opposing stride
 for(let side of [-1,1]){
 const shoulder=V(side*.42,1.63+bob,-.005),elbow=V(side*.55,1.17+bob,side*sway*.25+.01),hand=V(side*.52,.84+bob,side*sway*.50-.10);
 rod(shoulder,elbow,.205,9,jacket,9);rod(elbow,hand,.165,9,jacket,9);ball(hand[0],hand[1],hand[2],.125,.135,.115,11,skin,4,7);
 }
 // shoes have sculpted sole instead of rectangular blocks
 // angular pocket line on back of coat
 rod(V(-.26,.92+bob,.294),V(.26,.92+bob,.294),.015,9,T(.66,.69,.72),4);
 // transform local articulated model into the world each frame
 target=old;const ca=Math.cos(actorPos.yaw),sa=Math.sin(actorPos.yaw);
 for(let i=0;i<local.length;i+=STRIDE){let x=local[i],z=local[i+2],nx=local[i+3],nz=local[i+5];dynamicData.push(actorPos.x+x*ca+z*sa,local[i+1],actorPos.z-x*sa+z*ca,nx*ca+nz*sa,local[i+4],-nx*sa+nz*ca,...local.slice(i+6,i+12));}
}
function updateDynamic(){dynamicData.length=0;let old=target;target=dynamicData;actor();
 if(!hasKey){let y=.70+.16*Math.sin(time*2.5);cyl(-5.75,y,-5.0,.08,.19,.19,13,T(1.,.85,.59),8);cuboid(-5.41,y,-5,.68,.11,.13,13,T(1.,.8,.53));cuboid(-5.24,y-.17,-5,.12,.23,.13,13);}
 gate();target=old;gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dynamicData),gl.DYNAMIC_DRAW);
}
function show(text,seconds=2.8){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+seconds*1000;}
function action(){if(won)return;const kd=Math.hypot(actorPos.x+5.75,actorPos.z+5),gd=Math.hypot(actorPos.x-31,actorPos.z+4.3);
 if(!hasKey&&kd<3.6){hasKey=true;$('chapter').textContent='02 / IL VARCO';$('objective').textContent='Raggiungi il cancello a est';show('HAI RACCOLTO LA CHIAVE');return;}
 if(gd<4.8){if(!hasKey){show('IL CANCELLO È CHIUSO');return;}exitOpen=true;won=true;$('chapter').textContent='PROTOTIPO COMPLETATO';$('objective').textContent='Piazza del Gesù / Night Walk';show('CANCELLO APERTO — FINE TEST',8);return;}
 show('NESSUNA INTERAZIONE VICINA',1.4);
}
function update(dt){const f=(keys.w||keys.ArrowUp?1:0)-(keys.s||keys.ArrowDown?1:0)-stick.y,r=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0)+stick.x;let mag=Math.hypot(f,r);run=mag>.12;let speed=Math.min(1,mag)*(sprint||keys.Shift?5.3:2.8)*dt;if(run){const forward=f/mag,side=r/mag,dx=(Math.cos(cam.yaw)*side-Math.sin(cam.yaw)*forward)*speed,dz=(-Math.sin(cam.yaw)*side-Math.cos(cam.yaw)*forward)*speed;
 const yaw=Math.atan2(-dx,-dz),diff=Math.atan2(Math.sin(yaw-actorPos.yaw),Math.cos(yaw-actorPos.yaw));actorPos.yaw+=diff*Math.min(1,dt*7.2);
 if(!blocked(actorPos.x+dx,actorPos.z))actorPos.x+=dx;if(!blocked(actorPos.x,actorPos.z+dz))actorPos.z+=dz;}
 const kd=Math.hypot(actorPos.x+5.75,actorPos.z+5),gd=Math.hypot(actorPos.x-31,actorPos.z+4.3);
 if(!hasKey&&kd<3.6)$('hint').textContent='AZIONE · RACCOGLI CHIAVE';else if(gd<4.8)$('hint').textContent='AZIONE · CANCELLO';else $('hint').textContent='TRASCINA A DESTRA PER GUARDARE';}
let w=500,h=300;function resize(){const bounds=$('game').getBoundingClientRect(),ratio=bounds.width/Math.max(1,bounds.height);if(ratio>1.02){h=300;w=Math.min(800,Math.max(320,Math.round(ratio*h)));}else{w=340;h=Math.min(740,Math.max(390,Math.round(w/ratio)));}const cnv=$('screen');cnv.width=w;cnv.height=h;gl.viewport(0,0,w,h);}window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('game'));resize();
function tick(now){requestAnimationFrame(tick);if(!last)last=now;const dt=Math.min(.045,(now-last)/1000);last=now;if(!playing)return;time+=dt;update(dt);if(now>toastUntil)$('toast').classList.remove('show');updateDynamic();const eye=V(actorPos.x+Math.sin(cam.yaw)*3.55+Math.cos(cam.yaw)*1.0,2.36+Math.sin(cam.pitch)*1.48,actorPos.z+Math.cos(cam.yaw)*3.55-Math.sin(cam.yaw)*1.0),at=V(actorPos.x-Math.sin(cam.yaw)*4.4,1.40+Math.sin(cam.pitch)*2.1,actorPos.z-Math.cos(cam.yaw)*4.4);
 gl.uniformMatrix4fv(locVP,false,matmul(perspective(w>h?1.04:1.18,w/h,.12,165),lookAt(eye,at)));gl.uniform3fv(locEye,new Float32Array(eye));gl.uniform1f(locClock,time);
 gl.clearColor(.055,.069,.103,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);draw(staticBuffer,staticCount);draw(dynamicBuffer,dynamicData.length/STRIDE);
}
requestAnimationFrame(tick);
const ctl=$('stick'),nub=$('nub');function stickMove(e){const rect=ctl.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,r=rect.width*.35;let dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy);if(l>r){dx*=r/l;dy*=r/l;}stick={x:dx/r,y:dy/r};nub.style.transform=`translate(${dx}px,${dy}px)`;}
ctl.addEventListener('pointerdown',e=>{e.preventDefault();ctl.setPointerCapture(e.pointerId);pointerStick=e.pointerId;stickMove(e)});ctl.addEventListener('pointermove',e=>{if(pointerStick===e.pointerId)stickMove(e)});function stopStick(e){if(pointerStick!==e.pointerId)return;pointerStick=null;stick={x:0,y:0};nub.style.transform='translate(0,0)';}ctl.addEventListener('pointerup',stopStick);ctl.addEventListener('pointercancel',stopStick);
const look=$('look');look.addEventListener('pointerdown',e=>{e.preventDefault();pointerLook=e.pointerId;look.setPointerCapture(e.pointerId);lookX=e.clientX;lookY=e.clientY;});look.addEventListener('pointermove',e=>{if(pointerLook!==e.pointerId)return;cam.yaw-=Math.max(-70,Math.min(70,e.clientX-lookX))*.0052;cam.pitch=Math.max(-.36,Math.min(.45,cam.pitch+(e.clientY-lookY)*.0022));lookX=e.clientX;lookY=e.clientY;});function stopLook(e){if(pointerLook===e.pointerId)pointerLook=null;}look.addEventListener('pointerup',stopLook);look.addEventListener('pointercancel',stopLook);
$('action').addEventListener('pointerdown',e=>{e.preventDefault();action()});$('run').addEventListener('pointerdown',e=>{e.preventDefault();sprint=true});['pointerup','pointercancel','pointerleave'].forEach(v=>$('run').addEventListener(v,()=>sprint=false));
window.addEventListener('keydown',e=>{let k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))e.preventDefault();if((k==='e'||k===' ')&&!e.repeat)action();});window.addEventListener('keyup',e=>keys[e.key.length===1?e.key.toLowerCase():e.key]=false);
let mouse=false,mx=0,my=0;$('screen').addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;mouse=true;mx=e.clientX;my=e.clientY;$('screen').setPointerCapture(e.pointerId)});$('screen').addEventListener('pointermove',e=>{if(!mouse)return;cam.yaw-=(e.clientX-mx)*.0052;cam.pitch=Math.max(-.36,Math.min(.45,cam.pitch+(e.clientY-my)*.002));mx=e.clientX;my=e.clientY});$('screen').addEventListener('pointerup',()=>mouse=false);
window.addEventListener('blur',()=>{keys={};sprint=false;stick={x:0,y:0};});
const audio=$('bgm');audio.volume=.42;let audioReady=false,blobUrl='',musicLoading=false;
function playAudio(){if(audioReady)audio.play().then(()=>$('music').textContent='Ⅱ MUSICA').catch(()=>show('TOCCA ♫ AUDIO PER RIPRODURRE'));else show('AUDIO IN CARICAMENTO');}
async function loadAudio(){if(musicLoading)return;musicLoading=true;try{const chunks=await Promise.all(Array.from({length:6},(_,i)=>fetch('../music/p'+i+'.bin?v=20261105').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.arrayBuffer();})));const blob=new Blob(chunks,{type:'audio/ogg'});if(blob.size!==1523969)throw Error('File audio incompleto');blobUrl=URL.createObjectURL(blob);audio.src=blobUrl;audio.load();audioReady=true;$('music').textContent='♫ MUSICA';}catch(e){$('music').textContent='MP3';}}
const readyAudio=loadAudio();$('start').addEventListener('click',()=>{$('startOverlay').style.display='none';playing=true;last=performance.now();if(audioReady)playAudio();else readyAudio.then(()=>{if(playing&&audioReady)playAudio();});});$('music').addEventListener('click',()=>{if(audio.paused)playAudio();else{audio.pause();$('music').textContent='♫ MUSICA'}});$('fileButton').addEventListener('click',()=>$('trackFile').click());$('trackFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(f);audio.src=blobUrl;audioReady=true;playAudio()});$('reset').addEventListener('click',()=>{actorPos.x=-10;actorPos.z=13;actorPos.yaw=0;cam.yaw=0;cam.pitch=.05;show('POSIZIONE RIPRISTINATA')});$('full').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else $('game').requestFullscreen?.().catch(()=>{})});window.addEventListener('pagehide',()=>{audio.pause();if(blobUrl)URL.revokeObjectURL(blobUrl)});
})();
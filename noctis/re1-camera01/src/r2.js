/* ===== Calibrazione prospettica e geometria in coordinate immagine ===== */
const IW=982,IH=941;
const CAL={f:900,cx:395,cy:418,ch:3.26};   // pinhole a pitch 0: orizzonte a riga cy, camera ad altezza ch (m), asse ottico a colonna cx
const img2g=(u,v)=>{const k=CAL.ch/(v-CAL.cy);return [(u-CAL.cx)*k,-CAL.f*k]};   // -> [X,Z] a terra (Z negativo = verso il fondo)
const g2img=(X,Z)=>{const zd=-Z,k=CAL.f/zd;return [CAL.cx+X*k,CAL.cy+CAL.ch*k]};
const ppm=v=>(v-CAL.cy)/CAL.ch;                                 // pixel per metro all'altezza v
const WALK_IMG=[[15,930],[845,930],[640,700],[612,600],[603,514],[15,514]];
const BOLL=[[30,552],[113,549],[195,550],[277,552],[356,556],[466,560],[584,566]];
const GUG_BASE=[[100,528],[215,524],[222,500],[115,495]];
const GUG_MASK=[[100,527],[105,506],[125,498],[125,440],[131,396],[136,380],[129,368],[126,354],[127,340],[123,326],[126,312],[136,298],[136,284],[136,270],[137,256],[138,242],[140,228],[142,214],[141,200],[141,186],[141,172],[143,158],[145,144],[146,130],[147,116],[146,102],[146,88],[147,74],[151,60],[151,46],[152,32],[151,18],[163,18],[165,32],[164,46],[165,60],[167,74],[167,88],[169,102],[168,116],[168,130],[169,144],[171,158],[173,172],[174,186],[173,200],[173,214],[173,228],[175,242],[177,256],[178,270],[178,284],[180,298],[183,312],[189,326],[190,340],[189,354],[185,368],[180,380],[185,392],[195,440],[195,498],[212,508],[216,526]];
const WALKG=WALK_IMG.map(p=>img2g(...p));
const GUG=GUG_BASE.map(p=>img2g(...p));
const BCIRC=BOLL.map(p=>{const g=img2g(...p);return{x:g[0],z:g[1],r:.34}});
function bollardPoly(bx,by){const s=ppm(by),hw=.26*s,h=.95*s;return[[bx-hw,by],[bx-hw*.92,by-h*.8],[bx-hw*.6,by-h],[bx+hw*.6,by-h],[bx+hw*.92,by-h*.8],[bx+hw,by]]}
const MASKS=[{poly:GUG_MASK,base:524},...BOLL.map(b=>({poly:bollardPoly(b[0],b[1]),base:b[1]}))];
const SPOTS=[{id:'portal',img:[365,508],r:3.6},{id:'guglia',img:[160,545],r:3.6},{id:'lampione',img:[535,520],r:3.6}].map(s=>{const g=img2g(...s.img);return{id:s.id,x:g[0],z:g[1],r:s.r}});
function inPoly(x,z,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function pushPoly(p,r,P){let best=null,bd=1e9;
  for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[j],b=P[i],dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz||1;let t=((p.x-a[0])*dx+(p.z-a[1])*dz)/L;t=Math.max(0,Math.min(1,t));const qx=a[0]+dx*t,qz=a[1]+dz*t,d=Math.hypot(p.x-qx,p.z-qz);if(d<bd){bd=d;best=[qx,qz]}}
  const inside=inPoly(p.x,p.z,P);if(!inside&&bd>=r)return false;
  const nx=inside?best[0]-p.x:p.x-best[0],nz=inside?best[1]-p.z:p.z-best[1],nl=Math.hypot(nx,nz)||1;
  const need=inside?bd+r:r-bd;p.x+=nx/nl*need;p.z+=nz/nl*need;return true}

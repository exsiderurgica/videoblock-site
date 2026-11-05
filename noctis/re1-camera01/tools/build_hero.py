# Costruisce il protagonista dalle 4 foto: sagome -> sezioni superellittiche per parti, texture proiettata dalle foto, scheletro e pesi, export GLB
import cv2, numpy as np, json, struct
from scipy import ndimage as nd
from scipy.ndimage import gaussian_filter1d, median_filter
A='/mnt/user-data/attachments/bac2c691-12eb-5dc8-bb82-8dfe13d54163/'
V={ # half-res mask, full-res photo, floor row, scalp row, center col (hips), scale px/m (half-res)
 'F':dict(img='462eef39',floor=1262,scalp=216,c=472),
 'B':dict(img='917216ae',floor=1285,scalp=213,c=429),
 'L':dict(img='44dc0551',floor=1280,scalp=316,c=515)}
H=1.80
for k,v in V.items():
    v['s']=(v['floor']-v['scalp'])/H
    v['m']=cv2.imread(f'm2_{k}.png',0)>0
    v['full']=cv2.cvtColor(cv2.imread(A+v['img']+'-image.jpg'),cv2.COLOR_BGR2RGB).astype(np.float32)
    # nearest-inside lookup (half-res)
    d,ind=nd.distance_transform_edt(~v['m'],return_indices=True)
    v['near']=ind
def row(k,Y):
    v=V[k];r=int(round(v['floor']-Y*v['s']))
    if r<0 or r>=v['m'].shape[0]: return []
    xs=np.where(v['m'][r])[0]
    if len(xs)==0: return []
    runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1)
    return [(a[0],a[-1]) for a in runs]
def toX(k,u): v=V[k];return (u-v['c'])/v['s']*(1 if k!='B' else -1)
def toZ(u): v=V['L'];return (v['c']-u)/v['s']
# ---------- estrazione profili per parte ----------
dy=0.01
def prof(Y0,Y1,fx,fz):
    Ys=np.arange(Y0,Y1+1e-6,dy);P=[]
    for Y in Ys:
        a=fx(Y);b=fz(Y);P.append((a[0],a[1],b[0],b[1]) if a and b else (np.nan,)*4)
    P=np.array(P,float)
    for i in range(4):
        col=P[:,i];ok=~np.isnan(col)
        col[~ok]=np.interp(np.where(~ok)[0],np.where(ok)[0],col[ok]) if ok.any() else 0
        col=median_filter(col,7,mode='nearest');P[:,i]=gaussian_filter1d(col,2.0,mode='nearest')
    return Ys,P
uR,uLft=359,588     # confine braccio/busto nella foto frontale (colonne half-res)
def clip(iv,lo,hi):
    out=[(max(a,lo),min(b,hi)) for a,b in iv if b>=lo and a<=hi];return out
def span(iv):
    return (min(a for a,b in iv),max(b for a,b in iv)) if iv else None
def Fx(Y,lo,hi):
    s=span(clip(row('F',Y),lo,hi));return (toX('F',s[0]),toX('F',s[1])) if s else None
def Lz(Y,lo=0,hi=2000):
    s=span(clip(row('L',Y),lo,hi));return (toZ(s[1]),toZ(s[0])) if s else None
Yhem,Ycrotch,Yarm0,Ywrist,Ytip,Yhead0,Ytop=0.145,0.546,1.415,0.915,0.79,1.565,1.80
parts={}
# testa (dal mento in su; nel profilo escludi la parte di cappuccio dietro sotto 1.6)
parts['head']=prof(Yhead0,Ytop-0.004,lambda Y:Fx(Y,380,600),lambda Y:Lz(Y))
# busto: dal cavallo al collo
def torsoX(Y):
    lo,hi=(330,625)
    if Y<1.44: lo,hi=uR,uLft
    return Fx(Y,lo,hi)
parts['torso']=prof(Ycrotch-0.02,1.62,torsoX,lambda Y:Lz(Y))
# braccia: x dalla foto frontale, profondita' = larghezza, centro z interpolato spalla->mano
zSh,zHand=-0.02,0.07
def armZ(Y,w): zc=zSh+(zHand-zSh)*np.clip((Yarm0-Y)/(Yarm0-0.86),0,1);return (zc-w/2,zc+w/2)
def armProf(lo,hi):
    Ys=np.arange(Ytip,Yarm0+1e-6,dy);P=[]
    for Y in Ys:
        a=Fx(Y,lo,hi)
        if a and a[1]-a[0]<0.03: a=None
        P.append((a[0],a[1]) if a else (np.nan,np.nan))
    P=np.array(P,float)
    for i in range(2):
        col=P[:,i];ok=~np.isnan(col);col[~ok]=np.interp(np.where(~ok)[0],np.where(ok)[0],col[ok]);P[:,i]=gaussian_filter1d(median_filter(col,7,mode='nearest'),2,mode='nearest')
    w=P[:,1]-P[:,0];w=np.maximum(w,0.05)
    # sopra il gomito la manica nella foto si fonde col busto: limita la larghezza
    Z=np.array([armZ(Y,min(ww,0.13)) for Y,ww in zip(Ys,w)])
    P=np.column_stack([P,Z])
    tp=np.clip((Ys-(Yarm0-0.07))/0.07,0,1);f=1-0.45*tp**1.5    # spalla arrotondata
    for a,b in ((0,1),(2,3)):
        c=(P[:,a]+P[:,b])/2;h=(P[:,b]-P[:,a])/2*f;P[:,a]=c-h;P[:,b]=c+h
    return Ys,P
parts['arm_r']=armProf(250,uR+4)    # braccio destro della persona = sinistra immagine (X<0)
parts['arm_l']=armProf(uLft-4,720)
# gambe
def legProf(side):
    def fx(Y):
        iv=clip(row('F',Y),330,625)
        if side<0: iv=clip(iv,0,V['F']['c']-6)
        else: iv=clip(iv,V['F']['c']+6,2000)
        s=span(iv);return (toX('F',s[0]),toX('F',s[1])) if s else None
    Ys,P=prof(0.07,Ycrotch+0.05,fx,lambda Y:Lz(Y))
    # sotto l'orlo: prolunga con l'ultima sezione valida
    w=P[:,1]-P[:,0];d=P[:,3]-P[:,2];dc=(P[:,3]+P[:,2])/2
    d=np.minimum(d,w*1.2);P[:,2]=dc-d/2;P[:,3]=dc+d/2
    hi=np.searchsorted(Ys,Yhem+0.01)
    P[:hi]=P[hi]
    # prolunga il tubo della gamba dentro al busto fino all'anca, così ruotando non si stacca
    top=np.searchsorted(Ys,Ycrotch+0.02)
    Ys2=np.arange(Ys[top]+dy,0.80+1e-6,dy);ext=np.repeat(P[top:top+1],len(Ys2),0)
    f=np.linspace(0.85,0.45,len(Ys2))           # si assottiglia verso l'anca, resta dentro il busto
    cx=(ext[:,0]+ext[:,1])/2;cx=cx+(side*0.09-cx)*(1-f);w=(ext[:,1]-ext[:,0])*f;ext[:,0]=cx-w/2;ext[:,1]=cx+w/2
    cz=(ext[:,2]+ext[:,3])/2;d=(ext[:,3]-ext[:,2])*f;ext[:,2]=cz-d/2;ext[:,3]=cz+d/2
    return np.concatenate([Ys[:top+1],Ys2]),np.concatenate([P[:top+1],ext])
parts['leg_r']=legProf(-1);parts['leg_l']=legProf(1)
# ---------- mesh ----------
SEG={'head':48,'torso':56,'arm_r':20,'arm_l':20,'leg_r':28,'leg_l':28}
NEXP={'head':2.15,'torso':2.6,'arm_r':2.2,'arm_l':2.2,'leg_r':2.3,'leg_l':2.3}
TEX=2048
ATL={'torso':(0,0,1024,1024),'head':(1024,0,512,512),'leg_r':(1024,512,384,1024),'leg_l':(1408,512,384,1024),'arm_r':(1792,0,256,768),'arm_l':(1792,768,256,768),'shoe':(1536,0,256,256)}
def sect(P,theta,n):
    x0,x1,z0,z1=P;cx,cz,a,b=(x0+x1)/2,(z0+z1)/2,np.maximum((x1-x0)/2,0.004),np.maximum((z1-z0)/2,0.004)
    c,s=np.cos(theta),np.sin(theta)
    x=cx+a*np.sign(c)*np.abs(c)**(2/n);z=cz+b*np.sign(s)*np.abs(s)**(2/n)
    # normale (gradiente)
    gx=np.sign(x-cx)*np.abs((x-cx)/a)**(n-1)/a;gz=np.sign(z-cz)*np.abs((z-cz)/b)**(n-1)/b
    l=np.sqrt(gx*gx+gz*gz)+1e-9
    return x,z,gx/l,gz/l
pos=[];nor=[];uv=[];idx=[];part_of=[]
def add_tube(name):
    Ys,P=parts[name];N=SEG[name];n=NEXP[name];R=len(Ys);ox,oy,tw,th=ATL[name]
    base=len(pos)
    th_=np.linspace(0,2*np.pi,N+1)
    for j in range(R):
        x,z,nx,nz=sect(P[j],th_,n)
        for k in range(N+1):
            pos.append((x[k],Ys[j],z[k]));nor.append((nx[k],0,nz[k]))
            uv.append(((ox+k/N*tw)/TEX,(oy+(1-j/(R-1))*th)/TEX));part_of.append(name)
    for j in range(R-1):
        for k in range(N):
            a=base+j*(N+1)+k;b=a+1;c=a+(N+1);d=c+1
            idx.extend([a,c,b,b,c,d])
    # tappi
    for j,sgn in ((0,-1),(R-1,1)):
        x0,x1,z0,z1=P[j];ci=len(pos);pos.append(((x0+x1)/2,Ys[j]+sgn*0.004,(z0+z1)/2));nor.append((0,sgn,0))
        uv.append(((ox+tw/2)/TEX,(oy+(1-j/(R-1))*th)/TEX));part_of.append(name)
        for k in range(N):
            a=base+j*(N+1)+k;b=a+1
            idx.extend([ci,b,a] if sgn>0 else [ci,a,b])
    return base
for p in parts: add_tube(p)
# ---------- texture ----------
_hf=V['F']['full'][2*725:2*795,2*300:2*352].reshape(-1,3);_sk=_hf[(_hf[:,0]>110)&(_hf[:,0]>_hf[:,1]+12)&(_hf[:,1]>_hf[:,2])]
SKIN=np.median(_sk,0) if len(_sk)>50 else np.array([190,140,120],np.float32);print('skin',SKIN,len(_sk))
atlas=np.zeros((TEX,TEX,3),np.float32)+np.array([60,20,25],np.float32)
def sample(k,Xh,Yh,Zh,useZ):
    v=V[k];u=v['c']+(Zh*-v['s'] if useZ else Xh*v['s']*(1 if k!='B' else -1));r=v['floor']-Yh*v['s']
    ui=np.clip(np.round(u).astype(int),0,v['m'].shape[1]-1);ri=np.clip(np.round(r).astype(int),0,v['m'].shape[0]-1)
    ny,nx=v['near'][0][ri,ui],v['near'][1][ri,ui]
    inside=v['m'][ri,ui]
    fu=np.where(inside,u,nx)*2;fr=np.where(inside,r,ny)*2
    img=v['full'];fu=np.clip(fu,0,img.shape[1]-1).astype(np.float32);fr=np.clip(fr,0,img.shape[0]-1).astype(np.float32)
    n=fu.size;w=1024;h=(n+w-1)//w;pu=np.zeros(w*h,np.float32);pr=np.zeros(w*h,np.float32);pu[:n]=fu.ravel();pr[:n]=fr.ravel()
    return cv2.remap(img,pu.reshape(h,w),pr.reshape(h,w),cv2.INTER_LINEAR).reshape(-1,3)[:n]
for name,(Ys,P) in parts.items():
    ox,oy,tw,th=ATL[name];n=NEXP[name]
    iu,iv=np.meshgrid(np.arange(tw),np.arange(th))
    tu=(iu+0.5)/tw;tvv=1-(iv+0.5)/th
    Y=Ys[0]+tvv*(Ys[-1]-Ys[0])
    Pi=np.stack([np.interp(Y.ravel(),Ys,P[:,c]) for c in range(4)],1)
    th_=tu.ravel()*2*np.pi
    x,z,nx,nz=[],[],[],[]
    X,Z,NX,NZ=sect(Pi.T,th_,n)
    p=3;Yr=Y.ravel().copy()
    if name.startswith('leg'): Yr=np.clip(Yr,Yhem+0.02,Ycrotch+0.01)
    wF=np.maximum(NZ,0)**p;wB=np.maximum(-NZ,0)**p;wL=np.abs(NX)**p
    if name=='torso':   # i fianchi nel profilo sono coperti dal braccio: solo fronte/retro
        wF=np.maximum(NZ+0.2,0)**2;wB=np.maximum(-NZ+0.2,0)**2;wL=wL*0
    if name.startswith('arm'):
        hand=Yr<Ywrist+0.01
        wB=np.where(hand,0,wB);wL=np.where(hand,wL*0.15,wL);wF=np.where(hand,np.maximum(NZ+0.6,0.05),wF)
    cF=sample('F',X,Yr,Z,False);cB=sample('B',X,Yr,Z,False);cL=sample('L',X,Yr,Z,True)
    col=(cF*wF[:,None]+cB*wB[:,None]+cL*wL[:,None])/(wF+wB+wL+1e-6)[:,None]
    if name.startswith('arm'):   # braccia: solo dalla foto frontale, al centro della manica (niente sfondo tra braccio e busto)
        cx=(Pi[:,0]+Pi[:,1])/2;Xs=cx+(X-cx)*0.7
        col=sample('F',Xs,Yr,Z,False)*(0.86+0.14*np.maximum(NZ,0))[:,None]
        c3=col.reshape(th,tw,3);lum=c3.mean(2)
        for r_ in range(th):
            bad=lum[r_]<55
            if bad.any() and (~bad).sum()>4: c3[r_,bad]=np.median(c3[r_,~bad],0)
        hand=(Yr<Ywrist-0.005).reshape(th,tw)
        skin=SKIN*(0.8+0.2*np.clip((Yr.reshape(th,tw)-Ytip)/(Ywrist-Ytip),0,1))[...,None]
        sh=(0.85+0.15*np.maximum(NZ,0)).reshape(th,tw)[...,None]
        c3[hand]=(skin*sh)[hand];col=c3.reshape(-1,3)
    atlas[oy:oy+th,ox:ox+tw]=col.reshape(th,tw,3)
# scarpe: colore dalla foto
ox,oy,tw,th=ATL['shoe'];g=np.linspace(0,1,th)[:,None,None]
upper=np.array([82,70,60],np.float32);sole=np.array([38,34,31],np.float32)
atlas[oy:oy+th,ox:ox+tw]=np.where(g>0.78,sole,upper*(0.92+0.08*np.random.rand(th,tw,1)))
cv2.imwrite('atlas.jpg',cv2.cvtColor(np.clip(atlas,0,255).astype(np.uint8),cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,86])
# ---------- scheletro ----------
def cen(name,Y):
    Ys,P=parts[name];return np.array([np.interp(Y,Ys,(P[:,0]+P[:,1])/2),Y,np.interp(Y,Ys,(P[:,2]+P[:,3])/2)])
J={}
J['Root']=np.array([0,0,0.])
J['pelvis']=cen('torso',0.95)*[0,1,1]
for nm,Y in (('spine_01',1.05),('spine_02',1.18),('spine_03',1.32),('neck_01',1.50)): J[nm]=cen('torso',Y)*[0,1,1]
J['head']=cen('head',1.60)*[0,1,1]
for s,arm in ((1,'arm_l'),(-1,'arm_r')):
    t='l' if s>0 else 'r'
    J['clavicle_'+t]=np.array([s*0.05,1.42,J['spine_03'][2]])
    J['upperarm_'+t]=cen(arm,1.395);J['lowerarm_'+t]=cen(arm,1.14);J['hand_'+t]=cen(arm,Ywrist)
    leg='leg_l' if s>0 else 'leg_r'
    c=cen(leg,0.60);J['thigh_'+t]=np.array([c[0]*0.85,0.90,J['pelvis'][2]])
    J['calf_'+t]=cen(leg,0.50);a=cen(leg,0.16);J['foot_'+t]=np.array([a[0],0.085,a[2]]);J['ball_'+t]=np.array([a[0],0.03,a[2]+0.13])
PARENT={'Root':None,'pelvis':'Root','spine_01':'pelvis','spine_02':'spine_01','spine_03':'spine_02','neck_01':'spine_03','head':'neck_01'}
for t in 'lr':
    PARENT.update({'clavicle_'+t:'spine_03','upperarm_'+t:'clavicle_'+t,'lowerarm_'+t:'upperarm_'+t,'hand_'+t:'lowerarm_'+t,
                   'thigh_'+t:'pelvis','calf_'+t:'thigh_'+t,'foot_'+t:'calf_'+t,'ball_'+t:'foot_'+t})
BONES=list(PARENT.keys());BI={b:i for i,b in enumerate(BONES)}
# ---------- scarpe (rigide sul piede) ----------
def add_shoe(t):
    a=J['foot_'+t];ox,oy,tw,th=ATL['shoe'];N=24
    zs=np.linspace(-0.065,0.195,22);base=len(pos)
    for j,zz in enumerate(zs):
        f=(zz+0.065)/0.26
        w=0.088+0.016*np.sin(np.pi*min(1,f*1.3));h=0.10*(1-f)+0.05*f
        endk=min(1,min(f,1-f)/0.08)  # arrotonda punta e tallone
        w*=0.55+0.45*endk**0.5;h*=0.75+0.25*endk**0.5
        for k in range(N+1):
            tht=k/N*2*np.pi;c,s=np.cos(tht),np.sin(tht)
            x=a[0]+w/2*np.sign(c)*abs(c)**(2/3.2);y=h/2+h/2*np.sign(s)*abs(s)**(2/3.2)
            pos.append((x,max(y,0.0),a[2]+zz));nor.append((np.sign(c)*abs(c),np.sign(s)*abs(s),0));uv.append(((ox+k/N*tw)/TEX,(oy+(0.5-0.5*s)*th)/TEX));part_of.append('shoe_'+t)
    R=len(zs)
    for j in range(R-1):
        for k in range(N):
            p0=base+j*(N+1)+k;p1=p0+1;p2=p0+N+1;p3=p2+1;idx.extend([p0,p1,p2,p1,p3,p2])
    for j,sgn in ((0,-1),(R-1,1)):
        ci=len(pos);pos.append((a[0],0.05,a[2]+zs[j]+sgn*0.006));nor.append((0,0,sgn));uv.append(((ox+tw/2)/TEX,(oy+th/2)/TEX));part_of.append('shoe_'+t)
        for k in range(N):
            p0=base+j*(N+1)+k;p1=p0+1;idx.extend([ci,p0,p1] if sgn>0 else [ci,p1,p0])
add_shoe('l');add_shoe('r')
pos=np.array(pos,np.float32);nor=np.array(nor,np.float32);uv=np.array(uv,np.float32);idx=np.array(idx,np.uint32)
# normali smussate dai triangoli (le cuciture condividono posizione)
fn=np.cross(pos[idx[1::3]]-pos[idx[0::3]],pos[idx[2::3]]-pos[idx[0::3]])
acc=np.zeros_like(pos)
for c in range(3): np.add.at(acc,idx[c::3],fn)
key={};
for i,p in enumerate(map(tuple,np.round(pos,5))): key.setdefault(p,[]).append(i)
for g in key.values():
    if len(g)>1: acc[g]=acc[g].sum(0)
nrm=acc/(np.linalg.norm(acc,axis=1,keepdims=True)+1e-9)
# orientamento: se le normali puntano dentro, inverti i triangoli
cnt=np.array([0,1.0,0])
if (np.einsum('ij,ij->i',nrm,pos-pos.mean(0))<0).mean()>0.5:
    idx=idx.reshape(-1,3)[:,[0,2,1]].ravel();nrm=-nrm
# ---------- pesi ----------
def lerpw(Y,pts):
    # pts: lista (Y,bone) ordinata per Y crescente -> pesi lineari tra i due vicini
    if Y<=pts[0][0]: return {pts[0][1]:1}
    for (y0,b0),(y1,b1) in zip(pts,pts[1:]):
        if Y<=y1: t=(Y-y0)/(y1-y0);return {b0:1-t,b1:t}
    return {pts[-1][1]:1}
W=[]
for i,(p,pt) in enumerate(zip(pos,part_of)):
    X,Y,Z=p;w={}
    if pt=='head': w=lerpw(Y,[(1.54,'neck_01'),(1.60,'head')])
    elif pt=='torso':
        w=lerpw(Y,[(0.95,'pelvis'),(1.05,'spine_01'),(1.18,'spine_02'),(1.32,'spine_03'),(1.50,'neck_01')])
        if Y<0.95:
            t=np.clip((0.95-Y)/(0.95-Ycrotch),0,1)*np.clip(abs(X)/0.07,0,1)*0.85
            side='thigh_l' if X>0 else 'thigh_r';w={k:v*(1-t) for k,v in w.items()};w[side]=w.get(side,0)+t
        if Y>1.30 and abs(X)>0.12:
            t=np.clip((abs(X)-0.12)/0.09,0,1)*np.clip((Y-1.30)/0.08,0,1)*0.7;s='l' if X>0 else 'r'
            w={k:v*(1-t) for k,v in w.items()};w['upperarm_'+s]=w.get('upperarm_'+s,0)+t*0.6;w['clavicle_'+s]=w.get('clavicle_'+s,0)+t*0.4
    elif pt.startswith('arm'):
        s=pt[-1]
        w=lerpw(Y,[(Ywrist-0.03,'hand_'+s),(Ywrist+0.03,'lowerarm_'+s),(1.10,'lowerarm_'+s),(1.18,'upperarm_'+s),(1.36,'upperarm_'+s),(1.43,'clavicle_'+s)])
    elif pt.startswith('leg'):
        s=pt[-1]
        w=lerpw(Y,[(0.46,'calf_'+s),(0.55,'thigh_'+s)])
    elif pt.startswith('shoe'): w={'foot_'+pt[-1]:1}
    it=sorted(w.items(),key=lambda kv:-kv[1])[:4];tot=sum(v for _,v in it)
    W.append([(BI[b],v/tot) for b,v in it])
JO=np.zeros((len(pos),4),np.uint8);WE=np.zeros((len(pos),4),np.float32)
for i,ws in enumerate(W):
    for j,(b,v) in enumerate(ws): JO[i,j]=b;WE[i,j]=v
# ---------- GLB ----------
blob=bytearray();views=[];accs=[]
def addview(data,target=None):
    global blob
    while len(blob)%4: blob+=b'\0'
    off=len(blob);blob+=data;v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
    if target: v['target']=target
    views.append(v);return len(views)-1
def addacc(arr,ctype,typ,target=None,minmax=False,norm=False):
    vi=addview(arr.tobytes(),target);a={'bufferView':vi,'componentType':ctype,'count':int(arr.shape[0]),'type':typ}
    if minmax: a['min']=arr.min(0).tolist();a['max']=arr.max(0).tolist()
    if norm: a['normalized']=True
    accs.append(a);return len(accs)-1
aP=addacc(pos,5126,'VEC3',34962,True);aN=addacc(nrm.astype(np.float32),5126,'VEC3',34962);aT=addacc(uv,5126,'VEC2',34962)
aJ=addacc(JO,5121,'VEC4',34962);aW=addacc(WE,5126,'VEC4',34962);aI=addacc(idx,5125,'SCALAR',34963)
# nodi
nodes=[{'name':'Hero','children':[1,2]},{'name':'body','mesh':0,'skin':0}]
nidx={}
for b in BONES: nidx[b]=len(nodes)+BONES.index(b)
for b in BONES:
    par=PARENT[b];t=J[b]-(J[par] if par else 0)
    nodes.append({'name':b,'translation':[float(x) for x in t]})
for b in BONES:
    ch=[nidx[c] for c in BONES if PARENT[c]==b]
    if ch: nodes[nidx[b]]['children']=ch
nodes[0]['children']=[1,nidx['Root']]
ibm=np.zeros((len(BONES),16),np.float32)
for i,b in enumerate(BONES):
    M=np.eye(4,dtype=np.float32);M[:3,3]=-J[b];ibm[i]=M.T.ravel()
aB=addacc(ibm,5126,'MAT4')
img=open('atlas.jpg','rb').read();iv=addview(img)
gl={'asset':{'version':'2.0','generator':'noctis-photo-hero'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,
 'meshes':[{'name':'hero','primitives':[{'attributes':{'POSITION':aP,'NORMAL':aN,'TEXCOORD_0':aT,'JOINTS_0':aJ,'WEIGHTS_0':aW},'indices':aI,'material':0}]}],
 'skins':[{'joints':[nidx[b] for b in BONES],'inverseBindMatrices':aB,'skeleton':nidx['Root']}],
 'materials':[{'name':'photo','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':0.92},'doubleSided':False}],
 'textures':[{'sampler':0,'source':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
 'images':[{'bufferView':iv,'mimeType':'image/jpeg'}],'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':0}]}
while len(blob)%4: blob+=b'\0'
gl['buffers'][0]['byteLength']=len(blob)
js=json.dumps(gl).encode();js+=b' '*((4-len(js)%4)%4)
glb=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(blob),0x004E4942)+bytes(blob)
open('hero2.glb','wb').write(glb)
print('verts',len(pos),'tris',len(idx)//3,'glb',len(glb))
for b in BONES: print(b,np.round(J[b],3))

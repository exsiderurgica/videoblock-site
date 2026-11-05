# Zombie Pulcinella: stessa tecnica del protagonista (tubi per parte, atlante di texture, stesso scheletro)
import numpy as np, cv2, json, struct
dy=0.01
Yhem,Ycrotch,Yarm0,Ywrist,Ytip,Yhead0,Ytop=0.17,0.56,1.40,0.84,0.74,1.50,1.74
def prof(y0,y1,keys):
    """keys: lista (Y, halfX, halfZ, cx, cz) interpolata"""
    Ys=np.arange(y0,y1+1e-6,dy);K=np.array(keys,float)
    hx=np.interp(Ys,K[:,0],K[:,1]);hz=np.interp(Ys,K[:,0],K[:,2])
    cx=np.interp(Ys,K[:,0],K[:,3]);cz=np.interp(Ys,K[:,0],K[:,4])
    return Ys,np.column_stack([cx-hx,cx+hx,cz-hz,cz+hz])
parts={}
# camicione: largo in vita, stretto alle spalle, collare a ruota in cima
parts['torso']=prof(0.54,1.52,[(0.54,.205,.165,0,0),(0.70,.225,.185,0,.005),(0.86,.235,.195,0,.01),
    (1.00,.230,.190,0,.01),(1.14,.215,.175,0,.005),(1.30,.205,.165,0,0),(1.40,.195,.155,0,-.005),
    (1.44,.215,.185,0,-.005),(1.465,.185,.165,0,-.005),(1.48,.105,.095,0,0),(1.52,.085,.080,0,0)])
parts['head']=prof(Yhead0,Ytop,[(1.50,.072,.070,0,0),(1.545,.085,.082,0,.004),(1.59,.104,.104,0,.008),
    (1.65,.105,.106,0,.006),(1.70,.088,.090,0,0),(1.735,.045,.046,0,-.005),(1.74,.03,.03,0,-.005)])
for s,nm in ((1,'arm_l'),(-1,'arm_r')):
    parts[nm]=prof(Ytip,Yarm0,[(0.74,.045,.045,s*.235,.035),(0.80,.050,.050,s*.235,.03),
        (0.845,.082,.080,s*.237,.025),(1.00,.090,.088,s*.240,.015),(1.16,.093,.090,s*.238,.005),
        (1.30,.092,.090,s*.230,0),(1.40,.088,.086,s*.205,-.005)])
for s,nm in ((1,'leg_l'),(-1,'leg_r')):
    parts[nm]=prof(0.075,0.94,[(0.075,.058,.062,s*.105,.012),(0.16,.060,.064,s*.105,.008),
        (0.30,.064,.066,s*.106,.004),(0.44,.070,.072,s*.107,0),(0.47,.118,.118,s*.108,0),
        (0.60,.126,.124,s*.110,0),(0.76,.135,.132,s*.112,0),(0.88,.140,.138,s*.100,0),(0.94,.130,.130,s*.070,0)])
SEG={'head':44,'torso':52,'arm_r':20,'arm_l':20,'leg_r':26,'leg_l':26}
NEXP={'head':2.1,'torso':2.5,'arm_r':2.2,'arm_l':2.2,'leg_r':2.3,'leg_l':2.3}
TEX=1024
ATL={'torso':(0,0,512,512),'head':(512,0,256,256),'leg_r':(512,256,192,512),'leg_l':(704,256,192,512),
     'arm_r':(896,0,128,384),'arm_l':(896,384,128,384),'shoe':(768,0,128,128),'hat':(768,128,128,128),'nose':(768,256,128,128)}
exec(open('_mesh.part').read().split('pos=[]')[0].split('def sect')[1].join(['def sect','']) if False else '')
def sect(P,theta,n):
    x0,x1,z0,z1=P;cx,cz,a,b=(x0+x1)/2,(z0+z1)/2,np.maximum((x1-x0)/2,0.004),np.maximum((z1-z0)/2,0.004)
    c,s=np.cos(theta),np.sin(theta)
    x=cx+a*np.sign(c)*np.abs(c)**(2/n);z=cz+b*np.sign(s)*np.abs(s)**(2/n)
    gx=np.sign(x-cx)*np.abs((x-cx)/a)**(n-1)/a;gz=np.sign(z-cz)*np.abs((z-cz)/b)**(n-1)/b
    l=np.sqrt(gx*gx+gz*gz)+1e-9
    return x,z,gx/l,gz/l
pos=[];nor=[];uv=[];idx=[];part_of=[]
def add_tube(name):
    Ys,P=parts[name];N=SEG[name];n=NEXP[name];R=len(Ys);ox,oy,tw,th=ATL[name]
    base=len(pos);th_=np.linspace(0,2*np.pi,N+1)
    for j in range(R):
        x,z,nx,nz=sect(P[j],th_,n)
        for k in range(N+1):
            pos.append((x[k],Ys[j],z[k]));nor.append((nx[k],0,nz[k]))
            uv.append(((ox+k/N*tw)/TEX,(oy+(1-j/(R-1))*th)/TEX));part_of.append(name)
    for j in range(R-1):
        for k in range(N):
            a=base+j*(N+1)+k;b=a+1;c=a+(N+1);d=c+1;idx.extend([a,c,b,b,c,d])
    for j,sgn in ((0,-1),(R-1,1)):
        x0,x1,z0,z1=P[j];ci=len(pos);pos.append(((x0+x1)/2,Ys[j]+sgn*0.004,(z0+z1)/2));nor.append((0,sgn,0))
        uv.append(((ox+tw/2)/TEX,(oy+(1-j/(R-1))*th)/TEX));part_of.append(name)
        for k in range(N):
            a=base+j*(N+1)+k;b=a+1
            idx.extend([ci,b,a] if sgn>0 else [ci,a,b])
for p in parts: add_tube(p)
# ---------- texture dipinta ----------
rng=np.random.default_rng(11)
atlas=np.zeros((TEX,TEX,3),np.float32)+np.array([18,16,15],np.float32)
def fabric(w,h,base,shade=10,folds=True):
    img=np.zeros((h,w,3),np.float32)+np.array(base,np.float32)
    img+=rng.normal(0,shade*.45,(h,w,1))
    if folds:
        u=np.arange(w)[None,:];v=np.arange(h)[:,None]
        img+=(np.sin(u/w*np.pi*2*9+np.sin(v/h*6)*1.2)*shade*.9)[...,None]
        img+=(np.sin(u/w*np.pi*2*23+1.7)*shade*.35)[...,None]
    g=np.clip(1-(np.arange(h)/h)*.25,0,1)[:,None,None]      # più sporco in basso
    return img*g
def grime(img,n,amt=.45):
    h,w=img.shape[:2]
    for _ in range(n):
        x,y=int(rng.random()*w),int(rng.random()*h);r=int(6+rng.random()*28)
        m=np.zeros((h,w),np.float32);cv2.circle(m,(x,y),r,1.0,-1)
        m=cv2.GaussianBlur(m,(0,0),r*.6)*amt*(0.4+rng.random())
        img*= (1-m[...,None]*0.75)
    return img
def blood(img,n,big=1.0):
    h,w=img.shape[:2]
    for _ in range(n):
        x,y=int(rng.random()*w),int(rng.random()*h)
        R=(6+rng.random()*22)*big
        m=np.zeros((h,w),np.float32)
        cv2.ellipse(m,(x,y),(int(R),int(R*(.5+rng.random()))),rng.random()*180,0,360,1.0,-1)
        for _ in range(int(3+rng.random()*7)):      # schizzi
            a=rng.random()*6.283;d=R*(1.2+rng.random()*2.6)
            cv2.circle(m,(int(x+np.cos(a)*d),int(y+np.sin(a)*d)),int(1+rng.random()*R*.28),1.0,-1)
        for _ in range(int(1+rng.random()*3)):      # colature
            a=rng.random()*0.5-0.25
            cv2.line(m,(x,y),(int(x+np.sin(a)*R*.4),int(y+R*(2+rng.random()*5))),1.0,max(1,int(R*.22)))
        m=cv2.GaussianBlur(m,(0,0),1.3)
        col=np.array([88+rng.random()*55,12+rng.random()*12,10+rng.random()*10],np.float32)
        dark=np.array([38,7,7],np.float32)
        c=col*(0.55+0.45*rng.random())
        img=img*(1-m[...,None])+ (c*0.75+dark*0.25)*m[...,None]
    return img
def put(name,img):
    ox,oy,tw,th=ATL[name];atlas[oy:oy+th,ox:ox+tw]=cv2.resize(img,(tw,th))
# camicione
ox,oy,tw,th=ATL['torso'];T=fabric(tw,th,[196,190,172],12)
T=grime(T,26,.5);T=blood(T,7,1.25)
vv=np.arange(th)[:,None,None]/th
T=T*(1-0.35*np.clip((vv-0.78)/0.22,0,1))                     # orlo sporco di fango
T[int(th*0.025):int(th*0.075)]*=0.78                          # ombra sotto il collare
put('torso',T)
# maniche
for nm in ('arm_l','arm_r'):
    ox,oy,tw,th=ATL[nm];A=fabric(tw,th,[192,186,168],11);A=grime(A,12,.45);A=blood(A,3,.8)
    A[int(th*0.80):]=np.array([126,128,110],np.float32)*(0.75+0.25*rng.random((th-int(th*0.80),tw,1)))  # mani
    put(nm,A)
# gambe: pantaloni bianchi in alto, calze rosse in basso
for nm in ('leg_l','leg_r'):
    ox,oy,tw,th=ATL[nm];L=fabric(tw,th,[190,184,166],11)
    k=int(th*0.54)                                            # sotto il ginocchio
    L[k:]=fabric(tw,th-k,[112,26,24],9)
    L[k-3:k+3]*=0.6
    L=grime(L,16,.5);L=blood(L,4,.9)
    put(nm,L)
# testa: carnagione da morto + maschera nera sul davanti
ox,oy,tw,th=ATL['head'];H=np.zeros((th,tw,3),np.float32)+np.array([128,130,112],np.float32)
H+=rng.normal(0,7,(th,tw,1))
u=np.arange(tw)[None,:]/tw
front=np.clip((1-np.abs(((u-0.25+0.5)%1.0-0.5))/0.21)*2.2,0,1)   # fronte = u 0.25
vv=np.arange(th)[:,None]/th
vfac=np.clip((vv-0.08)/0.10,0,1)*np.clip((0.60-vv)/0.07,0,1)
mask=np.clip(front*vfac,0,1)[...,None]
H=H*(1-mask)+np.array([17,14,13],np.float32)*mask
for ex in (0.195,0.305):                                          # occhi chiari dentro la maschera
    cx=int(ex*tw);cy=int(0.33*th);cv2.ellipse(H,(cx,cy),(int(tw*0.030),int(th*0.020)),0,0,360,(150,146,132),-1)
    cv2.circle(H,(cx,cy),max(1,int(tw*0.011)),(20,18,16),-1)
H=grime(H,10,.35);H=blood(H,3,.7)
put('head',H)
# scarpe e cappello
ox,oy,tw,th=ATL['shoe'];S=np.zeros((th,tw,3),np.float32)+np.array([54,42,34],np.float32)
S[int(th*.72):]=np.array([32,27,24],np.float32);put('shoe',grime(S,6,.4))
ox,oy,tw,th=ATL['nose'];Ns=np.zeros((th,tw,3),np.float32)+np.array([21,17,16],np.float32);Ns+=rng.normal(0,4,(th,tw,1));put('nose',Ns)
ox,oy,tw,th=ATL['hat'];Hc=fabric(tw,th,[186,180,162],10);Hc=grime(Hc,8,.45);Hc=blood(Hc,2,.7);put('hat',Hc)
cv2.imwrite('zatlas.jpg',cv2.cvtColor(np.clip(atlas,0,255).astype(np.uint8),cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,88])
# ---------- scheletro, scarpe, pesi, GLB (stessa pipeline del protagonista) ----------
def cen(name,Y):
    Ys,P=parts[name];return np.array([np.interp(Y,Ys,(P[:,0]+P[:,1])/2),Y,np.interp(Y,Ys,(P[:,2]+P[:,3])/2)])
J={}
J['Root']=np.array([0,0,0.]);J['pelvis']=cen('torso',0.92)*[0,1,1]
for nm,Y in (('spine_01',1.02),('spine_02',1.15),('spine_03',1.30),('neck_01',1.47)): J[nm]=cen('torso',Y)*[0,1,1]
J['head']=cen('head',1.57)*[0,1,1]
for s,t in ((1,'l'),(-1,'r')):
    arm='arm_l' if s>0 else 'arm_r';leg='leg_l' if s>0 else 'leg_r'
    J['clavicle_'+t]=np.array([s*0.05,1.40,J['spine_03'][2]])
    J['upperarm_'+t]=cen(arm,1.385);J['lowerarm_'+t]=cen(arm,1.10);J['hand_'+t]=cen(arm,Ywrist)
    c=cen(leg,0.60);J['thigh_'+t]=np.array([c[0]*0.85,0.88,J['pelvis'][2]])
    J['calf_'+t]=cen(leg,0.47);a=cen(leg,0.16)
    J['foot_'+t]=np.array([a[0],0.085,a[2]]);J['ball_'+t]=np.array([a[0],0.03,a[2]+0.13])
PARENT={'Root':None,'pelvis':'Root','spine_01':'pelvis','spine_02':'spine_01','spine_03':'spine_02','neck_01':'spine_03','head':'neck_01'}
for t in 'lr':
    PARENT.update({'clavicle_'+t:'spine_03','upperarm_'+t:'clavicle_'+t,'lowerarm_'+t:'upperarm_'+t,'hand_'+t:'lowerarm_'+t,
                   'thigh_'+t:'pelvis','calf_'+t:'thigh_'+t,'foot_'+t:'calf_'+t,'ball_'+t:'foot_'+t})
BONES=list(PARENT.keys());BI={b:i for i,b in enumerate(BONES)}
def add_shoe(t):
    a=J['foot_'+t];ox,oy,tw,th=ATL['shoe'];N=20
    zs=np.linspace(-0.062,0.185,18);base=len(pos)
    for j,zz in enumerate(zs):
        f=(zz+0.062)/0.247
        w=0.082+0.015*np.sin(np.pi*min(1,f*1.3));h=0.095*(1-f)+0.05*f
        e=min(1,min(f,1-f)/0.09);w*=0.55+0.45*e**0.5;h*=0.72+0.28*e**0.5
        for k in range(N+1):
            tht=k/N*2*np.pi;c,s=np.cos(tht),np.sin(tht)
            x=a[0]+w/2*np.sign(c)*abs(c)**(2/3.2);y=h/2+h/2*np.sign(s)*abs(s)**(2/3.2)
            pos.append((x,max(y,0.0),a[2]+zz));nor.append((np.sign(c)*abs(c),np.sign(s)*abs(s),0))
            uv.append(((ox+k/N*tw)/TEX,(oy+(0.5-0.5*s)*th)/TEX));part_of.append('shoe_'+t)
    R=len(zs)
    for j in range(R-1):
        for k in range(N):
            p0=base+j*(N+1)+k;idx.extend([p0,p0+1,p0+N+1,p0+1,p0+N+2,p0+N+1])
    for j,sgn in ((0,-1),(R-1,1)):
        ci=len(pos);pos.append((a[0],0.05,a[2]+zs[j]+sgn*0.006));nor.append((0,0,sgn));uv.append(((ox+tw/2)/TEX,(oy+th/2)/TEX));part_of.append('shoe_'+t)
        for k in range(N):
            p0=base+j*(N+1)+k;idx.extend([ci,p0,p0+1] if sgn>0 else [ci,p0+1,p0])
add_shoe('l');add_shoe('r')
def add_hat():
    ox,oy,tw,th=ATL['hat'];N=18;base=len(pos)
    ring=[(1.722,.074,0),(1.750,.084,0),(1.80,.072,-.010),(1.86,.053,-.026),(1.92,.032,-.046),(1.96,.013,-.062),(1.98,.004,-.070)]
    for (y,r,dz) in ring:
        for k in range(N+1):
            t=2*np.pi*k/N;pos.append((np.cos(t)*r,y,np.sin(t)*r+dz));nor.append((np.cos(t),.25,np.sin(t)))
            uv.append(((ox+k/N*tw)/TEX,(oy+(1-(y-1.715)/.3)*th)/TEX));part_of.append('hat')
    for j in range(len(ring)-1):
        for k in range(N):
            p0=base+j*(N+1)+k;idx.extend([p0,p0+N+1,p0+1,p0+1,p0+N+1,p0+N+2])
add_hat()
def add_nose():
    ox,oy,tw,th=ATL['nose'];N=10;base=len(pos)
    ring=[(1.620,.030,.085),(1.606,.034,.112),(1.588,.030,.131),(1.566,.020,.139),(1.552,.009,.130)]
    for (y,r,z) in ring:
        for k in range(N+1):
            t=2*np.pi*k/N;pos.append((np.cos(t)*r,y+np.sin(t)*r*.8,z));nor.append((np.cos(t)*.5,np.sin(t)*.5,.7))
            uv.append(((ox+(0.2+0.6*k/N)*tw)/TEX,(oy+th*0.5)/TEX));part_of.append('nose')
    for j in range(len(ring)-1):
        for k in range(N):
            p0=base+j*(N+1)+k;idx.extend([p0,p0+N+1,p0+1,p0+1,p0+N+1,p0+N+2])
add_nose()
pos=np.array(pos,np.float32);nor=np.array(nor,np.float32);uv=np.array(uv,np.float32);idx=np.array(idx,np.uint32)
fn=np.cross(pos[idx[1::3]]-pos[idx[0::3]],pos[idx[2::3]]-pos[idx[0::3]])
acc=np.zeros_like(pos)
for c in range(3): np.add.at(acc,idx[c::3],fn)
key={}
for i,p in enumerate(map(tuple,np.round(pos,5))): key.setdefault(p,[]).append(i)
for g in key.values():
    if len(g)>1: acc[g]=acc[g].sum(0)
nrm=acc/(np.linalg.norm(acc,axis=1,keepdims=True)+1e-9)
if (np.einsum('ij,ij->i',nrm,pos-pos.mean(0))<0).mean()>0.5:
    idx=idx.reshape(-1,3)[:,[0,2,1]].ravel();nrm=-nrm
def lerpw(Y,pts):
    if Y<=pts[0][0]: return {pts[0][1]:1}
    for (y0,b0),(y1,b1) in zip(pts,pts[1:]):
        if Y<=y1: t=(Y-y0)/(y1-y0);return {b0:1-t,b1:t}
    return {pts[-1][1]:1}
W=[]
for i,(p,pt) in enumerate(zip(pos,part_of)):
    X,Y,Z=p;w={}
    if pt=='head': w=lerpw(Y,[(1.50,'neck_01'),(1.57,'head')])
    elif pt=='hat' or pt=='nose': w={'head':1}
    elif pt=='torso':
        w=lerpw(Y,[(0.92,'pelvis'),(1.02,'spine_01'),(1.15,'spine_02'),(1.30,'spine_03'),(1.47,'neck_01')])
        if Y<0.92:
            t=np.clip((0.92-Y)/(0.92-Ycrotch),0,1)*np.clip(abs(X)/0.07,0,1)*0.8
            side='thigh_l' if X>0 else 'thigh_r';w={k:v*(1-t) for k,v in w.items()};w[side]=w.get(side,0)+t
        if Y>1.28 and abs(X)>0.12:
            t=np.clip((abs(X)-0.12)/0.09,0,1)*np.clip((Y-1.28)/0.08,0,1)*0.7;s='l' if X>0 else 'r'
            w={k:v*(1-t) for k,v in w.items()};w['upperarm_'+s]=w.get('upperarm_'+s,0)+t*0.6;w['clavicle_'+s]=w.get('clavicle_'+s,0)+t*0.4
    elif pt.startswith('arm'):
        s=pt[-1]
        w=lerpw(Y,[(Ywrist-0.03,'hand_'+s),(Ywrist+0.03,'lowerarm_'+s),(1.06,'lowerarm_'+s),(1.14,'upperarm_'+s),(1.33,'upperarm_'+s),(1.40,'clavicle_'+s)])
    elif pt.startswith('leg'):
        s=pt[-1];w=lerpw(Y,[(0.44,'calf_'+s),(0.53,'thigh_'+s)])
    elif pt.startswith('shoe'): w={'foot_'+pt[-1]:1}
    it=sorted(w.items(),key=lambda kv:-kv[1])[:4];tot=sum(v for _,v in it)
    W.append([(BI[b],v/tot) for b,v in it])
JO=np.zeros((len(pos),4),np.uint8);WE=np.zeros((len(pos),4),np.float32)
for i,ws in enumerate(W):
    for j,(b,v) in enumerate(ws): JO[i,j]=b;WE[i,j]=v
blob=bytearray();views=[];accs=[]
def addview(data,target=None):
    while len(blob)%4: blob.append(0)
    off=len(blob);blob.extend(data);v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
    if target: v['target']=target
    views.append(v);return len(views)-1
def addacc(arr,ctype,typ,target=None,mm=False):
    vi=addview(arr.tobytes(),target);a={'bufferView':vi,'componentType':ctype,'count':int(arr.shape[0]),'type':typ}
    if mm: a['min']=arr.min(0).tolist();a['max']=arr.max(0).tolist()
    accs.append(a);return len(accs)-1
aP=addacc(pos,5126,'VEC3',34962,True);aN=addacc(nrm.astype(np.float32),5126,'VEC3',34962);aT=addacc(uv,5126,'VEC2',34962)
aJ=addacc(JO,5121,'VEC4',34962);aW=addacc(WE,5126,'VEC4',34962);aI=addacc(idx,5125,'SCALAR',34963)
nodes=[{'name':'Zombie','children':[1]},{'name':'body','mesh':0,'skin':0}]
nidx={b:2+i for i,b in enumerate(BONES)}
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
img=open('zatlas.jpg','rb').read();iv=addview(img)
gl={'asset':{'version':'2.0','generator':'noctis-pulcinella'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,
 'meshes':[{'name':'zombie','primitives':[{'attributes':{'POSITION':aP,'NORMAL':aN,'TEXCOORD_0':aT,'JOINTS_0':aJ,'WEIGHTS_0':aW},'indices':aI,'material':0}]}],
 'skins':[{'joints':[nidx[b] for b in BONES],'inverseBindMatrices':aB,'skeleton':nidx['Root']}],
 'materials':[{'name':'pulcinella','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':0.95},'doubleSided':False}],
 'textures':[{'sampler':0,'source':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
 'images':[{'bufferView':iv,'mimeType':'image/jpeg'}],'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':0}]}
while len(blob)%4: blob.append(0)
gl['buffers'][0]['byteLength']=len(blob)
js=json.dumps(gl).encode();js+=b' '*((4-len(js)%4)%4)
glb=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(blob),0x004E4942)+bytes(blob)
open('zombie.glb','wb').write(glb)
print('ZOMBIE verts',len(pos),'tris',len(idx)//3,'glb',len(glb))

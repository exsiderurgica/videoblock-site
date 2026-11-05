from PIL import Image,ImageDraw,ImageFilter
import numpy as np, random, math
from scipy.ndimage import gaussian_filter
from pathlib import Path
rng=np.random.default_rng(1207); random.seed(1207)
S=256
atlas=Image.new('RGB',(1024,1024)); META=[]

def noisy(base,scale=12,grain=9,cloud=25):
    n=rng.normal(0,1,(S,S)); high=gaussian_filter(n,1.1);high/=max(.1,np.std(high));
    broad=gaussian_filter(rng.normal(0,1,(S,S)),22); broad/=max(.1,np.std(broad));
    fine=rng.normal(0,1,(S,S));
    a=np.array(base,dtype=float)[None,None,:]+high[:,:,None]*scale + fine[:,:,None]*grain+broad[:,:,None]*cloud
    return Image.fromarray(np.uint8(np.clip(a,0,255)))

def put(idx,name,img):
    atlas.paste(img,((idx%4)*S,(idx//4)*S)); META.append((idx,name))

def grout(d):
    # hand-laid stone paving, irregular courses and joints
    im=noisy((75,75,72),8,5,16); pix=im.load(); colors=[]; y=-2; row=0
    while y<260:
        h=random.randint(20,33);start=-random.randint(8,28)
        if row%2:start-=17
        x=start
        while x<260:
            w=random.randint(34,60)
            base=random.uniform(.72,1.25); col=(int(65*base),int(64*base),int(60*base))
            for yy in range(max(0,y+2),min(S,y+h-2)):
                for xx in range(max(0,x+2),min(S,x+w-2)):
                    R,G,B=pix[xx,yy]; shine=max(0,1-(yy-y-3)/max(1,h))*random.random()*.10
                    pix[xx,yy]=(min(255,int(R*.38+col[0]*.62+shine*35)),min(255,int(G*.38+col[1]*.62+shine*19)),min(255,int(B*.40+col[2]*.6+shine*14)))
            x+=w
        y+=h;row+=1
    dr=ImageDraw.Draw(im,'RGBA')
    for i in range(26):
        x=random.randint(0,255);y=random.randint(0,255)
        dr.line([(x,y),(x+random.randint(-18,18),y+random.randint(4,13))],fill=(9,9,10,random.randint(22,74)),width=1)
    return im
put(0,'pavement',grout(None))
# Weathered limestone and plaster
for idx,name,base in [(1,'plaster-sand',(132,107,82)),(2,'church-basalt',(63,69,75)),(3,'limestone',(168,148,115)),(4,'plaster-gray',(105,102,94)),(5,'brick',(100,73,58)),(6,'roof',(64,60,62)),(7,'shutters',(59,65,68))]:
    im=noisy(base,8,7,21); d=ImageDraw.Draw(im,'RGBA')
    for k in range(40 if idx in (1,4,5) else 18):
        x=random.randint(0,255);y=random.randint(0,255)
        if idx in (1,4):
            d.line([(x,y),(x+random.randint(-30,30),y+random.randint(10,50))],fill=(25,20,17,random.randint(18,61)),width=random.choice([1,1,2]))
        elif idx==5:
            d.line([(x,y),(x+random.randint(10,50),y)],fill=(19,11,12,50),width=2)
        elif idx==6:
            d.line([(x,y),(x+random.randint(7,29),y)],fill=(10,13,14,50),width=1)
    put(idx,name,im)
# door wood planks with nailheads
im=noisy((67,45,36),4,7,12);d=ImageDraw.Draw(im,'RGBA')
for x in range(0,256,25):
    d.line((x,0,x,255),fill=(12,8,8,180),width=3)
    d.line((x+4,0,x+4,255),fill=(188,125,76,32),width=1)
    for y in range(12,255,24):
        d.ellipse((x+9,y,x+12,y+3),fill=(11,12,12,160))
for k in range(145):
    x=random.randrange(S); y=random.randrange(S); l=random.randint(3,15)
    d.line((x,y,x+random.randint(-2,2),y+l),fill=(12,8,5,random.randint(6,54)),width=1)
put(8,'wood-doors',im)
# clothes
for idx,name,base in [(9,'hoodie',(30,32,35)),(10,'pants',(35,36,39)),(11,'skin',(143,102,84)),(12,'black-metal',(46,46,45)),(13,'lantern',(235,167,77)),(14,'hair',(42,31,24)),(15,'window',(71,75,78))]:
    im=noisy(base,3,4,9 if idx not in (13,15) else 6)
    d=ImageDraw.Draw(im,'RGBA')
    if idx==9:
        for k in range(25):
            x=random.randint(0,255);y=random.randint(0,255)
            d.line([(x,y),(x+random.randint(-12,12),y+random.randint(20,40))],fill=(124,123,118,random.randint(9,20)),width=1)
    if idx==13:
        for k in range(3):d.ellipse((40-k*16,43-k*16,215+k*16,205+k*16),outline=(255,205,106,65),width=4)
    if idx==15:
        for k in range(7):
            y=k*37;d.line((0,y,255,y+5),fill=(8,10,13,160),width=4)
    put(idx,name,im)
atlas.save('/mnt/data/NOCTIS_Napoli_v1_0/assets/materials.png',optimize=True)
print(META,'size',Path('/mnt/data/NOCTIS_Napoli_v1_0/assets/materials.png').stat().st_size)
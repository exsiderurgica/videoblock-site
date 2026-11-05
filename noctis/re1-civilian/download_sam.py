from pathlib import Path
import requests,struct,json
u='https://www.innerscene.com/api/library/locomotion-collection-sam-3d-person-animated-dc23800f/download'
p=Path('noctis/re1-civilian/assets/civilian_animated.glb');p.parent.mkdir(parents=True,exist_ok=True)
r=requests.get(u,timeout=120,headers={'User-Agent':'NOCTIS-Indie-Prototype/1.0'},allow_redirects=True)
print('DOWNLOAD',r.status_code,r.url,r.headers.get('content-type'),len(r.content))
r.raise_for_status();b=r.content
if b[:4]!=b'glTF':raise RuntimeError('Unexpected non-GLB download')
p.write_bytes(b)
length=struct.unpack_from('<I',b,12)[0];dat=json.loads(b[20:20+length]);
print('animations:',[x.get('name') for x in dat.get('animations',[])])
print('meshes:',[x.get('name') for x in dat.get('meshes',[])])
print('materials:',[x.get('name') for x in dat.get('materials',[])])
print('skins:',len(dat.get('skins',[])))
print('nodes:',[x.get('name') for x in dat.get('nodes',[])][:70])
assert len(dat.get('skins',[]))>0
assert len(dat.get('animations',[]))>=3
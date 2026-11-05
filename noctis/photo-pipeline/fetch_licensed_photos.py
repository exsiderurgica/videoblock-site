#!/usr/bin/env python3
"""Collect properly credited CC BY-SA reference photography for NOCTIS. Avoid Google imagery."""
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageEnhance,ImageDraw,ImageFilter
import requests, time, sys, hashlib
root=Path(__file__).resolve().parent.parent/'photos'
root.mkdir(parents=True,exist_ok=True)
header={'User-Agent':'NOCTIS-exsiderurgica-independent-game/0.1 (reference source Wikimedia Commons; respecting CC attribution)'}
photos=[
 {'name':'gesu_facade','url':'https://upload.wikimedia.org/wikipedia/commons/8/8f/Facade_of_Chiesa_del_Ges%C3%B9_Nuovo.jpg','author':'Wittylama','source':'https://commons.wikimedia.org/wiki/File:Facade_of_Chiesa_del_Ges%C3%B9_Nuovo.jpg','license':'CC BY-SA 4.0'},
]
credit=['# NOCTIS photography and material license credits','','The following photographs and derivative textures are licensed under **CC BY-SA 4.0** (or their applicable compatible license). Changes: resized, cropped, tinted for night-time simulation. Do not treat these as public domain.','']
for p in photos:
 err=None
 for attempt in range(4):
  try:
   r=requests.get(p['url'],headers=header,timeout=40)
   r.raise_for_status()
   if len(r.content)<70000:raise ValueError('Photo appears truncated')
   im=Image.open(BytesIO(r.content)).convert('RGB')
   if im.width<1000:raise ValueError('Photo dimensions unexpectedly small')
   break
  except Exception as e:
   err=e;print('Retry',attempt,str(e),flush=True);time.sleep((attempt+1)*5)
 else:raise RuntimeError('Could not download authorized photo '+p['name']+': '+str(err))
 print('SUCCESS',p['name'],im.size,flush=True)
 im.thumbnail((2000,1600),Image.Resampling.LANCZOS)
 im.save(root/(p['name']+'_reference.jpg'),quality=85,optimize=True)
 # Night-aligned, photo-derived facade material; still a real photo, not algorithmic geometry.
 w,h=im.size
 face=im.crop((int(w*.06),int(h*.14),int(w*.96),int(h*.88)))
 face=ImageEnhance.Color(face).enhance(.65)
 face=ImageEnhance.Contrast(face).enhance(1.12)
 blue=Image.new('RGB',face.size,(23,32,54))
 face=Image.blend(face,blue,.36)
 face.thumbnail((1800,1200),Image.Resampling.LANCZOS)
 face.save(root/(p['name']+'_night.jpg'),quality=89,optimize=True)
 credit += [f"- **{p['name']}**: Photo by {p['author']} — {p['license']} — {p['source']} — adapted: crop, resize, colour grade for NOCTIS.\n"]
(root/'CREDITS.md').write_text('\n'.join(credit),encoding='utf8')
print('Assets saved',flush=True)
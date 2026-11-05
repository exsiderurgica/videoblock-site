#!/usr/bin/env python3
"""Fetch live OpenStreetMap geographical footprints for NOCTIS Piazza del Gesu.
OSM data © OpenStreetMap contributors, ODbL 1.0. No Google Maps scraping.
"""
import json,math,time,xml.etree.ElementTree as ET
from pathlib import Path
import requests
root=Path(__file__).resolve().parent.parent/'geo'
root.mkdir(parents=True,exist_ok=True)
west,south,east,north=14.25045,40.84605,14.25395,40.84855
center_lon,center_lat=14.25215,40.84728
url=f'https://api.openstreetmap.org/api/0.6/map?bbox={west},{south},{east},{north}'
headers={'User-Agent':'NOCTIS independent game development / data attribution: OpenStreetMap contributors (ODbL)'}
for attempt in range(4):
 try:
  resp=requests.get(url,headers=headers,timeout=85)
  resp.raise_for_status()
  xml=ET.fromstring(resp.content)
  break
 except Exception as e:
  print('OSM API attempt',attempt+1,'failed:',e,flush=True)
  if attempt==3:raise
  time.sleep(7*(attempt+1))
lat_scale=111_320; lon_scale=111_320*math.cos(math.radians(center_lat))
def point(n):return [round((float(n.attrib['lon'])-center_lon)*lon_scale,2),round(-(float(n.attrib['lat'])-center_lat)*lat_scale,2)]
node_data={n.attrib['id']:n for n in xml.findall('node')}
features=[];buildings=roads=0
for way in xml.findall('way'):
 tags={e.attrib['k']:e.attrib['v'] for e in way.findall('tag')}
 if 'building' not in tags and 'highway' not in tags and 'area' not in tags:continue
 refs=[e.attrib['ref'] for e in way.findall('nd')]
 pts=[point(node_data[n]) for n in refs if n in node_data]
 if len(pts)<2:continue
 isbuilding='building' in tags
 if isbuilding and len(pts)>3:
  buildings+=1;poly=pts[:-1] if pts[0]==pts[-1] else pts
  geom={'type':'Polygon','coordinates':[poly+[poly[0]]]}
 else:
  if 'highway' not in tags:continue
  roads+=1;geom={'type':'LineString','coordinates':pts}
 features.append({'type':'Feature','id':'way/'+way.attrib['id'],'geometry':geom,'properties':{k:v for k,v in tags.items() if k in ('building','highway','name','building:levels','height','historic','landuse','amenity','addr:street')}})
landmarks=[]
for nid,node in node_data.items():
 tags={e.attrib['k']:e.attrib['v'] for e in node.findall('tag')}
 if tags.get('name') and any(k in tags for k in ('historic','tourism','amenity','natural')):
  landmarks.append({'id':nid,'name':tags['name'],'local_m':point(node),'tags':tags})
geo={'type':'FeatureCollection','metadata':{'source':'OpenStreetMap API 0.6','license':'ODbL 1.0','attribution':'© OpenStreetMap contributors','url':url,'center_lat':center_lat,'center_lon':center_lon,'local_units':'metres, +x east, +z south'},'features':features}
(root/'piazza_del_gesu_footprints.geojson').write_text(json.dumps(geo,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(root/'landmarks.json').write_text(json.dumps(landmarks,ensure_ascii=False,indent=2),encoding='utf8')
(root/'README.md').write_text(f'NOCTIS geographical data from [OpenStreetMap]({url}). © OpenStreetMap contributors; licensed ODbL 1.0. Extract bbox {west},{south},{east},{north}; building footprints: {buildings}; highways: {roads}; mapped named POI: {len(landmarks)}. Heights not assumed as accurate if absent.\n',encoding='utf8')
print('OSM SUCCESS building footprint polygons:',buildings,'highway polylines:',roads,'named POI:',len(landmarks),'bytes',len(resp.content),flush=True)
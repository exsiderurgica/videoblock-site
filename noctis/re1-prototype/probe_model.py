import requests,re,html,json
url="https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-sam-3d-person-animated-dc23800f"
r=requests.get(url,timeout=40,headers={"User-Agent":"Mozilla/5.0"})
print("PAGE",r.status_code,"length",len(r.content),"url",r.url)
s=r.text
for kw in ("download","\.glb","assetUrl","fileUrl","modelUrl","cdn","api/","blob:"):
 idxs=[m.start() for m in list(re.finditer(re.escape(kw),s,re.I))[:8]]
 print("\nKEY",kw,"matches",len(idxs))
 for i in idxs[:6]:print("SNIP:",s[max(0,i-145):i+215].replace("\n"," ")[:350])
for m in re.findall(r'(?:href|src)=[\"\']([^\"\']+)[\"\']',s):
 if "glb" in m.lower() or "download" in m.lower():print("LINK",html.unescape(m)[:250])

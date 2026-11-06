#!/usr/bin/env python3
"""Test reale in Chromium: una sola Camera 01, su desktop e Android emulato."""
import json
import os
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8123/noctis/re1-camera01/index.html"
OUT = Path("noctis/re1-camera01/test-renders")
OUT.mkdir(parents=True, exist_ok=True)
summary = {}

def probe(page):
    return page.evaluate("""() => ({
      heroOK: window.__heroOk === true,
      zombieOK: window.__zomOk === true,
      modelIsPhoto: !!actor?.hero?.photo,
      modelLoaded: !!window.__noctis,
      startDisabled: document.getElementById('start')?.disabled,
      startText: document.getElementById('start')?.textContent,
      state: window.__noctis?.probe?.()
    })""")

def check(page, name):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_function(
        """() => { const b=document.getElementById('start');
        return b && (!b.disabled || b.textContent.startsWith('ERRORE')); }""",
        timeout=60000
    )
    status = probe(page)
    if status["startDisabled"]:
        page.screenshot(path=str(OUT / (name + "-errore.png")))
        raise AssertionError("Caricamento non completato: " + json.dumps(status, ensure_ascii=False))
    if not status["heroOK"] or not status["zombieOK"] or not status["modelIsPhoto"]:
        raise AssertionError("Modelli o animazioni non pronti: " + str(status))
    # I poligoni non devono produrre alcun pixel visibile:
    # solo profondita', con i personaggi occlusi quando sono dietro.
    projection=page.evaluate("""() => {
      const entries=foregroundMeshes.map((mesh,i)=>{
        const original=MASKS[i].poly,arr=mesh.geometry.getAttribute('position');
        let maxDeviation=0,triArea=0;
        const verts=[];
        for(let j=0;j<arr.count;j++){
          const q=new THREE.Vector3().fromBufferAttribute(arr,j).project(cam);
          const uv=[(q.x+1)*IW/2,(1-q.y)*IH/2];
          verts.push(uv);
          maxDeviation=Math.max(maxDeviation,Math.min(...original.map(p=>Math.hypot(p[0]-uv[0],p[1]-uv[1]))));
        }
        for(let j=0;j<verts.length;j+=3){
          const [a,b,c]=verts.slice(j,j+3);
          triArea+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;
        }
        const polygonArea=Math.abs(original.reduce((sum,p,j)=>{
          const n=original[(j+1)%original.length];
          return sum+p[0]*n[1]-n[0]*p[1];
        },0))/2;
        return {count:arr.count,maxDeviation,relativeAreaError:Math.abs(triArea-polygonArea)/polygonArea,
          depthOnly:mesh.material.colorWrite===false && mesh.material.depthWrite===true &&
                    mesh.material.depthTest===true && mesh.material.map===null,
          orderedFirst:mesh.renderOrder<0}
      });
      const wasHero=actor.root.visible,wasZombie=ZOM.root?.visible;
      actor.root.visible=false;if(ZOM.root)ZOM.root.visible=false;
      R.render(scene,cam);
      const gl=R.getContext(),d=R.getDrawingBufferSize(new THREE.Vector2()),pixel=new Uint8Array(4),samples=[];
      MASKS.forEach((mask,i)=>{
        const t=THREE.ShapeUtils.triangulateShape(mask.poly.map(p=>new THREE.Vector2(...p)),[])[0];
        const u=t.reduce((sum,j)=>sum+mask.poly[j][0],0)/3,
              v=t.reduce((sum,j)=>sum+mask.poly[j][1],0)/3;
        gl.readPixels(Math.max(0,Math.min(d.x-1,Math.round(u*d.x/IW))),
                      Math.max(0,Math.min(d.y-1,Math.round((IH-v)*d.y/IH))),
                      1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        samples.push({i,alpha:pixel[3],rgb:[pixel[0],pixel[1],pixel[2]]})
      });
      actor.root.visible=wasHero;if(ZOM.root)ZOM.root.visible=wasZombie;
      R.render(scene,cam);
      return {entries,samples,legacyMasks:document.getElementById('masks').children.length,
        mode:window.__noctis.probe().occlusionMode}
    }""")
    if len(projection["entries"]) != 8 or projection["legacyMasks"] or projection["mode"] != "depth-only":
        raise AssertionError("Sagome di sola profondita' mancanti: "+str(projection))
    for m in projection["entries"]:
        if (m["count"] < 3 or not m["depthOnly"] or not m["orderedFirst"]
            or m["maxDeviation"] > .2 or m["relativeAreaError"] > .015):
            raise AssertionError("Occlusore non invisibile o prospettiva errata: "+str(m))
    if any(p["alpha"] != 0 for p in projection["samples"]):
        raise AssertionError("Gli ostacoli disegnano ancora pixel nel WebGL: "+str(projection["samples"]))
    print("Otto occlusori di sola profondita', alpha 0: 8/8",flush=True)
    page.locator("#start").click()
    page.wait_for_timeout(800)
    state0 = page.evaluate("window.__noctis.probe()")
    page.screenshot(path=str(OUT / (name + "-inizio.png")), full_page=True)
    if name == "desktop":
        page.keyboard.down("w")
        page.wait_for_timeout(800)
        page.keyboard.up("w")
    else:
        # Eventi touch reali tramite il protocollo DevTools.
        c = page.context.new_cdp_session(page)
        box = page.locator("#stick").bounding_box()
        x = box["x"] + box["width"] / 2
        y = box["y"] + box["height"] / 2
        c.send("Input.dispatchTouchEvent", {"type":"touchStart","touchPoints":[{"x":x,"y":y,"id":7}]})
        c.send("Input.dispatchTouchEvent", {"type":"touchMove","touchPoints":[{"x":x,"y":y-box["height"]*.35,"id":7}]})
        page.wait_for_timeout(900)
        c.send("Input.dispatchTouchEvent", {"type":"touchEnd","touchPoints":[]})
    page.wait_for_timeout(250)
    state1 = page.evaluate("window.__noctis.probe()")
    page.screenshot(path=str(OUT / (name + "-movimento.png")), full_page=True)
    if name == "desktop":
        # Il protagonista si posiziona realmente prima dietro, poi davanti
        # a un paletto (base immagine y=556, stessa Camera 01).
        behind=page.evaluate("window.__noctis.setImg(356,536)")
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / "desktop-paletti-dietro.png"),full_page=True)
        front=page.evaluate("window.__noctis.setImg(356,600)")
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / "desktop-paletti-davanti.png"),full_page=True)
        print("Occlusione paletti testata a due profondita': "+str({"dietro":behind,"davanti":front}),flush=True)
    # Anteprima JPEG compressa nei log per poter ispezionare davvero il render,
    # oltre agli screenshot PNG originali conservati come artefatto GitHub.
    preview=base64.b64encode(page.screenshot(type="jpeg",quality=48,full_page=True)).decode("ascii")
    print("NOCTIS_PREVIEW_"+name+"_BEGIN",flush=True)
    for i in range(0,len(preview),1600):
        print(preview[i:i+1600],flush=True)
    print("NOCTIS_PREVIEW_"+name+"_END",flush=True)
    delta = ((state1["x"]-state0["x"])**2+(state1["z"]-state0["z"])**2)**.5
    result={"assets":status,"start":state0,"end":state1,"metriPercorsi":round(delta,3),"jsErrors":errors}
    summary[name] = result
    if delta < .02:
        raise AssertionError("Il personaggio non avanza tramite i controlli: "+str(result))
    if errors:
        raise AssertionError("Errori JavaScript nella console: " + str(errors))
    print(name+": caricamento, avvio e movimento verificati ("+str(round(delta,3))+" m)")
    return result

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True,args=[
        "--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader",
        "--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"
    ])
    try:
        for name,width,height,mobile in [("desktop",1280,800,False),("android",393,852,True)]:
            context=browser.new_context(viewport={"width":width,"height":height},
                is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
            page=context.new_page()
            try: check(page,name)
            finally: context.close()
    finally:
        (OUT/"resoconto.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
        browser.close()

#!/usr/bin/env python3
"""NOCTIS Camera 01: reale browser WebGL, pickup, orientamento, tre colpi e persistenza del corpo."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, math

URL="http://127.0.0.1:8123/noctis/re1-camera01/index.html"
OUT=Path("noctis/re1-camera01/test-renders")
OUT.mkdir(parents=True,exist_ok=True)
results={}

def state(page):
    return page.evaluate("window.__noctis.combat()")

def test(page,label):
    errors=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    page.goto(URL,wait_until="domcontentloaded",timeout=45000)
    page.wait_for_function("() => document.getElementById('start') && !document.getElementById('start').disabled",timeout=90000)
    page.locator("#start").click()
    page.wait_for_timeout(750)
    page.screenshot(path=str(OUT / (label+"-pistola-terra.png")),full_page=True)
    initial=state(page)
    assert not initial["gun"] and initial["visible"],initial
    # Pickup nella stessa scena usando il tasto AZIONE reale.
    page.evaluate("window.__noctis.setImg(336,763)")
    assert page.evaluate("combatNearGun()"),"La pistola non è raggiungibile"
    page.locator("#use").click()
    page.wait_for_function("() => COMBAT.picking",timeout=3500)
    page.wait_for_timeout(380)
    pose=page.evaluate("""() => ({
      spine:actor.hero?.bn?.spine_01?.rotation.x,
      pickup:COMBAT.picking,
      time:COMBAT.pickupT})""")
    assert pose["pickup"] and pose["time"]>.1 and pose["spine"] is not None,pose
    page.wait_for_function("() => COMBAT.hasGun && !COMBAT.picking",timeout=5000)
    taken=state(page)
    assert taken["gun"] and not taken["visible"],taken
    page.screenshot(path=str(OUT / (label+"-pistola-raccolta.png")),full_page=True)

    # L'animazione zombie avanza in base ai metri percorsi (no pattinaggio a vuoto).
    motion0=page.evaluate("({p:ZOM.walkPhase||0, x:ZOM.x,z:ZOM.z,s:ZOM.actualSpeed||0})")
    page.wait_for_timeout(750)
    motion1=page.evaluate("({p:ZOM.walkPhase||0, x:ZOM.x,z:ZOM.z,s:ZOM.actualSpeed||0})")
    assert motion1["p"] >= motion0["p"],"Fase di camminata regressiva"
    assert motion1["s"] <= .52,"Zombie troppo veloce"
    # Sparo verso Pulcinella: nessun tasto mira separato.
    deltas=[]
    for hit in (1,2,3):
        page.evaluate("""() => {
          actor.yaw=Math.atan2(ZOM.x-actor.x,-(ZOM.z-actor.z));
          actor.root.rotation.y=-actor.yaw;
        }""")
        assert page.evaluate("combatAim()"),"Orientamento non valido con protagonista verso lo zombie"
        before=page.evaluate("COMBAT.mesh?.geometry?.index?.count || -1")
        page.locator("#use").click()
        page.wait_for_function("(hits) => COMBAT.hits >= hits",arg=hit,timeout=4000)
        page.wait_for_timeout(90)
        page.screenshot(path=str(OUT / (label+"-colpo-"+str(hit)+".png")),full_page=True)
        next_idx=page.evaluate("COMBAT.mesh?.geometry?.index?.count || -1")
        deltas.append([before,next_idx])
        if hit<3:page.wait_for_timeout(580)

    page.wait_for_timeout(1350)
    final=state(page)
    full=page.evaluate("""() => ({
      zombieVisible:ZOM.root?.visible,
      corpseInScene:scene.children.includes(ZOM.root),
      isDead:!!ZOM.dead,
      fallAngle:ZOM.root?.rotation.x,
      originalTriangles:COMBAT.faces?.all?.length||0,
      currentTriangles:COMBAT.mesh?.geometry?.index?.count/3||0,
      parts:COMBAT.drops.filter(d=>!!d.mesh?.geometry?.attributes?.position).map(d=>({
          name:d.part,vertices:d.mesh.geometry.attributes.position.count,stillPresent:scene.children.includes(d.mesh)
      })),
      bloodPools:COMBAT.detached.length
    })""")
    page.screenshot(path=str(OUT / (label+"-cadavere.png")),full_page=True)
    assert final["hits"]==3 and final["gun"] and final["corpse"],final
    assert set(final["severed"])=={"arm_l","arm_r","head"},final
    assert final["fragments"]>=3 and final["blood"]>=70,final
    assert full["originalTriangles"] > full["currentTriangles"] and full["currentTriangles"]>0,full
    assert len(full["parts"])>=3 and all(x["vertices"]>100 and x["stillPresent"] for x in full["parts"]),full
    assert full["zombieVisible"] and full["corpseInScene"] and full["isDead"],full
    assert full["fallAngle"] < -1.2 and full["bloodPools"]>=3,full
    assert not errors,errors
    print("COMBAT",label,"OK",json.dumps({"initial":initial,"pickupPose":pose,"picked":taken,"hits":final,"corpse":full,"geometryCounts":deltas},ensure_ascii=False),flush=True)
    results[label]={"passed":True,"hits":final["hits"],"parts":final["severed"],"persistent":full["corpseInScene"],"errors":errors}

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=[
      "--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader",
      "--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    try:
        for label,width,height,mobile in [("desktop",1280,800,False),("android",393,852,True)]:
            ctx=browser.new_context(viewport={"width":width,"height":height},
                  is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
            try:test(ctx.new_page(),label)
            finally:ctx.close()
    finally:
        (OUT/"combat_report.json").write_text(json.dumps(results,indent=2,ensure_ascii=False))
        browser.close()

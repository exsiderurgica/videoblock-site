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

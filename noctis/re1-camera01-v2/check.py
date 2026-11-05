from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('noctis/re1-camera01-v2/test-renders');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'])
  for name,view in [
    ('desktop',{'width':1280,'height':720}),
    ('android_landscape',{'width':960,'height':420}),
    ('android_portrait',{'width':393,'height':852})]:
    page=browser.new_page(viewport=view,device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda exc:errors.append('JS '+str(exc)))
    page.on('requestfailed',lambda req: errors.append('Request '+req.url+' '+str(req.failure)) if not req.url.startswith('blob:') else None)
    page.goto('http://127.0.0.1:8123/noctis/re1-camera01-v2/',wait_until='domcontentloaded',timeout=60000)
    page.wait_for_timeout(3000)
    try:
      page.wait_for_function("window.__noctisProbe && window.__noctisProbe().bakedReady",timeout=75000)
      page.wait_for_function("window.__noctisProbe().modelReady",timeout=75000)
    except Exception:
      page.screenshot(path=str(out/f'{name}_LOAD_FAILED.png'))
      print('STATUS',page.locator('#status').inner_text(),'JS ERRORS',errors,'probe=',page.evaluate('window.__noctisProbe?.()'))
      raise
    p0=page.evaluate('window.__noctisProbe()')
    assert p0['backgroundReady'] and p0['maskCount']>40,p0
    assert p0['worldIsHidden'] and p0['monument']['height']==30,p0
    assert p0['groundBlocked'] and p0['canMove'],p0
    assert 50<p0['feet']['x']<1240 and 100<p0['feet']['y']<718,p0
    page.screenshot(path=str(out/f'{name}_scene.png'))
    page.locator('#start').click()
    page.wait_for_timeout(500)
    page.keyboard.down('w')
    page.wait_for_timeout(1500)
    page.keyboard.up('w')
    p1=page.evaluate('window.__noctisProbe()')
    assert p1['player']['z']<p0['player']['z']-.8,(p0,p1)
    page.screenshot(path=str(out/f'{name}_walking.png'))
    print(name,'monument',p0['monument'],'feet',p0['feet'],'masks',p0['maskCount'],'actor',p1['player'],'js_errors',errors,flush=True)
    if errors: raise AssertionError(errors[:10])
    page.close()
  browser.close()

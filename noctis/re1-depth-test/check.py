import pathlib
from playwright.sync_api import sync_playwright

output=pathlib.Path('noctis/re1-depth-test/test-renders')
output.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'])
    for name,size in [('landscape',{'width':1050,'height':590}),('phone_landscape',{'width':910,'height':393}),('portrait',{'width':393,'height':852})]:
        page=browser.new_page(viewport=size,device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('requestfailed',lambda r:errors.append('Request '+r.url+': '+str(r.failure)))
        page.goto('http://127.0.0.1:8123/noctis/re1-depth-test/',wait_until='domcontentloaded',timeout=45000)
        page.wait_for_function("document.querySelector('#state')?.textContent.includes('pronto')",timeout=90000)
        page.locator('#start').click()
        page.wait_for_timeout(1000)
        initial=page.evaluate('window.__noctisProbe()')
        assert initial['ready'] and initial['playing'],initial
        assert .56*590<initial['feet']['y']<.88*590,initial
        assert initial['collisions'],initial
        page.screenshot(path=str(output/f'{name}_idle.png'))
        page.keyboard.down('w')
        page.wait_for_timeout(850)
        page.keyboard.up('w')
        later=page.evaluate('window.__noctisProbe()')
        assert later['player']['z']<initial['player']['z']-.25,(initial,later)
        page.screenshot(path=str(output/f'{name}_walk.png'))
        print(name, 'feet',initial['feet'],'moving',later['player'],'masks',later['occlusion'])
        if errors: raise AssertionError(errors[:10])
        page.close()
    browser.close()

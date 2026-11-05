import time, pathlib
from playwright.sync_api import sync_playwright
out=pathlib.Path('noctis/re1-prototype/test-renders');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'])
 for name,view in [('landscape',{'width':1050,'height':590}),('portrait',{'width':393,'height':852})]:
  page=browser.new_page(viewport=view,device_scale_factor=1)
  failures=[]
  page.on('pageerror',lambda e:failures.append(str(e)))
  page.on('requestfailed',lambda r:failures.append(f'REQUEST: {r.url} {r.failure}'))
  page.goto('http://127.0.0.1:8123/noctis/re1-prototype/',wait_until='domcontentloaded',timeout=45000)
  page.wait_for_timeout(1500)
  page.wait_for_function("document.querySelector('#state')?.textContent.includes('pronto')",timeout=80000)
  page.locator('#start').click()
  page.wait_for_timeout(900)
  page.screenshot(path=str(out/f'{name}.png'))
  page.keyboard.down('w');page.wait_for_timeout(1300);page.keyboard.up('w')
  page.screenshot(path=str(out/f'{name}_walking.png'))
  print(f'{name}:',page.locator('#task').inner_text(), 'JS errors:',failures)
  if failures:raise RuntimeError('\n'.join(failures[:7]))
  page.close()
 browser.close()
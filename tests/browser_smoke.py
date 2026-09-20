#!/usr/bin/env python3
"""End-to-end smoke test in headless Chromium: loads the built page, waits for all background jobs,
clicks through tabs/layers/tools and fails on any console error. Needs: pip install playwright && playwright install chromium"""
import sys, os
from playwright.sync_api import sync_playwright
path = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist', 'flowshield.html'))
shots = '--shots' in sys.argv
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1480, 'height': 1000}, color_scheme='dark')
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and '403' not in m.text and 'fonts' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(path)
    pg.wait_for_function("S.ai!=null && Object.keys(S.results).length>=6", timeout=240000)
    for layer in ['Risk level', 'Time to critical', 'AI probability', 'Velocity', 'Land use', 'Population', 'Water depth']:
        pg.click('#layerChips >> text=' + layer)
    for tab in ['p-scen', 'p-ai', 'p-method', 'p-data', 'p-time']:
        pg.click('.tab[data-p=%s]' % tab)
    pg.click('#toolChips >> text=Fail drains'); box = pg.locator('#map').bounding_box()
    pg.mouse.click(box['x'] + 200, box['y'] + 250); assert pg.evaluate('S.failSet.size') > 0, 'fail tool did nothing'
    pg.click('#btnRun'); pg.wait_for_function('!S.running', timeout=60000)
    pg.click('#btnBulletin'); assert 'Alert bulletin' in pg.inner_text('#modalBox'); pg.click('#mclose')
    if shots: pg.screenshot(path='smoke.png')
    ai = pg.evaluate('S.ai.eval'); print('AI held-out R2=%.2f AUC=%.2f' % (ai['r2'], ai['auc']))
    b.close()
if errs: print('FAIL\n' + '\n'.join(errs)); sys.exit(1)
print('PASS: no console errors')

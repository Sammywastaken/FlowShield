#!/usr/bin/env python3
"""Bundle src/ into one self-contained dist/flowshield.html (no build tools, no dependencies)."""
import re, os, glob
root = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
strip = lambda s: s.replace("'use strict';", "")
app = ''.join(rd(f) + '\n' for f in sorted(p.replace(root + os.sep, '') for p in glob.glob(os.path.join(root, 'src/app/*.js'))))
js = strip(rd('src/engine.js')) + strip(rd('src/ai.js')) + app
js = re.sub(r"if\(typeof module!=='undefined'\)[^\n]*\n", "\n", js)   # drop Node-only export lines
html = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>FlowShield · Flood simulation and early warning for Kerala</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&display=swap">
<style>{rd('src/style.css')}</style></head><body>{rd('src/body.html')}<script>
"use strict";
{js}
</script></body></html>'''
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist/flowshield.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(root, 'dist/.bundle.js'), 'w', encoding='utf-8').write(js)
print('built dist/flowshield.html', len(html), 'bytes')

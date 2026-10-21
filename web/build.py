"""Assembles web/index.html from the sources in web/src. Run: python3 web/build.py"""
import os
d=os.path.dirname(os.path.abspath(__file__))
r=lambda n:open(os.path.join(d,'src',n)).read()
js='\n'.join(r(n) for n in ['defs.js','engine.js','ui.js','adapter.js','main.js'])
html='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arcanam Pathway</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%231c58a6%22%2F%3E%3Cpath%20d%3D%22M15%2052V30a17%2017%200%200%201%2034%200v22%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cpath%20d%3D%22M32%2052c0-8%200-10%200-14%22%20fill%3D%22none%22%20stroke%3D%22%239cc4f5%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2228%22%20r%3D%224.5%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
'''+r('style.css')+'''
</style></head><body>
<div class="wrap" id="app"><p class="small">Loading…</p></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script src="config.js"></script>
<script>
(function(){
'use strict';
'''+js+'''
})();
</script></body></html>
'''
open(os.path.join(d,'index.html'),'w').write(html)
print('index.html',len(html))

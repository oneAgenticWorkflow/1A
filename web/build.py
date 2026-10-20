"""Assembles web/index.html from the sources in web/src. Run: python3 web/build.py"""
import os
d=os.path.dirname(os.path.abspath(__file__))
r=lambda n:open(os.path.join(d,'src',n)).read()
js='\n'.join(r(n) for n in ['defs.js','engine.js','ui.js','adapter.js','main.js'])
html='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EB-1A Profile Program</title>
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

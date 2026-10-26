"""Assembles web/index.html from the sources in web/src. Run: python3 web/build.py"""
import os
d=os.path.dirname(os.path.abspath(__file__))
r=lambda n:open(os.path.join(d,'src',n)).read()
js='\n'.join(r(n) for n in ['brand.js','defs.js','engine.js','pathway-v2.js','ui.js','adapter.js','main.js'])
html='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arcanam Pathway</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
'''+r('style.css')+'''
</style></head><body>
<div class="wrap" id="app"><p class="small">Loading…</p></div>
<script>
(function(){
  var finished=false;
  function fail(message){
    if(finished)return;
    var app=document.getElementById('app');
    if(!app)return;
    var content=(app.textContent||'').trim();
    if(content!=='Loading…'&&content!=='Loading...')return;
    finished=true;
    app.innerHTML='<div class="panel newcase" style="margin-top:48px"><h2>Unable to start Arcanam Pathway</h2><p id="startup-error"></p><p class="small">No candidate data has been changed. Refresh to try again.</p><button class="btn pri" onclick="location.reload()">Retry</button></div>';
    document.getElementById('startup-error').textContent=message;
  }
  window.addEventListener('error',function(e){fail('Application startup error: '+(e.message||'Script could not load'))});
  window.addEventListener('unhandledrejection',function(e){fail('Application initialization failed: '+((e.reason&&e.reason.message)||'Request failed'))});
  setTimeout(function(){
    if(!window.supabase)fail('Authentication library did not load. Check your connection or browser content blockers.');
    else fail('Startup took too long. Check your connection and try again.');
  },12000);
})();
</script>
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

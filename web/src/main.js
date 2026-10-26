/* Sign-in and role routing. */
(function(){
  var cfg=window.PORTAL_CONFIG||{};
  (function(){var l=document.querySelector('link[rel=icon]');if(!l){l=document.createElement('link');l.rel='icon';document.head.appendChild(l)}l.type='image/png';l.href=BRAND_FAV})();
  var app=document.getElementById('app');
  window.addEventListener('error',function(e){if(app&&/Loading cases|Loading…/.test(app.textContent||''))app.innerHTML='<div class="panel"><h2>Application startup error</h2><p>'+String(e.message||'Unexpected JavaScript error').replace(/[&<>]/g,'')+'</p><p>Diagnostic version: 2026-10-26-b</p></div>'});
  window.addEventListener('unhandledrejection',function(e){if(app&&/Loading cases|Loading…/.test(app.textContent||''))app.innerHTML='<div class="panel"><h2>Application request failed</h2><p>'+String(e.reason&&e.reason.message||'Unhandled request error').replace(/[&<>]/g,'')+'</p><p>Diagnostic version: 2026-10-26-b</p></div>'});
  function shell(html){app.innerHTML='<div class="panel newcase" style="margin-top:48px"><img class="brandfull" src="'+BRAND_FULL+'" alt="Arcanam Pathway">'+html+'</div>'}
  function esc2(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_URL.indexOf('YOUR-')>=0){shell('<p>This site is not configured yet. Fill in <code>config.js</code> (see the README).</p>');return}
  var sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  function field(id,label,type,ac){return '<label class="f" for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" autocomplete="'+ac+'">'}
  function val(id){var e=document.getElementById(id);return e?e.value.trim():''}
  function err(m){document.getElementById('lerr').textContent=m}
  var AUTH_DOMAIN='accounts.arcanam.com'; /* keep in sync with the accounts function */
  function login(msg){
    var h='';
    if(msg)h+='<div class="banner ok">'+msg+'</div>';
    h+='<p class="small">Sign in with the username and password your administrator gave you.</p>'+field('em','Username','text','username')+field('pw','Password','password','current-password')+
      '<div class="addrow"><button class="btn pri" id="go">Sign in</button></div><p class="small" id="lerr"></p>'+
      '<p class="small">Forgot your password or need access? Ask your administrator.</p>';
    shell(h);
    var go=document.getElementById('go');
    var doGo=async function(){
      var id=val('em').toLowerCase(),pw=document.getElementById('pw').value;
      if(!id||!pw){err('Enter your username and password.');return}
      go.disabled=true;err('');
      var email=id.indexOf('@')>=0?id:id+'@'+AUTH_DOMAIN;
      var r=await sb.auth.signInWithPassword({email:email,password:pw});
      if(r.error){err(r.error.message==='Invalid login credentials'?'Username or password is not right.':r.error.message);go.disabled=false}
    };
    go.onclick=doGo;
    ['em','pw'].forEach(function(i){document.getElementById(i).onkeydown=function(e){if(e.key==='Enter')doGo()}});
  }
  function mustChange(session){
    shell('<div class="banner ok">Welcome. Please choose your own password before you continue.</div>'+field('p1','New password (at least 8 characters)','password','new-password')+field('p2','Repeat the new password','password','new-password')+
      '<div class="addrow"><button class="btn pri" id="go">Save and continue</button> <button class="btn" id="so">Sign out</button></div><p class="small" id="lerr"></p>');
    document.getElementById('so').onclick=function(){sb.auth.signOut().then(function(){location.reload()})};
    document.getElementById('go').onclick=async function(){
      var a=document.getElementById('p1').value,b=document.getElementById('p2').value;
      if(a.length<8){err('Use at least 8 characters.');return}
      if(a!==b){err('The two passwords do not match.');return}
      var u=await sb.auth.updateUser({password:a});if(u.error){err(u.error.message);return}
      var p=await sb.from('profiles').select('must_change').eq('id',session.user.id).single();
      if(p.error){err('Password updated, but account verification failed: '+p.error.message);return}
      if(p.data.must_change){err('Password updated, but verification is still pending. Please sign out and sign in again.');return}
      enter(session);
    };
  }
  function pwTool(){
    if(document.getElementById('pwtool'))return;
    var d=document.createElement('div');d.id='pwtool';d.style.cssText='position:fixed;right:12px;bottom:12px;z-index:50;font-size:13px';
    d.innerHTML='<button class="link" id="pwo">Change password</button>';
    document.body.appendChild(d);
    d.onclick=async function(e){
      if(e.target.id==='pwo'){d.innerHTML='<div class="panel" style="padding:10px"><input id="np" type="password" autocomplete="new-password" placeholder="New password (8+ characters)"> <button class="btn sm pri" id="pws">Save</button> <button class="btn sm" id="pwc">Cancel</button> <span class="small" id="pwm"></span></div>'}
      else if(e.target.id==='pwc'){d.remove();pwTool()}
      else if(e.target.id==='pws'){var v=document.getElementById('np').value;if(v.length<8){document.getElementById('pwm').textContent='At least 8 characters.';return}
        var r=await sb.auth.updateUser({password:v});document.getElementById('pwm').textContent=r.error?r.error.message:'Password saved.';if(!r.error)setTimeout(function(){d.remove();pwTool()},1500)}
    };
  }
  function bounded(p,ms){return Promise.race([p,new Promise(function(_,reject){setTimeout(function(){reject(new Error('Account request timed out. Check your connection and reload.'))},ms)})])}
  async function enter(session){
    shell('<p class="small">Loading…</p>');
    var uid=session.user.id;
    var p;try{p=await bounded(sb.from('profiles').select('role,case_id,email,username,display_name,must_change').eq('id',uid).maybeSingle(),15000)}catch(e){shell('<p>Could not finish loading your account: '+esc2(e.message)+'</p><p class="small">Your saved candidate data has not been changed. Refresh the page to retry.</p><button class="btn" id="retry">Retry</button>');document.getElementById('retry').onclick=function(){location.reload()};return}
    if(p.error){shell('<p>Could not load your account: '+esc2(p.error.message)+'</p>');return}
    var prof=p.data||{role:'candidate',case_id:null,email:session.user.email};
    if(prof.must_change){mustChange(session);return}
    app.innerHTML='';
    var isAdmin=prof.role==='admin',isStaff=isAdmin||prof.role==='supervisor';
    if(!isStaff&&!prof.case_id){shell('<p>Your login is not linked to a case yet. Ask your administrator.</p><div class="addrow"><button class="btn" id="so">Sign out</button></div>');document.getElementById('so').onclick=function(){sb.auth.signOut().then(function(){location.reload()})};return}
    var db=makeDb(sb,isStaff,prof.case_id,cfg);
    startApp({db:db,sample:isStaff?makeSample(sb,cfg):null,locked:!isStaff,staff:prof.role,caseId:prof.case_id,me:{email:prof.email||session.user.email,username:prof.username||'',name:prof.display_name||''}});
  }
  var inviteToken=new URLSearchParams(location.search).get('invite_token');
  if(inviteToken){
    history.replaceState(null,'',location.pathname);
    shell('<p class="small">Verifying your invitation…</p>');
    window.__busy=true;
    sb.auth.verifyOtp({token_hash:inviteToken,type:'recovery'}).then(function(r){
      window.__busy=false;
      if(r.error||!r.data.session){login();err('Invitation link is invalid or expired. Ask your administrator to resend it.');return}
      window.__entered=true;
      mustChange(r.data.session);
    }).catch(function(){window.__busy=false;login();err('Could not verify invitation. Ask your administrator for a new link.')});
    return;
  }
  bounded(sb.auth.getSession(),15000).then(function(r){if(r.error){shell('<p>Sign-in check failed: '+esc2(r.error.message)+'</p><button class="btn" id="retry">Retry</button>');document.getElementById('retry').onclick=function(){location.reload()};return}if(r.data.session){window.__entered=true;enter(r.data.session)}else login()}).catch(function(e){shell('<p>Sign-in check timed out: '+esc2(e.message)+'</p><button class="btn" id="retry">Retry</button>');document.getElementById('retry').onclick=function(){location.reload()}});
  sb.auth.onAuthStateChange(function(ev,session){if(ev==='SIGNED_IN'&&session&&!window.__entered&&!window.__busy){window.__entered=true;enter(session)}if(ev==='SIGNED_OUT'&&!window.__busy)login()});
})();

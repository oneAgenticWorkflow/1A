/* Sign-in and role routing. */
(function(){
  var cfg=window.PORTAL_CONFIG||{};
  var app=document.getElementById('app');
  function shell(html){app.innerHTML='<div class="panel newcase" style="margin-top:48px"><h2>EB-1A Profile Program</h2>'+html+'</div>'}
  function esc2(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_URL.indexOf('YOUR-')>=0){shell('<p>This site is not configured yet. Fill in <code>config.js</code> (see the README).</p>');return}
  var sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  function login(msg){
    shell('<p class="small">Sign in with the email address your advisor has on file. We will email you a one-time link. No password needed.</p>'+(msg?'<div class="banner ok">'+msg+'</div>':'')+
      '<label class="f" for="em">Email</label><input id="em" type="email" autocomplete="email"><div class="addrow"><button class="btn pri" id="go">Email me a sign-in link</button></div><p class="small" id="lerr"></p>');
    document.getElementById('go').onclick=async function(){
      var em=document.getElementById('em').value.trim().toLowerCase();if(!em)return;
      this.disabled=true;
      var r=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.href.split('#')[0]}});
      if(r.error){document.getElementById('lerr').textContent=r.error.message;this.disabled=false;return}
      login('Check your inbox for '+esc2(em)+'. Open the link on this device.');
    };
  }
  async function enter(session){
    shell('<p class="small">Loading…</p>');
    var uid=session.user.id;
    var p=await sb.from('profiles').select('role,case_id,email').eq('id',uid).maybeSingle();
    if(p.error){shell('<p>Could not load your account: '+esc2(p.error.message)+'</p>');return}
    var prof=p.data||{role:'candidate',case_id:null,email:session.user.email};
    if(prof.role==='candidate'&&!prof.case_id){var c=await sb.rpc('claim_case');if(!c.error&&c.data)prof.case_id=c.data}
    app.innerHTML='';
    var isAdmin=prof.role==='admin';
    if(!isAdmin&&!prof.case_id){shell('<p>This email is not linked to a case yet. Ask your advisor to add <b>'+esc2(prof.email||session.user.email)+'</b>, then sign in again.</p><div class="addrow"><button class="btn" id="so">Sign out</button></div>');document.getElementById('so').onclick=function(){sb.auth.signOut().then(function(){location.reload()})};return}
    var db=makeDb(sb,isAdmin,prof.case_id);
    startApp({db:db,sample:isAdmin?makeSample(sb,cfg):null,locked:!isAdmin,caseId:prof.case_id,me:{email:prof.email||session.user.email}});
  }
  sb.auth.getSession().then(function(r){if(r.data.session){window.__entered=true;enter(r.data.session)}else login()});
  sb.auth.onAuthStateChange(function(ev,session){if(ev==='SIGNED_IN'&&session&&!window.__entered){window.__entered=true;enter(session)}if(ev==='SIGNED_OUT')login()});
})();

/* Sign-in and role routing. */
(function(){
  var cfg=window.PORTAL_CONFIG||{};
  var app=document.getElementById('app');
  function shell(html){app.innerHTML='<div class="panel newcase" style="margin-top:48px"><h2>Arcanam Pathway</h2>'+html+'</div>'}
  function esc2(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_URL.indexOf('YOUR-')>=0){shell('<p>This site is not configured yet. Fill in <code>config.js</code> (see the README).</p>');return}
  var sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  function field(id,label,type,ac){return '<label class="f" for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" autocomplete="'+ac+'">'}
  function val(id){var e=document.getElementById(id);return e?e.value.trim():''}
  function err(m){document.getElementById('lerr').textContent=m}
  function login(msg,mode){
    mode=mode||'in';
    var h='';
    if(msg)h+='<div class="banner ok">'+msg+'</div>';
    if(mode==='in'){
      h+='<p class="small">Sign in with your email and password.</p>'+field('em','Email','email','email')+field('pw','Password','password','current-password')+
        '<div class="addrow"><button class="btn pri" id="go">Sign in</button></div><p class="small" id="lerr"></p>'+
        '<p class="small"><button class="link" id="m-up">First time? Create your password</button> &middot; <button class="link" id="m-link">Forgot password? Email me a link</button></p>';
    }else if(mode==='up'){
      h+='<p class="small">First time here? Use the email address and access code your advisor gave you, then choose a password (at least 8 characters).</p>'+field('em','Email','email','email')+field('cd','Access code','text','off')+field('pw','Choose a password','password','new-password')+
        '<div class="addrow"><button class="btn pri" id="go">Create my account</button></div><p class="small" id="lerr"></p><p class="small"><button class="link" id="m-in">Back to sign in</button></p>';
    }else{
      h+='<p class="small">We will email you a one-time sign-in link. Then you can set a new password from inside the portal.</p>'+field('em','Email','email','email')+
        '<div class="addrow"><button class="btn pri" id="go">Email me a sign-in link</button></div><p class="small" id="lerr"></p><p class="small"><button class="link" id="m-in">Back to sign in</button></p>';
    }
    shell(h);
    ['m-up','m-in','m-link'].forEach(function(id){var b=document.getElementById(id);if(b)b.onclick=function(){login('',id==='m-up'?'up':id==='m-in'?'in':'link')}});
    var go=document.getElementById('go');
    go.onclick=async function(){
      var em=val('em').toLowerCase();if(!em){err('Enter your email.');return}
      go.disabled=true;err('');
      if(mode==='in'){
        var pw=document.getElementById('pw').value;
        var r=await sb.auth.signInWithPassword({email:em,password:pw});
        if(r.error){err(r.error.message==='Invalid login credentials'?'Email or password is not right. If this is your first time, choose "Create your password".':r.error.message);go.disabled=false}
      }else if(mode==='up'){
        var cd=val('cd'),pw2=document.getElementById('pw').value;
        if(!cd){err('Enter the access code from your advisor.');go.disabled=false;return}
        if(pw2.length<8){err('Choose a password of at least 8 characters.');go.disabled=false;return}
        window.__busy=true;
        var sess=null;
        var si=await sb.auth.signInWithPassword({email:em,password:pw2});
        if(!si.error)sess=si.data.session;
        else{
          var u=await sb.auth.signUp({email:em,password:pw2});
          if(u.error){window.__busy=false;err(/already registered/i.test(u.error.message)?'An account with this email already exists. Use Sign in, or "Forgot password" if you cannot remember it.':u.error.message);go.disabled=false;return}
          sess=u.data.session;
          if(!sess){var s2=await sb.auth.signInWithPassword({email:em,password:pw2});if(s2.error){window.__busy=false;err(s2.error.message);go.disabled=false;return}sess=s2.data.session}
        }
        var c=await sb.rpc('claim_with_code',{p_code:cd});
        if(c.error||!c.data){await sb.auth.signOut();window.__busy=false;login('',"up");err('That email and access code do not match a case. Check them with your advisor.');return}
        window.__busy=false;window.__entered=true;enter(sess);
      }else{
        var o=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.href.split('#')[0]}});
        if(o.error){err(o.error.message);go.disabled=false;return}
        login('Check your inbox for '+esc2(em)+'. Open the link on this device.','link');
      }
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
  async function enter(session){
    shell('<p class="small">Loading…</p>');
    var uid=session.user.id;
    var p=await sb.from('profiles').select('role,case_id,email').eq('id',uid).maybeSingle();
    if(p.error){shell('<p>Could not load your account: '+esc2(p.error.message)+'</p>');return}
    var prof=p.data||{role:'candidate',case_id:null,email:session.user.email};
    app.innerHTML='';
    var isAdmin=prof.role==='admin';
    if(!isAdmin&&!prof.case_id){shell('<p>This email is not linked to a case yet. Ask your advisor to add <b>'+esc2(prof.email||session.user.email)+'</b> and send you an access code, then use &quot;Create your password&quot;.</p><div class="addrow"><button class="btn" id="so">Sign out</button></div>');document.getElementById('so').onclick=function(){sb.auth.signOut().then(function(){location.reload()})};return}
    pwTool();
    var db=makeDb(sb,isAdmin,prof.case_id);
    startApp({db:db,sample:isAdmin?makeSample(sb,cfg):null,locked:!isAdmin,caseId:prof.case_id,me:{email:prof.email||session.user.email}});
  }
  sb.auth.getSession().then(function(r){if(r.data.session){window.__entered=true;enter(r.data.session)}else login()});
  sb.auth.onAuthStateChange(function(ev,session){if(ev==='SIGNED_IN'&&session&&!window.__entered&&!window.__busy){window.__entered=true;enter(session)}if(ev==='SIGNED_OUT'&&!window.__busy)login()});
})();

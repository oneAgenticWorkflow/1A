var LOGO_SVG='<img src="'+BRAND_TILE+'" alt="" width="38" height="38">';
/* ---------- Rendering ---------- */
function schedule(){
  if(raf)return;
  raf=requestAnimationFrame(function(){
    raf=0;
    var a=document.activeElement;
    if(a&&a.closest&&a.closest('#app')&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&a.type!=='checkbox'&&a.type!=='radio'))){pendingRender=true;return}
    pendingRender=false;render();
  });
}
function chip(t,c){return '<span class="chip'+(c?' '+c:'')+'">'+esc(t)+'</span>'}
function statCls(s){return s==='Done'?'ok':s==='In progress'?'mid':s==='Blocked'?'bad':s==='Skipped'?'':s==='Not started'?'':'gate'}
function dueCls(t){if(isDone(t.status)||!t.due)return '';var d=daysUntil(t.due);return d<0?'bad':d<=7?'gate':''}
function dueTxt(t){if(!t.due)return '';var d=daysUntil(t.due);return fmtDate(t.due).replace(/, \d{4}$/,'')+(isDone(t.status)?'':(d<0?' ('+(-d)+'d late)':d===0?' (today)':''))}
function kindChip(t){return t.kind==='form'?chip('FORM'):t.kind==='review'?chip('REVIEW'):t.kind==='ai'?chip('ANALYSIS'):t.kind==='gate'?chip('GATE','gate'):''}
function ownerLabel(o){return o==='Analysis'?'System':o}
function ownerChip(o){return '<span class="own own-'+esc(o)+'">'+esc(ownerLabel(o))+'</span>'}
function options(arr,sel,blank){return (blank!==undefined?'<option value="">'+esc(blank)+'</option>':'')+arr.map(function(x){return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'}).join('')}
function caseProgress(c){if(S.locked&&c.progress!=null)return c.progress;var ts=tasksOf(c.id).filter(function(t){return t.req!==false});if(!ts.length)return 0;return Math.round(ts.filter(function(t){return isDone(t.status)}).length/ts.length*100)}
function bar(p){return '<div class="bar" role="img" aria-label="'+p+' percent"><i style="width:'+p+'%"></i></div>'}
function waitingFor(t){var by={};tasksOf(t.cid).forEach(function(x){by[x.key]=x});return (t.deps||[]).map(function(k){return by[k]}).filter(function(d){return d&&!isDone(d.status)})}

function render(){
  var app=document.getElementById('app');if(!app)return;
  var y=window.scrollY;
  var h='';
  if(!db){return}
  if(S.dberr){app.innerHTML='<div class="panel"><h2>Could not load</h2><p>Storage returned: '+esc(S.dberr)+'. Reload the page.</p></div>';return}
  if(!S.ready){app.innerHTML='<p class="small">Loading cases…</p>';return}
  h+=topbar();
  if(S.msg)h+='<div class="banner '+S.msgKind+'" role="status">'+esc(S.msg)+(S.msgGo?' <button class="btn sm pri" data-a="'+S.msgGo.a+'" data-id="'+S.msgGo.id+'">View: '+esc(S.msgGo.l)+'</button>':'')+' <button class="link" data-a="dismiss">Dismiss</button></div>';
  if(S.busy)h+='<div class="banner busy" role="status">Analysis is running: '+esc(S.busy)+'… <button class="btn sm" data-a="cancel">Stop</button></div>';
  if(S.setup)h+='<div class="banner busy" role="status">'+esc(S.setup)+'</div>';
  var c=cur();
  if(S.locked)h+=c?candidateView(c):'<div class="panel"><h2>No case yet</h2><p>Your login is not linked to a case. Ask your administrator.</p></div>';
  else if(S.home==='new')h+=newCaseView();
  else if(S.home==='users'&&!c&&S.staff==='admin')h+=usersView();
  else if(S.home==='tasks'&&!c)h+=allTasksView();
  else if(c)h+=(S.role==='Candidate'?candidateView(c):caseView(c));
  else h+=casesView();
  app.innerHTML=h;
  app.classList.toggle('adm',!S.locked&&S.role!=='Candidate');
  if(S.focusCaseTab&&!S.locked&&c&&S.role!=='Candidate'){
    S.focusCaseTab=false;
    var activeTab=app.querySelector('.nav.tabs .tab.on');
    var tabRow=app.querySelector('.nav.tabs');
    if(activeTab){try{activeTab.focus({preventScroll:true})}catch(e){}}
    if(tabRow){var top=tabRow.getBoundingClientRect().top+window.scrollY-16;window.scrollTo({top:Math.max(0,top),behavior:'instant'});}
  }else if(typeof y==='number')window.scrollTo(0,y);
  reconcile();
}

function topbar(){return topbar0()+pwPanel()}
function pwPanel(){
  if(!S.pwOpen)return '';
  return '<div class="panel pwp"><b>Change your password</b><div class="addrow"><input id="np" type="password" autocomplete="new-password" placeholder="New password (8+ characters)"><button class="btn pri sm" data-a="pw-save">Save</button><button class="btn sm" data-a="pw-cancel">Cancel</button></div>'+(S.pwMsg?'<p class="small">'+esc(S.pwMsg)+'</p>':'')+'</div>';
}
function topbar0(){
  var c=cur();
  if(S.locked){var em=(S.me&&(S.me.name||S.me.username||S.me.email))||'',nm=(c&&c.name)||em;var ini=nm.split(/[ @.]+/).filter(Boolean).slice(0,2).map(function(x){return x[0].toUpperCase()}).join('');
    return '<header class="cv-top"><div class="cv-brand"><span class="cv-logo">'+LOGO_SVG+'</span><div><b>Arcanam Pathway</b><small>Your private case page</small></div></div><div class="cv-user"><span class="cv-av" aria-hidden="true">'+esc(ini)+'</span><span class="cv-em">'+esc(em)+'</span><button class="btn sm ghost" data-a="pw-open">Change password</button><button class="btn sm" data-a="signout">Sign out</button></div></header>';}
  var adm=S.staff==='admin';
  return '<div class="top"><div class="brandh"><span class="cv-logo">'+LOGO_SVG+'</span><div><h1>Arcanam Pathway</h1><div class="priv">'+(adm?'Admin':'Supervisor')+' · '+esc(S.me&&(S.me.name||S.me.username||S.me.email)||'')+' · screening aid, not legal advice</div></div></div>'+
   '<div class="nav"><button class="tab'+(!c&&S.home==='cases'?' on':'')+'" data-a="home">Cases</button>'+
   '<button class="tab'+(!c&&S.home==='tasks'?' on':'')+'" data-a="alltasks">All tasks</button>'+
   (adm?'<button class="tab'+(!c&&S.home==='users'?' on':'')+'" data-a="usr-open">People</button><button class="btn pri" data-a="newcase">New candidate</button>':'')+'<button class="btn sm ghost" data-a="pw-open">Change password</button><button class="btn sm ghost" data-a="signout">Sign out</button></div></div>';
}


/* ----- logins (admins only) ----- */
function credPanel(){
  if(!S.cred)return '';
  var x=S.cred;
  return '<div class="panel cred"><div class="ph"><h3>Login created for '+esc(x.name||x.username)+'</h3><button class="link" data-a="cred-close">Close</button></div>'+
   '<div class="banner ok">The password is shown only now. Copy the message below and send it. Use Reset password later if it is lost.</div>'+
   '<p><b>Username:</b> <code>'+esc(x.username)+'</code> &nbsp; <b>Temporary password:</b> <code>'+esc(x.password)+'</code></p>'+
   '<textarea class="tall" readonly>'+esc(credText(x.name,x.username,x.password,x.role))+'</textarea></div>';
}
function loginPanel(c){
  if(S.staff!=='admin')return '';
  var h=credPanel();
  var lu=((S.users&&S.users.profiles)||[]).find(function(p){return p.role==='candidate'&&p.case_id===c.id});
  h+='<div class="panel"><div class="ph"><h3>Candidate login</h3></div>';
  if(S.usersErr)return h+'<p class="small">Could not load logins: '+esc(S.usersErr)+'</p></div>';
  if(!S.users)return h+'<p class="small">Loading…</p></div>';
  if(lu){
    h+='<p>Username: <b>'+esc(lu.username||lu.email)+'</b>'+(lu.must_change?' · <span class="chip mid">has not chosen a password yet</span>':' · <span class="chip ok">active</span>')+'</p><label class="f" for="candidate_contact_email">Invitation email</label><div class="addrow"><input id="candidate_contact_email" type="email" data-draft="candidate_contact_email" value="'+esc(S.draft.candidate_contact_email!==undefined?S.draft.candidate_contact_email:(lu.contact_email||c.email||''))+'" placeholder="candidate@example.com"><button class="btn sm" data-a="candidate-email-save" data-id="'+esc(c.id)+'">Save email</button></div><div class="addrow"><button class="btn sm pri" data-a="candidate-email-invite" data-id="'+esc(c.id)+'">Invite Candidate by email</button>'+ 
      (S.confirmUser==='r:'+lu.id?'<button class="btn sm danger" data-a="usr-reset-yes" data-id="'+esc(lu.id)+'">Yes, issue a new password</button><button class="btn sm" data-a="usr-cancel">Cancel</button>':'<button class="btn sm" data-a="usr-reset" data-id="'+esc(lu.id)+'">Reset password</button>')+'</div>';
  }else{
    var sug=S.draft.cl_user!==undefined?S.draft.cl_user:slugName(c.name);
    h+='<p class="small">This candidate has no login yet. Choose a username and create it; you will get a temporary password to share.</p><div class="two"><div><label class="f" for="cl_user">Username</label><input id="cl_user" type="text" data-draft="cl_user" value="'+esc(sug)+'" autocomplete="off"></div></div>'+
      '<div class="addrow"><button class="btn pri sm" data-a="usr-create-cand" data-id="'+esc(c.id)+'">Create login</button></div><p class="small">After creating the login, use Invite Candidate by email to send a secure activation link.</p>';
  }
  return h+'</div>';
}
function usersView(){
  var h=credPanel();
  if(S.usersErr)return h+'<div class="panel"><p>Could not load people: '+esc(S.usersErr)+'</p></div>';
  if(!S.users)return h+'<p class="small">Loading…</p>';
  var P=S.users.profiles.slice().sort(function(a,b){return (a.role+(a.display_name||a.username||''))<(b.role+(b.display_name||b.username||''))?-1:1});
  var role=S.draft.ur||'supervisor';
  h+='<div class="panel"><h3>Add a person</h3><p class="small">You create every login. Each person gets a username and a temporary password and chooses their own at first sign-in. Candidate logins are normally created from the candidate\'s case page.</p>'+
   '<div class="two"><div><label class="f" for="ur">Role</label><select id="ur" data-draft="ur">'+[['supervisor','Supervisor (assigned cases)'],['admin','Admin (full control)'],['candidate','Candidate (one case)']].map(function(r){return '<option value="'+r[0]+'"'+(r[0]===role?' selected':'')+'>'+r[1]+'</option>'}).join('')+'</select></div>'+
   '<div><label class="f" for="un">Full name</label><input id="un" type="text" data-draft="un" value="'+esc(S.draft.un||'')+'"></div></div>'+
   '<div class="two"><div><label class="f" for="uu">Username</label><input id="uu" type="text" data-draft="uu" value="'+esc(S.draft.uu!==undefined?S.draft.uu:slugName(S.draft.un))+'" autocomplete="off"></div>'+
   '<div><label class="f" for="ue">Contact email (optional, for your records)</label><input id="ue" type="text" data-draft="ue" value="'+esc(S.draft.ue||'')+'"></div></div>'+
   (role==='candidate'?'<label class="f" for="uc">Case</label><select id="uc" data-draft="uc"><option value="">Choose a case</option>'+S.cands.filter(function(c){return !P.some(function(p){return p.role==='candidate'&&p.case_id===c.id})}).map(function(c){return '<option value="'+esc(c.id)+'"'+(S.draft.uc===c.id?' selected':'')+'>'+esc(c.name)+'</option>'}).join('')+'</select>':'')+
   '<div class="addrow"><button class="btn pri" data-a="usr-create">Create login</button></div></div>';
  h+='<div class="panel"><h3>People</h3><div class="tablewrap"><table class="tbl"><thead><tr><th>Name</th><th>Sign-in</th><th>Role</th><th>Cases</th><th></th></tr></thead><tbody>';
  P.forEach(function(p){
    var asg=S.users.assign.filter(function(a){return a.user_id===p.id}).map(function(a){return a.case_id});
    var cs=p.role==='candidate'?((S.cands.find(function(c){return c.id===p.case_id})||{}).name||'(case removed)'):p.role==='admin'?'All':(asg.length?asg.map(function(id){return (S.cands.find(function(c){return c.id===id})||{}).name||id}).join(', '):'None assigned');
    h+='<tr><td>'+esc(p.display_name||'')+'</td><td>'+esc(p.username||p.email||'')+(p.must_change?' <span class="chip mid">new</span>':'')+'</td><td>'+esc(p.role)+'</td><td>'+esc(cs)+'</td><td class="rowact">'+
      (S.confirmUser==='r:'+p.id?'<button class="btn sm danger" data-a="usr-reset-yes" data-id="'+esc(p.id)+'">Yes, new password</button><button class="btn sm" data-a="usr-cancel">Cancel</button>':'<button class="btn sm" data-a="usr-reset" data-id="'+esc(p.id)+'">Reset password</button>')+
      (S.confirmUser==='d:'+p.id?'<button class="btn sm danger" data-a="usr-del-yes" data-id="'+esc(p.id)+'">Yes, remove</button><button class="btn sm" data-a="usr-cancel">Keep</button>':'<button class="btn sm danger" data-a="usr-del" data-id="'+esc(p.id)+'">Remove</button>')+'</td></tr>';
    if(p.role==='supervisor'){
      h+='<tr><td colspan="5"><div class="small">Assigned cases for '+esc(p.display_name||p.username)+':</div><div class="chips">'+(S.cands.length?S.cands.map(function(c){var on=asg.indexOf(c.id)>=0;return '<button class="btn sm'+(on?' pri':'')+'" data-a="asg-toggle" data-id="'+esc(p.id+'|'+c.id)+'" aria-pressed="'+on+'">'+esc(c.name)+'</button>'}).join(''):'<span class="small">No cases yet.</span>')+'</div></td></tr>';
    }
  });
  return h+'</tbody></table></div></div>';
}

/* ----- cases list ----- */
function ensurePathwayDashboardStyle(){
  if(document.getElementById('pathway-dashboard-style'))return;
  var style=document.createElement('style');style.id='pathway-dashboard-style';
  style.textContent=[
    '.pathway-overview{background:linear-gradient(125deg,#234D3D,#315A45);color:#fff;border-radius:18px;padding:24px;margin:16px 0 22px;box-shadow:0 12px 30px rgba(35,77,61,.10)}',
    '.pathway-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}.pathway-eyebrow{font-size:10px;letter-spacing:.16em;color:#DCC69D;font-weight:750}.pathway-heading h2{font-size:27px;letter-spacing:-.035em;margin:7px 0 4px;color:#fff}.pathway-heading p{color:#E3E9DF;font-size:13px;margin:0}',
    '.pathway-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.pathway-metric{background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:5px}.pathway-metric>span{font-size:12px;color:#E5EDE5}.pathway-metric strong{font-size:30px;line-height:1.2;letter-spacing:-.04em;color:#fff}.pathway-metric small{font-size:11px;color:#D1DED1}.pathway-urgent strong{color:#F1D1A5}',
    '.pathway-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:19px 0 11px}.pathway-section-title h3{margin:0;font-size:17px;letter-spacing:-.02em}.pathway-section-title>span{font-size:12px;color:#697369}',
    '.pathway-attention{margin-bottom:22px}.pathway-alert{display:flex;align-items:center;justify-content:space-between;text-align:left;width:100%;padding:12px 16px;margin:6px 0;background:#FFFAF2;border:1px solid #E8DAC4;border-radius:10px;color:#202A23;cursor:pointer;gap:14px}.pathway-alert b{font-size:13px}.pathway-alert small{display:block;font-size:11px;color:#766F60;margin-top:3px}.pathway-alert-due{font-size:11px;color:#946A36;white-space:nowrap}',
    '.pathway-cases{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pathway-case{display:block;width:100%;text-align:left;padding:19px;background:#FFFFFF;border:1px solid #E7E6DE;border-radius:14px;color:#202A23;cursor:pointer;transition:border-color .18s,box-shadow .18s}.pathway-case:hover,.pathway-case:focus-visible{border-color:#74977C;box-shadow:0 7px 22px rgba(35,77,61,.09)}',
    '.pathway-case-top,.pathway-case-progress{display:flex;align-items:center;justify-content:space-between;gap:12px}.pathway-case-top b{font-size:16px;letter-spacing:-.02em}.pathway-case-top small{display:block;margin-top:4px;color:#687168;font-size:11px}.pathway-case-arrow{color:#42745C;font-size:20px}.pathway-case-tags{display:flex;gap:5px;flex-wrap:wrap;margin:14px 0}.pathway-case-progress{font-size:11px;color:#687168;margin-bottom:7px}.pathway-case-progress strong{font-size:12px;color:#234D3D}.pathway-case .bar{margin:0}.pathway-case-foot{display:flex;flex-direction:column;gap:5px;margin-top:13px;color:#687168;font-size:11px}',
    '@media(max-width:760px){.pathway-overview{padding:17px;border-radius:14px}.pathway-heading{align-items:flex-start}.pathway-heading h2{font-size:23px}.pathway-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pathway-metric{padding:12px}.pathway-metric strong{font-size:25px}.pathway-cases{grid-template-columns:1fr}.pathway-alert-due{white-space:normal;text-align:right}}'
  ].join('');
  document.head.appendChild(style);
}

function casesView(){
  ensurePathwayDashboardStyle();
  var open=0,late=0,wait=0;
  S.tasks.forEach(function(t){if(t.status==='Not started'||isDone(t.status))return;open++;if(t.due&&daysUntil(t.due)<0)late++;if(t.owner==='Candidate')wait++});
  var sorted=S.cands.slice().sort(function(a,b){return (a.createdAt||'')<(b.createdAt||'')?1:-1});
  var active=sorted.filter(function(c){return caseProgress(c)<100}).length;
  var h='<section class="pathway-overview" aria-label="Case portfolio overview">'+
    '<div class="pathway-heading"><div><div class="pathway-eyebrow">ARCANAM / CASE INTELLIGENCE</div><h2>Case overview</h2><p>Priorities, evidence readiness, and progress across your portfolio.</p></div>'+
    '</div>'+
    '<div class="pathway-metrics">'+
    '<div class="pathway-metric"><span>Active cases</span><strong>'+active+'</strong><small>'+S.cands.length+' total candidates</small></div>'+
    '<div class="pathway-metric"><span>Open tasks</span><strong>'+open+'</strong><small>Currently in progress</small></div>'+
    '<div class="pathway-metric'+(late?' pathway-urgent':'')+'"><span>Overdue tasks</span><strong>'+late+'</strong><small>'+ (late?'Require attention':'No overdue work')+'</small></div>'+
    '<div class="pathway-metric"><span>Candidate actions</span><strong>'+wait+'</strong><small>Waiting on candidates</small></div></div></section>';
  if(!sorted.length)return h;
  var attention=[];
  S.tasks.forEach(function(t){
    if(t.status==='Not started'||isDone(t.status)||!t.due||daysUntil(t.due)>=0||(t.owner==='Candidate'&&(t.req!==false||/^art/.test(t.key||''))))return;
    var owner=sorted.find(function(c){return c.id===t.cid});if(owner)attention.push({t:t,c:owner});
  });
  attention.sort(function(a,b){return a.t.due<b.t.due?-1:1});
  if(attention.length){
    h+='<section class="pathway-attention"><div class="pathway-section-title"><h3>Needs attention</h3><span>'+attention.length+' overdue</span></div>';
    attention.slice(0,3).forEach(function(x){h+='<button class="pathway-alert" data-a="gotask" data-id="'+esc(x.t.id)+'"><span><b>'+esc(x.t.title)+'</b><small>'+esc(x.c.name)+' · '+esc(x.t.owner)+'</small></span><span class="pathway-alert-due">'+esc(dueTxt(x.t))+' &rarr;</span></button>'});
    h+='</section>';
  }
  /* reminders to send */
  var rem=[];
  S.tasks.forEach(function(t){
    if(t.owner!=='Candidate'||t.status==='Not started'||isDone(t.status)||t.status==='Skipped'||t.req===false&&!/^art/.test(t.key||'')||!t.due||daysUntil(t.due)>3)return;
    var oc=sorted.find(function(c){return c.id===t.cid});if(oc)rem.push({t:t,c:oc,d:daysUntil(t.due)});
  });
  rem.sort(function(a,b){return a.d-b.d});
  if(rem.length){
    h+='<section class="pathway-attention"><div class="pathway-section-title"><h3>Reminders to send</h3><span>'+rem.length+' due soon or overdue</span></div>';
    rem.slice(0,8).forEach(function(x){h+='<button class="pathway-alert" data-a="nudge" data-id="'+esc(x.t.id)+'"><span><b>'+esc(x.c.name)+'</b><small>'+esc(cxName(x.t))+'</small></span><span class="pathway-alert-due">'+(x.d<0?'Overdue by '+(-x.d)+(x.d===-1?' day':' days'):x.d===0?'Due today':'Due in '+x.d+(x.d===1?' day':' days'))+' · Write message &rarr;</span></button>'});
    h+='<p class="small" style="margin:8px 2px 0">The app does not send anything on its own. Tap a row to get a ready message you can copy into email or chat.</p></section>';
  }
  if(S.copyText!==null)h+='<div class="panel"><div class="ph"><h3>Reminder (select and copy)</h3><button class="link" data-a="copy-close">Close</button></div><textarea class="tall" readonly>'+esc(S.copyText)+'</textarea></div>';
  h+='<div class="pathway-section-title"><h3>Candidate portfolio</h3><span>'+sorted.length+' cases</span></div><div class="pathway-cases">';
  sorted.forEach(function(c){
    var ts=tasksOf(c.id),n=counts(c),rd=readiness(c),progress=caseProgress(c);
    var next=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)&&t.due}).sort(function(a,b){return a.due<b.due?-1:1})[0];
    var overdue=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)&&t.due&&daysUntil(t.due)<0}).length;
    var stage=STAGES[c.stage||0];
    h+='<button class="pathway-case" data-a="open" data-id="'+esc(c.id)+'">'+
      '<span class="pathway-case-top"><span><b>'+esc(c.name)+'</b><small>'+esc(c.visa||'Status not specified')+(c.visaExpiry?' · Expires '+esc(c.visaExpiry):'')+'</small></span><span class="pathway-case-arrow" aria-hidden="true">&rarr;</span></span>'+
      '<span class="pathway-case-tags">'+chip('Stage '+((c.stage||0)+1)+' · '+stage.n,stage.gate?'gate':'')+chip(rd.k,rd.cls)+(overdue?chip(overdue+' overdue','bad'):'')+'</span>'+
      '<span class="pathway-case-progress"><span>Workflow progress</span><strong>'+progress+'%</strong></span>'+bar(progress)+
      '<span class="pathway-case-foot"><span>'+n.High+' high-strength criteria</span><span>'+(next?'Next · '+esc(next.title):'No upcoming dated task')+'</span></span></button>';
  });
  return h+'</div>';
}

function newCaseView(){
  return '<div class="panel newcase"><h2>New candidate</h2><p class="small">Creating the case builds the whole workflow: '+TEMPLATE.length+' tasks across '+STAGES.length+' stages, with owners, due dates and dependencies. Later steps unlock as earlier ones finish.</p>'+
   
   '<label class="f" for="nn">Full name</label><input id="nn" type="text" data-draft="nn" value="'+esc(S.draft.nn||'')+'">'+
   '<div class="two"><div><label class="f" for="ndob">Date of birth</label><input id="ndob" type="date" data-draft="ndob" max="'+today()+'" value="'+esc(S.draft.ndob||'')+'"></div>'+
   '<div><label class="f" for="nsex">Gender</label><select id="nsex" data-draft="nsex"><option value="">Select gender</option><option value="Male"'+(S.draft.nsex==='Male'?' selected':'')+'>Male</option><option value="Female"'+(S.draft.nsex==='Female'?' selected':'')+'>Female</option></select></div></div>'+
   '<label class="f" for="nemp">Employer name</label><input id="nemp" type="text" data-draft="nemp" value="'+esc(S.draft.nemp||'')+'" placeholder="Current employer">'+
   '<div class="two"><div><label class="f" for="ne">Email</label><input id="ne" type="text" data-draft="ne" value="'+esc(S.draft.ne||'')+'"></div>'+
   '<div><label class="f" for="nv">Current status</label><select id="nv" data-draft="nv">'+options(VISAS,S.draft.nv||'H-1B')+'</select></div>'+
   '<div><label class="f" for="nx">Status expiry</label><input id="nx" type="date" data-draft="nx" value="'+esc(S.draft.nx||'')+'"></div>'+
   '<div><label class="f" for="ng">Timeline goal</label><select id="ng" data-draft="ng">'+options(GOALS,S.draft.ng||'12 months')+'</select></div></div>'+
   '<div class="addrow"><button class="btn pri" data-a="create">Create case and start workflow</button><button class="btn" data-a="home">Cancel</button></div></div>';
}

/* ----- all tasks ----- */
function allTasksView(){
  var f=S.filter,list=S.tasks.filter(function(t){
    if(t.draft)return f.status!=='Done';
    if(f.owner!=='All'&&t.owner!==f.owner)return false;
    if(f.status==='Open')return t.status!=='Not started'&&!isDone(t.status);
    if(f.status==='Overdue')return t.status!=='Not started'&&!isDone(t.status)&&t.due&&daysUntil(t.due)<0;
    if(f.status==='Locked')return t.status==='Not started';
    if(f.status==='Done')return isDone(t.status);
    return true;
  }).sort(function(a,b){return (a.due||'9')<(b.due||'9')?-1:1});
  var h='<div class="panel"><div class="ph"><h2>All tasks</h2><div class="seg"><label class="small">Owner</label><select data-filter="owner">'+options(['All'].concat(OWNERS),f.owner)+'</select><label class="small">Show</label><select data-filter="status">'+options(['Open','Overdue','Locked','Done','All'],f.status)+'</select></div></div>';
  if(!list.length)h+='<p class="empty">Nothing matches.</p>';
  list.slice(0,300).forEach(function(t){
    var c=S.cands.find(function(x){return x.id===t.cid});if(!c)return;
    h+='<div class="task"><button class="chk'+(isDone(t.status)?' on':'')+'" disabled aria-hidden="true"></button><div class="tt"><b>'+esc(t.title)+'</b><small>'+esc(c.name)+' · '+esc(STAGES[t.stage].n)+'</small></div>'+ownerChip(t.owner)+'<span class="chip '+dueCls(t)+'">'+esc(dueTxt(t)||'no date')+'</span><button class="btn sm" data-a="gotask" data-id="'+t.id+'">Open</button></div>';
  });
  return h+'</div>';
}

/* Planning forecast uses recorded task dates only; no speculative USCIS timing. */
function filingReadinessForecast(c,ts){
  var active=ts.filter(t=>t.req!==false&&t.status!=='Skipped'&&!isDone(t.status));
  var all=Object.fromEntries(ts.filter(t=>t.key).map(t=>[t.key,t]));
  var today=Math.floor(Date.now()/86400000),cache={},stack={},cycles=0,undated=0;
  function parse(v){return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v||'')?Math.floor(Date.parse(v+'T12:00:00Z')/86400000):null}
  function work(start,n){var d=new Date(start*86400000);while(n>0){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)n--}return Math.floor(d.getTime()/86400000)}
  function fmt(n){return fmtDate(new Date(n*86400000).toISOString().slice(0,10))}
  function calc(t){
    if(isDone(t.status))return {lo:today,hi:today,path:[]};
    if(cache[t.id])return cache[t.id];
    if(stack[t.id]){cycles++;return {lo:today,hi:today,path:[]}}
    stack[t.id]=true;
    var deps=(t.deps||[]).map(k=>all[k]).filter(Boolean).map(calc);
    var lo=Math.max(today,...deps.map(x=>x.lo)),hi=Math.max(today,...deps.map(x=>x.hi));
    var lead=t.owner==='Attorney'?7:t.owner==='Candidate'?5:t.owner==='Analysis'?3:4;
    if(t.status==='In progress')lead=Math.max(2,Math.ceil(lead/2));
    if(t.status==='Blocked')lead+=5;
    lo=work(lo,lead);hi=work(hi,Math.ceil(lead*1.6)+2);
    var due=parse(t.due);if(due===null)undated++;else{lo=Math.max(lo,due);hi=Math.max(hi,due)}
    var longest=deps.slice().sort((x,y)=>y.hi-x.hi)[0];
    var out={lo:lo,hi:hi,path:(longest?longest.path:[]).concat([t])};
    delete stack[t.id];return cache[t.id]=out;
  }
  active.forEach(calc);
  function phase(min,max,previous){
    var tasks=active.filter(t=>t.stage>=min&&t.stage<=max),lo=previous?previous.lo:today,hi=previous?previous.hi:today,path=previous?previous.path:[];
    tasks.forEach(t=>{var v=calc(t);lo=Math.max(lo,v.lo);if(v.hi>=hi){hi=v.hi;path=v.path}});
    return {lo:lo,hi:hi,path:path,count:tasks.length};
  }
  var evidence=phase(0,6),attorney=phase(7,7,evidence),filing=phase(8,8,attorney);
  var stages=[['Evidence preparation',evidence],['Attorney review',attorney],['Filing preparation',filing]];
  var h='<section class="panel filing-forecast"><div class="filing-forecast-head"><div><p class="cv-work-eyebrow">CASE PLANNING</p><h3>Filing readiness forecast</h3><p>Provisional ranges based on dependencies, ownership, due dates and parallel work.</p></div>'+chip(active.length+' tasks remaining',active.length?'mid':'ok')+'</div><div class="filing-forecast-grid">';
  stages.forEach((row,i)=>{var x=row[1];h+='<div class="filing-forecast-step"><span>0'+(i+1)+' · '+esc(row[0])+'</span><b>'+(active.length?esc(fmt(x.lo)+' – '+fmt(x.hi)):'Tracked work complete')+'</b><small>'+x.count+' outstanding tasks in this phase</small></div>'});
  h+='</div>';
  var critical=filing.path.filter(t=>!isDone(t.status));
  if(critical.length)h+='<div class="filing-forecast-detail"><b>Potential critical path</b><p>'+critical.slice(0,5).map(t=>esc(t.title)).join(' → ')+(critical.length>5?' → +'+(critical.length-5)+' more':'')+'</p></div>';
  if(undated)h+='<p class="filing-forecast-warning">'+undated+' tasks lack due dates. Provisional durations: candidate 5, advisor 4, analysis 3, attorney 7 working days; blocked work adds 5. Confirm dates and attorney availability.</p>';
  if(cycles)h+='<p class="filing-forecast-warning">Circular dependencies detected; review task relationships.</p>';
  return h+'<p class="filing-forecast-note">Planning scenarios only, not confidence intervals or promised dates. No historical throughput or staff capacity is modeled yet. Attorney review, legal signoff, filing eligibility and USCIS processing are not predicted. Filing requires attorney confirmation.</p></section>';
}

/* ----- case view ----- */
function caseView(c){
  var ts=tasksOf(c.id),st=c.stage||0,rd=readiness(c);
  var h='<div class="casehead"><div><button class="link" data-a="home">&larr; All cases</button><h2>'+esc(c.name)+'</h2><div class="meta"><span>'+esc(c.visa||'')+(c.visaExpiry?' · expires '+esc(c.visaExpiry):'')+'</span><span>Goal: '+esc(c.goal||'')+'</span><span>'+chip(rd.k,rd.cls)+'</span><span>FOE: '+esc((c.foe&&c.foe.locked)||'not locked')+'</span>'+((S.staff==='admin'&&c.costs&&c.costs.length)?'<span title="AI cost, admins only">AI cost: $'+c.costs.reduce(function(a,x){return a+(x.usd||0)},0).toFixed(2)+'</span>':'')+'</div></div>'+
   '<div class="chips"><button class="btn sm" data-a="asCand">View as candidate</button><button class="btn sm" data-a="copy">Copy summary</button>'+(S.staff!=='admin'?'':S.confirmDel?'<button class="btn sm danger" data-a="delete-yes">Yes, delete this case</button><button class="btn sm" data-a="delete-no">Keep</button>':'<button class="btn sm danger" data-a="delete">Delete case</button>')+'</div></div>';
  if(S.staff==='admin')h+='<div class="addrow"><button class="btn sm" data-a="candidate-login-toggle" aria-expanded="'+(S.showCandidateLogin===c.id?'true':'false')+'">'+(S.showCandidateLogin===c.id?'Hide candidate login':'Candidate login')+'</button></div>';
  if(S.showCandidateLogin===c.id)h+=loginPanel(c);
  if(S.copyText!==null)h+='<div class="panel"><div class="ph"><h3>Summary (select and copy)</h3><button class="link" data-a="copy-close">Close</button></div><textarea class="tall" readonly>'+esc(S.copyText)+'</textarea></div>';
  h+='<div class="steps">'+STAGES.map(function(s,i){return '<div class="step'+(i<st?' done':i===st?' now':'')+(s.gate?' g':'')+'" title="'+esc(s.d)+'"><i>'+(i+1)+'</i>'+esc(s.n)+'</div>'}).join('')+'</div>'+bar(caseProgress(c));
  var blockers=ts.filter(function(t){return t.stage===st&&t.req!==false&&!isDone(t.status)});
  if(blockers.length){
    var byO={};blockers.forEach(function(t){byO[t.owner]=(byO[t.owner]||0)+1});
    h+='<div class="blockers"><b>Stage '+(st+1)+' ('+esc(STAGES[st].n)+') finishes when these are done.</b> Waiting on: '+Object.keys(byO).map(function(o){return byO[o]+' '+o}).join(', ')+'.<ul>'+blockers.slice(0,6).map(function(t){return '<li>'+esc(t.title)+' <span class="small">('+esc(t.owner)+(t.status==='Not started'?', locked':'')+')</span></li>'}).join('')+(blockers.length>6?'<li class="small">and '+(blockers.length-6)+' more</li>':'')+'</ul></div>';
  }
  h+=lanes(c,ts);
  h+=filingReadinessForecast(c,ts);
  var tabs=[['tasks','Tasks'],['forms','Forms'],['docs','Documents'],['profile','Profile'],['pathway','Pathway screening'],['development','Evidence tracks'],['niwcase','NIW case'],['strategy','Strategy'],['guide','Pathway guide'],['score','Scorecard'],['field','Field'],['plan','Plan'],['feas','Feasibility'],['activity','Activity']];
  h+='<div class="nav tabs">'+tabs.map(function(t){return '<button class="tab'+(S.tab===t[0]?' on':'')+'" data-a="tab" data-id="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div><div class="case-tab-content">';
  if(S.tab==='tasks')h+=tasksTab(c,ts);
  else if(S.tab==='forms')h+=formsTab(c);
  else if(S.tab==='docs')h+=docsPanel(c,true);
  else if(S.tab==='profile')h+=profileTab(c);
  else if(S.tab==='pathway')h+=pathwayScreening(c);
  else if(S.tab==='development')h+=pathwayDevelopment(c);
  else if(S.tab==='niwcase')h+=niwCaseFlow(c,false);
  else if(S.tab==='strategy')h+=pathwayStrategy(c);
  else if(S.tab==='guide')h+=pathwayGuide();
  else if(S.tab==='score')h+=scoreTab(c);
  else if(S.tab==='field')h+=fieldTab(c);
  else if(S.tab==='plan')h+=planTab(c);
  else if(S.tab==='feas')h+=feasTab(c);
  else h+=activityTab(c);
  return h+'</div>';
}

var PATHWAY_REQUIREMENTS={
 niw:[
 ['eb2_degree','EB-2 threshold','Qualifying completed degree and transcripts, or exceptional-ability evidence'],
 ['niw_endeavor','Proposed endeavor','Specific U.S. endeavor statement, objectives, and implementation plan'],
 ['niw_importance','NIW prong 1','Independent evidence of substantial merit and national importance'],
 ['niw_position','NIW prong 2','Evidence of expertise, past results, progress, support, and ability to advance the endeavor'],
 ['niw_balance','NIW prong 3','Evidence addressing why a waiver of job offer and labor certification is beneficial on balance']
 ],
 eb1a:[
 ['eb1_recognition','Extraordinary ability','Evidence of sustained national or international acclaim'],
 ['eb1_criteria','Regulatory evidence','Evidence for applicable EB-1A regulatory criteria or qualifying major award'],
 ['eb1_contribution','Independent impact','Corroboration of original contributions, recognition, and field impact'],
 ['eb1_merits','Final merits','Evidence supporting overall sustained acclaim and position among the small percentage at the top of the field']
 ]
};
function pathwayDevelopment(c){
 var ps=c.pathwayScreening||{},decision=(ps.review||{}).decision||'',tracks=decision==='both'?['niw','eb1a']:decision==='niw'||decision==='eb1a'?[decision]:[];
 if(!tracks.length)return '<div class="panel"><h3>Pathway evidence development</h3><p class="small">Record an advisor pathway decision in Pathway screening before generating pathway-specific evidence requests.</p></div>';
 var reqs=S.docs.filter(function(d){return d.cid===c.id&&d.kind==='request'}),files=S.docs.filter(function(d){return d.cid===c.id&&d.kind==='file'});
 var h='<div class="panel"><div class="ph"><h3>Pathway evidence development</h3>'+chip(tracks.length===2?'Dual track':tracks[0]==='niw'?'EB-2 NIW':'EB-1A','ok')+'</div><p class="small">Separate legal tracks share the same private document vault. Requests are created only when an advisor confirms; existing requests are reused rather than duplicated. This checklist is not an eligibility finding.</p>';
 tracks.forEach(function(track){
 h+='<div class="entry"><div class="ph"><h4>'+(track==='niw'?'EB-2 NIW — threshold and three prongs':'EB-1A — extraordinary ability and final merits')+'</h4></div>';
 PATHWAY_REQUIREMENTS[track].forEach(function(item){
 var key='pathway:'+track+':'+item[0],r=reqs.find(function(x){return x.pathwayKey===key}),uploaded=r?files.filter(function(f){return f.reqId===r.id}).length:0;
 h+='<div class="formrow"><div><b>'+esc(item[1])+'</b><p class="small">'+esc(item[2])+'</p></div><div class="chips">'+chip(r?(uploaded?uploaded+' uploaded':'Requested'):'Not requested',uploaded?'ok':r?'mid':'gate')+'</div></div>';
 });
 h+='</div>';
 });
 h+=evidenceSourceReview(c,tracks);
 h+='<div class="addrow"><button class="btn pri sm" data-a="ps-generate">Create missing evidence requests</button><button class="btn sm" data-a="tab" data-id="docs">Open shared documents</button></div><p class="small">Advisor review required for all evidence and final legal conclusions.</p></div>';
 return h;
}
var NIW_PHASES=[
 ['agreement','Candidate agreement','Candidate acknowledges NIW pathway and authorizes case preparation'],
 ['intake','NIW intake','Education, work history, status, chargeability, and proposed endeavor'],
 ['evidence','Evidence collection','EB-2 threshold, proposed endeavor and each Dhanasar prong'],
 ['draft','Petition drafting','Endeavor statement, supporting exhibits, letters, and petition narrative'],
 ['legal','Attorney review','Counsel validates petition, evidence, and filing strategy'],
 ['filing','I-140 filing','Record actual USCIS receipt and priority date'],
 ['uscis','USCIS adjudication','Track receipt, RFE, response, approval or denial'],
 ['visa','Visa availability','Monitor EB-2 chargeability, bulletin and adjustment eligibility'],
 ['residence','Green-card process','Separate I-485 or consular processing and final decision']
];
function niwReadiness(c){
 var docs=S.docs.filter(function(d){return d.cid===c.id}),reqs=docs.filter(function(d){return d.kind==='request'&&String(d.pathwayKey||'').indexOf('pathway:niw:')===0}),files=docs.filter(function(d){return d.kind==='file'});
 var findings=(c.evidenceFindings||[]).filter(function(f){return PATHWAY_REQUIREMENTS.niw.some(function(x){return x[0]===f.criterionId})});
 var checks=PATHWAY_REQUIREMENTS.niw.map(function(item){
 var key='pathway:niw:'+item[0],req=reqs.find(function(d){return d.pathwayKey===key});
 var linked=req?files.filter(function(f){return f.reqId===req.id}):[];
 var accepted=findings.filter(function(f){return f.criterionId===item[0]&&f.status==='accepted'&&linked.some(function(d){return d.id===f.fileId&&d.path})});
 return {key:item[0],label:item[1],requested:!!req,uploaded:linked.length,reviewed:accepted.length};
 });
 var all=checks.every(function(x){return x.requested&&x.uploaded>0&&x.reviewed>0});
 return {checks:checks,ready:all};
}
function niwReadinessPanel(c){
 var r=niwReadiness(c),p=c.niwCase||{},sign=p.legalSignoff||{};
 var h='<div class="entry"><div class="ph"><h4>NIW petition preparation checklist</h4>'+chip(r.ready?'Evidence checks satisfied':'Evidence review incomplete',r.ready?'ok':'mid')+'</div>'+
 '<p class="small">Each requirement needs a document request, a linked upload and at least one advisor-reviewed, source-cited finding. These checks support preparation only; they do not establish legal sufficiency.</p>';
 r.checks.forEach(function(x){h+='<div class="formrow"><div><b>'+esc(x.label)+'</b><p class="small">Request: '+(x.requested?'Created':'Missing')+' · Linked files: '+x.uploaded+' · Reviewed findings: '+x.reviewed+'</p></div>'+chip(x.requested&&x.uploaded&&x.reviewed?'Documented':'Needs work',x.requested&&x.uploaded&&x.reviewed?'ok':'mid')+'</div>'});
 h+='<div class="entry"><h4>Attorney sign-off</h4><p class="small">Record the reviewing attorney and confirmation after independent review. This field is an advisor-entered record, not an authenticated attorney signature.</p>';
 if(sign.signedAt)h+='<p class="small">Recorded: '+esc(sign.reviewer)+' · '+esc(fmt(sign.signedAt))+'</p>';
 h+='<label class="f" for="niwreviewer">Reviewing attorney name</label><input id="niwreviewer" data-draft="niwreviewer" value="'+esc(S.draft.niwreviewer!==undefined?S.draft.niwreviewer:sign.reviewer||'')+'">'+
 '<label class="f" for="niwreviewnote">Review decision and filing instructions</label><textarea id="niwreviewnote" data-draft="niwreviewnote">'+esc(S.draft.niwreviewnote!==undefined?S.draft.niwreviewnote:sign.note||'')+'</textarea>'+
 '<label class="chk-l"><input type="checkbox" data-draft-chk="niwreviewconfirm"'+(S.draft.niwreviewconfirm?' checked':'')+'> I confirm an attorney has independently reviewed the NIW petition and authorized preparation for filing.</label>'+
 '<button class="btn sm pri" data-a="niw-signoff"'+(!r.ready?' disabled':'')+'>Record attorney review</button>'+
 (!r.ready?'<p class="small">Complete evidence review before recording sign-off.</p>':'')+'</div></div>';
 return h;
}
var NIW_PACKAGE_ITEMS=[
 ['i140','Form I-140 and applicable filing documents'],
 ['endeavor','Proposed endeavor statement'],
 ['eb2','EB-2 qualifying degree or exceptional ability'],
 ['prong1','National importance evidence and analysis'],
 ['prong2','Well-positioned evidence and analysis'],
 ['prong3','On-balance waiver argument'],
 ['exhibits','Exhibit index and cited source documents'],
 ['letters','Supporting letters, where appropriate'],
 ['review','Final attorney-reviewed petition narrative']
];
function niwAdvancedWorkspace(c){
 var p=c.niwCase||{},pkg=p.package||{},rfe=p.rfe||{},visa=p.visaTracking||{};
 var h='<div class="entry"><h4>Petition package workspace</h4><p class="small">Track preparation of the I-140 package. Marking an item ready is an advisor work record, not verification of its legal sufficiency.</p>';
 NIW_PACKAGE_ITEMS.forEach(function(x){
 var item=pkg[x[0]]||{},val=S.draft['niwpkg_'+x[0]]!==undefined?S.draft['niwpkg_'+x[0]]:item.note||'';
 h+='<div class="entry"><div class="ph"><b>'+esc(x[1])+'</b>'+chip(item.ready?'Prepared':'Open',item.ready?'ok':'mid')+'</div>'+
 '<label class="f">Document location / preparation notes</label><input data-draft="niwpkg_'+x[0]+'" value="'+esc(val)+'">'+
 '<button class="btn sm" data-a="niw-package" data-id="'+x[0]+'">'+(item.ready?'Reopen item':'Mark prepared')+'</button></div>';
 });
 h+='</div><div class="entry"><h4>USCIS RFE response tracker</h4><p class="small">Use only when USCIS has actually issued a Request for Evidence. An RFE deadline must be verified against the notice; this app does not calculate or extend deadlines.</p>';
 [['notice','RFE notice date','date'],['deadline','Response due date on USCIS notice','date'],['issues','USCIS requested issues / evidence','textarea'],['response','Response package and evidence references','textarea']].forEach(function(x){
 var val=S.draft['niwrfe_'+x[0]]!==undefined?S.draft['niwrfe_'+x[0]]:rfe[x[0]]||'';
 h+='<label class="f">'+esc(x[1])+'</label>'+(x[2]==='textarea'?'<textarea data-draft="niwrfe_'+x[0]+'">'+esc(val)+'</textarea>':'<input type="date" data-draft="niwrfe_'+x[0]+'" value="'+esc(val)+'">');
 });
 h+='<label class="f">RFE status</label><select data-draft="niwrfe_status">'+[['none','No RFE'],['received','Received'],['preparing','Preparing response'],['review','Attorney review'],['sent','Response sent'],['closed','Closed']].map(function(x){return '<option value="'+x[0]+'"'+((S.draft.niwrfe_status||rfe.status||'none')===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'+
 '<button class="btn sm pri" data-a="niw-rfe">Save RFE tracker</button></div>';
 h+='<div class="entry"><h4>Post-approval visa availability</h4><p class="small">Record the bulletin actually reviewed. Visa Bulletin dates change monthly, and USCIS separately selects the adjustment filing chart. This tracker does not automatically determine I-485 eligibility.</p>';
 [['chargeability','Country of chargeability','text'],['bulletin','Visa Bulletin month (YYYY-MM)','month'],['category','Employment-based category','text'],['filingCutoff','Dates for Filing cutoff','date'],['finalCutoff','Final Action cutoff','date'],['chart','USCIS adjustment chart selected that month','text'],['notes','Counsel review / I-485 or consular-processing next steps','textarea']].forEach(function(x){
 var val=S.draft['niwvisa_'+x[0]]!==undefined?S.draft['niwvisa_'+x[0]]:visa[x[0]]||'';
 h+='<label class="f">'+esc(x[1])+'</label>'+(x[2]==='textarea'?'<textarea data-draft="niwvisa_'+x[0]+'">'+esc(val)+'</textarea>':'<input type="'+x[2]+'" data-draft="niwvisa_'+x[0]+'" value="'+esc(val)+'">');
 });
 h+='<button class="btn sm pri" data-a="niw-visa">Save bulletin review</button><p class="small"><a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" target="_blank" rel="noopener noreferrer">State Department Visa Bulletin</a> · <a href="https://www.uscis.gov/visabulletininfo" target="_blank" rel="noopener noreferrer">USCIS adjustment filing chart</a></p></div>';
 return h;
}
function niwCaseFlow(c,candidate){
 var p=c.niwCase||{},decision=(((c.pathwayScreening||{}).review||{}).decision||'');
 if(decision!=='niw'&&decision!=='both')return candidate?'':'<div class="panel"><h3>NIW case</h3><p class="small">An advisor must select NIW or both pathways in screening before starting this case.</p></div>';
 var agreed=!!(p.agreement&&p.agreement.acceptedAt),active=!!p.activatedAt;
 var h='<section class="panel"><div class="ph"><h3>EB-2 NIW case journey</h3>'+chip(active?'Active NIW case':agreed?'Awaiting advisor activation':'Agreement required',active?'ok':'mid')+'</div>'+
 '<p class="small">This is a separate NIW petition workflow. It does not establish legal eligibility or replace attorney advice. NIW I-140 approval is not a green card or employment authorization.</p>';
 if(!agreed){
 h+='<div class="entry"><h4>Pathway confirmation</h4><p>The NIW path requires EB-2 qualification and evidence addressing the proposed endeavor, national importance, your ability to advance it, and why waiving a job offer and labor certification benefits the United States.</p><p class="small">Your acknowledgement confirms your chosen preparation pathway only. It is not a legal eligibility finding, attorney engagement, or agreement to pay fees.</p>'+
 (S.locked?'<label><input type="checkbox" data-draft-chk="niw_agree" '+(S.draft.niw_agree?'checked':'')+'> I understand and agree to proceed with NIW case preparation.</label><div class="addrow"><button class="btn pri sm" data-a="niw-agree">Confirm NIW pathway</button></div>':'<p class="small">Candidate must sign in to record their own agreement.</p>')+'</div>';
 }else{
 h+='<div class="entry"><b>Candidate agreement recorded</b><p class="small">'+esc(fmt(p.agreement.acceptedAt))+' · '+esc(p.agreement.actor||'Candidate')+'</p></div>';
 if(!active&&!candidate)h+='<button class="btn pri sm" data-a="niw-activate">Activate NIW case</button>';
 if(!active&&candidate)h+='<p class="small">Your advisor will activate the NIW preparation workflow.</p>';
 }
 if(active&&candidate){
 var requestDocs=S.docs.filter(function(d){return d.cid===c.id&&d.kind==='request'&&String(d.pathwayKey||'').indexOf('pathway:niw:')===0});
 var uploaded=S.docs.filter(function(d){return d.cid===c.id&&d.kind==='file'});
 var pending=requestDocs.filter(function(d){return !uploaded.some(function(f){return f.reqId===d.id})});
 h+='<div class="entry"><div class="ph"><h4>Your NIW document requests</h4>'+chip(pending.length+' awaiting uploads',pending.length?'mid':'ok')+'</div>'+
 '<p class="small">Your advisor reviews all evidence. An upload does not mean the evidence has been accepted.</p>';
 if(!requestDocs.length)h+='<p class="small">Your advisor has not issued NIW-specific document requests yet.</p>';
 pending.forEach(function(d){h+='<div class="formrow"><div><b>'+esc(d.label)+'</b><p class="small">'+esc(d.note||'')+'</p></div><button class="btn sm" data-a="cvscroll" data-id="cvdocs">Go to documents</button></div>'});
 if(!pending.length&&requestDocs.length)h+='<p class="small">All requested categories have at least one uploaded document; advisor review may still be pending.</p>';
 h+='</div>';
 if(p.rfe&&p.rfe.status&&p.rfe.status!=='none'&&p.rfe.status!=='closed')h+='<div class="entry"><h4>USCIS additional evidence request</h4><p class="small">Your advisor has recorded an RFE. Contact your advisor for the official notice and response instructions. Recorded deadline: '+esc(p.rfe.deadline||'Not provided')+'. Do not rely on this display instead of the USCIS notice.</p></div>';
 }
 if(active){
 var completed=NIW_PHASES.filter(function(x){return (p.phases||{})[x[0]]&&((p.phases||{})[x[0]].status==='completed')}).length;
 h+='<p class="small"><b>'+completed+' of '+NIW_PHASES.length+' phases recorded complete</b>. Completion is a workflow status, not USCIS approval.</p>';
 NIW_PHASES.forEach(function(x,i){
 var record=(p.phases||{})[x[0]]||{},status=record.status||'not_started';
 h+='<div class="entry"><div class="ph"><b>'+(i+1)+'. '+esc(x[1])+'</b>'+chip(status==='completed'?'Complete':status==='in_progress'?'In progress':status==='blocked'?'Blocked':'Not started',status==='completed'?'ok':status==='blocked'?'bad':'mid')+'</div><p class="small">'+esc(x[2])+'</p>';
 if(record.note)h+='<p class="small">'+esc(record.note)+'</p>';
 if(!candidate){
 h+='<label class="f" for="niwstatus_'+x[0]+'">Phase status</label><select id="niwstatus_'+x[0]+'" data-draft="niwstatus_'+x[0]+'">'+[['not_started','Not started'],['in_progress','In progress'],['blocked','Blocked'],['completed','Complete']].map(function(o){var v=S.draft['niwstatus_'+x[0]]||status;return '<option value="'+o[0]+'"'+(v===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>'+
 '<label class="f" for="niwnote_'+x[0]+'">Advisor note</label><textarea id="niwnote_'+x[0]+'" data-draft="niwnote_'+x[0]+'">'+esc(S.draft['niwnote_'+x[0]]!==undefined?S.draft['niwnote_'+x[0]]:record.note||'')+'</textarea>'+
 '<button class="btn sm" data-a="niw-phase" data-id="'+x[0]+'">Save phase</button>';
 }
 h+='</div>';
 });
 if(!candidate){h+=niwReadinessPanel(c);h+=niwAdvancedWorkspace(c)}
 if(!candidate)h+='<div class="entry"><h4>USCIS filing details (advisor-recorded)</h4>'+
 [['receipt','USCIS receipt number'],['filed','I-140 received / filed date'],['priority','Verified priority date'],['decision','I-140 decision (pending / approved / denied / withdrawn)']].map(function(x){return '<label class="f">'+esc(x[1])+'</label><input type="'+(x[0]==='filed'||x[0]==='priority'?'date':'text')+'" data-draft="niw_'+x[0]+'" value="'+esc(S.draft['niw_'+x[0]]!==undefined?S.draft['niw_'+x[0]]:(p.filing||{})[x[0]]||'')+'">' }).join('')+
 '<button class="btn sm pri" data-a="niw-filing">Save filing details</button><p class="small">Do not infer priority date from approval date. Verify receipt notice and applicable rules.</p></div>';
 if(p.filing&&p.filing.receipt)h+='<p class="small">USCIS receipt: '+esc(p.filing.receipt)+' · Priority date: '+esc(p.filing.priority||'Not verified')+' · I-140: '+esc(p.filing.decision||'Pending')+'</p>';
 }
 h+='</section>';return h;
}
function pathwayGuide(){
 var sections=[
 ['EB-1A — Extraordinary Ability','EB-1A is a first-preference immigrant category for people who can demonstrate extraordinary ability and sustained national or international acclaim. A degree, job title, or years of experience alone is not enough. The petition requires qualifying evidence and a final-merits evaluation.'],
 ['EB-2 NIW — National Interest Waiver','NIW is a waiver within EB-2, not a separate visa queue. First, the person must qualify for EB-2 through an advanced degree or exceptional ability. Then the proposed U.S. endeavor must have substantial merit and national importance, the person must be well positioned to advance it, and on balance the waiver must benefit the United States.'],
 ['Master\'s degree and ongoing PhD','A qualifying completed master\'s degree may satisfy the EB-2 advanced-degree threshold even while a PhD is in progress. Neither degree automatically establishes NIW or EB-1A eligibility. H-1B is not required to file either I-140.'],
 ['I-140 approval versus a green card','An approved I-140 establishes an approved immigrant petition, not a green card, lawful status, or employment authorization by itself. Visa availability and eligibility for adjustment of status or consular processing are separate requirements.'],
 ['Priority dates and India backlogs','For a self-petitioned NIW without labor certification, the priority date generally is the properly filed I-140 receipt date, not its approval date. An India-chargeable NIW case is in the EB-2 India queue, not a special NIW queue. The Visa Bulletin changes monthly; no fixed waiting-time prediction is reliable.'],
 ['NIW first, EB-1A later?','A qualifying priority date from an approved EB-2 I-140 can generally be retained for a later EB-1A I-140, subject to regulatory exceptions. This is priority-date retention, not automatic green-card eligibility. EB-1A must independently be approved.'],
 ['F-1, CPT, OPT and STEM OPT','An I-140 does not extend F-1 status or grant work authorization. Filing decisions can raise immigrant-intent, travel, visa renewal, and status questions; consult qualified immigration counsel.']
 ];
 var comparison='<div class="entry"><h4>Compare the two green-card pathways</h4><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:left"><thead><tr><th scope="col" style="padding:10px">Question</th><th scope="col" style="padding:10px">EB-1A</th><th scope="col" style="padding:10px">EB-2 NIW</th></tr></thead><tbody>'+
 [
 ['Main test','Extraordinary ability and sustained acclaim','EB-2 qualification plus national-interest waiver'],
 ['Completed master\'s required?','No','No, if another EB-2 qualification route applies'],
 ['Proposed U.S. endeavor','Not assessed under the NIW three-prong test','Central to the NIW three-prong test'],
 ['Employer sponsorship','Self-petition permitted','Self-petition permitted'],
 ['Visa queue','EB-1 by chargeability','EB-2 by chargeability; no separate NIW queue'],
 ['I-140 approval grants work authorization?','No','No']
 ].map(function(x){return '<tr><th scope="row" style="padding:10px;border-top:1px solid #d8ded6">'+esc(x[0])+'</th><td style="padding:10px;border-top:1px solid #d8ded6">'+esc(x[1])+'</td><td style="padding:10px;border-top:1px solid #d8ded6">'+esc(x[2])+'</td></tr>'}).join('')+'</tbody></table></div><p class="small">Both require evidence and independent legal assessment. A long EB-2 backlog does not itself make a person eligible for EB-1A.</p></div>'+
 '<div class="entry"><h4>After an I-140 is approved</h4><div class="cols3">'+
 '<div><b>1. Petition approved</b><p class="small">USCIS approved an immigrant classification. This is not a green card or work permit.</p></div>'+
 '<div><b>2. Check visa availability</b><p class="small">Compare the priority date against the correct category and country in the monthly Visa Bulletin and USCIS filing chart.</p></div>'+
 '<div><b>3. Apply when eligible</b><p class="small">Adjustment of status (I-485) or consular processing may follow when the applicable requirements are met. Final approval requires visa availability.</p></div></div>'+
 '<p class="small"><b>Example:</b> NIW I-140 filed November 2026 and approved May 2027 generally has a November 2026 priority date. An India-chargeable applicant remains in the EB-2 India queue; approval does not make the priority date current.</p></div>';
 var h='<section class="panel"><div class="ph"><h3>Immigration Pathway Guide</h3>'+chip('Educational reference','gate')+'</div><p class="small">Understand the options before choosing a petition track. This guide is general information, not legal advice or a determination of eligibility.</p>';
 h+=comparison;
 sections.forEach(function(s){h+='<details class="entry"><summary><b>'+esc(s[0])+'</b></summary><p>'+esc(s[1])+'</p></details>'});
 h+='<div class="entry"><h4>Official resources</h4><p><a href="https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-first-preference-eb-1" target="_blank" rel="noopener noreferrer">USCIS: EB-1</a> · <a href="https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-second-preference-eb-2" target="_blank" rel="noopener noreferrer">USCIS: EB-2</a> · <a href="https://www.uscis.gov/policy-manual/volume-6-part-f-chapter-5" target="_blank" rel="noopener noreferrer">USCIS: National Interest Waiver</a> · <a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" target="_blank" rel="noopener noreferrer">State Department: Visa Bulletin</a></p><p class="small">Check the latest Visa Bulletin and USCIS adjustment filing chart each month. Eligibility, filing, and final approval are distinct decisions.</p></div></section>';
 return h;
}
function pathwayStrategy(c){
 var ps=c.pathwayScreening||{},d=ps.data||{},r=ps.review||{},s=ps.strategy||{};
 var fields=[['chargeability','Country of chargeability (usually country of birth)','text'],['prior','Existing approved I-140 priority date (if any)','date'],['niwFiled','NIW I-140 filing / receipt date (if any)','date'],['statusEnd','Current status or work authorization expiration (if known)','date'],['rationale','Advisor analysis of evidence strength, visa backlog, status risks and next steps','textarea']];
 var h='<section class="panel"><div class="ph"><h3>Pathway strategy</h3>'+chip(s.reviewedAt?'Strategy recorded':'Advisor review needed',s.reviewedAt?'ok':'mid')+'</div><p class="small">Assess EB-1A and EB-2 NIW independently. Visa Bulletin cutoffs are not calculated here; verify the current official charts. A priority date does not itself authorize I-485 filing.</p>';
 fields.forEach(function(f){var val=S.draft['strategy_'+f[0]]!==undefined?S.draft['strategy_'+f[0]]:s[f[0]]||'';h+='<label class="f" for="strategy_'+f[0]+'">'+esc(f[1])+'</label>'+(f[2]==='textarea'?'<textarea id="strategy_'+f[0]+'" data-draft="strategy_'+f[0]+'">'+esc(val)+'</textarea>':'<input id="strategy_'+f[0]+'" type="'+f[2]+'" data-draft="strategy_'+f[0]+'" value="'+esc(val)+'">')});
 h+='<div class="entry"><h4>Review prompts</h4><p><b>Current screening:</b> '+esc(r.decision||'Not decided')+'. <b>Education:</b> '+esc(d.degree||'Not recorded')+'. <b>Current status:</b> '+esc(d.status||'Not recorded')+'.</p><p class="small">For India chargeability, compare EB-1 and EB-2 Dates for Filing and Final Action Dates independently. Do not infer that EB-1A is viable from backlog length. Confirm priority-date retention and any prior I-140 revocation exceptions with counsel.</p></div><button class="btn pri sm" data-a="strategy-save">Save advisor strategy</button></section>';
 return h;
}
function pathwayAudit(c){
 var p=c.pathwayScreening||{},d=p.data||{},rev=p.review||{},elig=c.eligibilityReview||{},forms=S.tasks.filter(function(t){return t.owner==='Candidate'&&t.kind==='form'&&t.req!==false}),reviewTasks=S.tasks.filter(function(t){return t.owner!=='Candidate'&&t.kind==='form'&&t.req!==false});
 forms=forms.filter(function(t){return t.cid===c.id});reviewTasks=reviewTasks.filter(function(t){return t.cid===c.id});
 var missing=['degree','experience','status','field'].filter(function(k){return !String(d[k]||'').trim()});
 var intakeReady=forms.length>0&&forms.every(function(t){return isDone(t.status)})&&reviewTasks.every(function(t){return isDone(t.status)});
 var screened=!!(rev.decision&&rev.note&&rev.reviewedAt),eligible=!!(elig.reviewedAt&&elig.decision&&elig.note);
 var foeReady=!!(c.foe&&c.foe.locked),criteriaReady=!!(c.chosen&&c.chosen.length&&c.criteriaFinalization&&c.criteriaFinalization.approvedAt&&c.criteriaFinalization.foe===(c.foe||{}).locked);
 return {intakeReady:intakeReady,missing:missing,screened:screened,eligible:eligible,foeReady:foeReady,criteriaReady:criteriaReady,forms:forms.length,reviewTasks:reviewTasks.length};
}
function pathwayAuditPanel(c){
 var a=pathwayAudit(c),e=c.eligibilityReview||{},f=c.criteriaFinalization||{};
 var h='<section class="panel"><div class="ph"><h3>Case preparation checkpoints</h3>'+chip(a.intakeReady&&a.screened&&a.eligible&&a.foeReady&&a.criteriaReady?'All decisions recorded':'Review in progress','mid')+'</div>'+
 '<p class="small">Advisor decisions are preparation records, not USCIS eligibility findings. Previously completed cases may require review to establish these checkpoints.</p>';
 [['Candidate intake and form review',a.intakeReady],['Pathway screening',a.screened],['Eligibility assessment',a.eligible],['Final field of endeavor',a.foeReady],['EB-1A criteria finalization',a.criteriaReady]].forEach(function(x){h+='<div class="formrow"><b>'+esc(x[0])+'</b>'+chip(x[1]?'Recorded':'Pending',x[1]?'ok':'mid')+'</div>'});
 h+='<p class="small">Required intake forms: '+a.forms+' · Advisor review tasks: '+a.reviewTasks+'. Screening details missing: '+esc(a.missing.join(', ')||'None')+'.</p>';
 h+='<div class="entry"><h4>Advisor eligibility assessment</h4><p class="small">Evaluate the EB-1A criteria and final merits independently from the EB-2 threshold and NIW three prongs. Do not mark legal eligibility as confirmed by software.</p>'+
 '<label class="f">Assessment outcome</label><select data-draft="elig_decision">'+[['','Select'],['develop','Evidence development recommended'],['attorney','Ready for independent attorney eligibility review'],['hold','Insufficient evidence / on hold'],['other','Alternative pathway review']].map(function(x){return '<option value="'+x[0]+'"'+((S.draft.elig_decision||e.decision||'')===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'+
 '<label class="f">EB-1A assessment, EB-2 threshold, NIW prongs, gaps and reasoning</label><textarea data-draft="elig_note">'+esc(S.draft.elig_note!==undefined?S.draft.elig_note:e.note||'')+'</textarea>'+
 '<button class="btn sm pri" data-a="elig-save">Record assessment</button></div>';
 h+='<div class="entry"><h4>Criteria approval record</h4><p class="small">Finalization requires the approved FOE and a written reason for each selected EB-1A criterion. NIW evidence requirements are tracked separately.</p>'+
 '<label class="f">Final criteria rationale and evidence gaps</label><textarea data-draft="criteria_note">'+esc(S.draft.criteria_note!==undefined?S.draft.criteria_note:f.note||'')+'</textarea>'+
 '<p class="small">'+(f.approvedAt?'Approved '+esc(fmt(f.approvedAt))+' · '+esc((f.criteria||[]).join(', ')):'No approved criteria record')+'</p></div></section>';
 return h;
}
function pathwayScreening(c){
 var p=c.pathwayScreening||{},d=p.data||{},review=p.review||{},fields=[
 ['degree','Highest completed degree','select',['','Bachelor','Master','PhD','Other']],
 ['phd','Currently pursuing a PhD?','select',['','Yes','No']],
 ['experience','Years of professional experience','number'],
 ['status','Current immigration / work authorization','select',[''].concat(VISAS).concat(['Unknown'])],
 ['field','Professional and research field','text'],
 ['endeavor','Specific proposed U.S. endeavor','textarea'],
 ['impact','Evidence of broader U.S. or national importance','textarea'],
 ['positioned','Evidence of ability to advance the endeavor','textarea'],
 ['recognition','Independent recognition, publications, judging, awards, original contributions','textarea'],
 ['statusNotes','Status expiration and employment authorization questions','textarea']
 ];
 var h='<section class="panel"><div class="ph"><h3>Candidate pathway screening</h3>'+chip(review.decision?'Advisor decision recorded':'Screening needed',review.decision?'ok':'mid')+'</div><p class="small">Separate EB-1A and EB-2 NIW intake. Preliminary screening only: no automated eligibility finding, approval prediction, or immigration-status advice.</p>';
 fields.forEach(function(f){
 var val=S.draft['ps_'+f[0]]!==undefined?S.draft['ps_'+f[0]]:(d[f[0]]||'');
 h+='<label class="f" for="ps_'+f[0]+'">'+esc(f[1])+'</label>';
 if(f[2]==='select')h+='<select id="ps_'+f[0]+'" data-draft="ps_'+f[0]+'">'+f[3].map(function(o){return '<option value="'+esc(o)+'"'+(String(val)===o?' selected':'')+'>'+esc(o||'Not provided')+'</option>'}).join('')+'</select>';
 else if(f[2]==='textarea')h+='<textarea id="ps_'+f[0]+'" data-draft="ps_'+f[0]+'">'+esc(val)+'</textarea>';
 else h+='<input id="ps_'+f[0]+'" type="'+f[2]+'" '+(f[2]==='number'?'min="0" max="70" step="1" ':'')+'data-draft="ps_'+f[0]+'" value="'+esc(val)+'">';
 });
 h+='<div class="addrow"><button class="btn pri sm" data-a="ps-save">Save screening intake</button></div>';
 if(p.updatedAt){
 var degree=d.degree||'',threshold=degree==='Master'||degree==='PhD'?'Completed advanced degree reported; verify credentials.':degree==='Bachelor'?'Review qualifying progressive post-degree experience or exceptional ability.':'EB-2 threshold requires additional information.';
 h+='<div class="entry"><h4>Independent pathway reviews</h4><p><b>EB-2 threshold:</b> '+esc(threshold)+'</p>'+
 '<p><b>NIW:</b> Evaluate the specific proposed endeavor for substantial merit and national importance, whether the candidate is well positioned, and whether the waiver is beneficial on balance. '+(!d.endeavor?'Proposed endeavor is missing.':'Proposed endeavor recorded; supporting evidence still requires review.')+'</p>'+
 '<p><b>EB-1A:</b> Evaluate qualifying criteria and sustained recognition, followed by final merits. '+(!d.recognition?'Independent recognition details are missing.':'Reported recognition is unverified.')+'</p>'+
 '<p><b>F-1 / timing:</b> '+(/F-1/.test(d.status||'')?'Attorney must separately review status maintenance, authorized employment, immigrant intent, travel, and filing timing.':'Confirm current status and filing implications with counsel.')+'</p></div>';
 }
 h+='<div class="entry"><h4>Advisor pathway decision</h4><label class="f" for="psdecision">Recommended development track</label><select id="psdecision" data-draft="ps_decision">'+
 [['','Not decided'],['eb1a','EB-1A'],['niw','EB-2 NIW'],['both','Both independently'],['evidence','More evidence needed'],['other','Other options / attorney referral']].map(function(x){return '<option value="'+x[0]+'"'+((S.draft.ps_decision||review.decision||'')===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'+
 '<label class="f" for="psnote">Reason and next evidence actions</label><textarea id="psnote" data-draft="ps_note">'+esc(S.draft.ps_note!==undefined?S.draft.ps_note:review.note||'')+'</textarea>'+
 '<div class="addrow"><button class="btn sm" data-a="ps-review">Record advisor decision</button></div>'+
 '<p class="small">An attorney must validate legal conclusions. This screening does not automatically unlock petition steps or change existing case decisions.</p></div></section>';
 return h;
}
function profileSummary(c){
  var p=c.profile;if(!p)return '<p class="empty">Run the profile screen first.</p>';
  function ul(a){return a&&a.length?'<ul>'+a.map(function(i){return '<li>'+esc(i)+'</li>'}).join('')+'</ul>':'<p class="small">None listed.</p>'}
  return '<div class="row"><div class="nm">Domain</div><div><p>'+esc(p.domain)+'</p></div></div><div class="cols3"><div><h4>Positives</h4>'+ul(p.positives)+'</div><div><h4>Risks</h4>'+ul(p.risks)+'</div><div><h4>Improvements</h4>'+ul(p.improvements)+'</div></div>';
}
function decisionUi(c){
  var d=c.decision,t=taskByKey(c.id,'proceed');
  var h='<div class="gatebox"><b>Your decision</b>';
  if(d)h+='<p>'+chip(d.choice==='proceed'?'Proceed':d.choice==='hold'?'On hold':'Declined',d.choice==='proceed'?'ok':d.choice==='hold'?'mid':'bad')+' <span class="small">'+esc(fmt(d.at))+(d.note?' · '+esc(d.note):'')+'</span></p>';
  h+='<label class="f" for="decn">Note (optional)</label><input type="text" id="decn" data-draft="decn" value="'+esc(S.draft.decn||'')+'">'+
   '<div class="addrow"><button class="btn pri sm" data-a="dec-proceed"'+(c.profile?'':' disabled')+'>Proceed to deep intake</button><button class="btn sm" data-a="dec-hold">Hold</button><button class="btn sm danger" data-a="dec-decline">Decline</button></div>'+
   '<p class="small">Proceed opens the working field of endeavor step. Hold or Decline keeps the later steps locked and records why.</p></div>';
  return h;
}
function profileTab(c){
  var p=c.profile;
  var h='<div class="panel"><div class="ph"><h3>Profile screen</h3><div class="chips">'+(p?chip(p.outlook,p.outlook==='Promising'?'ok':p.outlook==='Possible with a longer build'?'mid':p.outlook==='Unlikely in the near term'?'bad':''):chip('Not run','gate'))+(c.decision?chip(c.decision.choice==='proceed'?'Proceed':c.decision.choice==='hold'?'On hold':'Declined',c.decision.choice==='proceed'?'ok':'mid'):'')+'</div></div><p class="small">A quick read from the resume and Form 1 only. It does not rate criteria. Internal view; not shown to candidates.</p>';
  if(!p)return h+'<p class="empty">Not run yet. It runs after Form 1 is reviewed.</p></div>';
  h+=profileSummary(c)+decisionUi(c);
  return h+'<p class="small">Run '+esc(fmt(p.ranAt))+'. A screening aid, not legal advice.</p></div>';
}
/* ----- field (FOE and market) tab ----- */
function mw(c){return S.mktWork||c.market||null}
function mwEdit(c){if(!S.mktWork&&c.market)S.mktWork=JSON.parse(JSON.stringify(c.market));return S.mktWork}
function fieldTab(c){
  var m=mw(c),foe=(c.foe&&c.foe.locked)||'';
  var h='<div class="panel"><div class="ph"><h3>Field of endeavor and market evidence</h3><div class="chips">'+(m?chip(m.checked?'Checked':'Draft, not checked',m.checked?'ok':'gate'):chip('Not run','gate'))+'</div></div>';
  h+='<div class="row"><div class="nm">Working field</div><div><p>'+esc((c.foe&&c.foe.working)||'Not set')+'</p></div></div><div class="row"><div class="nm">Final field</div><div><p>'+esc(foe||'Not locked yet')+'</p></div></div>';
  if(!m)return h+'<p class="empty">The table is drafted after the field is locked (step: Research the market and evidence for the field).</p></div>';
  h+='<p class="small">Figures and links come from a web search run when the table was drafted. Open each link, confirm the number and the year, and fix anything that does not match. Links the search did not return were dropped.</p>';
  (m.rows||[]).forEach(function(r,i){
    h+='<div class="opt"><label class="f">FOE</label><textarea data-mk="'+i+'|foe">'+esc(r.foe)+'</textarea><label class="f">Market size and growth</label><textarea class="tall" data-mk="'+i+'|market">'+esc(r.market)+'</textarea><label class="f">Why it matters to the US</label><textarea class="tall" data-mk="'+i+'|importance">'+esc(r.importance||r.evidence)+'</textarea><label class="f">Maps to the Critical and Emerging Technologies list</label><textarea data-mk="'+i+'|cet">'+esc(r.cet)+'</textarea><label class="f">Where the candidate fits</label><textarea data-mk="'+i+'|fit">'+esc(r.fit)+'</textarea><label class="f">Not found or not confirmed (chase these)</label><textarea data-mk="'+i+'|gaps">'+esc(r.gaps)+'</textarea><label class="f">Source links (one per line)</label><textarea data-mk="'+i+'|urls">'+esc((r.urls||[]).join('\n'))+'</textarea>'+(r.urls&&r.urls.length?'<p class="small">Open: '+r.urls.map(function(u){return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(u.replace(/^https?:\/\/(www\.)?/,'').slice(0,60))+'</a>'}).join(' · ')+'</p>':'')+(r.dropped?'<p class="small">'+r.dropped+' link(s) removed because the search did not return them.</p>':'')+'<button class="btn sm danger" data-a="mk-del" data-id="'+i+'">Remove row</button></div>';
  });
  h+='<div class="addrow"><button class="btn sm" data-a="mk-add">Add a row</button><button class="btn pri sm" data-a="mk-save">Save changes</button><button class="btn sm" data-a="mk-ok">'+(m.checked?'Mark as not checked':'Mark as checked')+'</button><button class="btn sm" data-a="mk-copy">Copy table</button></div>';
  if(m.pages&&m.pages.length)h+='<h4>Pages the search returned</h4><ul>'+m.pages.map(function(p){return '<li><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.title||p.url)+'</a></li>'}).join('')+'</ul>';
  return h+'</div>';
}
/* ----- plan tab ----- */
function pw(c){return S.planWork||c.plan||null}
function pwEdit(c){if(!S.planWork&&c.plan)S.planWork=JSON.parse(JSON.stringify(c.plan));return S.planWork}
function candIdeas(c){var r=getResp(c.id,'f10');return ((r&&r.data&&r.data.ideas)||[]).filter(function(x){return x&&String(x.title||x.summary||'').trim()})}
function ideasPanel(c,p){
  var ids=candIdeas(c),f=getResp(c.id,'f10').status;
  var h='<h4>Candidate\'s own ideas ('+ids.length+') <span class="small">Form 10: '+esc(f)+'</span></h4>';
  if(!ids.length)return h+'<p class="small">None yet. Their ideas appear here once they submit Form 10.</p>';
  ids.forEach(function(x,i){
    var added=p&&(p.articles||[]).some(function(a){return a.fromCand===(x.title||'')+'|'+i});
    h+='<div class="opt"><b>'+esc(x.title||'(untitled)')+'</b> <span class="small">'+esc(x.state||'')+'</span><p>'+esc(x.summary||'')+'</p>'+(x.venues?'<p class="small">Journals they mention: '+esc(x.venues)+'</p>':'')+(x.conf?'<p class="small">Confidentiality: '+esc(x.conf)+'</p>':'')+(p&&!p.released?(added?'<span class="chip ok">In the plan</span>':'<button class="btn sm" data-a="pl-addcand" data-id="'+i+'">Add to plan</button>'):'')+'</div>';
  });
  return h;
}
function planTab(c){
  var p=pw(c);
  var h='<div class="panel"><div class="ph"><h3>Plan: articles, memberships, judging</h3><div class="chips">'+(p?chip(p.released?'Released':p.status==='approved'?'Approved, held back':'Draft',p.released?'ok':p.status==='approved'?'mid':'gate'):chip('Not drafted','gate'))+'</div></div><p class="small">Built around the locked field of endeavor. Journal and association names come from the model and are unverified. Check each before approving. Candidates see only the tasks you release.</p>';
  if(!p)return h+ideasPanel(c,null)+'<p class="empty">Our suggestions are not drafted yet. They are drafted after the target criteria are chosen and Form 10 is reviewed.</p></div>';
  var ro=!!p.released,dis=ro?' disabled':'';
  h+=ideasPanel(c,p)+'<h4>Our suggested articles ('+(p.articles||[]).length+')</h4>';
  var shn=(p.articles||[]).filter(function(a){return a.short}).length;
  h+='<p class="small">Shortlisted: <b>'+shn+'</b> (aim for 4, worked on two at a time). Only shortlisted articles become tasks; the rest stay as reserves. If none is shortlisted, all become tasks. At most two ideas per category, and keep career-advice pieces to one.</p>';
  (p.articles||[]).forEach(function(a,i){
    h+='<div class="opt"><div class="chips">'+(a.cat?chip(a.cat):'')+(a.tier?chip(a.tier,'mid'):'')+(a.short?chip('Shortlisted','ok'):'')+(a.fromCand?chip('From candidate'):'')+'</div><label class="f">Title</label><input type="text" data-pl="articles|'+i+'|title" value="'+esc(a.title)+'"'+dis+'><label class="f">Abstract</label><textarea class="tall" data-pl="articles|'+i+'|abstract"'+dis+'>'+esc(a.abstract)+'</textarea><label class="f">Possible journals (one per line, unverified)</label><textarea data-pl="articles|'+i+'|journals"'+dis+'>'+esc((a.journals||[]).join('\n'))+'</textarea>'+(a.evidence?'<p class="small">Evidence needed: '+esc(a.evidence)+'</p>':'')+(a.note?'<p class="small">Note: '+esc(a.note)+'</p>':'')+
     '<div class="two"><div><label class="f">Status</label><select data-pl="articles|'+i+'|state">'+options(['Idea','Outline','Drafting','Candidate review','Submitted','Published'],a.state||'Idea')+'</select></div><div><label class="f">Link once published</label><input type="text" data-pl="articles|'+i+'|url" value="'+esc(a.url||'')+'" placeholder="https://"></div></div>'+
     '<div class="addrow">'+(ro?'':'<button class="btn sm'+(a.short?' pri':'')+'" data-a="pl-short" data-id="'+i+'">'+(a.short?'Shortlisted (click to remove)':'Shortlist')+'</button><button class="btn sm danger" data-a="pl-del" data-id="articles|'+i+'">Remove</button>')+'</div></div>';
  });
  if(!ro)h+='<div class="addrow"><button class="btn sm" data-a="pl-add" data-id="articles">Add an article</button></div>';
  h+='<h4>Memberships ('+(p.memberships||[]).length+')</h4>';
  (p.memberships||[]).forEach(function(m,i){
    h+='<div class="opt"><label class="f">Association and grade (unverified)</label><input type="text" data-pl="memberships|'+i+'|name" value="'+esc(m.name)+'"'+dis+'><label class="f">Why it fits</label><textarea data-pl="memberships|'+i+'|why"'+dis+'>'+esc(m.why)+'</textarea><label class="f">What to verify</label><input type="text" data-pl="memberships|'+i+'|note" value="'+esc(m.note)+'"'+dis+'>'+(ro?'':'<button class="btn sm danger" data-a="pl-del" data-id="memberships|'+i+'">Remove</button>')+'</div>';
  });
  if(!ro)h+='<div class="addrow"><button class="btn sm" data-a="pl-add" data-id="memberships">Add a membership</button></div>';
  var j=p.judging||{count:0,types:[],note:''};
  h+='<h4>Judging and review</h4><div class="opt"><label class="f">How many roles</label><input type="number" min="0" data-pl="judging|count" value="'+esc(j.count)+'"'+dis+'><label class="f">Kinds of role (one per line)</label><textarea data-pl="judging|types"'+dis+'>'+esc((j.types||[]).join('\n'))+'</textarea><label class="f">Note</label><input type="text" data-pl="judging|note" value="'+esc(j.note||'')+'"'+dis+'></div>';
  if(!ro){
    var gok=gateState(c,'plan')==='approved';
    h+='<div class="addrow"><button class="btn pri sm" data-a="plan-approve">'+(gok?'Approve again (rebuild held tasks)':'Approve and create tasks')+'</button></div><p class="small">Approving creates one task per item, held back from the candidate. Release them from the review step after you have gone through the plan together.</p>';
    if(p.status==='approved')h+='<div class="addrow"><button class="btn pri sm" data-a="plan-release">Release tasks to the candidate</button></div>';
  }
  return h+'</div>';
}
function setPlanField(path,val){
  var c=cur(),p=c&&pwEdit(c);if(!p)return;var q=path.split('|');
  var multi=function(v){return String(v).split('\n').map(function(x){return x.trim()}).filter(Boolean)};
  if(q[0]==='judging'){p.judging=p.judging||{count:0,types:[],note:''};p.judging[q[1]]=q[1]==='count'?Math.max(0,parseInt(val,10)||0):q[1]==='types'?multi(val):val;return}
  var it=(p[q[0]]||[])[+q[1]];if(!it)return;it[q[2]]=q[2]==='journals'?multi(val):val;
}
var RESULT={profile:{t:'profile',l:'Profile'},proceed:{t:'profile',l:'Profile'},analysis:{t:'score',l:'Scorecard'},review:{t:'score',l:'Scorecard'},rescore:{t:'score',l:'Scorecard'},strategy:{t:'score',l:'Scorecard'},targets:{t:'score',l:'Scorecard'},'foe-mkt':{t:'field',l:'Field'},'foe-mkt-ok':{t:'field',l:'Field'},recs:{t:'plan',l:'Plan'},plan:{t:'plan',l:'Plan'},'review-cand':{t:'plan',l:'Plan'},venues:{t:'plan',l:'Plan'},'feas-draft':{t:'feas',l:'Feasibility'},feas:{t:'feas',l:'Feasibility'},'foe-ai':{k:'foe',l:'FOE lock task'}};
function laneRow(t){
  var d=RESULT[t.key],run=t.kind==='ai'&&!isDone(t.status);
  var main=(d&&d.t&&!run)?'<button class="link" data-a="tab" data-id="'+d.t+'">'+esc(t.title)+'</button>':'<button class="link" data-a="gotask" data-id="'+t.id+'">'+esc(t.title)+'</button>';
  var hint=run?'Press Run analysis in the task':(d&&d.t?'Opens the '+d.l+' tab':'');
  var sub=(hint?'<span class="small">'+esc(hint)+'</span>':'')+((d&&d.t&&!run)?' <button class="link small" data-a="gotask" data-id="'+t.id+'">task details</button>':'');
  return '<div class="laner"><div>'+main+(sub?'<br>'+sub:'')+'</div><span class="chip '+dueCls(t)+'">'+esc(dueTxt(t)||'no date')+'</span></div>';
}
function lanes(c,ts){
  var live=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)&&t.req!==false||(t.draft&&!isDone(t.status))});
  var cand=live.filter(function(t){return t.owner==='Candidate'&&!t.draft}).sort(function(a,b){return (a.due||'9')<(b.due||'9')?-1:1});
  var us=live.filter(function(t){return t.owner!=='Candidate'||t.draft}).sort(function(a,b){return (a.due||'9')<(b.due||'9')?-1:1});
  function lane(title,list,empty,sub){return '<div class="lane"><h4>'+title+' <span class="chip">'+list.length+'</span></h4><p class="small">'+sub+'</p>'+(list.length?list.slice(0,6).map(laneRow).join('')+(list.length>6?'<p class="small">and '+(list.length-6)+' more in Tasks</p>':''):'<p class="small">'+empty+'</p>')+'</div>'}
  return '<div class="lanes">'+lane('Waiting on candidate',cand,'Nothing is waiting on the candidate.','Forms, documents and real-world actions they own.')+lane('Waiting on you',us,'Nothing is waiting on you.','Reviews, approvals, drafts to approve, and analysis to run.')+'</div>';
}
function feasTab(c){
  var d=c.feasibilityDraft,rel=c.feasibilityReleased;
  var h='<div class="panel"><div class="ph"><h3>Feasibility summary for the candidate</h3><div class="chips">'+(rel?chip('Released v'+rel.version+' · '+fmt(rel.releasedAt),'ok'):chip('Not released','gate'))+'</div></div>';
  h+='<p class="small">This is the only analysis result the candidate ever sees. It is written separately from the scorecard, so internal ratings, risks and plans never reach them. Edit freely, then release.</p>';
  if(!d){return h+'<p class="empty">No draft yet. It is drafted after the criteria strategy and your choice of target criteria.</p></div>'}
  function val(k,fallback){return S.draft['fz_'+k]!==undefined?S.draft['fz_'+k]:fallback}
  h+='<label class="f" for="fzo">Outlook</label><select id="fzo" data-draft="fz_outlook">'+options(['Strong foundation','Promising, with work needed','Needs substantial building'],val('outlook',d.outlook))+'</select>'+
   '<label class="f" for="fzs">Strengths (one per line)</label><textarea id="fzs" class="tall" data-draft="fz_strengths">'+esc(val('strengths',(d.strengths||[]).join('\n')))+'</textarea>'+
   '<label class="f" for="fzf">What we will build together (one per line)</label><textarea id="fzf" data-draft="fz_focus">'+esc(val('focus',(d.focus||[]).join('\n')))+'</textarea>'+
   '<label class="f" for="fzt">Rough preparation time</label><input id="fzt" type="text" data-draft="fz_timeline" value="'+esc(val('timeline',d.timeline||''))+'">'+
   '<label class="f" for="fzn">Closing note</label><textarea id="fzn" data-draft="fz_note">'+esc(val('note',d.note||''))+'</textarea>'+
   '<div class="addrow"><button class="btn" data-a="feas-save">Save draft</button><button class="btn pri" data-a="feas-release">'+(rel?'Release updated version':'Release to candidate')+'</button></div>';
  h+='<p class="small">Releasing saves your edits first. The candidate sees it on their next refresh.</p></div>';
  return h+'<div class="panel"><h3>What the candidate will see</h3>'+feasCard(feasFromForm(c),true)+'</div>';
}
function feasFromForm(c){
  var d=c.feasibilityDraft||{};
  function v(k,f){return S.draft['fz_'+k]!==undefined?S.draft['fz_'+k]:f}
  function lines(x){return String(x||'').split('\n').map(function(l){return l.trim()}).filter(Boolean)}
  return {outlook:v('outlook',d.outlook),strengths:lines(v('strengths',(d.strengths||[]).join('\n'))),focus:lines(v('focus',(d.focus||[]).join('\n'))),timeline:v('timeline',d.timeline||''),note:v('note',d.note||'')};
}
function feasCard(f,preview){
  if(!f||!f.outlook)return '';
  function ul(a){return a&&a.length?'<ul>'+a.map(function(i){return '<li>'+esc(i)+'</li>'}).join('')+'</ul>':''}
  return '<div class="feas">'+(preview?'':'<h3>Your feasibility summary</h3>')+'<div class="chips">'+chip(f.outlook,f.outlook==='Strong foundation'?'ok':f.outlook==='Promising, with work needed'?'mid':'gate')+'</div>'+
   (f.strengths&&f.strengths.length?'<h4>Where you are strong</h4>'+ul(f.strengths):'')+(f.focus&&f.focus.length?'<h4>What we will build together</h4>'+ul(f.focus):'')+
   (f.timeline?'<p><b>Rough preparation time:</b> '+esc(f.timeline)+' <span class="small">(an estimate, not a promise)</span></p>':'')+(f.note?'<p>'+esc(f.note)+'</p>':'')+
   '<p class="small">This is a planning assessment from your advisory team. It is not legal advice and does not guarantee any outcome.</p></div>';
}

function tasksTab(c,ts){
  var v=S.view||'list';
  var h='<div class="ph"><div class="seg">'+[['list','List'],['board','Board'],['time','Timeline']].map(function(x){return '<button class="tab'+(v===x[0]?' on':'')+'" data-a="view" data-id="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'+
   '<div class="seg"><label class="small">Owner</label><select data-filter="owner">'+options(['All'].concat(OWNERS),S.filter.owner)+'</select></div></div>';
  var have={};ts.forEach(function(t){have[t.key]=1});
  var miss=TEMPLATE.filter(function(t){return !have[t.k]});
  if(miss.length&&S.staff==='admin')h+='<div class="panel" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:12px"><div><b>'+miss.length+' newer workflow steps are not on this case yet</b><div class="small">For example the monthly article steps and optional speaking. Adding them keeps all your existing work. Nothing is removed or changed.</div></div><button class="btn pri sm" data-a="sync-tpl">Add the '+miss.length+' missing steps</button></div>';
  var shown=ts.filter(function(t){return S.filter.owner==='All'||t.owner===S.filter.owner});
  if(v==='board')return h+boardView(c,shown);
  if(v==='time')return h+timelineView(c,shown);
  return h+listView(c,shown);
}
function listView(c,ts){
  var st=c.stage||0,h='';
  STAGES.forEach(function(s,i){
    var group=ts.filter(function(t){return t.stage===i}).sort(function(a,b){var x=tIdx(a),y=tIdx(b);if(x!==y)return x-y;return (a.due||'9')<(b.due||'9')?-1:1});
    if(!group.length)return;
    var all=tasksOf(c.id).filter(function(t){return t.stage===i&&t.req!==false}),done=all.filter(function(t){return isDone(t.status)}).length;
    var key='st'+c.id+i,open=S.open[key]===undefined?i===st:S.open[key];
    h+='<div class="panel stagebox'+(i===st?' now':'')+'"><button class="sthead" data-a="tog" data-id="'+key+'" aria-expanded="'+open+'"><span class="car">'+(open?'▾':'▸')+'</span><b>'+(i+1)+'. '+esc(s.n)+'</b>'+(s.gate?chip('GATE','gate'):'')+'<span class="small">'+done+' of '+all.length+' done</span></button>';
    if(open){h+='<p class="small stdesc">'+esc(s.d)+'</p>';group.forEach(function(t){h+=taskRow(c,t)})}
    h+='</div>';
  });
  h+='<div class="panel"><h3>Add a task</h3><div class="addrow"><input type="text" data-draft="tt" placeholder="Task title" value="'+esc(S.draft.tt||'')+'"><select data-draft="to">'+options(OWNERS,S.draft.to||'Advisor')+'</select><input type="date" data-draft="td" value="'+esc(S.draft.td||'')+'"><button class="btn" data-a="task-add">Add</button></div></div>';
  return h;
}
function taskRow(c,t){
  var open=!!S.open[t.id],locked=t.status==='Not started',w=locked?waitingFor(t):[];
  var h='<div class="task'+(isDone(t.status)?' done':'')+(locked?' locked':'')+'">';
  if(t.kind==='task'&&!locked&&!t.draft)h+='<button class="chk'+(isDone(t.status)?' on':'')+'" data-a="check" data-id="'+t.id+'" aria-label="Mark '+(isDone(t.status)?'not done':'done')+'"></button>';
  else h+='<span class="chk dis'+(isDone(t.status)?' on':'')+'" aria-hidden="true"></span>';
  h+='<button class="tt" data-a="tog" data-id="'+t.id+'" aria-expanded="'+open+'"><b>'+esc(t.title)+'</b><small>'+(locked&&w.length?'Waiting for: '+esc(w.map(function(x){return x.title}).slice(0,2).join('; '))+(w.length>2?' +'+(w.length-2):''):esc(t.status))+(t.draft?' · Draft, not yet approved':'')+(t.req===false?' · optional':'')+'</small></button>';
  h+=kindChip(t)+ownerChip(t.owner)+'<span class="chip '+dueCls(t)+'">'+esc(dueTxt(t)||'no date')+'</span>';
  if(open)h+='<div class="detail">'+taskDetail(c,t)+'</div>';
  return h+'</div>';
}
function taskDetail(c,t){
  var h='',locked=t.status==='Not started';
  if(t.detail)h+='<p>'+esc(t.detail)+'</p>';
  if(t.draft)h+='<div class="addrow"><button class="btn pri sm" data-a="draft-ok" data-id="'+t.id+'">Approve for candidate</button><button class="btn sm danger" data-a="task-del" data-id="'+t.id+'">Delete draft</button></div>';
  h+='<div class="two ctl"><div><label class="f">Status</label>'+(locked?'<span class="chip">Locked until earlier steps finish</span>':'<select data-tf="status" data-id="'+t.id+'">'+options(PICK,t.status)+'</select>')+'</div>'+
   '<div><label class="f">Owner</label><select data-tf="owner" data-id="'+t.id+'">'+options(OWNERS,t.owner)+'</select></div>'+
   '<div><label class="f">Due</label><input type="date" data-tf="due" data-id="'+t.id+'" value="'+esc(t.due||'')+'"></div></div>';
  if(locked){var w=waitingFor(t);if(w.length)h+='<p class="small">Unlocks when done: '+esc(w.map(function(x){return x.title}).join('; '))+'</p>'}
  if(!locked&&!isDone(t.status)||t.kind!=='task'){
    if(t.kind==='form')h+='<div class="addrow"><button class="btn pri sm" data-a="openform" data-id="'+t.form+'">Open '+esc(formDef(t.form).n)+'</button></div>';
    if(t.kind==='review'&&!locked){var r=getResp(c.id,t.form);h+='<p class="small">Form status: '+esc(r.status)+'</p><div class="addrow"><button class="btn sm" data-a="openform" data-id="'+t.form+'">Read the answers</button>'+(!isDone(t.status)?'<button class="btn pri sm" data-a="reviewed" data-id="'+t.id+'">Mark reviewed</button>':'')+(r.status==='Submitted'||r.status==='Reviewed'?'<button class="btn sm" data-a="reopenform" data-id="'+t.form+'">Send back for edits</button>':'')+'</div>'}
    if(t.key==='analysis'&&!locked)h+='<label class="chk-l"><input type="checkbox" data-docschk="1"'+(c.docsChecked?' checked':'')+'> No documents available beyond what is uploaded (confirmed with the candidate)</label>';
    if(t.kind==='ai'&&!locked){var why=aiReady(c,t);h+='<div class="addrow"><button class="btn pri sm" data-a="runai" data-id="'+t.id+'"'+(why||S.busy?' disabled':'')+'>'+(isDone(t.status)?'Run again':'Run analysis')+'</button>'+(why?'<span class="small">'+esc(why)+'</span>':'')+'</div>'}
    if(RESULT[t.key]&&RESULT[t.key].t&&!locked&&!/^(foe-mkt-ok|review-cand|plan|feas|proceed)$/.test(t.key))h+='<div class="addrow"><button class="btn sm" data-a="tab" data-id="'+RESULT[t.key].t+'">'+(isDone(t.status)?'See the result: ':'Open ')+RESULT[t.key].l+' tab</button></div>';
    if(t.key==='foe-mkt-ok'&&!locked)h+='<div class="addrow"><button class="btn sm" data-a="tab" data-id="field">Open Field tab</button></div>';
    if(t.key==='proceed'&&!locked)h+=profileSummary(c)+decisionUi(c);
    if(t.key==='review-cand'&&!locked)h+='<div class="addrow"><button class="btn sm" data-a="tab" data-id="plan">Open Plan tab</button><button class="btn pri sm" data-a="plan-release">Release plan tasks to the candidate</button></div>';
    if(t.kind==='gate'&&!locked)h+=gateUi(c,t);
  }
  var notes=S.log.filter(function(l){return l.tid===t.id&&l.kind==='note'}).sort(function(a,b){return a.ts<b.ts?-1:1});
  h+='<div class="notes"><label class="f">Notes</label>'+notes.map(function(n){return '<div class="note"><span class="small mono">'+esc(fmt(n.ts))+'</span> '+(n.by==='Candidate'?'<b>Candidate:</b> ':'')+esc(n.text)+(n.shared?' <span class="chip">shared</span>':'')+'</div>'}).join('')+
   '<div class="addrow"><input type="text" data-draft="nt'+t.id+'" placeholder="Add a note" value="'+esc(S.draft['nt'+t.id]||'')+'"><label class="chk-l"><input type="checkbox" data-draft-chk="ns'+t.id+'"'+(S.draft['ns'+t.id]?' checked':'')+'> Share with candidate</label><button class="btn sm" data-a="note" data-id="'+t.id+'">Add</button></div></div>';
  if(t.source!=='template')h+='<div class="addrow"><button class="btn sm danger" data-a="task-del" data-id="'+t.id+'">Delete task</button></div>';
  return h;
}
function gateUi(c,t){
  var g=gateState(c,t.gate),h='';
  if(t.gate==='foew'){
    var wo=(c.foe&&c.foe.options)||[];
    h+='<div class="gatebox"><b>Set the working field of endeavor</b>'+(c.profile&&c.profile.domain?'<p class="small">Profile screen domain: '+esc(c.profile.domain)+' (see the Profile tab)</p>':'');
    wo.forEach(function(o,i){h+='<div class="opt"><b>'+esc(o.label)+'</b><p>'+esc(o.statement)+'</p><p class="small">Why: '+esc(o.why)+'</p><p class="small">US growth to verify: '+esc(o.usGrowth)+'</p><p class="small">Peer pool: '+esc(o.peerPool)+'</p><button class="btn sm" data-a="foew-use" data-id="'+i+'">Use this wording</button></div>'});
    var wv=S.draft.foeWText!==undefined?S.draft.foeWText:((c.foe&&c.foe.working)||'');
    h+='<label class="f" for="foewt">Working statement</label><textarea id="foewt" data-draft="foeWText">'+esc(wv)+'</textarea><div class="addrow"><button class="btn pri sm" data-a="foew-lock">'+(g==='approved'?'Update working field':'Set working field')+'</button></div><p class="small">The deep intake is built around this. The final field is locked after the full analysis.</p></div>';
    return h;
  }
  if(t.gate==='plan'){
    return '<div class="gatebox"><b>Edit and approve</b><p class="small">Open the Plan tab to edit, add or remove items, then approve.</p><div class="addrow"><button class="btn pri sm" data-a="tab" data-id="plan">Open Plan tab</button></div></div>';
  }
  if(t.gate==='foe'){
    var opts=(c.foe&&c.foe.options)||[];
    if(!opts.length)return '<p class="small">Run the FOE draft first.</p>';
    h+='<div class="gatebox"><b>Choose or edit the field of endeavor</b>';
    opts.forEach(function(o,i){h+='<div class="opt"><b>'+esc(o.label)+'</b><p>'+esc(o.statement)+'</p><p class="small">Why: '+esc(o.why)+'</p><p class="small">US growth to verify: '+esc(o.usGrowth)+'</p><p class="small">Peer pool: '+esc(o.peerPool)+'</p><button class="btn sm" data-a="foe-use" data-id="'+i+'">Use this wording</button></div>'});
    var val=S.draft.foeText!==undefined?S.draft.foeText:((c.foe&&(c.foe.locked||c.foe.working))||'');
    h+='<label class="f" for="foet">Final statement</label><textarea id="foet" data-draft="foeText">'+esc(val)+'</textarea>'+
     '<label class="chk-l"><input type="checkbox" data-draft-chk="foeOk"'+(S.draft.foeOk?' checked':'')+'> I checked the US growth and impact evidence behind this statement.</label>'+
     '<div class="addrow"><button class="btn pri sm" data-a="foe-lock"'+(g==='approved'?' disabled':'')+'>'+(g==='approved'?'Locked':'Lock FOE')+'</button></div></div>';
  }else if(t.gate==='feas'){
    h+='<div class="gatebox"><b>Release to the candidate</b><p class="small">Open the Feasibility tab to edit the wording and release it.</p><div class="addrow"><button class="btn pri sm" data-a="tab" data-id="feas">Open Feasibility tab</button></div></div>';
  }else{
    var open=openFlags(c);
    h+='<div class="gatebox"><b>Attorney decision</b>'+(open?'<p class="small">'+open+' red flag'+(open>1?'s are':' is')+' still open on the scorecard.</p>':'')+
     '<label class="f" for="atn">Counsel notes</label><textarea id="atn" data-draft="atn">'+esc(S.draft.atn||'')+'</textarea>'+
     '<div class="addrow"><button class="btn pri sm" data-a="att-ok">Approve for filing</button><button class="btn sm" data-a="att-no">Request changes</button></div></div>';
  }
  return h;
}

function boardView(c,ts){
  var cols=[['Not started','Locked'],['To do','To do'],['In progress','In progress'],['Blocked','Blocked'],['Done','Done']];
  var h='<div class="board">';
  cols.forEach(function(col){
    var items=ts.filter(function(t){return col[0]==='Done'?isDone(t.status):t.status===col[0]}).sort(function(a,b){return (a.due||'9')<(b.due||'9')?-1:1});
    h+='<div class="col'+(col[0]==='Not started'?' lockedcol':'')+'" data-drop="'+col[0]+'"><header><span>'+col[1]+'</span><em>'+items.length+'</em></header>';
    items.forEach(function(t){
      h+='<div class="cardc" draggable="'+(t.status==='Not started'?'false':'true')+'" data-drag="'+t.id+'" data-a="gotask" data-id="'+t.id+'" tabindex="0"><b>'+esc(t.title)+'</b><small>'+esc(STAGES[t.stage].n)+'</small><div class="chips">'+ownerChip(t.owner)+(t.due?'<span class="chip '+dueCls(t)+'">'+esc(dueTxt(t))+'</span>':'')+kindChip(t)+(t.status==='Skipped'?chip('Skipped'):'')+'</div></div>';
    });
    h+=(items.length?'':'<p class="empty">Empty</p>')+'</div>';
  });
  return h+'</div><p class="small">Drag a card to change its status. Locked cards open on their own when earlier steps finish.</p>';
}

function timelineView(c,ts){
  var rows=ts.filter(function(t){return t.due}).sort(function(a,b){return a.due<b.due?-1:1});
  if(!rows.length)return '<p class="empty">No dated tasks.</p>';
  var start=c.startDate||today(),end=rows[rows.length-1].due;
  var span=Math.max(30,Math.round((parse(end)-parse(start))/864e5)+7);
  function pct(d){return Math.max(0,Math.min(100,Math.round((parse(d)-parse(start))/864e5)/span*1000)/10)}
  var months=[],m=parse(start);m.setDate(1);
  while(m<=parse(addDays(start,span))){var ds=dstr(m);months.push('<span class="mk" style="left:'+pct(ds)+'%">'+m.toLocaleDateString(undefined,{month:'short'})+'</span>');m.setMonth(m.getMonth()+1)}
  var h='<div class="gantt"><div class="grow ghead"><div></div><div class="track">'+months.join('')+'<i class="todayline" style="left:'+pct(today())+'%"></i></div></div>';
  rows.forEach(function(t){
    var e=pct(t.due),s=Math.max(0,e-2.4);
    h+='<div class="grow"><button class="glabel" data-a="gotask" data-id="'+t.id+'" title="'+esc(t.title)+'">'+esc(t.title)+'</button><div class="track"><i class="todayline" style="left:'+pct(today())+'%"></i><span class="gbar s-'+(t.status==='Not started'?'lock':isDone(t.status)?'done':t.status==='Blocked'?'bad':t.status==='In progress'?'mid':'todo')+'" style="left:'+s+'%;width:'+Math.max(1.6,e-s)+'%"></span></div></div>';
  });
  return h+'</div><p class="small">Each bar ends on the due date. Grey bars are locked; the thin line is today.</p>';
}

/* ----- forms ----- */
function tIdx(t){for(var i=0;i<TEMPLATE.length;i++)if(TEMPLATE[i].k===t.key)return i;return 9999}
function formsTab(c){
  if(S.openForm)return formEditor(c,S.form);
  var h='<div class="panel"><h3>Forms</h3>';
  FORMS.slice().sort(function(a,b){return parseInt(a.id.slice(1),10)-parseInt(b.id.slice(1),10)}).forEach(function(f){
    var r=getResp(c.id,f.id),p=progress(f,r),tk=taskByKey(c.id,f.id);
    if(tk&&tk.stage>2&&tk.status==='Not started'&&r.status==='Not started')return;
    h+='<div class="formrow"><div><b>'+esc(f.n)+'</b><div class="small">'+esc(r.status)+' · '+p+'% of required fields</div></div><div class="chips">'+chip(r.status,r.status==='Reviewed'?'ok':r.status==='Submitted'?'mid':'')+'<button class="btn sm" data-a="openform" data-id="'+f.id+'">Open</button></div></div>';
  });
  return h+'</div>';
}
function fieldInput(path,f,v,ro){
  var a=' data-fp="'+esc(path)+'"'+(ro?' disabled':'');
  if(f.t==='area')return '<textarea'+a+(f.tall?' class="tall"':'')+'>'+esc(v||'')+'</textarea>';
  if(f.t==='select')return '<select'+a+'>'+options(f.o,v,'Choose')+'</select>';
  if(f.t==='check')return '<label class="chk-l"><input type="checkbox"'+a+(v?' checked':'')+'> '+esc(f.l)+'</label>';
  if(f.t==='multi'){var arr=v||[];return '<div class="multi">'+f.o.map(function(o){return '<label class="chk-l"><input type="checkbox" data-mp="'+esc(path)+'" data-mv="'+esc(o)+'"'+(arr.indexOf(o)>=0?' checked':'')+(ro?' disabled':'')+'> '+esc(o)+'</label>'}).join('')+'</div>'}
  var ty=f.t==='date'?'date':f.t==='num'?'number':'text';
  return '<input type="'+ty+'"'+a+' value="'+esc(v==null?'':v)+'">';
}
function rowsInput(pathBase,f,v,ro){
  var rows=(v&&v.length)?v:[{}];
  var h='<div class="tablewrap"><table class="rt"><thead><tr>'+f.cols.map(function(c){return '<th>'+esc(c.l)+'</th>'}).join('')+'<th></th></tr></thead><tbody>';
  rows.forEach(function(row,ri){
    h+='<tr>'+f.cols.map(function(c){
      var p=pathBase+'|'+ri+'|'+c.k,a=' data-fp="'+esc(p)+'" aria-label="'+esc(c.l)+'"'+(ro?' disabled':'');
      return '<td>'+(c.t==='select'?'<select'+a+'>'+options(c.o,row[c.k],'')+'</select>':'<input type="text"'+a+' value="'+esc(row[c.k]||'')+'">')+'</td>';
    }).join('')+'<td>'+(ro?'':'<button class="link" data-a="row-del" data-fp="'+esc(pathBase+'|'+ri)+'" aria-label="Remove row">Remove</button>')+'</td></tr>';
  });
  return h+'</tbody></table></div>'+(ro?'':'<button class="btn sm" data-a="row-add" data-fp="'+esc(pathBase)+'">Add row</button>');
}
function renderFields(def,part,idx,vals,ro){
  var h='';
  part.fields.forEach(function(f){
    if(f.adv&&S.role!=='Advisor')return;
    if(!fieldVisible(f,vals))return;
    var base=def.id+'|'+part.id+'|'+(idx===''?'':idx)+'|'+f.k,v=vals[f.k];
    var fro=ro&&!f.adv;if(f.adv)fro=false;
    if(f.t==='check'){h+='<div class="fld">'+fieldInput(base,f,v,fro)+'</div>';return}
    h+='<div class="fld"><label class="f">'+esc(f.l)+(f.req?' <span class="req">*</span>':'')+(f.adv?' <span class="chip gate">Advisor only</span>':'')+'</label>'+(f.h?'<div class="hint">'+esc(f.h)+'</div>':'');
    h+=f.t==='rows'?rowsInput(base,f,v,fro):fieldInput(base,f,v,fro);
    if(f.minWords||f.maxWords){var n=wc(v);h+='<div class="hint mono">'+n+' words'+(f.minWords?', at least '+f.minWords:'')+(f.maxWords?', at most '+f.maxWords:'')+'</div>'}
    h+='</div>';
  });
  return h;
}
function formEditor(c,fid){
  var def=formDef(fid),r=getResp(c.id,fid),ro=S.role==='Candidate'&&(r.status==='Submitted'||r.status==='Reviewed');
  var h='<div class="panel"><div class="ph"><div><button class="link" data-a="closeform">&larr; All forms</button><h2>'+esc(def.n)+'</h2></div><div class="chips">'+chip(r.status,r.status==='Reviewed'?'ok':r.status==='Submitted'?'mid':'')+chip(progress(def,r)+'% required')+'</div></div><p class="small">'+esc(def.intro||'')+' Answers save as you type.</p>';
  if(S.errs&&S.errs.length)h+='<div class="banner err" role="alert"><b>Fix these before submitting:</b><ul>'+S.errs.slice(0,12).map(function(e){return '<li>'+esc(e)+'</li>'}).join('')+(S.errs.length>12?'<li>and '+(S.errs.length-12)+' more</li>':'')+'</ul></div>';
  if(ro)h+='<div class="banner ok">Submitted. Your advisor is reviewing it. '+(S.role==='Candidate'?'':'')+'</div>';
  def.parts.forEach(function(p){
    if(!partVisible(def,p,r))return;
    h+='<section class="fpart"><h3>'+esc(p.title)+'</h3>'+(p.intro?'<p class="small">'+esc(p.intro)+'</p>':'');
    if(p.repeat){
      var arr=r.data[p.id]||[],n=Math.max(arr.length,p.repeat.min);
      for(var i=0;i<n;i++){
        var e=arr[i]||{};
        h+='<div class="entry"><div class="ph"><b>'+esc(p.repeat.label)+' '+(i+1)+(e[p.repeat.title]?': '+esc(String(e[p.repeat.title]).slice(0,60)):'')+'</b>'+(!ro&&i>=p.repeat.min?'<button class="link" data-a="entry-del" data-fp="'+esc(def.id+'|'+p.id+'|'+i)+'">Remove</button>':'')+'</div>'+renderFields(def,p,i,e,ro);
        if(e._screen&&S.role==='Advisor'){var sc=e._screen;h+='<div class="opt"><b>Screen: '+sc.total+'/100, '+esc(sc.verdict)+'</b><p>'+esc(sc.note)+'</p><p class="small">Venue types to look for: '+esc((sc.venueTypes||[]).join('; '))+'. Verify real venues yourself.</p></div>'}
        h+='</div>';
      }
      if(!ro&&n<p.repeat.max)h+='<button class="btn sm" data-a="entry-add" data-fp="'+esc(def.id+'|'+p.id)+'">Add '+esc(p.repeat.label.toLowerCase())+'</button> <span class="small">'+n+' of up to '+p.repeat.max+'</span>';
    }else h+=renderFields(def,p,'',r.data[p.id]||{},ro);
    h+='</section>';
  });
  h+='<div class="addrow">';
  if(!ro&&r.status!=='Reviewed')h+='<button class="btn pri" data-a="submit">Submit '+(S.role==='Candidate'?'':'for review')+'</button>';
  if(S.role==='Advisor'&&(r.status==='Submitted'||r.status==='Reviewed'))h+='<button class="btn" data-a="reopenform" data-id="'+fid+'">Send back for edits</button>';
  return h+'<button class="btn" data-a="form-tpl" data-id="'+esc(fid)+'">Download blank template</button> <button class="btn" data-a="closeform">Close</button></div></div>';
}

/* Blank, fill-in template for any form, generated from its definition so it never drifts. Opens in Word. */
function formTemplate(fid,guide){
  var def=formDef(fid);if(!def)return '';
  function fld(f){var o=(f.o&&f.o.length)?'<div class="o">Choose one: '+f.o.map(esc).join(' / ')+'</div>':'';
    return '<p class="q">'+esc(f.l)+(f.req?' <b>*</b>':'')+'</p>'+o+'<div class="box'+(f.t==='area'?' tall':'')+'"></div>'}
  var b='<h1>'+esc(def.n)+'</h1><p class="n">'+esc(def.intro||'')+' Fields marked * are required. Fill this in and send it back, or enter the same answers in the portal.</p>';
  if(fid==='f10'&&guide&&guide.length)b+='<h2>Example ideas for your field</h2><ul>'+guide.map(function(g){return '<li><b>'+esc(g.cat)+':</b> '+esc(g.title)+' &mdash; '+esc(g.line)+'</li>'}).join('')+'</ul>';
  def.parts.forEach(function(p){
    b+='<h2>'+esc(p.title)+'</h2>'+(p.intro?'<p class="n">'+esc(p.intro)+'</p>':'');
    if(p.repeat){for(var i=1;i<=Math.max(p.repeat.min,fid==='f10'?4:2);i++)b+='<h3>'+esc(p.repeat.label)+' '+i+'</h3>'+p.fields.map(fld).join('')}
    else b+=p.fields.map(fld).join('');
  });
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>'+esc(def.n)+'</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}h1{font-size:18pt}h2{font-size:14pt;border-bottom:1px solid #999}h3{font-size:12pt}.q{font-weight:bold;margin:10pt 0 2pt}.o,.n{color:#555;font-size:10pt}.box{border:1px solid #888;height:22pt}.box.tall{height:110pt}</style></head><body>'+b+'</body></html>';
}

function planHtml(p){
  if(!p||!p.call)return '';
  function ul(t,a){return a&&a.length?'<h4>'+t+'</h4><ul>'+a.map(function(i){return '<li>'+esc(i)+'</li>'}).join('')+'</ul>':''}
  var cls=p.call==='Invest'?'ok':p.call==='Maintain'?'mid':'';
  var det=p.call==='Skip'?'':ul('Actions',p.actions)+ul('Documents to request',p.evidenceToRequest)+ul('Article topics',p.articleTopics)+ul('Venue types (verify real venues)',p.venueTypes)+ul('Judging routes',p.judgingRoutes)+ul('Letter ideas',p.letterIdeas);
  return '<div class="plan"><div class="chips">'+chip(p.call,cls)+(p.effort?'<span class="small">'+esc(p.effort)+'</span>':'')+'</div>'+(p.why?'<p class="small">'+esc(p.why)+'</p>':'')+(det?'<details><summary>Plan details</summary>'+det+'</details>':'')+'</div>';
}
/* ----- scorecard ----- */
var CRIT_TASKS={c1:['awards'],c2:['mem-fit','f11','r11'],c3:['media-sheet','media-chk','angles','media'],c4:['judging-proof'],c5:['contrib'],c8:['role'],c9:['comp']};
function targetsPanel(c){
  if(!c.strategyAt)return '';
  var sug=c.targets||[],cho=c.chosen,h='<div class="panel"><div class="ph"><h3>Target criteria for evidence building</h3><div class="chips">'+(cho?chip('Confirmed: '+cho.length+' criteria','ok'):chip('Not confirmed','gate'))+'</div></div>';
  h+='<p class="small">Tick every criterion to build evidence for. Our suggestion is pre-ticked, with the reason. Unticked criteria have their evidence tasks marked Skipped; you can change this later.</p>';
  CRIT.forEach(function(k){
    if(k.na)return;
    var x=(c.criteria||{})[k.id]||{},call=(x.plan&&x.plan.call)||'',key='tg_'+k.id;
    var on=S.draft[key]!==undefined?S.draft[key]:(cho?cho.indexOf(k.id)>=0:sug.indexOf(k.id)>=0);
    h+='<label class="flag"><input type="checkbox" data-draft-chk="'+key+'"'+(on?' checked':'')+'><span><b>'+esc(k.n)+'</b> '+chip(x.rating||'n/a',x.rating==='High'?'ok':x.rating==='Medium'?'mid':'bad')+(call?' '+chip(call,call==='Invest'?'ok':'')+(sug.indexOf(k.id)>=0?' '+chip('Suggested','ok'):''):'')+(x.plan&&x.plan.why?'<br><span class="small">'+esc(x.plan.why)+'</span>':'')+'</span></label>';
  });
  if(c.targetNote)h+='<p class="small">'+esc(c.targetNote)+'</p>';
  return h+'<div class="addrow"><button class="btn pri sm" data-a="tgt-save">'+(cho?'Update target criteria':'Confirm target criteria')+'</button></div></div>';
}
function costPanel(c){
  var r=c.costs||[],tot=0,inp=0,out=0,se=0,by={};
  r.forEach(function(x){tot+=x.usd||0;inp+=x.input||0;out+=x.output||0;se+=x.searches||0;by[x.label]=(by[x.label]||0)+(x.usd||0)});
  var h='<div class="panel"><div class="ph"><h3>AI cost for this case (admins only)</h3><div class="chips">'+chip('$'+tot.toFixed(2)+' total','ok')+chip(r.length+' runs')+'</div></div>';
  if(!r.length)return h+'<p class="empty">No analysis has run for this case yet.</p></div>';
  h+='<p class="small">A full case has 8 analysis steps, and a re-run costs again. Alerts show when one run passes $'+RUN_WARN.toFixed(2)+' or the case passes $'+CASE_WARN+'. Estimated from token counts at published per-million-token rates plus $0.01 per web search. Check the Anthropic console for the billed amount. Never shown to candidates.</p>';
  h+='<div class="chips">'+Object.keys(by).map(function(k){return chip(k+': $'+by[k].toFixed(3))}).join('')+'</div>';
  h+='<p class="small">'+inp.toLocaleString()+' input tokens, '+out.toLocaleString()+' output tokens, '+se+' web searches.</p>';
  h+='<div class="log">'+r.slice().reverse().map(function(x){return '<div><time>'+esc(fmt(x.ts))+'</time><span>'+esc(x.label)+' · '+esc(String(x.model||'').replace('claude-',''))+' · '+(x.input||0).toLocaleString()+' in / '+(x.output||0).toLocaleString()+' out'+(x.searches?' / '+x.searches+' searches':'')+' · <b>$'+(x.usd||0).toFixed(3)+'</b></span></div>'}).join('')+'</div></div>';
  return h;
}
/* Advisor-only evidence triage. Descriptive, not a legal eligibility model. */
function evidenceIntelligence(c){
  var criteria=c.criteria||{},chosen=Array.isArray(c.chosen)?c.chosen:[],items=[];
  CRIT.forEach(function(k){
    if(k.na)return;
    var x=criteria[k.id]||{},targeted=chosen.indexOf(k.id)>=0;
    if(!targeted&&!x.rating&&!x.evidence&&!x.gaps)return;
    var evidence=String(x.evidence||'').trim(),gap=String(x.gaps||'').trim();
    var rating=x.rating||'Not assessed',priority,reason,action;
    if(targeted&&!evidence){priority='High';reason='Target criterion without a recorded evidence explanation';action='Document the claimed contribution and link supporting primary evidence for advisor review.'}
    else if(targeted&&gap){priority='High';reason='Target criterion with a recorded evidence gap';action=gap}
    else if(!evidence){priority='Medium';reason='Evidence has not been described';action='Review this criterion and record whether relevant evidence exists.'}
    else if(gap){priority='Medium';reason='Existing analysis identifies an unresolved gap';action=gap}
    else{priority='Review';reason='Evidence described; sufficiency and authenticity are not independently verified';action='Verify source, relevance, authorship, dates, and supporting documents.'}
    items.push({id:k.id,name:k.n,priority:priority,reason:reason,action:action,rating:rating,targeted:targeted,hasEvidence:!!evidence});
  });
  var order={High:0,Medium:1,Review:2};
  items.sort(function(a,b){return order[a.priority]-order[b.priority]||Number(b.targeted)-Number(a.targeted)||a.name.localeCompare(b.name)});
  return items;
}
function evidenceIntelligencePanel(c){
  var items=evidenceIntelligence(c),high=items.filter(function(x){return x.priority==='High'}).length,
    medium=items.filter(function(x){return x.priority==='Medium'}).length,
    review=items.filter(function(x){return x.priority==='Review'}).length;
  var h='<section class="panel" aria-label="Evidence intelligence"><div class="ph"><h3>Evidence intelligence</h3><div class="chips">'+chip(high+' high priority',high?'bad':'')+chip(medium+' to develop',medium?'mid':'')+chip(review+' to verify')+'</div></div>'+
    '<p class="small">Advisor work queue based on recorded criteria, selected targets, and written evidence gaps. Priority reflects documentation work, not petition eligibility, likelihood of approval, or legal advice. No independent document verification has occurred.</p>';
  if(!c.scoredAt)h+='<div class="banner">A full evidence assessment has not been recorded. These are intake and documentation prompts only.</div>';
  if(!items.length)return h+'<p class="empty">No criterion evidence has been assessed or targeted yet. Complete intake and review the scorecard to build a case-specific action queue.</p></section>';
  h+='<div class="pathway-evidence-list">';
  items.forEach(function(x){
    h+='<div class="pathway-evidence-item"><div class="ph"><b>'+esc(x.name)+'</b><div class="chips">'+chip(x.priority==='Review'?'Verify':x.priority+' priority',x.priority==='High'?'bad':x.priority==='Medium'?'mid':'')+(x.targeted?chip('Selected target','ok'):'')+'</div></div>'+
      '<p class="small">'+esc(x.reason)+' · Current assessment: '+esc(x.rating)+'</p><p><b>Next action:</b> '+esc(x.action)+'</p></div>';
  });
  return h+'</div><p class="small">EB-1A criteria and NIW considerations require separate legal analysis. These case records do not establish either classification, and an attorney must evaluate the complete petition and final merits.</p></section>';
}
/* Source-linked advisor findings: no automatic document extraction or legal determination. */
function evidenceSourceReview(c,tracks){
  tracks=tracks||['eb1a'];
  var files=S.docs.filter(function(d){return d.cid===c.id&&d.kind==='file'&&d.path});
  var findings=Array.isArray(c.evidenceFindings)?c.evidenceFindings:[];
  var h='<section class="panel" aria-label="Source-linked evidence review"><div class="ph"><h3>Source-linked evidence review</h3>'+chip(findings.length+' findings')+'</div>'+
    '<p class="small">Create a finding only after reading the source document. Record an exact excerpt or page reference. A citation is a pointer to a file, not proof of authenticity or eligibility. Findings remain advisor-only and do not change criterion ratings automatically.</p>';
  if(files.length){
    h+='<label class="f" for="evfile">Source document</label><select id="evfile" data-draft="evfile"><option value="">Select an uploaded file</option>';
    files.forEach(function(f){h+='<option value="'+esc(f.id)+'"'+(S.draft.evfile===f.id?' selected':'')+'>'+esc(f.name)+'</option>'});
    h+='</select><label class="f" for="evcriterion">Criterion to examine</label><select id="evcriterion" data-draft="evcriterion"><option value="">Choose a criterion</option>';
    if(tracks.indexOf('eb1a')>=0)CRIT.forEach(function(k){if(!k.na)h+='<option value="'+esc(k.id)+'"'+(S.draft.evcriterion===k.id?' selected':'')+'>'+esc('EB-1A — '+k.n)+'</option>'});
    if(tracks.indexOf('niw')>=0)PATHWAY_REQUIREMENTS.niw.forEach(function(k){h+='<option value="'+esc(k[0])+'"'+(S.draft.evcriterion===k[0]?' selected':'')+'>'+esc('NIW — '+k[1])+'</option>'});
    h+='</select><label class="f" for="evlocator">Page / section / location in source</label><input id="evlocator" data-draft="evlocator" maxlength="180" value="'+esc(S.draft.evlocator||'')+'" placeholder="Page 2, paragraph 3">'+
      '<label class="f" for="evexcerpt">Exact source excerpt or factual description</label><textarea id="evexcerpt" data-draft="evexcerpt" maxlength="1600">'+esc(S.draft.evexcerpt||'')+'</textarea>'+
      '<label class="f" for="evnote">Advisor interpretation (separate from source)</label><textarea id="evnote" data-draft="evnote" maxlength="1600">'+esc(S.draft.evnote||'')+'</textarea>'+
      '<div class="addrow"><button class="btn sm pri" data-a="ev-add">Record finding for review</button></div>';
  }else h+='<p class="empty">Upload a source document in Documents before recording a cited finding.</p>';
  if(findings.length)h+='<h4>Recorded findings</h4>';
  findings.forEach(function(f){
    var file=files.find(function(x){return x.id===f.fileId});
    var criterion=CRIT.find(function(x){return x.id===f.criterionId});
    var niwItem=PATHWAY_REQUIREMENTS.niw.find(function(x){return x[0]===f.criterionId});
    h+='<div class="entry"><div class="ph"><b>'+esc(criterion?criterion.n:niwItem?'NIW — '+niwItem[1]:'Criterion unavailable')+'</b>'+chip(f.status==='accepted'?'Reviewed':f.status==='rejected'?'Rejected':'Pending review',f.status==='accepted'?'ok':f.status==='rejected'?'bad':'mid')+'</div>'+
      '<p class="small">Source: '+esc(file?file.name:'File unavailable or deleted')+' · '+esc(f.locator||'Location unspecified')+'</p>'+
      '<p><b>Source excerpt:</b> '+esc(f.excerpt||'')+'</p>'+(f.note?'<p class="small"><b>Advisor interpretation:</b> '+esc(f.note)+'</p>':'')+
      (file?'<button class="btn sm" data-a="getfile" data-path="'+esc(file.path)+'">Open source</button> ':'')+
      (f.status==='pending'?'<button class="btn sm" data-a="ev-accept" data-id="'+esc(f.id)+'">Mark reviewed</button> <button class="btn sm" data-a="ev-reject" data-id="'+esc(f.id)+'">Reject finding</button>':'')+
      '<button class="btn sm" data-a="ev-remove" data-id="'+esc(f.id)+'">Remove</button></div>';
  });
  return h+'</section>';
}
function scoreTab(c){
  var n=counts(c),rd=readiness(c);
  var h='<div class="panel"><div class="ph"><h3>Criteria scorecard</h3><div class="chips">'+chip(n.High+' High','ok')+chip(n.Medium+' Medium','mid')+chip(n.Low+' Low or not met','bad')+chip(rd.k,rd.cls)+'</div></div>';
  if(!c.scoredAt)h+='<p class="empty">Not scored yet. The full analysis runs after the deep intake: every form reviewed and documents checked.</p>';
  else{
    h+='<p class="small">'+(c.scoreKind==='analysis'?'<b>Full analysis</b> from the reviewed forms and documents.':c.scoreKind==='rescore'?'<b>Re-score</b> after evidence was gathered.':'<b>Earlier resume-only run.</b> Replaced by the full analysis after the deep intake.')+'</p>';
    if(c.summary)h+='<p>'+esc(c.summary)+'</p>';
    CRIT.forEach(function(k){
      var x=(c.criteria||{})[k.id];if(!x)return;
      h+='<div class="row"><div class="nm">'+esc(k.n)+'<small>'+k.id.toUpperCase()+(x.prev&&x.prev!==x.rating?' · was '+esc(x.prev):'')+'</small></div><div><select data-rate="'+k.id+'" aria-label="Rating for '+esc(k.n)+'">'+options(RATINGS,x.rating)+'</select>'+(x.evidence?'<p>'+esc(x.evidence)+'</p>':'')+(x.gaps?'<p class="g">Gap: '+esc(x.gaps)+'</p>':'')+planHtml(x.plan)+'</div></div>';
    });
  }
  h+='</div>';
  h+=pathwayAuditPanel(c);
  h+=evidenceIntelligencePanel(c);
  h+=evidenceSourceReview(c);
  h+=targetsPanel(c);
  var mr=c.meritsRisk;
  if(mr&&mr.level){h+='<div class="panel"><div class="ph"><h3>Final-merits risk</h3><div class="chips">'+chip(mr.level,mr.level==='Low'?'ok':mr.level==='Medium'?'mid':'bad')+'</div></div>'+(mr.drivers&&mr.drivers.length?'<ul>'+mr.drivers.map(function(d){return '<li>'+esc(d)+'</li>'}).join('')+'</ul>':'')+(mr.advice?'<p>'+esc(mr.advice)+'</p>':'')+'<p class="small">Internal view for advisors. Not shown to candidates.</p></div>'}
  var fl=c.redFlags||[];
  if(fl.length){h+='<div class="panel"><h3>Final-merits red flags</h3>'+fl.map(function(f,i){return '<label class="flag'+(f.done?' done':'')+'"><input type="checkbox" data-flag="'+i+'"'+(f.done?' checked':'')+'><span>'+esc(f.t)+'</span></label>'}).join('')+'<p class="small">Tick a flag when resolved or knowingly accepted.</p></div>'}
  h+='<div class="panel"><h3>Gates</h3><p>FOE lock: '+chip(gateState(c,'foe'),gateState(c,'foe')==='approved'?'ok':'gate')+' Attorney approval: '+chip(gateState(c,'attorney'),gateState(c,'attorney')==='approved'?'ok':'gate')+'</p></div>';
  h+='<div class="panel"><label class="f" for="cn">Advisor notes</label><textarea id="cn" data-cnotes>'+esc(c.notes||'')+'</textarea></div>';
  return h;
}
function activityTab(c){
  var l=S.log.filter(function(x){return x.cid===c.id}).sort(function(a,b){return a.ts<b.ts?1:-1}).slice(0,200);
  return messagesPanel(c,true)+(S.staff==='admin'?costPanel(c):'')+'<div class="panel"><h3>Activity</h3><div class="log">'+(l.length?l.map(function(x){return '<div><time>'+esc(fmt(x.ts))+'</time><span>'+esc(x.text)+'</span></div>'}).join(''):'<p class="empty">Nothing yet.</p>')+'</div></div>';
}

/* ----- documents, messages ----- */
function docsPanel(c,admin){
  var ds=S.docs.filter(function(d){return d.cid===c.id}).sort(function(a,b){return (a.ts||'')<(b.ts||'')?-1:1});
  var reqs=ds.filter(function(d){return d.kind==='request'}),files=ds.filter(function(d){return d.kind==='file'});
  var h='<div class="panel"><div class="ph"><h3>Documents</h3></div><p class="small">Files are stored privately. Only you and your advisor can open them. Do not upload passports or tax returns unless your advisor asked for them.</p>';
  function fileList(list){return list.map(function(f){return '<div class="formrow"><div><b>'+esc(f.name)+'</b><div class="small">'+esc(fmt(f.ts))+' · '+esc(f.by||'')+'</div></div><div class="chips"><button class="btn sm" data-a="getfile" data-path="'+esc(f.path)+'">Open</button>'+(admin?'<button class="btn sm danger" data-a="file-del" data-id="'+f.id+'">Delete</button>':'')+'</div></div>'}).join('')}
  reqs.forEach(function(r){
    var mine=files.filter(function(f){return f.reqId===r.id});
    h+='<div class="entry"><div class="ph"><b>'+esc(r.label)+'</b><div class="chips">'+chip(mine.length?mine.length+' uploaded':'Waiting',mine.length?'ok':'gate')+(admin?'<button class="link" data-a="req-del" data-id="'+r.id+'">Remove request</button>':'')+'</div></div>'+(r.note?'<p class="small">'+esc(r.note)+'</p>':'')+fileList(mine)+'<label class="btn sm up">Upload file<input type="file" hidden data-up="'+r.id+'"></label></div>';
  });
  var other=files.filter(function(f){return !f.reqId||!reqs.some(function(r){return r.id===f.reqId})});
  if(other.length)h+='<div class="entry"><b>Other files</b>'+fileList(other)+'</div>';
  h+='<div class="addrow"><label class="btn sm up">Upload another file<input type="file" hidden data-up=""></label></div>';
  if(admin)h+='<h3 style="margin-top:14px">Request a document</h3><div class="addrow"><input type="text" data-draft="rq" placeholder="For example: W-2 for 2025" value="'+esc(S.draft.rq||'')+'"><input type="text" data-draft="rqn" placeholder="Note for the candidate (optional)" value="'+esc(S.draft.rqn||'')+'"><button class="btn" data-a="req-add">Request</button></div>';
  if(S.upBusy)h+='<p class="small">Uploading…</p>';
  return h+'</div>';
}
function messagesPanel(c,admin){
  var ms=S.log.filter(function(l){return l.cid===c.id&&l.kind==='note'&&!l.tid&&(admin||l.by==='Candidate'||l.shared)}).sort(function(a,b){return a.ts<b.ts?-1:1});
  return '<div class="panel"><h3>Messages</h3>'+(ms.length?ms.map(function(m){return '<div class="note"><span class="small mono">'+esc(fmt(m.ts))+'</span> <b>'+(m.by==='Candidate'?(admin?'Candidate':'You'):'Advisor')+':</b> '+esc(m.text)+(admin&&m.by!=='Candidate'&&!m.shared?' <span class="chip">private</span>':'')+'</div>'}).join(''):'<p class="empty">No messages yet.</p>')+
   '<div class="addrow"><input type="text" data-draft="msg" placeholder="'+(admin?'Write a message':'Message your advisor')+'" value="'+esc(S.draft.msg||'')+'">'+(admin?'<label class="chk-l"><input type="checkbox" data-draft-chk="msgShare"'+(S.draft.msgShare?' checked':'')+'> Share with candidate</label>':'')+'<button class="btn sm" data-a="msg">Send</button></div></div>';
}

/* ----- candidate view ----- */
var CV_STAGES=[
 {n:'Welcome and onboarding',d:'A welcome call, your consent and your first form.'},
 {n:'Profile review',d:'We read your background and agree on your direction.'},
 {n:'Share your details',d:'You complete detailed forms and share documents. We review each one.'},
 {n:'Field and analysis',d:'We study everything you shared and settle on your field of endeavor.'},
 {n:'Your strategy',d:'We agree which areas to strengthen and how, then you receive your plan.'},
 {n:'Build your evidence',d:'You carry out the plan: reviews, articles, memberships, proof and more.'},
 {n:'Verify and finalize',d:'We check every claim, gather recommendation letters and write your case.'},
 {n:'Attorney review',d:'Your attorney reviews everything before anything is filed.'},
 {n:'Filing',d:'Your attorney files the petition and supports you afterwards.'}];
var CV_ICON={form:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',file:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>',msg:'<path d="M4 5h16v11H9l-5 4z"/>',check:'<path d="M5 12l4 4 10-10"/>',lock:'<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 016 0v3"/>'};
function cvIcon(k){return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+CV_ICON[k]+'</svg>'}
function cvRing(p){var r=34,cf=2*Math.PI*r;return '<svg class="cv-ring" viewBox="0 0 80 80" role="img" aria-label="'+p+' percent complete"><circle cx="40" cy="40" r="'+r+'" class="rt"/><circle cx="40" cy="40" r="'+r+'" class="rf" stroke-dasharray="'+(cf*p/100).toFixed(1)+' '+cf.toFixed(1)+'" transform="rotate(-90 40 40)"/><text x="40" y="45" text-anchor="middle">'+p+'%</text></svg>'}
function cvGreeting(){var h=new Date().getHours();return h<5?'Hello':h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
function cvTaskCard(c,t){
  var isForm=t.kind==='form'&&t.form,def=isForm?formDef(t.form):null,r=isForm?getResp(c.id,t.form):null,p=isForm?progress(def,r):0;
  var started=isForm&&r.status==='In progress';
  var ico=isForm?'form':'file';
  var cta=isForm?'<button class="btn pri" data-a="openform" data-id="'+t.form+'">'+(started?'Continue':'Start')+'</button>':'<button class="btn pri" data-a="cvscroll" data-id="cv-docs">Upload a file</button><button class="btn" data-a="cvscroll" data-id="cv-msg">Message us</button>';
  var late=t.due&&daysUntil(t.due)<0;
  return '<div class="cv-task"><div class="cv-ico">'+cvIcon(ico)+'</div><div class="cv-tb"><div class="cv-tt"><b>'+esc(t.title)+'</b>'+(t.due?'<span class="chip '+dueCls(t)+'">'+(late?'Overdue · ':'Due ')+esc(fmtDate(t.due).replace(/, \d{4}$/,''))+'</span>':'')+'</div>'+
   (t.detail?'<p>'+esc(t.detail)+'</p>':'')+
   (isForm&&r.status!=='Not started'?'<div class="cv-prog"><div class="bar"><i style="width:'+p+'%"></i></div><span class="small">'+p+'% of required answers</span></div>':'')+
   '<div class="cv-cta">'+cta+'</div></div></div>';
}
var CX_FORMS={f1:['Profile intake','Your background, CV and goals.'],f2:['Project intake','Your 3 to 6 most significant projects and their impact.'],f3:['Scholarly article intake','Papers, presentations, citations and patents you have already published.'],f4:['Awards intake','Awards and prizes from outside your employer.'],f5:['Media intake','Articles and coverage that are about you and your work.'],f6:['Compensation intake','Your pay and equity, compared with peers.'],f7:['Roles intake','Leading or critical roles you have held.'],f8:['Judging and memberships intake','Reviews you have done and associations you belong to.'],f9:['Recommender intake','The independent experts who know your work.'],f10:['Article ideas','Topics you could write about for professional publications.'],f11:['Senior membership facts','Facts for the memberships we are targeting.']};
var CX_STEPS={'Collect proof of every completed review':'Gather proof of the reviews you completed','Review the media sheet':'Check your media list','Apply to shortlisted qualifying awards':'Apply for the awards we shortlisted','Secure coverage in vetted outlets (editorial only)':'Earn coverage in approved outlets','Collect adoption and impact proof for top contributions':'Gather proof of your work\'s impact','Get a signed org chart and employer distinction proof':'Get a signed org chart and proof your employer is distinguished','Collect 6 to 8 signed letters':'Collect your 6 to 8 signed recommendation letters'};
function cxName(t){var f=t&&t.kind==='form'&&t.form&&CX_FORMS[t.form];return f?f[0]:(t&&(CX_STEPS[t.title]||t.title))||''}
function cxDesc(t){var f=t&&t.kind==='form'&&t.form&&CX_FORMS[t.form];return f?f[1]:''}
function cxTask(c,t){
  var isForm=t.kind==='form'&&t.form,r=isForm?getResp(c.id,t.form):null,p=isForm?progress(formDef(t.form),r):0;
  var nodue=/^speak-/.test(t.key||''),late=!nodue&&t.due&&daysUntil(t.due)<0,started=isForm&&r&&r.status==='In progress';
  var du=t.due?daysUntil(t.due):0,due=t.due&&!nodue?'<span class="chip '+dueCls(t)+'">'+(late?'Overdue by '+(-du)+(du===-1?' day':' days'):du===0?'Due today':du<=7?'Due in '+du+(du===1?' day':' days'):'Due '+esc(fmtDate(t.due).replace(/, \d{4}$/,'')))+'</span>':'';
  var main=isForm?'<button class="btn pri" data-a="openform" data-id="'+t.form+'">'+(started?'Continue form':'Start form')+'</button>':'<button class="btn pri" data-a="cvscroll" data-id="cx-docs">Upload a file</button><button class="btn" data-a="cvscroll" data-id="cx-msg">Message us</button>';
  return '<article class="cx-task"><div class="cx-ticon">'+cvIcon(isForm?'form':'file')+'</div><div class="cx-tbody"><div class="cx-thead"><h4>'+esc(cxName(t))+'</h4>'+due+'</div>'+
    '<p>'+esc(t.detail||(isForm?(cxDesc(t)+' You can save and come back later.'):'Share the requested information or files with your advisor.'))+'</p>'+
    (isForm&&r.status!=='Not started'?'<div class="cv-prog"><div class="bar"><i style="width:'+p+'%"></i></div><span class="small">'+p+'% of required answers</span></div>':'')+
    (/^art\d/.test(t.key||'')?'<p class="cx-note">Publishing on time keeps the dates after it. If it slips, every date after it moves out by the same amount.</p>':'')+'<div class="cx-actions">'+main+'</div></div></article>';
}
function candidateView(c){
  var ts=tasksOf(c.id).filter(function(t){return t.owner==='Candidate'&&!t.draft&&t.req!==false||(t.owner==='Candidate'&&!t.draft&&t.status!=='Not started')});
  var h=S.locked?'':'<div class="candbar"><span class="chip gate">Candidate view (preview)</span> <button class="btn sm" data-a="asAdv">Back to admin view</button></div>';
  if(S.openForm){return h+formEditor(c,S.form)}
  var LCN=7,st=Math.min(c.stage||0,LCN-1);
  var by=function(a,b){return (a.due||'9')<(b.due||'9')?-1:1};
  var now=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)&&t.status!=='Skipped'}).sort(by);
  var later=ts.filter(function(t){return t.status==='Not started'}).sort(by),done=ts.filter(function(t){return isDone(t.status)});
  var pct=caseProgress(c),sel=Math.min(S.cvp!==undefined?S.cvp:st,LCN),sg=CV_STAGES[st];
  var allc=tasksOf(c.id).filter(function(t){return t.owner==='Candidate'&&!t.draft});
  /* Live schedule: 7 months in total, split across the 7 stages. Finished stages use real finish dates,
     the current stage slips by the number of days an open task is overdue, and every later stage moves with it. */
  var PLAN=[10,14,35,21,21,75,34],DAY=864e5,iso=function(d){return d.toISOString().slice(0,10)},addD=function(x,n){var d=new Date(x+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Math.round(n));return iso(d)},tod=iso(new Date());
  var base=(c.startDate||c.createdAt||tod).slice(0,10),cur=base,sched=[];
  for(var si=0;si<LCN;si++){
    var inS=allc.filter(function(t){return t.stage===si}),plan=PLAN[si],e;
    if(si<st){var dn=inS.map(function(t){return (t.doneAt||'').slice(0,10)}).filter(Boolean).sort();e=dn.length&&dn[dn.length-1]>cur?dn[dn.length-1]:addD(cur,plan);if(e>tod)e=tod}
    else if(si===st){var open=inS.filter(function(t){return !isDone(t.status)&&t.status!=='Skipped'}),late=0;
      open.forEach(function(t){if(t.due&&t.due<tod)late=Math.max(late,Math.round((new Date(tod)-new Date(t.due))/DAY))});
      var frac=inS.length?(inS.length-open.length)/inS.length:0;e=addD(cur,plan+late);
      if(e<tod)e=addD(tod,Math.ceil(plan*(1-frac)||1))}
    else e=addD(cur,plan);
    sched.push({s:cur,e:e,plan:plan,len:Math.max(1,Math.round((new Date(e)-new Date(cur))/DAY))});cur=e}
  var plannedEnd=function(i){return addD(base,PLAN.slice(0,i+1).reduce(function(a,b){return a+b},0))};
  var stEnd=function(i){return sched[i].e};
  var slip=Math.round((new Date(sched[LCN-1].e)-new Date(plannedEnd(LCN-1)))/DAY);
  var evEnd={d:sched[5].e};
  var nf=function(v){return v?esc(String(v)):'<span class="cx-na">Not provided</span>'};
  h+='<div class="cx">';
  /* summary */
  h+='<section class="cx-hero"><div class="cx-hl"><p class="cx-eyebrow">Your case</p><h2>'+esc(c.name||'Candidate')+'</h2><p class="cx-sub">Stage '+(st+1)+' of '+LCN+': <b>'+esc(sg.n)+'</b></p>'+(evEnd?'<p class="cx-sub cx-ev">Anticipated evidence collection end: <b>'+esc(fmtDate(evEnd.d))+'</b>'+(slip>3?' <small>('+slip+' days later than the original plan)</small>':slip<-3?' <small>('+(-slip)+' days ahead of plan)</small>':' <small>(on track)</small>')+'</p>':'')+
    '<dl class="cx-facts">'+[['Email',c.email],['Employer',c.employer],['Immigration status',c.visa?c.visa+(c.visaExpiry?' (valid to '+fmtDate(c.visaExpiry)+')':''):''],['Timeline goal',c.goal]].map(function(x){return '<div><dt>'+x[0]+'</dt><dd>'+(x[1]?esc(x[1]):'<span class="cx-na">Not provided</span>')+'</dd></div>'}).join('')+'</dl><p class="cx-fn">Recorded case information, not verified legal dates. To correct anything, send us a message.</p>'+
    '</div>'+
    '<div class="cx-prog"><b>'+pct+'%</b><div class="cx-bar" role="img" aria-label="'+pct+' percent complete"><i style="width:'+pct+'%"></i></div><span>overall progress</span></div></section>';
  /* fast track to the first article */
  var ftf=['f1','f2','f3'].map(function(k){return allc.filter(function(t){return t.form===k})[0]}).filter(Boolean);
  var ftLeft=ftf.filter(function(t){return !isDone(t.status)});
  if(ftf.length&&ftLeft.length&&st<=3){var ftBy=addD(base,18);
    h+='<section class="cx-fast"><div class="cx-fh"><b>Fast track to your first article</b><span>Target: all three intake forms by '+esc(fmtDate(ftBy).replace(/, \d{4}$/,''))+'</span></div><p>We publish one article a month, and your first one can only start once we know your background, your projects and your publication record. Finishing these three early keeps your whole schedule on time.</p><ul>'+ftf.map(function(t){
      var d2=isDone(t.status),open=!d2&&t.status!=='Not started'&&t.status!=='Skipped';
      return '<li class="'+(d2?'d':open?'o':'l')+'"><span class="cx-si">'+cvIcon(d2?'check':open?'form':'lock')+'</span><b>'+esc(cxName(t))+'</b><small>'+(d2?'Completed':open?'Ready for you. Start it under What to do now.':'Opens as soon as your profile is reviewed')+'</small>'+'</li>'}).join('')+'</ul></section>';}
  /* tasks */
  h+='<section class="cx-sec" id="cx-todo"><div class="cx-sh"><h3>What to do now</h3>'+(now.length?chip(now.length+(now.length===1?' task':' tasks'),'gate'):chip('Nothing due','ok'))+'</div>';
  if(now.length){now.forEach(function(t){h+=cxTask(c,t)})}
  else{var l0=later[0];h+='<div class="cx-calm"><span class="cx-ticon ok">'+cvIcon(l0?'lock':'check')+'</span><div><b>Nothing for you to do today</b><p>'+(l0?'Next for you: <b>'+esc(l0.title)+'</b>'+(l0.due?' (due '+esc(fmtDate(l0.due).replace(/, \d{4}$/,''))+')':'')+'. It opens when our team finishes the step before it, and we will message you.':'Our team is working on your case. New tasks will appear here.')+'</p></div></div>'}
  h+='</section>';
  /* all intake forms in one place */
  var fm=allc.filter(function(t){return t.kind==='form'&&t.form&&t.stage<LCN}).sort(function(a,b){return a.stage-b.stage||(a.form<b.form?-1:1)});
  if(fm.length){h+='<details class="cx-sec cx-details" id="cx-forms"><summary><b>Your forms</b><small>'+fm.filter(function(t){return isDone(t.status)}).length+' of '+fm.length+' complete. Tap to see every form, from profile intake to scholarly articles.</small></summary><ul class="cx-steplist" style="margin-top:14px">'+fm.map(function(t){
    var d2=isDone(t.status),open=!d2&&t.status!=='Not started'&&t.status!=='Skipped',r=getResp(c.id,t.form),lab=d2?'Completed':open?(r&&r.status==='In progress'?'In progress':'Ready for you'):'Opens later';
    return '<li class="'+(d2?'d':open?'o':'l')+'"><span class="cx-si">'+cvIcon(d2?'check':open?'form':'lock')+'</span><div class="cx-sb"><b>'+esc(cxName(t))+'</b><small>'+esc(cxDesc(t))+' · '+lab+'</small></div>'+(open?'<button class="btn sm pri" data-a="openform" data-id="'+t.form+'">'+(r&&r.status==='In progress'?'Continue':'Open')+'</button>':'')+'</li>'}).join('')+'</ul></details>';}
  var spkNode='<li class="opt'+(sel===LCN?' sel':'')+'"><button type="button" data-a="cvphase" data-id="'+LCN+'" aria-pressed="'+(sel===LCN)+'"><i>+</i><span>Conference speaking</span><small>Optional · any time</small></button></li>';
  var spkT=allc.filter(function(t){return /^speak-/.test(t.key||'')});
  var speakHtml='<div class="cx-stage"><div class="cx-sth"><div><b>Conference speaking</b></div>'+chip('Optional','')+'</div>'+
    '<h5>What this is about</h5><p>Being invited to speak at a conference, as a keynote or invited speaker, shows that people in your field want to hear from you. It supports your original contributions and your overall case for sustained acclaim. It is not one of the ten criteria by itself, so it adds to the other evidence and does not replace it.</p>'+
    '<h5>When</h5><p>Any time, from your first month. Only the articles follow a monthly pace. Speaking can start as soon as you like, and it does not wait for the articles. <span class="cx-more">Your advisor can help you choose events.</span></p>'+
    '<h5>'+(spkT.length?'Your steps':'Steps you may see')+'</h5><ul class="cx-steplist">'+(spkT.length?spkT.map(function(t){var d2=isDone(t.status),open=!d2&&t.status!=='Not started'&&t.status!=='Skipped';return '<li class="'+(d2?'d':open?'o':'l')+'"><span class="cx-si">'+cvIcon(d2?'check':open?'file':'lock')+'</span><div class="cx-sb"><b>'+esc(t.title.replace(/^Choose/,'We choose'))+'</b><small>'+esc(t.detail||'')+' · '+(d2?'Completed':open?'Ready for you':'Opens later')+'</small></div></li>'}).join(''):['Pick 5 target conferences in your field.|We check that each is selective and respected.','Send talk proposals.|One strong abstract, adapted for each event.','Ask organizers about invited or keynote slots.|An invitation counts for more than an accepted submission.','Keep proof for every talk.|Program page with your name, invitation email, and an organizer letter.','Share the talk.|Slides, recording and any coverage.'].map(function(x){var p=x.split('|');return '<li class="l"><span class="cx-si">'+cvIcon('file')+'</span><div class="cx-sb"><b>'+p[0]+'</b><small>'+p[1]+'</small></div></li>'}).join(''))+'</ul><p class="cx-none">Optional. Skip it if it does not fit. Speaking adds to your other evidence and does not replace it.</p></div></section>';
  /* case life cycle */
  h+='<section class="cx-sec" id="cx-stages"><div class="cx-sh"><h3>Your case life cycle</h3><span class="small">About 7 months in total. Dates move as you progress, so finishing early or late shifts what follows.</span></div><ol class="cx-tl" role="group" aria-label="Case life cycle">'+CV_STAGES.slice(0,LCN).map(function(s,i){
    var e=stEnd(i);
    return '<li class="'+(i<st?'done':i===st?'now':'')+(i===sel?' sel':'')+'"><button type="button" data-a="cvphase" data-id="'+i+'" aria-pressed="'+(i===sel)+'"><i>'+(i<st?cvIcon('check'):(i+1))+'</i><span>'+esc(s.n)+'</span><small>'+(i<st?'Complete':i===st?'In progress':e?'by '+esc(fmtDate(e).replace(/, \d{4}$/,'')):'Upcoming')+'</small></button></li>'}).join('')+spkNode+'</ol>';
  if(sel===LCN){h+=speakHtml;}else{
  var mine=allc.filter(function(t){return t.stage===sel&&!/^speak-/.test(t.key||'')}).sort(by),ss=sel<st?'Complete':sel===st?'You are here':'Coming up',se=stEnd(sel);
  h+='<div class="cx-stage"><div class="cx-sth"><div><b>'+(sel+1)+'. '+esc(CV_STAGES[sel].n)+'</b></div>'+chip(ss,sel<st?'ok':sel===st?'gate':'')+'</div>'+
    '<h5>What this stage is about</h5><p>'+esc(CV_STAGES[sel].d)+' <span class="cx-more">'+esc(STAGES[sel].d)+'.</span></p>'+
    '<h5>'+(sel===5?'Anticipated evidence collection end':'Expected to finish')+'</h5><p>'+esc(fmtDate(sched[sel].e))+' <span class="cx-more">· about '+Math.max(1,Math.round(sched[sel].plan/7))+(Math.round(sched[sel].plan/7)<=1?' week':' weeks')+' planned'+(sel===st&&sched[sel].len>sched[sel].plan+3?', running '+(sched[sel].len-sched[sel].plan)+' days longer':'')+'</span></p>'+
    '<h5>Steps for you in this stage</h5>';
  if(mine.length){h+='<ul class="cx-steplist">'+mine.map(function(t){
    var d2=isDone(t.status),open=!d2&&t.status!=='Not started'&&t.status!=='Skipped',isForm=t.kind==='form'&&t.form;
    var lab=d2?'Completed':open?'Ready for you':t.status==='Skipped'?'Skipped':'Opens later';
    return '<li class="'+(d2?'d':open?'o':'l')+'"><span class="cx-si">'+cvIcon(d2?'check':open?(isForm?'form':'file'):'lock')+'</span><div class="cx-sb"><b>'+esc(cxName(t))+'</b><small>'+(cxDesc(t)?esc(cxDesc(t))+' · ':'')+lab+(t.due&&!d2?' · due '+esc(fmtDate(t.due).replace(/, \d{4}$/,'')):'')+'</small></div></li>'}).join('')+'</ul><p class="cx-none">Anything marked Ready for you also appears under What to do now. Other work in this stage is done by our team.</p>'}
  else h+='<p class="cx-none">Our team handles this stage. Nothing is needed from you.</p>';
  h+='</div></section>';}
  /* evidence rhythm */
  var rows=[
   ['Intake and first topic','Finish Profile, Project and Scholarly intake. We approve your first article topic and venue.','','Speaking can start now: pick target conferences.','Collect your CV proof and employer proof.'],
   ['Article 1 published','Your first article goes out (aim for day 30 to 45).','Apply to 3 to 5 journal or conference review panels.','','Check your media list.'],
   ['Article 2','One new article.','First reviews completed.','','Start senior membership facts.'],
   ['Article 3','One new article.','Keep reviewing.','Send talk proposals as invitations and calls open.','Apply for the awards we shortlisted.'],
   ['Article 4','One new article.','Keep reviewing.','Ask organizers about invited or keynote slots.','Pitch your story to approved outlets.'],
   ['Article 5','One new article.','Reviews documented with proof.','Collect programs and invitation letters for each talk.','Apply for senior memberships.'],
   ['Article 6 (optional) and letters','Optional sixth article.','','Talk recordings and organizer letters filed.','Recommendation letters and exhibits.']];
  h+='<details class="cx-sec cx-details cx-rhythm" id="cx-rhythm" open><summary><b>Your evidence rhythm: one article a month</b><small>How we build proof steadily, with reviewing, speaking and other evidence running alongside</small></summary>'+
    '<p class="cx-why">We publish about one article a month instead of everything at once. A steady record over many months shows recognition that is real and lasting. A burst of articles in a few weeks can look planned for the petition and may raise questions with the reviewing officer. Only the articles follow a monthly pace. Reviewing, speaking and the other evidence can happen at any time that suits you. This is a planning guide, not legal advice. Your advisor confirms venues and timing.</p><div class="cx-months">'+rows.map(function(r,i){
      var ms=addD(base,30*i);
      return '<div class="cx-month'+(Math.floor((new Date(tod)-new Date(base))/DAY/30)===i?' now':'')+'"><div class="cx-mh"><b>Month '+(i+1)+'</b><small>from '+esc(fmtDate(ms).replace(/, \d{4}$/,''))+'</small></div><div class="cx-mt">'+r[0]+'</div>'+
        '<p><em class="a">Articles</em>'+esc(r[1])+'</p>'+(r[2]?'<p><em class="j">Reviewing</em>'+esc(r[2])+'</p>':'')+(r[3]?'<p><em class="s">Speaking</em>'+esc(r[3])+'</p>':'')+(r[4]?'<p><em class="o">Other</em>'+esc(r[4])+'</p>':'')+'</div>'}).join('')+'</div></details>';
  h+=niwCaseFlow(c,true);
  var fz=S.locked?c.feasibility:c.feasibilityReleased;
  if(fz&&fz.outlook)h+='<section class="panel cv-feas">'+feasCard(fz,false)+'</section>';
  h+='<div class="cv-two"><div id="cx-docs">'+docsPanel(c,false)+'</div><div id="cx-msg">'+messagesPanel(c,false)+'</div></div>';
  /* details */
  h+='<p class="cv-foot">Arcanam Pathway is a planning and coaching service. It is not legal advice and does not guarantee any outcome. Only you and your advisory team can see this page.</p></div>';
  return h;
}

/* ---------- Events ---------- */
var saveTimer={};
function parsePath(p){return p.split('|')}
function resolveHolder(path,create){
  var p=parsePath(path),def=formDef(p[0]);if(!def)return null;
  var part=def.parts.find(function(x){return x.id===p[1]}),f=part.fields.find(function(x){return x.k===p[3]});
  var r=workResp(S.cid,p[0]),holder;
  if(part.repeat){var arr=r.data[part.id]=r.data[part.id]||[];while(arr.length<=+p[2])arr.push({});holder=arr[+p[2]]}
  else holder=r.data[part.id]=r.data[part.id]||{};
  return {def:def,part:part,f:f,r:r,holder:holder,p:p};
}
function touch(fid){
  var r=workResp(S.cid,fid);
  if(r.status==='Not started'){r.status='In progress';var t=taskByKey(S.cid,fid);if(t&&t.status==='To do'&&!S.locked)setStatus(t,'In progress')}
}
function setField(path,val){
  var x=resolveHolder(path);if(!x)return;
  if(x.f.t==='rows'){var rows=x.holder[x.f.k]=x.holder[x.f.k]||[];while(rows.length<=+x.p[4])rows.push({});rows[+x.p[4]][x.p[5]]=val}
  else x.holder[x.f.k]=val;
  touch(x.p[0]);
}
function queueSave(fid){PEND[rid(S.cid,fid)]=1;clearTimeout(saveTimer[fid]);saveTimer[fid]=setTimeout(function(){saveResp(S.cid,fid)},700)}

document.addEventListener('input',function(e){
  var t=e.target;
  if(t.dataset.mk!==undefined){var mq=t.dataset.mk.split('|'),cc=cur(),mm=cc&&mwEdit(cc);if(mm&&mm.rows[+mq[0]])mm.rows[+mq[0]][mq[1]]=mq[1]==='urls'?t.value.split('\n').map(function(x){return x.trim()}).filter(Boolean):t.value;return}
  if(t.dataset.pl!==undefined){setPlanField(t.dataset.pl,t.value);var pq=t.dataset.pl.split('|'),pc=cur();if(pc&&pc.plan&&pc.plan.status==='approved'&&pq[0]==='articles'&&(pq[2]==='state'||pq[2]==='url')){clearTimeout(saveTimer.pl);saveTimer.pl=setTimeout(function(){var pp=S.planWork;if(!pp)return;var cp=JSON.parse(JSON.stringify(pc.plan));pp.articles.forEach(function(a,i){if(cp.articles[i]){cp.articles[i].state=a.state;cp.articles[i].url=a.url}});candRef(pc.id).update({plan:cp})},700)}return}
  if(t.dataset.draft!==undefined){S.draft[t.dataset.draft]=t.value;return}
  if(t.dataset.fp!==undefined&&t.type!=='checkbox'&&t.tagName!=='SELECT'){setField(t.dataset.fp,t.value);queueSave(parsePath(t.dataset.fp)[0])}
  if(t.dataset.cnotes!==undefined){var c=cur();if(c){clearTimeout(saveTimer.n);var v=t.value;saveTimer.n=setTimeout(function(){candRef(c.id).update({notes:v})},700)}}
});
document.addEventListener('focusout',function(e){
  var t=e.target;
  if(t.dataset&&t.dataset.fp!==undefined){var fid=parsePath(t.dataset.fp)[0];clearTimeout(saveTimer[fid]);saveResp(S.cid,fid)}
  setTimeout(function(){if(pendingRender){var a=document.activeElement;if(!(a&&a.closest&&a.closest('#app')&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'))){pendingRender=false;schedule()}}},50);
});
document.addEventListener('change',async function(e){
  var t=e.target,c=cur();
  try{
    if(t.dataset.docschk!==undefined&&c){await candRef(c.id).update({docsChecked:t.checked});return}
    if(t.dataset.draftChk!==undefined){S.draft[t.dataset.draftChk]=t.checked;return}
    if(t.dataset.up!==undefined&&t.files&&t.files[0]&&c){
      var file=t.files[0];if(file.size>25*1024*1024){say('That file is over 25 MB.','err');t.value='';return}
      S.upBusy=true;schedule();
      try{var path=await db.upload(c.id,file);await db.collection('docs').add({cid:c.id,kind:'file',reqId:t.dataset.up||'',name:file.name,path:path,size:file.size,by:S.locked?'Candidate':'Admin',ts:nowIso()});say('Uploaded '+file.name+'.','ok')}
      finally{S.upBusy=false;schedule()}
      return}
    if(t.dataset.draft!==undefined){S.draft[t.dataset.draft]=t.value;return}
    if(t.dataset.filter){S.filter[t.dataset.filter]=t.value;schedule();return}
    if(t.dataset.mp){var x=resolveHolder(t.dataset.mp);var arr=x.holder[x.f.k]=x.holder[x.f.k]||[];var i=arr.indexOf(t.dataset.mv);if(t.checked&&i<0)arr.push(t.dataset.mv);if(!t.checked&&i>=0)arr.splice(i,1);touch(x.p[0]);await saveResp(S.cid,x.p[0]);return}
    if(t.dataset.fp!==undefined&&(t.type==='checkbox'||t.tagName==='SELECT')){var v=t.type==='checkbox'?t.checked:t.value;setField(t.dataset.fp,v);await saveResp(S.cid,parsePath(t.dataset.fp)[0]);schedule();return}
    if(t.dataset.tf){
      var tk=S.tasks.find(function(x){return x.id===t.dataset.id});if(!tk)return;
      if(t.dataset.tf==='status'){await setStatus(tk,t.value);await log(tk.cid,tk.title+' set to '+t.value+'.','task',tk.id)}
      else if(t.dataset.tf==='owner'){await db.doc('tasks/'+tk.id).update({owner:t.value})}
      else if(t.dataset.tf==='due'){await db.doc('tasks/'+tk.id).update({due:t.value})}
      return;
    }
    if(t.dataset.rate&&c){var cr=JSON.parse(JSON.stringify(c.criteria||{}));var old=cr[t.dataset.rate]||{};cr[t.dataset.rate]=Object.assign({},old,{rating:t.value,prev:old.prev||old.rating});await candRef(c.id).update({criteria:cr});await log(c.id,'You changed '+t.dataset.rate.toUpperCase()+' to '+t.value+'.','score');return}
    if(t.dataset.flag!==undefined&&c){var fl=JSON.parse(JSON.stringify(c.redFlags||[]));fl[+t.dataset.flag].done=t.checked;await candRef(c.id).update({redFlags:fl});return}
  }catch(err){fail(err)}
});

document.addEventListener('click',async function(e){
  var el=e.target.closest&&e.target.closest('[data-a]');if(!el)return;
  var a=el.dataset.a,id=el.dataset.id,c=cur();
  try{
    if(S.staff==='supervisor'&&['feas-release','plan-approve','att-ok','delete-yes','newcase','create'].indexOf(a)>=0){say('An admin has to do this step.','err');return}
    switch(a){
      case 'dismiss':S.msg=null;S.msgGo=null;break;
      case 'usr-open':S.cid=null;S.home='users';S.confirmUser=null;refreshUsers();break;
      case 'cred-close':S.cred=null;break;
      case 'pw-open':S.pwOpen=true;S.pwMsg='';break;
      case 'pw-cancel':S.pwOpen=false;S.pwMsg='';break;
      case 'pw-save':{var pv=(document.getElementById('np')||{}).value||'';if(pv.length<8){S.pwMsg='Use at least 8 characters.';break}var pr=await db.setPassword(pv);if(pr&&pr.error){S.pwMsg=pr.error.message}else{S.pwOpen=false;S.pwMsg='';say('Password changed.','ok')}break}
      case 'usr-cancel':S.confirmUser=null;break;
      case 'usr-create':case 'usr-create-cand':{
        if(S.staff!=='admin')return;
        var cc=a==='usr-create-cand',ro=cc?'candidate':(S.draft.ur||'supervisor'),nm=cc?(c?c.name:''):(S.draft.un||''),
            un=((cc?S.draft.cl_user:S.draft.uu)!==undefined?(cc?S.draft.cl_user:S.draft.uu):slugName(nm)).trim().toLowerCase(),cid=cc?id:(S.draft.uc||'');
        if(!un){say('Choose a username.','err');return}
        if(!cc&&!nm.trim()){say('Enter the person\'s name.','err');return}
        if(ro==='candidate'&&!cid){say('Choose the case for this candidate.','err');return}
        var rs=await db.accounts({action:'create',role:ro,username:un,name:nm,email:cc?(c.email||''):(S.draft.ue||''),case_id:cid});
        S.cred={username:rs.username,password:rs.password,name:nm,role:ro};
        S.draft.un=S.draft.uu=S.draft.ue=S.draft.cl_user=undefined;
        if(cid)await log(cid,'Candidate login created: '+rs.username+'.','case');
        await refreshUsers();break}
      case 'candidate-email-save':{
        if(S.staff!=='admin')return;
        var email=String(S.draft.candidate_contact_email||document.getElementById('candidate_contact_email')?.value||'').trim();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){say('Enter a valid invitation email.','err');return}
        await db.sendCandidateInvite(id,'update-email',email);
        S.draft.candidate_contact_email=undefined;
        await refreshUsers();
        say('Candidate invitation email updated.','ok');
        break}
      case 'candidate-email-invite':{
        if(S.staff!=='admin')return;
        var target=((S.users&&S.users.profiles)||[]).find(function(p){return p.role==='candidate'&&p.case_id===id});
        if(!target){say('Create the candidate login first.','err');return}
        if(!target.contact_email){say('Save the candidate invitation email first.','err');return}
        var sent=await db.sendCandidateInvite(id);
        say('Invitation email sent to '+sent.to+'.','ok');
        break}
      case 'usr-reset':S.confirmUser='r:'+id;break;
      case 'usr-reset-yes':{if(S.staff!=='admin')return;S.confirmUser=null;var rr=await db.accounts({action:'reset',user_id:id});
        var pp=(S.users&&S.users.profiles||[]).find(function(p){return p.id===id})||{};
        S.cred={username:rr.username,password:rr.password,name:pp.display_name||rr.username,role:rr.role};
        if(pp.case_id)await log(pp.case_id,'Candidate password reset.','case');
        await refreshUsers();break}
      case 'usr-del':S.confirmUser='d:'+id;break;
      case 'usr-del-yes':{if(S.staff!=='admin')return;S.confirmUser=null;await db.accounts({action:'delete',user_id:id});await refreshUsers();say('Login removed.','ok');break}
      case 'asg-toggle':{if(S.staff!=='admin')return;var ap=id.split('|'),au=ap[0],ac=ap[1];
        var cur2=S.users.assign.filter(function(x){return x.user_id===au}).map(function(x){return x.case_id});
        var nxt=cur2.indexOf(ac)>=0?cur2.filter(function(x){return x!==ac}):cur2.concat([ac]);
        await db.setAssign(au,nxt);await refreshUsers();break}

      case 'signout':await db.signOut();return;
      case 'invite':{var site=location.href.split('#')[0];var icode=db.inviteCode?await db.inviteCode(c.id):'';S.copyText='Hello '+c.name.split(' ')[0]+',\n\nYour Arcanam Pathway workspace is ready: '+site+'\n\nFirst time: choose "First time? Create your password" and enter\n  Email: '+(c.email||'your email')+'\n  Access code: '+(icode||'(ask your advisor)')+'\nThen pick a password. After that, just sign in with your email and password.\nYou can fill in forms and upload documents there. You will only ever see your own case.\n';break}
      case 'strategy-save':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var ps=c.pathwayScreening||{},old=ps.strategy||{},v={};
        ['chargeability','prior','niwFiled','statusEnd','rationale'].forEach(function(k){v[k]=String(S.draft['strategy_'+k]!==undefined?S.draft['strategy_'+k]:old[k]||'').trim().slice(0,3000)});
        if(!v.rationale){say('Record an advisor rationale before saving.','err');return}
        for(var dateKey of ['prior','niwFiled','statusEnd'])if(v[dateKey]&&!/^\d{4}-\d{2}-\d{2}$/.test(v[dateKey])){say('Use valid dates.','err');return}
        v.reviewedAt=nowIso();
        await candRef(c.id).update({pathwayScreening:{data:ps.data||{},review:ps.review||{},updatedAt:ps.updatedAt||nowIso(),strategy:v}});
        ['chargeability','prior','niwFiled','statusEnd','rationale'].forEach(function(k){delete S.draft['strategy_'+k]});
        say('Advisor strategy saved.','ok');break;
      }
      case 'niw-agree':{
        var decision=(((c.pathwayScreening||{}).review||{}).decision||'');
        if(decision!=='niw'&&decision!=='both'){say('NIW must be selected by the advisor first.','err');return}
        if(!S.locked){say('Agreement must be submitted from the candidate’s authenticated account, not advisor preview.','err');return}
        if(!S.draft.niw_agree){say('Please check the agreement acknowledgement.','err');return}
        var p=c.niwCase||{};if(p.agreement&&p.agreement.acceptedAt)return;
        await candRef(c.id).update({niwCase:Object.assign({},p,{agreement:{acceptedAt:nowIso(),actor:'Candidate',version:'niw-v1'}})});
        delete S.draft.niw_agree;say('NIW pathway acknowledgement recorded.','ok');break;
      }
      case 'niw-activate':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var p=c.niwCase||{};if(!p.agreement||!p.agreement.acceptedAt){say('Candidate agreement required.','err');return}
        await candRef(c.id).update({niwCase:Object.assign({},p,{activatedAt:p.activatedAt||nowIso(),phases:Object.assign({agreement:{status:'completed',note:'Candidate acknowledgement recorded',updatedAt:nowIso()}},p.phases||{})})});
        say('NIW case activated.','ok');break;
      }
      case 'niw-phase':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var p=c.niwCase||{},key=id,phase=NIW_PHASES.find(function(x){return x[0]===key});
        if(!p.activatedAt||!phase){say('Activate a valid NIW case first.','err');return}
        var status=S.draft['niwstatus_'+key]||((p.phases||{})[key]||{}).status||'not_started';
        if(!['not_started','in_progress','blocked','completed'].includes(status)){say('Invalid phase status.','err');return}
        if(status==='completed'&&key==='draft'&&!NIW_PACKAGE_ITEMS.every(function(x){return (p.package||{})[x[0]]&&(p.package||{})[x[0]].ready})){say('Complete all petition package items first.','err');return}
        if(status==='completed'&&['draft','legal','filing'].includes(key)&&!niwReadiness(c).ready){say('Complete NIW evidence review before closing this phase.','err');return}
        if(status==='completed'&&['legal','filing'].includes(key)&&!(p.legalSignoff&&p.legalSignoff.signedAt)){say('Attorney review record required.','err');return}
        if(status==='completed'&&key==='uscis'&&!['approved','denied','withdrawn'].includes(String((p.filing||{}).decision||'').toLowerCase())){say('Record a USCIS I-140 decision before completing adjudication.','err');return}
        if(status==='completed'&&key==='visa'&&!(p.visaTracking&&p.visaTracking.reviewedAt)){say('Record a reviewed Visa Bulletin and USCIS chart before completing visa tracking.','err');return}
        if(status==='completed'&&key==='filing'&&!(p.filing&&p.filing.receipt&&p.filing.filed)){say('Record USCIS receipt and filing date first.','err');return}
        if(key==='agreement'&&status!=='completed') {say('Candidate agreement cannot be reset by an advisor.','err');return}
        if(key==='agreement'&&status==='completed'&&!(p.agreement&&p.agreement.acceptedAt)){say('Candidate agreement is required.','err');return}
        var note=String(S.draft['niwnote_'+key]!==undefined?S.draft['niwnote_'+key]:((p.phases||{})[key]||{}).note||'').trim().slice(0,3000);
        var phases=Object.assign({},p.phases||{});phases[key]={status:status,note:note,updatedAt:nowIso()};
        await candRef(c.id).update({niwCase:Object.assign({},p,{phases:phases})});
        delete S.draft['niwstatus_'+key];delete S.draft['niwnote_'+key];say('NIW phase saved.','ok');break;
      }
      case 'niw-package':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var p=c.niwCase||{},item=NIW_PACKAGE_ITEMS.find(function(x){return x[0]===id});
        if(!p.activatedAt||!item){say('Active NIW case required.','err');return}
        var pack=Object.assign({},p.package||{}),old=pack[id]||{},note=String(S.draft['niwpkg_'+id]!==undefined?S.draft['niwpkg_'+id]:old.note||'').trim().slice(0,2000);
        if(!old.ready&&!note){say('Add a document reference or preparation note first.','err');return}
        pack[id]={ready:!old.ready,note:note,updatedAt:nowIso()};
        await candRef(c.id).update({niwCase:Object.assign({},p,{package:pack})});
        delete S.draft['niwpkg_'+id];say('Petition package item updated.','ok');break;
      }
      case 'niw-rfe':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var p=c.niwCase||{};if(!p.activatedAt){say('Active NIW case required.','err');return}
        var old=p.rfe||{},v={};
        ['notice','deadline','issues','response','status'].forEach(function(k){v[k]=String(S.draft['niwrfe_'+k]!==undefined?S.draft['niwrfe_'+k]:old[k]||'').trim().slice(0,3000)});
        v.status=v.status||'none';if(!['none','received','preparing','review','sent','closed'].includes(v.status)){say('Select a valid RFE status.','err');return}
        if(v.status!=='none'&&(!v.notice||!v.deadline||!v.issues)){say('RFE notice, deadline and requested issues are required.','err');return}
        if(v.status==='sent'&&!v.response){say('Record the response package reference before marking sent.','err');return}
        await candRef(c.id).update({niwCase:Object.assign({},p,{rfe:Object.assign({},v,{updatedAt:nowIso()})})});
        ['notice','deadline','issues','response','status'].forEach(function(k){delete S.draft['niwrfe_'+k]});say('RFE tracker saved.','ok');break;
      }
      case 'niw-visa':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var p=c.niwCase||{};if(!p.activatedAt){say('Active NIW case required.','err');return}
        var old=p.visaTracking||{},v={};
        ['chargeability','bulletin','category','filingCutoff','finalCutoff','chart','notes'].forEach(function(k){v[k]=String(S.draft['niwvisa_'+k]!==undefined?S.draft['niwvisa_'+k]:old[k]||'').trim().slice(0,3000)});
        if(!v.chargeability||!v.bulletin||!v.category||!v.chart){say('Record chargeability, bulletin month, category and USCIS chart.','err');return}
        await candRef(c.id).update({niwCase:Object.assign({},p,{visaTracking:Object.assign({},v,{reviewedAt:nowIso()})})});
        Object.keys(v).forEach(function(k){delete S.draft['niwvisa_'+k]});say('Visa Bulletin review saved.','ok');break;
      }
      case 'niw-signoff':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var p=c.niwCase||{},r=niwReadiness(c);
        if(!p.activatedAt||!r.ready){say('NIW evidence requirements must be reviewed first.','err');return}
        var reviewer=String(S.draft.niwreviewer||'').trim().slice(0,160),note=String(S.draft.niwreviewnote||'').trim().slice(0,3000);
        if(!reviewer||!note||!S.draft.niwreviewconfirm){say('Enter reviewer, decision, and explicit confirmation.','err');return}
        await candRef(c.id).update({niwCase:Object.assign({},p,{legalSignoff:{reviewer:reviewer,note:note,signedAt:nowIso(),recordedBy:'Advisor'}})});
        delete S.draft.niwreviewconfirm;say('Attorney review record saved.','ok');break;
      }
      case 'niw-filing':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var p=c.niwCase||{};if(!p.activatedAt){say('Activate NIW case first.','err');return}
        if(!p.legalSignoff||!p.legalSignoff.signedAt){say('Record attorney review before filing details.','err');return}
        var f={},old=p.filing||{};
        ['receipt','filed','priority','decision'].forEach(function(k){f[k]=String(S.draft['niw_'+k]!==undefined?S.draft['niw_'+k]:old[k]||'').trim().slice(0,160)});
        if(['filed','priority'].some(function(k){return f[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(f[k])})){say('Enter valid filing and priority dates.','err');return}
        if(f.decision&&!['pending','approved','denied','withdrawn'].includes(f.decision.toLowerCase())){say('Use pending, approved, denied or withdrawn.','err');return}
        await candRef(c.id).update({niwCase:Object.assign({},p,{filing:f})});
        ['receipt','filed','priority','decision'].forEach(function(k){delete S.draft['niw_'+k]});
        say('NIW filing details saved.','ok');break;
      }
      case 'ps-generate':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var ps=c.pathwayScreening||{},decision=(ps.review||{}).decision||'';
        var tracks=decision==='both'?['niw','eb1a']:decision==='niw'||decision==='eb1a'?[decision]:[];
        if(!tracks.length){say('Record a pathway decision first.','err');return}
        var existing=S.docs.filter(function(d){return d.cid===c.id&&d.kind==='request'}),created=0;
        for(var track of tracks){
          for(var item of PATHWAY_REQUIREMENTS[track]){
            var key='pathway:'+track+':'+item[0];
            if(existing.some(function(d){return d.pathwayKey===key}))continue;
            var doc={cid:c.id,kind:'request',label:(track==='niw'?'NIW':'EB-1A')+' — '+item[1],note:item[2],pathwayKey:key,by:'Admin',ts:nowIso()};
            await db.collection('docs').add(doc);existing.push(doc);created++;
          }
        }
        say(created?created+' pathway evidence requests created.':'All pathway evidence requests already exist.','ok');break;
      }
      case 'ps-save':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var keys=['degree','phd','experience','status','field','endeavor','impact','positioned','recognition','statusNotes'],old=(c.pathwayScreening||{}),data={};
        keys.forEach(function(k){data[k]=String(S.draft['ps_'+k]!==undefined?S.draft['ps_'+k]:(old.data||{})[k]||'').trim().slice(0,3000)});
        if(data.experience&&(!/^\d{1,2}$/.test(data.experience)||Number(data.experience)>70)){say('Enter valid years of experience.','err');return}
        await candRef(c.id).update({pathwayScreening:{data:data,review:old.review||{},updatedAt:nowIso()}});
        keys.forEach(function(k){delete S.draft['ps_'+k]});say('Screening intake saved.','ok');break;
      }
      case 'elig-save':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var a=pathwayAudit(c),decision=String(S.draft.elig_decision||'').trim(),note=String(S.draft.elig_note||'').trim().slice(0,5000);
        if(!a.screened){say('Complete pathway screening first.','err');return}
        if(a.missing.length){say('Complete screening fields: '+a.missing.join(', ')+'.','err');return}
        if(!['develop','attorney','hold','other'].includes(decision)||note.length<30){say('Select an outcome and provide detailed reasoning (at least 30 characters).','err');return}
        var old=c.eligibilityReview||{},history=(old.history||[]).slice();
        if(old.reviewedAt)history.push({decision:old.decision,note:old.note,reviewedAt:old.reviewedAt});
        await candRef(c.id).update({eligibilityReview:{decision:decision,note:note,reviewedAt:nowIso(),history:history}});
        delete S.draft.elig_decision;delete S.draft.elig_note;say('Eligibility assessment recorded for advisor review.','ok');break;
      }
      case 'ps-review':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var old=(c.pathwayScreening||{}),decision=S.draft.ps_decision||((old.review||{}).decision||''),valid=['eb1a','niw','both','evidence','other'];
        if(valid.indexOf(decision)<0){say('Select a pathway decision.','err');return}
        var note=String(S.draft.ps_note!==undefined?S.draft.ps_note:((old.review||{}).note||'')).trim().slice(0,3000);
        if(!note){say('Record the reasoning and next evidence actions.','err');return}
        var audit=pathwayAudit(c),missing=audit.missing;if(!audit.intakeReady&&decision!=='evidence'&&decision!=='other'){say('Complete required candidate intake and advisor form reviews before recommending a pathway.','err');return}if(missing.length&&decision!=='evidence'&&decision!=='other'){say('Complete screening fields: '+missing.join(', ')+'.','err');return}
        await candRef(c.id).update({pathwayScreening:{data:old.data||{},updatedAt:old.updatedAt||nowIso(),review:{decision:decision,note:note,reviewedAt:nowIso()}}});
        delete S.draft.ps_decision;delete S.draft.ps_note;say('Advisor screening decision recorded.','ok');break;
      }
      case 'ev-add':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var fileId=(S.draft.evfile||'').trim(),criterionId=(S.draft.evcriterion||'').trim();
        var locator=(S.draft.evlocator||'').trim(),excerpt=(S.draft.evexcerpt||'').trim(),note=(S.draft.evnote||'').trim();
        if(!S.docs.some(function(d){return d.id===fileId&&d.cid===c.id&&d.kind==='file'&&d.path})||!CRIT.some(function(k){return k.id===criterionId&&!k.na})&&!PATHWAY_REQUIREMENTS.niw.some(function(k){return k[0]===criterionId&&['niw','both'].indexOf((((c.pathwayScreening||{}).review||{}).decision||''))>=0})){say('Choose a valid source and criterion.','err');return}
        if(!locator||!excerpt){say('Add a source location and excerpt before saving.','err');return}
        var findings=(c.evidenceFindings||[]).slice();
        findings.push({id:'ev'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),fileId:fileId,criterionId:criterionId,locator:locator.slice(0,180),excerpt:excerpt.slice(0,1600),note:note.slice(0,1600),status:'pending',createdAt:nowIso()});
        await candRef(c.id).update({evidenceFindings:findings});
        ['evfile','evcriterion','evlocator','evexcerpt','evnote'].forEach(function(k){delete S.draft[k]});
        say('Source-linked finding saved for review.','ok');break;
      }
      case 'ev-accept':case 'ev-reject':case 'ev-remove':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        var current=(c.evidenceFindings||[]).slice(),found=current.find(function(f){return f.id===id});
        if(!found)return;
        if(a==='ev-remove')current=current.filter(function(f){return f.id!==id});
        else if(found.status==='pending'){current=current.map(function(f){return f.id===id?Object.assign({},f,{status:a==='ev-accept'?'accepted':'rejected',reviewedAt:nowIso()}):f})}
        await candRef(c.id).update({evidenceFindings:current});say('Finding updated.','ok');break;
      }
      case 'getfile':{var url=await db.signedUrl(el.dataset.path);window.open(url,'_blank','noopener');return}
      case 'file-del':{var fd0=S.docs.find(function(x){return x.id===id});if(fd0){await db.doc('docs/'+id).delete();if(fd0.path)await db.removeFiles([fd0.path])}break}
      case 'req-add':{var lb=(S.draft.rq||'').trim();if(!lb){say('Name the document you need.','err');return}await db.collection('docs').add({cid:c.id,kind:'request',label:lb,note:(S.draft.rqn||'').trim(),by:'Admin',ts:nowIso()});S.draft.rq='';S.draft.rqn='';break}
      case 'req-del':{await db.doc('docs/'+id).delete();break}
      case 'msg':{var mt=(S.draft.msg||'').trim();if(!mt)return;var adm=!S.locked;await db.collection('log').add({cid:c.id,tid:'',ts:nowIso(),text:mt,kind:'note',by:adm?'Admin':'Candidate',shared:adm?!!S.draft.msgShare:true});S.draft.msg='';break}
      case 'cancel':if(ctl)ctl.abort();break;
      case 'home':S.cid=null;S.home='cases';S.openForm=false;S.role='Advisor';break;
      case 'alltasks':S.cid=null;S.home='tasks';break;
      case 'newcase':S.cid=null;S.home='new';break;
      case 'create':await createCase();return;
      case 'open':S.cid=id;S.showCandidateLogin=null;S.tab='tasks';S.openForm=false;S.confirmDel=false;S.copyText=null;S.view=S.view||'list';break;
      case 'gotask':{var tk=S.tasks.find(function(x){return x.id===id});if(tk){S.cid=tk.cid;S.tab='tasks';S.view='list';S.open[tk.id]=true;S.open['st'+tk.cid+tk.stage]=true;S.home='cases'}break}
      case 'cvphase':S.cvp=+id;break;
      case 'form-tpl':{var tf=id,tg2=tf==='f10'&&c?(getResp(c.id,'f10').data.guide||c.articleExamples||[]):[];var bl=new Blob([formTemplate(tf,tg2)],{type:'application/msword'}),ua=document.createElement('a');ua.href=URL.createObjectURL(bl);ua.download=(formDef(tf).n.replace(/[^A-Za-z0-9]+/g,'_'))+'_template.doc';document.body.appendChild(ua);ua.click();setTimeout(function(){URL.revokeObjectURL(ua.href);ua.remove()},500);return}
      case 'cvscroll':{var se=document.getElementById(id);if(se)se.scrollIntoView({behavior:'smooth',block:'start'});return}
      case 'tab':S.tab=id;S.openForm=false;S.msgGo=null;S.focusCaseTab=true;break;
      case 'view':S.view=id;break;
      case 'tog':S.open[id]=!(S.open[id]===undefined?(id.indexOf('st')===0&&c&&id==='st'+c.id+(c.stage||0)):S.open[id]);break;
      case 'asCand':S.role='Candidate';S.openForm=false;break;
      case 'nudge':{var nt=S.tasks.find(function(x){return x.id===id});var nc=nt&&S.cands.find(function(x){return x.id===nt.cid});if(nt&&nc){var nd=daysUntil(nt.due),isArt=/^art\d/.test(nt.key||'');
        S.copyText='Hello '+(nc.name||'').split(' ')[0]+',\n\nA quick reminder about "'+cxName(nt)+'", '+(nd<0?'which was due on '+fmtDate(nt.due)+'.':nd===0?'which is due today.':'which is due on '+fmtDate(nt.due)+'.')+
          (isArt?'\n\nWe publish one article a month, so a delay here moves the dates after it by the same amount.':'')+
          '\n\nYou can open it from your page: '+location.href.split('#')[0]+'\n\nIf something is blocking you, reply here and we will help.\n\nThank you.';}
        break}
      case 'sync-tpl':{if(S.staff!=='admin'||!c)return;try{var tsx=tasksOf(c.id),hv={};tsx.forEach(function(t){hv[t.key]=t});var ms=TEMPLATE.filter(function(t){return !hv[t.k]}),st0=c.startDate||today();
        for(var mi=0;mi<ms.length;mi++){var mt=ms[mi],alld=(mt.deps||[]).every(function(k){return hv[k]&&isDone(hv[k].status)});
          await db.doc('tasks/'+c.id+'-'+mt.k).set({cid:c.id,key:mt.k,stage:mt.s,title:mt.t,detail:mt.d||'',owner:mt.o,kind:mt.kind||'task',form:mt.form||'',gate:mt.gate||'',deps:mt.deps||[],req:mt.req!==false,status:(mt.deps&&mt.deps.length&&!alld)?'Not started':'To do',due:addDays(st0,mt.off),source:'template',createdAt:nowIso()})}
        await log(c.id,'Added '+ms.length+' newer workflow steps to this case.','case');say('Added '+ms.length+' steps.','ok')}catch(e){fail(e)}}break;
      case 'asAdv':S.role='Advisor';S.openForm=false;break;
      case 'copy':S.copyText=summary(c);break;
      case 'copy-close':S.copyText=null;break;
      case 'candidate-login-toggle':S.showCandidateLogin=S.showCandidateLogin===c.id?null:c.id;break;
      case 'delete':S.confirmDel=true;break;
      case 'delete-no':S.confirmDel=false;break;
      case 'reset':S.confirmReset=true;break;
      case 'reset-no':S.confirmReset=false;break;
      case 'reset-yes':{S.confirmReset=false;try{var rc=await db.rpc('reset_candidate',{p_case:c.id});S.copyText='Hello '+c.name.split(' ')[0]+',\n\nYour access has been reset. Open '+location.href.split('#')[0]+' and choose "First time? Create your password".\n  Email: '+(c.email||'your email')+'\n  New access code: '+rc+'\nThen pick a new password.\n';say('Access reset. Send the message below to the candidate.','ok')}catch(err){fail(err)}break}
      case 'delete-yes':{if(S.staff!=='admin'||!c)return;var did=c.id;S.confirmDel=false;try{await db.deleteCase(did);S.cid=null;S.home='cases';S.showCandidateLogin=null;say('Case deleted.','ok')}catch(err){fail(err)}break}
      case 'check':{var t1=S.tasks.find(function(x){return x.id===id});if(t1){var nd=!isDone(t1.status);await setStatus(t1,nd?'Done':'To do');await log(t1.cid,(nd?'Done: ':'Reopened: ')+t1.title,'task',t1.id)}break}
      case 'task-add':{var title=(S.draft.tt||'').trim();if(!title){say('Enter a task title.','err');return}
        await db.collection('tasks').add({cid:c.id,key:'m'+Date.now().toString(36),stage:c.stage||0,title:title,detail:'',owner:S.draft.to||'Advisor',kind:'task',form:'',gate:'',deps:[],req:false,status:'To do',due:S.draft.td||addDays(today(),14),source:'You',createdAt:nowIso()});
        S.draft.tt='';S.draft.td='';break}
      case 'task-del':await db.doc('tasks/'+id).delete();break;
      case 'draft-ok':await db.doc('tasks/'+id).update({draft:false});await log(c.id,'You approved a drafted task for the candidate.','task',id);break;
      case 'note':{var txt=(S.draft['nt'+id]||'').trim();if(txt){await db.collection('log').add({cid:c.id,tid:id,ts:nowIso(),text:txt,kind:'note',by:'Admin',shared:!!S.draft['ns'+id]});S.draft['nt'+id]='';S.draft['ns'+id]=false}break}
      case 'runai':{var tr=S.tasks.find(function(x){return x.id===id});if(tr&&!S.busy)Promise.resolve(runAi(tr)).then(function(){var d=RESULT[tr.key];if(d&&S.msgKind==='ok'&&!S.busy){var ft=d.k&&taskByKey(tr.cid,d.k);S.msg=tr.title+' finished. See the result in: '+d.l+'.'+(S.costNote||'');S.msgGo=ft?{a:'gotask',id:ft.id,l:d.l}:{a:'tab',id:d.t,l:d.l};schedule()}});return}
      case 'openform':S.form=id;S.openForm=true;S.errs=null;S.tab='forms';break;
      case 'closeform':S.openForm=false;S.errs=null;if(S.role==='Advisor')S.tab='forms';break;
      case 'entry-add':{var p1=parsePath(el.dataset.fp);var def1=formDef(p1[0]);var part1=def1.parts.find(function(x){return x.id===p1[1]});var r1=workResp(c.id,p1[0]);var ar=r1.data[part1.id]=r1.data[part1.id]||[];while(ar.length<part1.repeat.min)ar.push({});if(ar.length<part1.repeat.max)ar.push({});touch(p1[0]);await saveResp(c.id,p1[0]);break}
      case 'entry-del':{var p2=parsePath(el.dataset.fp);var r2=workResp(c.id,p2[0]);(r2.data[p2[1]]||[]).splice(+p2[2],1);await saveResp(c.id,p2[0]);break}
      case 'row-add':{var x1=resolveHolder(el.dataset.fp+'|0|x');var rws=x1.holder[x1.f.k]=x1.holder[x1.f.k]||[];if(!rws.length)rws.push({});rws.push({});touch(x1.p[0]);await saveResp(c.id,x1.p[0]);break}
      case 'row-del':{var q=parsePath(el.dataset.fp);var x2=resolveHolder(q.slice(0,4).join('|')+'|0|x');var rr=x2.holder[x2.f.k]||[];rr.splice(+q[4],1);await saveResp(c.id,q[0]);break}
      case 'submit':{
        var def=formDef(S.form),r=workResp(c.id,S.form),errs=validate(def,r);
        if(errs.length){S.errs=errs;window.scrollTo(0,0);break}
        S.errs=null;clearTimeout(saveTimer[S.form]);await saveResp(c.id,S.form);
        if(S.locked){await db.rpc('submit_form',{p_form:S.form});delete WORK[rid(c.id,S.form)]}
        else{r.status='Submitted';r.submittedAt=nowIso();await saveResp(c.id,S.form);await completeKey(c.id,S.form,def.n+' submitted.')}
        S.openForm=false;say(def.n+' submitted. Your advisor will review it.','ok');return}
      case 'reviewed':{var tr2=S.tasks.find(function(x){return x.id===id});var rr2=workResp(c.id,tr2.form);rr2.status='Reviewed';rr2.reviewedAt=nowIso();await saveResp(c.id,tr2.form);await setStatus(tr2,'Done');await log(c.id,'Reviewed '+formDef(tr2.form).n+'.','task',tr2.id);break}
      case 'reopenform':{var fid=id;var rr3=workResp(c.id,fid);rr3.status='In progress';await saveResp(c.id,fid);var ft=taskByKey(c.id,fid),rt=taskByKey(c.id,'r'+fid.slice(1));if(ft)await setStatus(ft,'In progress');if(rt&&isDone(rt.status))await setStatus(rt,'To do');await log(c.id,formDef(fid).n+' sent back for edits.','task');break}
      case 'feas-save':{var fdr=feasFromForm(c);fdr.updatedAt=nowIso();await candRef(c.id).update({feasibilityDraft:fdr});S.draft.fz_outlook=S.draft.fz_strengths=S.draft.fz_focus=S.draft.fz_timeline=S.draft.fz_note=undefined;say('Draft saved.','ok');break}
      case 'feas-release':{var fdr2=feasFromForm(c);fdr2.updatedAt=nowIso();await candRef(c.id).update({feasibilityDraft:fdr2});c.feasibilityDraft=fdr2;S.draft.fz_outlook=S.draft.fz_strengths=S.draft.fz_focus=S.draft.fz_timeline=S.draft.fz_note=undefined;await releaseFeas();say('Released to the candidate.','ok');break}
      case 'dec-proceed':case 'dec-hold':case 'dec-decline':{
        var ch=a.slice(4),pt=taskByKey(c.id,'proceed');
        await candRef(c.id).update({decision:{choice:ch,at:nowIso(),note:(S.draft.decn||'').trim()}});
        await log(c.id,'Profile decision: '+ch+(S.draft.decn?'. '+S.draft.decn:'.'),'gate');S.draft.decn='';
        if(ch==='proceed'){if(pt)await completeKey(c.id,'proceed','Decision: proceed.')}
        else if(pt&&!isDone(pt.status))await setStatus(pt,'Blocked');
        break}
      case 'foew-use':{S.draft.foeWText=c.foe.options[+id].statement;break}
      case 'foew-lock':{
        var wt=(S.draft.foeWText!==undefined?S.draft.foeWText:((c.foe&&c.foe.working)||'')).trim();
        if(!wt){say('Write the working field statement.','err');return}
        var gw=Object.assign({},c.gates||{});gw.foew={status:'approved',at:nowIso()};
        await candRef(c.id).update({foe:Object.assign({},c.foe||{},{working:wt}),gates:gw});
        await log(c.id,'Working FOE set: '+wt,'gate');await completeKey(c.id,'foew','Working field set.');S.draft.foeWText=undefined;break}
      case 'pl-add':{var pp=pwEdit(c)||(S.planWork={articles:[],memberships:[],judging:{count:0,types:[],note:''},status:'draft'});
        if(id==='articles')pp.articles.push({id:'a'+Date.now().toString(36),title:'',abstract:'',journals:[],note:''});else pp.memberships.push({id:'m'+Date.now().toString(36),name:'',why:'',note:''});break}
      case 'mk-add':{var ma=mwEdit(c);if(ma)ma.rows.push({foe:'',market:'',importance:'',cet:'',fit:'',gaps:'',urls:[]});break}
      case 'mk-del':{var md=mwEdit(c);if(md)md.rows.splice(+id,1);break}
      case 'mk-save':case 'mk-ok':{var mv=mwEdit(c);if(!mv)break;var m2=JSON.parse(JSON.stringify(mv));if(a==='mk-ok')m2.checked=!m2.checked;m2.editedAt=nowIso();await candRef(c.id).update({market:m2});S.mktWork=null;say(a==='mk-ok'?(m2.checked?'Marked as checked.':'Marked as not checked.'):'Saved.','ok');break}
      case 'mk-copy':{S.copyText=marketText(Object.assign({},c,{market:mw(c)}));break}
      case 'pl-addcand':{var ci=candIdeas(c)[+id],pq=pwEdit(c);if(!ci||!pq)break;
        pq.articles.push({id:'a'+Date.now().toString(36),title:ci.title||'',abstract:ci.summary||'',journals:ci.venues?[ci.venues]:[],note:'Candidate\'s own idea.'+(ci.conf?' Confidentiality: '+ci.conf:''),fromCand:(ci.title||'')+'|'+id});break}
      case 'pl-short':{var pa=pwEdit(c).articles[+id];if(pa)pa.short=!pa.short;break}
      case 'pl-del':{var qq=id.split('|');pwEdit(c)[qq[0]].splice(+qq[1],1);break}
      case 'plan-approve':{if(!pw(c)){say('No plan yet.','err');return}await approvePlan();say('Plan approved. Tasks created and held back.','ok');break}
      case 'plan-release':{if(!(c.plan&&c.plan.status==='approved')){say('Approve the plan first.','err');return}await releasePlan();say('Released to the candidate.','ok');break}
      case 'foe-use':{S.draft.foeText=c.foe.options[+id].statement;break}
      case 'tgt-save':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        if(!pathwayAudit(c).foeReady||!pathwayAudit(c).eligible){say('Complete eligibility assessment and FOE lock first.','err');return}
        var rationale=String(S.draft.criteria_note||'').trim().slice(0,4000);
        if(rationale.length<30){say('Record criteria rationale (at least 30 characters).','err');return}
        var ch=CRIT.filter(function(k){return !k.na&&(S.draft['tg_'+k.id]!==undefined?S.draft['tg_'+k.id]:(c.chosen?c.chosen.indexOf(k.id)>=0:(c.targets||[]).indexOf(k.id)>=0))}).map(function(k){return k.id});
        if(!ch.length){say('Tick at least one criterion.','err');return}
        var prev=c.criteriaFinalization||{},history=(prev.history||[]).slice();if(prev.approvedAt)history.push({criteria:prev.criteria||[],note:prev.note||'',approvedAt:prev.approvedAt});
        await candRef(c.id).update({chosen:ch,chosenAt:nowIso(),criteriaFinalization:{criteria:ch,note:rationale,approvedAt:nowIso(),foe:(c.foe||{}).locked,history:history}});
        delete S.draft.criteria_note;
        var sk=0,rs=0;
        for(var ci=0;ci<CRIT.length;ci++){var kk=CRIT[ci].id,keys=CRIT_TASKS[kk]||[],on2=ch.indexOf(kk)>=0;
          for(var ki=0;ki<keys.length;ki++){var tt=taskByKey(c.id,keys[ki]);if(!tt)continue;
            if(!on2&&!isDone(tt.status)){await setStatus(tt,'Skipped',{skippedBy:'targets'});sk++}
            else if(on2&&tt.status==='Skipped'&&tt.skippedBy==='targets'){await setStatus(tt,'Not started',{skippedBy:''});rs++}}}
        Object.keys(S.draft).forEach(function(dk){if(dk.indexOf('tg_')===0)delete S.draft[dk]});
        await log(c.id,'Target criteria confirmed: '+ch.map(function(id){return id.toUpperCase()}).join(', ')+(sk?'. '+sk+' evidence tasks skipped.':'')+(rs?'. '+rs+' evidence tasks restored.':''),'gate');
        if((c.articleExamples||[]).length){var fr=workResp(c.id,'f10');if(!fr.data.guide&&fr.status!=='Submitted'&&fr.status!=='Reviewed'){fr.data.guide=c.articleExamples;await saveResp(c.id,'f10')}}
        await completeKey(c.id,'targets','Target criteria confirmed.');
        say('Target criteria confirmed: '+ch.length+'.');break}
      case 'foe-lock':{
        if(S.locked||S.role==='Candidate'){say('Advisor access required.','err');return}
        if(!pathwayAudit(c).eligible){say('Record the eligibility assessment before locking the final FOE.','err');return}
        var ft2=(S.draft.foeText!==undefined?S.draft.foeText:((c.foe&&c.foe.locked)||'')).trim();
        if(!ft2){say('Write the final FOE statement.','err');return}
        if(!S.draft.foeOk){say('Tick the box to confirm you checked the US growth evidence.','err');return}
        var gs=Object.assign({},c.gates||{});gs.foe={status:'approved',at:nowIso()};
        var oldFoe=(c.foe||{}).locked||'',foeHistory=((c.foe||{}).history||[]).slice();if(oldFoe&&oldFoe!==ft2)foeHistory.push({statement:oldFoe,replacedAt:nowIso()});
        await candRef(c.id).update({foe:Object.assign({},c.foe||{},{locked:ft2,history:foeHistory}),gates:gs});
        await log(c.id,'FOE locked: '+ft2,'gate');await completeKey(c.id,'foe','FOE gate approved.');S.draft.foeOk=false;break}
      case 'att-ok':{var g2=Object.assign({},c.gates||{});g2.attorney={status:'approved',at:nowIso(),note:S.draft.atn||''};await candRef(c.id).update({gates:g2});await log(c.id,'Attorney approved for filing. '+(S.draft.atn||''),'gate');await completeKey(c.id,'attorney','Attorney gate approved.');break}
      case 'att-no':{var g3=Object.assign({},c.gates||{});g3.attorney={status:'changes',at:nowIso(),note:S.draft.atn||''};await candRef(c.id).update({gates:g3});var pk=taskByKey(c.id,'pack');if(pk)await setStatus(pk,'In progress');await log(c.id,'Attorney requested changes: '+(S.draft.atn||'no note'),'gate');break}
    }
  }catch(err){fail(err);return}
  schedule();
});

/* drag and drop on the board */
document.addEventListener('dragstart',function(e){var el=e.target.closest&&e.target.closest('[data-drag]');if(!el)return;e.dataTransfer.setData('text/plain',el.dataset.drag);e.dataTransfer.effectAllowed='move'});
document.addEventListener('dragover',function(e){var col=e.target.closest&&e.target.closest('[data-drop]');if(col&&col.dataset.drop!=='Not started'){e.preventDefault();col.classList.add('over')}});
document.addEventListener('dragleave',function(e){var col=e.target.closest&&e.target.closest('[data-drop]');if(col)col.classList.remove('over')});
document.addEventListener('drop',async function(e){
  var col=e.target.closest&&e.target.closest('[data-drop]');if(!col)return;e.preventDefault();col.classList.remove('over');
  var tk=S.tasks.find(function(x){return x.id===e.dataTransfer.getData('text/plain')});
  var to=col.dataset.drop;if(!tk||to==='Not started'||tk.status===to||(to==='Done'&&isDone(tk.status)))return;
  if(tk.kind!=='task'&&to==='Done'){say('This step finishes by itself: '+(tk.kind==='form'?'when the candidate submits the form.':tk.kind==='review'?'use Mark reviewed.':tk.kind==='ai'?'when the analysis runs.':'when the gate is approved.'),'err');return}
  try{await setStatus(tk,to);await log(tk.cid,tk.title+' moved to '+to+'.','task',tk.id)}catch(err){fail(err)}
});
document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.drag!==undefined){e.preventDefault();e.target.click()}});

/* ---------- Start (called by main.js after sign-in) ---------- */
function startApp(opts){
  db=opts.db;sampleFn=opts.sample;S.locked=!!opts.locked;S.me=opts.me;S.staff=opts.staff||'admin';if(S.locked){S.role='Candidate';S.cid=opts.caseId}
  var loaded={};
  function sub(coll,key){
    db.collection(coll).onSnapshot(function(snap){
      S[key]=snap.docs.map(function(d){var o=d.data();o.id=d.id;return o});
      if(key==='resp')S.resp.forEach(function(r){if(!DIRTY[r.id]&&!PEND[r.id]&&WORK[r.id])delete WORK[r.id]});
      loaded[key]=1;
      if(loaded.cands&&loaded.tasks&&loaded.resp&&loaded.log&&loaded.docs)S.ready=true;
      schedule();
    },function(err){S.dberr=(err&&err.message)||'error';schedule()});
  }
  sub('candidates','cands');sub('tasks','tasks');sub('responses','resp');sub('log','log');sub('docs','docs');
  render();
  if(S.staff==='admin'&&!S.locked)refreshUsers();
  if(window.__db)window.__t={S:S,runAi:runAi,taskByKey:taskByKey,aiReady:aiReady,cur:cur,STAGES:STAGES,FORMS:FORMS};
}

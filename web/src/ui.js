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
  if(typeof y==='number')window.scrollTo(0,y);
  reconcile();
}

function topbar(){
  var c=cur();
  if(S.locked){var em=(S.me&&(S.me.name||S.me.username||S.me.email))||'',nm=(c&&c.name)||em;var ini=nm.split(/[ @.]+/).filter(Boolean).slice(0,2).map(function(x){return x[0].toUpperCase()}).join('');
    return '<header class="cv-top"><div class="cv-brand"><span class="cv-logo">'+LOGO_SVG+'</span><div><b>Arcanam Pathway</b><small>Your private case page</small></div></div><div class="cv-user"><span class="cv-av" aria-hidden="true">'+esc(ini)+'</span><span class="cv-em">'+esc(em)+'</span><button class="btn sm" data-a="signout">Sign out</button></div></header>';}
  var adm=S.staff==='admin';
  return '<div class="top"><div><h1>Arcanam Case Tracker</h1><div class="priv">'+(adm?'Admin':'Supervisor')+' · '+esc(S.me&&(S.me.name||S.me.username||S.me.email)||'')+' · screening aid, not legal advice</div></div>'+
   '<div class="nav"><button class="tab'+(!c&&S.home==='cases'?' on':'')+'" data-a="home">Cases</button>'+
   '<button class="tab'+(!c&&S.home==='tasks'?' on':'')+'" data-a="alltasks">All tasks</button>'+
   (adm?'<button class="tab'+(!c&&S.home==='users'?' on':'')+'" data-a="usr-open">People</button><button class="btn pri" data-a="newcase">New candidate</button>':'')+'<button class="btn sm ghost" data-a="signout">Sign out</button></div></div>';
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
    h+='<p>Username: <b>'+esc(lu.username||lu.email)+'</b>'+(lu.must_change?' · <span class="chip mid">has not chosen a password yet</span>':' · <span class="chip ok">active</span>')+'</p><div class="addrow">'+
      (S.confirmUser==='r:'+lu.id?'<button class="btn sm danger" data-a="usr-reset-yes" data-id="'+esc(lu.id)+'">Yes, issue a new password</button><button class="btn sm" data-a="usr-cancel">Cancel</button>':'<button class="btn sm" data-a="usr-reset" data-id="'+esc(lu.id)+'">Reset password</button>')+'</div>';
  }else{
    var sug=S.draft.cl_user!==undefined?S.draft.cl_user:slugName(c.name);
    h+='<p class="small">This candidate has no login yet. Choose a username and create it; you will get a temporary password to share.</p><div class="two"><div><label class="f" for="cl_user">Username</label><input id="cl_user" type="text" data-draft="cl_user" value="'+esc(sug)+'" autocomplete="off"></div></div>'+
      '<div class="addrow"><button class="btn pri sm" data-a="usr-create-cand" data-id="'+esc(c.id)+'">Create login</button></div>';
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
function casesView(){
  var open=0,late=0,wait=0;
  S.tasks.forEach(function(t){if(t.status==='Not started'||isDone(t.status))return;open++;if(t.due&&daysUntil(t.due)<0)late++;if(t.owner==='Candidate')wait++});
  var sorted=S.cands.slice().sort(function(a,b){return (a.createdAt||'')<(b.createdAt||'')?1:-1});
  var active=sorted.filter(function(c){return caseProgress(c)<100}).length;
  var h='<section class="pathway-overview" aria-label="Case portfolio overview">'+
    '<div class="pathway-heading"><div><div class="pathway-eyebrow">ARCANAM / CASE INTELLIGENCE</div><h2>Case overview</h2><p>Priorities, evidence readiness, and progress across your portfolio.</p></div>'+
    (S.staff==='admin'?'<button class="btn pri" data-a="newcase">+ New candidate</button>':'')+'</div>'+
    '<div class="pathway-metrics">'+
    '<div class="pathway-metric"><span>Active cases</span><strong>'+active+'</strong><small>'+S.cands.length+' total candidates</small></div>'+
    '<div class="pathway-metric"><span>Open tasks</span><strong>'+open+'</strong><small>Currently in progress</small></div>'+
    '<div class="pathway-metric'+(late?' pathway-urgent':'')+'"><span>Overdue tasks</span><strong>'+late+'</strong><small>'+ (late?'Require attention':'No overdue work')+'</small></div>'+
    '<div class="pathway-metric"><span>Candidate actions</span><strong>'+wait+'</strong><small>Waiting on candidates</small></div></div></section>';
  if(!sorted.length)return h+'<div class="panel"><h2>No candidates yet</h2><p>Add a candidate to start the '+TEMPLATE.length+'-task workflow across '+STAGES.length+' stages.</p><button class="btn pri" data-a="newcase">New candidate</button></div>';
  var attention=[];
  S.tasks.forEach(function(t){
    if(t.status==='Not started'||isDone(t.status)||!t.due||daysUntil(t.due)>=0)return;
    var owner=sorted.find(function(c){return c.id===t.cid});if(owner)attention.push({t:t,c:owner});
  });
  attention.sort(function(a,b){return a.t.due<b.t.due?-1:1});
  if(attention.length){
    h+='<section class="pathway-attention"><div class="pathway-section-title"><h3>Needs attention</h3><span>'+attention.length+' overdue</span></div>';
    attention.slice(0,3).forEach(function(x){h+='<button class="pathway-alert" data-a="gotask" data-id="'+esc(x.t.id)+'"><span><b>'+esc(x.t.title)+'</b><small>'+esc(x.c.name)+' · '+esc(x.t.owner)+'</small></span><span class="pathway-alert-due">'+esc(dueTxt(x.t))+' &rarr;</span></button>'});
    h+='</section>';
  }
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

/* ----- case view ----- */
function caseView(c){
  var ts=tasksOf(c.id),st=c.stage||0,rd=readiness(c);
  var h='<div class="casehead"><div><button class="link" data-a="home">&larr; All cases</button><h2>'+esc(c.name)+'</h2><div class="meta"><span>'+esc(c.visa||'')+(c.visaExpiry?' · expires '+esc(c.visaExpiry):'')+'</span><span>Goal: '+esc(c.goal||'')+'</span><span>'+chip(rd.k,rd.cls)+'</span><span>FOE: '+esc((c.foe&&c.foe.locked)||'not locked')+'</span>'+((S.staff==='admin'&&c.costs&&c.costs.length)?'<span title="AI cost, admins only">AI cost: $'+c.costs.reduce(function(a,x){return a+(x.usd||0)},0).toFixed(2)+'</span>':'')+'</div></div>'+
   '<div class="chips"><button class="btn sm" data-a="asCand">View as candidate</button><button class="btn sm" data-a="copy">Copy summary</button>'+(S.staff!=='admin'?'':S.confirmDel?'<button class="btn sm danger" data-a="delete-yes">Yes, delete this case</button><button class="btn sm" data-a="delete-no">Keep</button>':'<button class="btn sm danger" data-a="delete">Delete case</button>')+'</div></div>';
  h+=loginPanel(c);
  if(S.copyText!==null)h+='<div class="panel"><div class="ph"><h3>Summary (select and copy)</h3><button class="link" data-a="copy-close">Close</button></div><textarea class="tall" readonly>'+esc(S.copyText)+'</textarea></div>';
  h+='<div class="steps">'+STAGES.map(function(s,i){return '<div class="step'+(i<st?' done':i===st?' now':'')+(s.gate?' g':'')+'" title="'+esc(s.d)+'"><i>'+(i+1)+'</i>'+esc(s.n)+'</div>'}).join('')+'</div>'+bar(caseProgress(c));
  var blockers=ts.filter(function(t){return t.stage===st&&t.req!==false&&!isDone(t.status)});
  if(blockers.length){
    var byO={};blockers.forEach(function(t){byO[t.owner]=(byO[t.owner]||0)+1});
    h+='<div class="blockers"><b>Stage '+(st+1)+' ('+esc(STAGES[st].n)+') finishes when these are done.</b> Waiting on: '+Object.keys(byO).map(function(o){return byO[o]+' '+o}).join(', ')+'.<ul>'+blockers.slice(0,6).map(function(t){return '<li>'+esc(t.title)+' <span class="small">('+esc(t.owner)+(t.status==='Not started'?', locked':'')+')</span></li>'}).join('')+(blockers.length>6?'<li class="small">and '+(blockers.length-6)+' more</li>':'')+'</ul></div>';
  }
  h+=lanes(c,ts);
  var tabs=[['tasks','Tasks'],['forms','Forms'],['docs','Documents'],['profile','Profile'],['score','Scorecard'],['field','Field'],['plan','Plan'],['feas','Feasibility'],['activity','Activity']];
  h+='<div class="nav tabs">'+tabs.map(function(t){return '<button class="tab'+(S.tab===t[0]?' on':'')+'" data-a="tab" data-id="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div>';
  if(S.tab==='tasks')h+=tasksTab(c,ts);
  else if(S.tab==='forms')h+=formsTab(c);
  else if(S.tab==='docs')h+=docsPanel(c,true);
  else if(S.tab==='profile')h+=profileTab(c);
  else if(S.tab==='score')h+=scoreTab(c);
  else if(S.tab==='field')h+=fieldTab(c);
  else if(S.tab==='plan')h+=planTab(c);
  else if(S.tab==='feas')h+=feasTab(c);
  else h+=activityTab(c);
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
  if(fid==='f10'&&r.data.guide&&r.data.guide.length)h+='<div class="panel cv-guide"><h3>Example ideas for your field</h3><p class="small">Only to spark ideas. Write your own in your own words.</p><ul class="cv-list" style="display:block">'+r.data.guide.map(function(g){return '<li style="display:block;margin:6px 0"><b>'+esc(g.cat)+':</b> '+esc(g.title)+'<br><span class="small">'+esc(g.line)+'</span></li>'}).join('')+'</ul></div>';
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
 {n:'Getting started',d:'A welcome call, your consent and your first form.'},
 {n:'Your profile',d:'We read your background and agree on your direction.'},
 {n:'Tell us the details',d:'You complete detailed forms and share documents. We review each one.'},
 {n:'Our analysis',d:'We study everything you shared and settle on your field of endeavor.'},
 {n:'Your plan',d:'We agree which areas to strengthen and how, then you receive your plan.'},
 {n:'Build your evidence',d:'You carry out the plan: reviews, articles, memberships, proof and more.'},
 {n:'Prove and polish',d:'We check every claim, gather recommendation letters and write your case.'},
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
function candidateView(c){
  var ts=tasksOf(c.id).filter(function(t){return t.owner==='Candidate'&&!t.draft&&t.req!==false||(t.owner==='Candidate'&&!t.draft&&t.status!=='Not started')});
  var h=S.locked?'':'<div class="candbar"><span class="chip gate">Candidate view (preview)</span> <button class="btn sm" data-a="asAdv">Back to admin view</button></div>';
  if(S.openForm){return h+formEditor(c,S.form)}
  var st=c.stage||0,first=(c.name||'').split(' ')[0];
  var by=function(a,b){return (a.due||'9')<(b.due||'9')?-1:1};
  var now=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)&&t.status!=='Skipped'}).sort(by);
  var later=ts.filter(function(t){return t.status==='Not started'}).sort(by),done=ts.filter(function(t){return isDone(t.status)}).sort(function(a,b){return (b.doneAt||'')<(a.doneAt||'')?-1:1});
  var pct=caseProgress(c),sel=S.cvp!==undefined?S.cvp:st,ph=CV_STAGES[st];
  /* hero */
  h+='<section class="cv-hero"><div class="cv-hl"><p class="cv-eyebrow">'+esc(cvGreeting())+'</p><h2>'+esc(first)+', here is where you stand</h2><p class="cv-sub">Phase '+(st+1)+' of '+CV_STAGES.length+': <b>'+esc(ph.n)+'</b>. '+esc(ph.d)+'</p>'+
   '<div class="cv-meta">'+(c.visa?'<span>'+esc(c.visa)+(c.visaExpiry?' valid to '+esc(fmtDate(c.visaExpiry)):'')+'</span>':'')+(c.goal?'<span>Goal: '+esc(c.goal)+'</span>':'')+'</div></div><div class="cv-hr">'+cvRing(pct)+'<span>overall progress</span></div></section>';
  /* next step */
  if(now.length){var n0=now[0];h+='<section class="cv-next"><div><p class="cv-eyebrow">Your next step</p><h3>'+esc(n0.title)+'</h3><p class="small">'+(n0.due?'Due '+esc(fmtDate(n0.due).replace(/, \d{4}$/,''))+'. ':'')+(now.length>1?(now.length-1)+' more after this one.':'This is the only thing we need from you right now.')+'</p></div>'+(n0.kind==='form'&&n0.form?'<button class="btn pri big" data-a="openform" data-id="'+n0.form+'">'+(getResp(c.id,n0.form).status==='In progress'?'Continue':'Start')+'</button>':'<button class="btn pri big" data-a="cvscroll" data-id="cv-todo">See what to do</button>')+'</section>'}
  else h+='<section class="cv-next calm"><div><p class="cv-eyebrow">Your next step</p><h3>Nothing needed from you right now</h3><p class="small">Our team is working on your case. We will list your next task here and in your messages as soon as it is ready.</p></div><span class="cv-ico ok">'+cvIcon('check')+'</span></section>';
  /* lifecycle */
  h+='<section class="panel cv-life"><div class="ph"><h3>Your journey</h3><span class="small">Tap a phase to see what happens in it</span></div><ol class="cv-rail">'+CV_STAGES.map(function(s,i){
    var cls=i<st?'done':i===st?'now':'next';return '<li class="'+cls+(i===sel?' sel':'')+'"><button data-a="cvphase" data-id="'+i+'" aria-label="Phase '+(i+1)+': '+esc(s.n)+'"><i>'+(i<st?cvIcon('check'):(i+1))+'</i><span>'+esc(s.n)+'</span></button></li>'}).join('')+'</ol>';
  var mine=ts.filter(function(t){return t.stage===sel}).sort(by),sc=sel<st?'Complete':sel===st?'You are here':'Coming up';
  h+='<div class="cv-phase"><div class="cv-ph"><b>'+(sel+1)+'. '+esc(CV_STAGES[sel].n)+'</b>'+chip(sc,sel<st?'ok':sel===st?'gate':'')+'</div><p>'+esc(CV_STAGES[sel].d)+'</p>'+
   (mine.length?'<ul class="cv-list">'+mine.map(function(t){var d2=isDone(t.status);return '<li class="'+(d2?'d':t.status==='Not started'?'l':'')+'"><span>'+(d2?cvIcon('check'):t.status==='Not started'?cvIcon('lock'):'')+'</span>'+esc(t.title)+'</li>'}).join('')+'</ul>':'<p class="small">Nothing is needed from you in this phase. Our team handles it.</p>')+'</div></section>';
  /* to do */
  h+='<section class="panel" id="cv-todo"><div class="ph"><h3>Your to-do</h3>'+(now.length?chip(now.length+' open','gate'):chip('All caught up','ok'))+'</div>';
  if(!now.length)h+='<p class="empty">You are all caught up. Thank you.</p>';
  now.forEach(function(t){h+=cvTaskCard(c,t)});
  if(later.length)h+='<details class="cv-more"><summary>Coming up ('+later.length+')</summary><ul class="cv-list">'+later.slice(0,12).map(function(t){return '<li class="l"><span>'+cvIcon('lock')+'</span>'+esc(t.title)+'</li>'}).join('')+'</ul><p class="small">These open automatically as earlier steps finish.</p></details>';
  if(done.length)h+='<details class="cv-more"><summary>Completed ('+done.length+')</summary><ul class="cv-list">'+done.map(function(t){var rs=t.kind==='form'&&t.form?getResp(c.id,t.form).status:'';return '<li class="d"><span>'+cvIcon('check')+'</span>'+esc(t.title)+(rs==='Submitted'?' <span class="chip mid">Under review</span>':rs==='Reviewed'?' <span class="chip ok">Reviewed</span>':'')+'</li>'}).join('')+'</ul></details>';
  h+='</section>';
  var fz=S.locked?c.feasibility:c.feasibilityReleased;
  if(fz&&fz.outlook)h+='<section class="panel cv-feas">'+feasCard(fz,false)+'</section>';
  h+='<div class="cv-two"><div id="cv-docs">'+docsPanel(c,false)+'</div><div id="cv-msg">'+messagesPanel(c,false)+'</div></div>';
  h+='<p class="cv-foot">Arcanam Pathway is a planning and coaching service. It is not legal advice and does not guarantee any outcome. Only you and your advisory team can see this page.</p>';
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
      case 'open':S.cid=id;S.tab='tasks';S.openForm=false;S.confirmDel=false;S.copyText=null;S.view=S.view||'list';break;
      case 'gotask':{var tk=S.tasks.find(function(x){return x.id===id});if(tk){S.cid=tk.cid;S.tab='tasks';S.view='list';S.open[tk.id]=true;S.open['st'+tk.cid+tk.stage]=true;S.home='cases'}break}
      case 'cvphase':S.cvp=+id;break;
      case 'form-tpl':{var tf=id,tg2=tf==='f10'&&c?(getResp(c.id,'f10').data.guide||c.articleExamples||[]):[];var bl=new Blob([formTemplate(tf,tg2)],{type:'application/msword'}),ua=document.createElement('a');ua.href=URL.createObjectURL(bl);ua.download=(formDef(tf).n.replace(/[^A-Za-z0-9]+/g,'_'))+'_template.doc';document.body.appendChild(ua);ua.click();setTimeout(function(){URL.revokeObjectURL(ua.href);ua.remove()},500);return}
      case 'cvscroll':{var se=document.getElementById(id);if(se)se.scrollIntoView({behavior:'smooth',block:'start'});return}
      case 'tab':S.tab=id;S.openForm=false;S.msgGo=null;try{window.scrollTo(0,0)}catch(e){}break;
      case 'view':S.view=id;break;
      case 'tog':S.open[id]=!(S.open[id]===undefined?(id.indexOf('st')===0&&c&&id==='st'+c.id+(c.stage||0)):S.open[id]);break;
      case 'asCand':S.role='Candidate';S.openForm=false;break;
      case 'asAdv':S.role='Advisor';S.openForm=false;break;
      case 'copy':S.copyText=summary(c);break;
      case 'copy-close':S.copyText=null;break;
      case 'delete':S.confirmDel=true;break;
      case 'delete-no':S.confirmDel=false;break;
      case 'reset':S.confirmReset=true;break;
      case 'reset-no':S.confirmReset=false;break;
      case 'reset-yes':{S.confirmReset=false;try{var rc=await db.rpc('reset_candidate',{p_case:c.id});S.copyText='Hello '+c.name.split(' ')[0]+',\n\nYour access has been reset. Open '+location.href.split('#')[0]+' and choose "First time? Create your password".\n  Email: '+(c.email||'your email')+'\n  New access code: '+rc+'\nThen pick a new password.\n';say('Access reset. Send the message below to the candidate.','ok')}catch(err){fail(err)}break}
      case 'delete-yes':{var did=c.id;S.confirmDel=false;S.cid=null;schedule();await deleteCase(did);say('Case deleted.','ok');return}
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
        var ch=CRIT.filter(function(k){return !k.na&&(S.draft['tg_'+k.id]!==undefined?S.draft['tg_'+k.id]:(c.chosen?c.chosen.indexOf(k.id)>=0:(c.targets||[]).indexOf(k.id)>=0))}).map(function(k){return k.id});
        if(!ch.length){say('Tick at least one criterion.','err');return}
        await candRef(c.id).update({chosen:ch,chosenAt:nowIso()});
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
        var ft2=(S.draft.foeText!==undefined?S.draft.foeText:((c.foe&&c.foe.locked)||'')).trim();
        if(!ft2){say('Write the final FOE statement.','err');return}
        if(!S.draft.foeOk){say('Tick the box to confirm you checked the US growth evidence.','err');return}
        var gs=Object.assign({},c.gates||{});gs.foe={status:'approved',at:nowIso()};
        await candRef(c.id).update({foe:Object.assign({},c.foe||{},{locked:ft2}),gates:gs});
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

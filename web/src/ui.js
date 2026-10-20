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
function ownerChip(o){return '<span class="own own-'+esc(o)+'">'+esc(o)+'</span>'}
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
  if(S.msg)h+='<div class="banner '+S.msgKind+'" role="status">'+esc(S.msg)+' <button class="link" data-a="dismiss">Dismiss</button></div>';
  if(S.busy)h+='<div class="banner busy" role="status">Analysis is running: '+esc(S.busy)+'… <button class="btn sm" data-a="cancel">Stop</button></div>';
  if(S.setup)h+='<div class="banner busy" role="status">'+esc(S.setup)+'</div>';
  var c=cur();
  if(S.locked)h+=c?candidateView(c):'<div class="panel"><h2>No case yet</h2><p>This email is not linked to a case. Ask your advisor to add it, then sign in again.</p></div>';
  else if(S.home==='new')h+=newCaseView();
  else if(S.home==='tasks'&&!c)h+=allTasksView();
  else if(c)h+=(S.role==='Candidate'?candidateView(c):caseView(c));
  else h+=casesView();
  app.innerHTML=h;
  if(typeof y==='number')window.scrollTo(0,y);
  reconcile();
}

function topbar(){
  var c=cur();
  if(S.locked)return '<div class="top"><div><h1>OneA Pathway</h1><div class="priv">Signed in as '+esc((S.me&&S.me.email)||'')+'</div></div><div class="nav"><button class="btn sm" data-a="signout">Sign out</button></div></div>';
  return '<div class="top"><div><h1>OneA Case Tracker</h1><div class="priv">Admin · '+esc((S.me&&S.me.email)||'')+' · screening aid, not legal advice</div></div>'+
   '<div class="nav"><button class="tab'+(!c&&S.home==='cases'?' on':'')+'" data-a="home">Cases</button>'+
   '<button class="tab'+(!c&&S.home==='tasks'?' on':'')+'" data-a="alltasks">All tasks</button>'+
   '<button class="btn pri" data-a="newcase">New candidate</button><button class="btn sm ghost" data-a="signout">Sign out</button></div></div>';
}

/* ----- cases list ----- */
function casesView(){
  var open=0,late=0,wait=0;
  S.tasks.forEach(function(t){if(t.status==='Not started'||isDone(t.status))return;open++;if(t.due&&daysUntil(t.due)<0)late++;if(t.owner==='Candidate')wait++});
  var h='<div class="stats"><div class="stat"><b>'+S.cands.length+'</b><span>Candidates</span></div><div class="stat"><b>'+open+'</b><span>Open tasks</span></div><div class="stat'+(late?' warn':'')+'"><b>'+late+'</b><span>Overdue</span></div><div class="stat"><b>'+wait+'</b><span>Waiting on candidates</span></div></div>';
  if(!S.cands.length)return h+'<div class="panel"><h2>No candidates yet</h2><p>Add a candidate. The whole workflow, '+TEMPLATE.length+' tasks across '+STAGES.length+' stages, is created for you and starts with the welcome call.</p><button class="btn pri" data-a="newcase">New candidate</button></div>';
  h+='<div class="cards">';
  S.cands.slice().sort(function(a,b){return (a.createdAt||'')<(b.createdAt||'')?1:-1}).forEach(function(c){
    var ts=tasksOf(c.id),n=counts(c),rd=readiness(c);
    var next=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)&&t.due}).sort(function(a,b){return a.due<b.due?-1:1})[0];
    var late=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)&&t.due&&daysUntil(t.due)<0}).length;
    h+='<button class="cardc big" data-a="open" data-id="'+c.id+'"><b>'+esc(c.name)+'</b><small>'+esc(c.visa||'')+(c.visaExpiry?' · expires '+esc(c.visaExpiry):'')+'</small>'+
      '<div class="chips">'+chip('Stage '+((c.stage||0)+1)+': '+STAGES[c.stage||0].n,STAGES[c.stage||0].gate?'gate':'')+chip(rd.k,rd.cls)+(late?chip(late+' overdue','bad'):'')+'</div>'+
      bar(caseProgress(c))+'<small>'+caseProgress(c)+'% of required tasks done · '+n.High+' High criteria</small>'+
      (next?'<small>Next: '+esc(next.title)+' ('+esc(next.owner)+', '+esc(dueTxt(next))+')</small>':'')+'</button>';
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
  var h='<div class="casehead"><div><button class="link" data-a="home">&larr; All cases</button><h2>'+esc(c.name)+'</h2><div class="meta"><span>'+esc(c.visa||'')+(c.visaExpiry?' · expires '+esc(c.visaExpiry):'')+'</span><span>Goal: '+esc(c.goal||'')+'</span><span>'+chip(rd.k,rd.cls)+'</span><span>FOE: '+esc((c.foe&&c.foe.locked)||'not locked')+'</span></div></div>'+
   '<div class="chips"><button class="btn sm" data-a="asCand">View as candidate</button><button class="btn sm" data-a="invite">Copy invite message</button><button class="btn sm" data-a="copy">Copy summary</button>'+(S.confirmReset?'<button class="btn sm danger" data-a="reset-yes">Yes, reset access</button><button class="btn sm" data-a="reset-no">Cancel</button>':'<button class="btn sm" data-a="reset">Reset access</button>')+(S.confirmDel?'<button class="btn sm danger" data-a="delete-yes">Yes, delete this case</button><button class="btn sm" data-a="delete-no">Keep</button>':'<button class="btn sm danger" data-a="delete">Delete case</button>')+'</div></div>';
  if(S.copyText!==null)h+='<div class="panel"><div class="ph"><h3>Summary (select and copy)</h3><button class="link" data-a="copy-close">Close</button></div><textarea class="tall" readonly>'+esc(S.copyText)+'</textarea></div>';
  h+='<div class="steps">'+STAGES.map(function(s,i){return '<div class="step'+(i<st?' done':i===st?' now':'')+(s.gate?' g':'')+'" title="'+esc(s.d)+'"><i>'+(i+1)+'</i>'+esc(s.n)+'</div>'}).join('')+'</div>'+bar(caseProgress(c));
  var blockers=ts.filter(function(t){return t.stage===st&&t.req!==false&&!isDone(t.status)});
  if(blockers.length){
    var byO={};blockers.forEach(function(t){byO[t.owner]=(byO[t.owner]||0)+1});
    h+='<div class="blockers"><b>Stage '+(st+1)+' ('+esc(STAGES[st].n)+') finishes when these are done.</b> Waiting on: '+Object.keys(byO).map(function(o){return byO[o]+' '+o}).join(', ')+'.<ul>'+blockers.slice(0,6).map(function(t){return '<li>'+esc(t.title)+' <span class="small">('+esc(t.owner)+(t.status==='Not started'?', locked':'')+')</span></li>'}).join('')+(blockers.length>6?'<li class="small">and '+(blockers.length-6)+' more</li>':'')+'</ul></div>';
  }
  var tabs=[['tasks','Tasks'],['forms','Forms'],['docs','Documents'],['score','Scorecard'],['activity','Activity']];
  h+='<div class="nav tabs">'+tabs.map(function(t){return '<button class="tab'+(S.tab===t[0]?' on':'')+'" data-a="tab" data-id="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div>';
  if(S.tab==='tasks')h+=tasksTab(c,ts);
  else if(S.tab==='forms')h+=formsTab(c);
  else if(S.tab==='docs')h+=docsPanel(c,true);
  else if(S.tab==='score')h+=scoreTab(c);
  else h+=activityTab(c);
  return h;
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
    var group=ts.filter(function(t){return t.stage===i}).sort(function(a,b){return (a.due||'9')<(b.due||'9')?-1:1});
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
    if(t.kind==='ai'&&!locked){var why=aiReady(c,t);h+='<div class="addrow"><button class="btn pri sm" data-a="runai" data-id="'+t.id+'"'+(why||S.busy?' disabled':'')+'>'+(isDone(t.status)?'Run again':'Run analysis')+'</button>'+(why?'<span class="small">'+esc(why)+'</span>':'')+'</div>'}
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
  if(t.gate==='foe'){
    var opts=(c.foe&&c.foe.options)||[];
    if(!opts.length)return '<p class="small">Run the FOE draft first.</p>';
    h+='<div class="gatebox"><b>Choose or edit the field of endeavor</b>';
    opts.forEach(function(o,i){h+='<div class="opt"><b>'+esc(o.label)+'</b><p>'+esc(o.statement)+'</p><p class="small">Why: '+esc(o.why)+'</p><p class="small">US growth to verify: '+esc(o.usGrowth)+'</p><p class="small">Peer pool: '+esc(o.peerPool)+'</p><button class="btn sm" data-a="foe-use" data-id="'+i+'">Use this wording</button></div>'});
    var val=S.draft.foeText!==undefined?S.draft.foeText:((c.foe&&c.foe.locked)||'');
    h+='<label class="f" for="foet">Final statement</label><textarea id="foet" data-draft="foeText">'+esc(val)+'</textarea>'+
     '<label class="chk-l"><input type="checkbox" data-draft-chk="foeOk"'+(S.draft.foeOk?' checked':'')+'> I checked the US growth and impact evidence behind this statement.</label>'+
     '<div class="addrow"><button class="btn pri sm" data-a="foe-lock"'+(g==='approved'?' disabled':'')+'>'+(g==='approved'?'Locked':'Lock FOE')+'</button></div></div>';
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
function formsTab(c){
  if(S.openForm)return formEditor(c,S.form);
  var h='<div class="panel"><h3>Forms</h3>';
  FORMS.forEach(function(f){
    var r=getResp(c.id,f.id),p=progress(f,r);
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
  return h+'<button class="btn" data-a="closeform">Close</button></div></div>';
}

function planHtml(p){
  if(!p||!p.call)return '';
  function ul(t,a){return a&&a.length?'<h4>'+t+'</h4><ul>'+a.map(function(i){return '<li>'+esc(i)+'</li>'}).join('')+'</ul>':''}
  var cls=p.call==='Invest'?'ok':p.call==='Maintain'?'mid':'';
  var det=p.call==='Skip'?'':ul('Actions',p.actions)+ul('Documents to request',p.evidenceToRequest)+ul('Article topics',p.articleTopics)+ul('Venue types (verify real venues)',p.venueTypes)+ul('Judging routes',p.judgingRoutes)+ul('Letter ideas',p.letterIdeas);
  return '<div class="plan"><div class="chips">'+chip(p.call,cls)+(p.effort?'<span class="small">'+esc(p.effort)+'</span>':'')+'</div>'+(p.why?'<p class="small">'+esc(p.why)+'</p>':'')+(det?'<details><summary>Plan details</summary>'+det+'</details>':'')+'</div>';
}
/* ----- scorecard ----- */
function scoreTab(c){
  var n=counts(c),rd=readiness(c);
  var h='<div class="panel"><div class="ph"><h3>Criteria scorecard</h3><div class="chips">'+chip(n.High+' High','ok')+chip(n.Medium+' Medium','mid')+chip(n.Low+' Low or not met','bad')+chip(rd.k,rd.cls)+'</div></div>';
  if(!c.scoredAt)h+='<p class="empty">Not scored yet. The baseline score task runs after Form 1 is reviewed.</p>';
  else{
    if(c.summary)h+='<p>'+esc(c.summary)+'</p>';
    CRIT.forEach(function(k){
      var x=(c.criteria||{})[k.id];if(!x)return;
      h+='<div class="row"><div class="nm">'+esc(k.n)+'<small>'+k.id.toUpperCase()+(x.prev&&x.prev!==x.rating?' · was '+esc(x.prev):'')+'</small></div><div><select data-rate="'+k.id+'" aria-label="Rating for '+esc(k.n)+'">'+options(RATINGS,x.rating)+'</select>'+(x.evidence?'<p>'+esc(x.evidence)+'</p>':'')+(x.gaps?'<p class="g">Gap: '+esc(x.gaps)+'</p>':'')+planHtml(x.plan)+'</div></div>';
    });
  }
  h+='</div>';
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
  return messagesPanel(c,true)+'<div class="panel"><h3>Activity</h3><div class="log">'+(l.length?l.map(function(x){return '<div><time>'+esc(fmt(x.ts))+'</time><span>'+esc(x.text)+'</span></div>'}).join(''):'<p class="empty">Nothing yet.</p>')+'</div></div>';
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
function candidateView(c){
  var ts=tasksOf(c.id).filter(function(t){return t.owner==='Candidate'&&!t.draft});
  var h=S.locked?'':'<div class="candbar"><span class="chip gate">Candidate view (preview)</span> <button class="btn sm" data-a="asAdv">Back to admin view</button></div>';
  if(S.openForm){return h+formEditor(c,S.form)}
  var now=ts.filter(function(t){return t.status!=='Not started'&&!isDone(t.status)}).sort(function(a,b){return (a.due||'9')<(b.due||'9')?-1:1});
  var later=ts.filter(function(t){return t.status==='Not started'}),done=ts.filter(function(t){return isDone(t.status)});
  h+='<div class="panel"><h2>Welcome, '+esc((c.name||'').split(' ')[0])+'</h2><p>Phase '+((c.stage||0)+1)+' of '+STAGES.length+': <b>'+esc(STAGES[c.stage||0].n)+'</b>. '+esc(STAGES[c.stage||0].d)+'.</p>'+bar(caseProgress(c))+'<p class="small">Your advisor moves your case forward after reviewing what you send.</p></div>';
  h+='<div class="panel"><h3>Your next steps</h3>';
  if(!now.length)h+='<p class="empty">Nothing for you right now. Your advisor is working on the next step.</p>';
  now.forEach(function(t){
    h+='<div class="task"><span class="chk dis"></span><div class="tt"><b>'+esc(t.title)+'</b><small>'+esc(t.detail||'')+'</small></div><span class="chip '+dueCls(t)+'">'+esc(dueTxt(t))+'</span>'+
     (t.kind==='form'?'<button class="btn pri sm" data-a="openform" data-id="'+t.form+'">Open form</button>':'<span class="small">Send files or a message below</span>')+'</div>';
  });
  h+='</div>'+docsPanel(c,false)+messagesPanel(c,false);
  h+='<div class="panel"><h3>Your journey</h3><p class="small">Nine phases from start to filing. Your advisor moves you from one phase to the next.</p>'+STAGES.map(function(s,i){var st=c.stage||0,cls=i<st?'done':i===st?'now':'',mine=ts.filter(function(t){return t.stage===i}).sort(function(a,b){return (a.due||'9')<(b.due||'9')?-1:1});return '<div style="border-top:1px solid var(--line);padding:10px 0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="step '+cls+(s.gate?' g':'')+'"><i>'+(i+1)+'</i>'+esc(s.n)+'</span><span class="chip">'+(i<st?'Complete':i===st?'You are here':'Upcoming')+'</span></div><p class="small">'+esc(s.d)+'</p>'+mine.map(function(t){var dn=isDone(t.status);return '<div class="task'+(dn?' done':t.status==='Not started'?' locked':'')+'"><span class="chk dis'+(dn?' on':'')+'"></span><div class="tt"><b>'+esc(t.title)+'</b></div><span class="chip">'+(dn?'Done':esc(dueTxt(t)))+'</span></div>'}).join('')+'</div>'}).join('')+'</div>';
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
    switch(a){
      case 'dismiss':S.msg=null;break;
      case 'signout':await db.signOut();return;
      case 'invite':{var site=location.href.split('#')[0];var icode=db.inviteCode?await db.inviteCode(c.id):'';S.copyText='Hello '+c.name.split(' ')[0]+',\n\nYour OneA Pathway workspace is ready: '+site+'\n\nFirst time: choose "First time? Create your password" and enter\n  Email: '+(c.email||'your email')+'\n  Access code: '+(icode||'(ask your advisor)')+'\nThen pick a password. After that, just sign in with your email and password.\nYou can fill in forms and upload documents there. You will only ever see your own case.\n';break}
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
      case 'tab':S.tab=id;S.openForm=false;break;
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
      case 'runai':{var tr=S.tasks.find(function(x){return x.id===id});if(tr&&!S.busy)runAi(tr);return}
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
      case 'foe-use':{S.draft.foeText=c.foe.options[+id].statement;break}
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
  db=opts.db;sampleFn=opts.sample;S.locked=!!opts.locked;S.me=opts.me;if(S.locked){S.role='Candidate';S.cid=opts.caseId}
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
}

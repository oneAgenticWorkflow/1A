// In-memory stand-in for supabase-js used only by the browser test. Mimics the database rules in JS.
(function(){
  var q=new URLSearchParams(location.search),role=q.get('as')||'admin';
  var KEY='stubdb';
  var db=JSON.parse(localStorage.getItem(KEY)||'{"candidates":[],"tasks":[],"responses":[],"log":[],"docs":[],"invites":[],"files":[]}');
  function save(){localStorage.setItem(KEY,JSON.stringify(db))}
  var CASE=(db.invites.find(function(i){return i.email==='alex@x.com'})||{}).case_id||null;
  var prof=role==='admin'?{role:'admin',case_id:null,email:'boss@x.com'}:{role:'candidate',case_id:CASE,email:'alex@x.com'};
  var now=function(){return new Date().toISOString()};
  function visible(t,r){
    if(role==='admin')return true;
    if(t==='tasks')return r.case_id===CASE&&r.data.owner==='Candidate'&&!r.data.draft;
    if(t==='log')return r.case_id===CASE&&(r.data.by==='Candidate'||r.data.shared);
    if(t==='candidates')return false;
    return r.case_id===CASE;
  }
  function reconcile(cid){
    var ts=db.tasks.filter(function(t){return t.case_id===cid});
    ts.forEach(function(t){var deps=t.data.deps||[];if(!deps.length)return;
      var met=deps.every(function(k){var d=ts.find(function(x){return x.id===cid+'-'+k});return d&&(d.data.status==='Done'||d.data.status==='Skipped')});
      if(t.data.status==='Not started'&&met)t.data.status='To do';else if(t.data.status==='To do'&&!met)t.data.status='Not started'});
    var st=8;ts.forEach(function(t){if(t.data.req!==false&&t.data.status!=='Done'&&t.data.status!=='Skipped')st=Math.min(st,t.data.stage)});
    var c=db.candidates.find(function(x){return x.id===cid});if(c&&c.data.stage!==st){c.data.stage=st}
  }
  function rpc(name,a){
    return new Promise(function(res){setTimeout(function(){
      var out={data:null,error:null};
      try{
        if(name==='merge_doc'){var row=db[a.p_table].find(function(r){return r.id===a.p_id});if(!row)throw new Error('no such row');Object.assign(row.data,a.p_patch)}
        else if(name==='reconcile'){if(role!=='admin')throw new Error('admins only');reconcile(a.p_case)}
        else if(name==='submit_form'){var r=db.responses.find(function(x){return x.id===CASE+'-'+a.p_form});if(!r||['Not started','In progress'].indexOf(r.data.status)<0)throw new Error('already submitted');r.data.status='Submitted';var t=db.tasks.find(function(x){return x.id===CASE+'-'+a.p_form});if(t)t.data.status='Done';reconcile(CASE)}
        else if(name==='my_case'){var c=db.candidates.find(function(x){return x.id===CASE});var req=db.tasks.filter(function(t){return t.case_id===CASE&&t.data.req!==false});out.data=c?{name:c.data.name,visa:c.data.visa,goal:c.data.goal,stage:c.data.stage||0,progress:req.length?Math.round(req.filter(function(t){return t.data.status==='Done'||t.data.status==='Skipped'}).length/req.length*100):0}:null}
        else if(name==='claim_case'){out.data=CASE}
        save();
      }catch(e){out.error={message:e.message}}
      res(out)},5)});
  }
  function from(t){
    var f={_t:t,_eq:null,_one:false};
    function done(){return new Promise(function(res){setTimeout(function(){
      var rows=(db[t]||[]).filter(function(r){return t==='profiles'||t==='invites'||visible(t,r)});
      if(t==='profiles'){res({data:prof,error:null});return}
      res({data:rows.map(function(r){return {id:r.id,data:JSON.parse(JSON.stringify(r.data))}}),error:null})},5)})}
    f.select=function(){return f};f.order=function(){return f};f.range=function(){return done()};
    f.maybeSingle=function(){return Promise.resolve({data:prof,error:null})};
    f.eq=function(k,v){f._eq=[k,v];return f};
    f.then=function(a,b){
      // delete(...).eq(...) resolves here
      if(f._del){db[t]=db[t].filter(function(r){return !(f._eq&&r[f._eq[0]]===f._eq[1])});save();return Promise.resolve({error:null}).then(a,b)}
      return done().then(a,b)};
    f.delete=function(){f._del=true;return f};
    f.upsert=function(row){return new Promise(function(res){setTimeout(function(){
      if(role!=='admin'){
        if(t==='responses'){var ex=db.responses.find(function(r){return r.id===row.id});if(row.case_id!==CASE||['Not started','In progress'].indexOf(row.data.status)<0||(ex&&['Not started','In progress'].indexOf(ex.data.status)<0)){res({error:{message:'new row violates row-level security policy'}});return}}
        else if(t==='docs'||t==='log'){if(row.case_id!==CASE||row.data.by!=='Candidate'){res({error:{message:'new row violates row-level security policy'}});return}}
        else{res({error:{message:'new row violates row-level security policy'}});return}
      }
      var i=db[t].findIndex(function(r){return r.id===row.id});
      if(i>=0)db[t][i]=row;else db[t].push(row);
      if(t==='invites')db.invites=db.invites.filter(function(x,j,arr){return arr.findIndex(function(y){return y.email===x.email})===j});
      save();res({error:null})},5)})};
    return f;
  }
  var chan={on:function(){return chan},subscribe:function(){return chan}};
  window.supabase={createClient:function(){return {
    auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:prof.email},access_token:'t'}}})},onAuthStateChange:function(){},signOut:function(){return Promise.resolve()},signInWithOtp:function(){return Promise.resolve({})}},
    from:from,rpc:rpc,channel:function(){return chan},
    storage:{from:function(){return {
      upload:function(path){db.files.push(path);save();return Promise.resolve({error:null})},
      createSignedUrl:function(p){return Promise.resolve({data:{signedUrl:'about:blank#'+p},error:null})},
      remove:function(){return Promise.resolve({})}}}}
  }}};
  window.__db=db;
  window.PORTAL_CONFIG={SUPABASE_URL:'https://x.supabase.co',SUPABASE_ANON_KEY:'k'};
  window.__reload=function(){};
})();

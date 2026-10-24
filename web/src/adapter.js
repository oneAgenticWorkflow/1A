/* Thin layer that gives the app a small document-database API on top of Supabase tables. */
function makeDb(sb,isAdmin,caseId,cfg){
  function fail(error){var e=new Error(error.message||String(error));e.code=error.code||'db_error';return e}
  var loaders={};
  function bump(coll){if(coll){(loaders[coll]||[]).forEach(function(f){f()})}else Object.keys(loaders).forEach(bump)}
  function caseOf(coll,id,d){return coll==='candidates'?id:(d&&d.cid)||caseId}
  function newId(){return 'a'+(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):String(Date.now())+Math.random().toString(16).slice(2))}
  function ref(coll,id){
    return {id:id,
      set:async function(d){var r=await sb.from(coll).upsert({id:id,case_id:caseOf(coll,id,d),data:d});if(r.error)throw fail(r.error);bump(coll)},
      update:async function(d){var r=await sb.rpc('merge_doc',{p_table:coll,p_id:id,p_patch:d});if(r.error)throw fail(r.error);bump(coll)},
      delete:async function(){var r=await sb.from(coll).delete().eq('id',id);if(r.error)throw fail(r.error);bump(coll)}};
  }
  async function loadAll(coll){
    if(coll==='candidates'&&!isAdmin){
      var m=await sb.rpc('my_case');if(m.error)throw fail(m.error);
      return m.data?[{id:caseId,data:function(){return Object.assign({},m.data)}}]:[];
    }
    var out=[],from=0,page=1000;
    for(;;){
      var r=await sb.from(coll).select('id,data').order('id').range(from,from+page-1);
      if(r.error)throw fail(r.error);
      r.data.forEach(function(row){out.push({id:row.id,data:function(){return JSON.parse(JSON.stringify(row.data))}})});
      if(r.data.length<page)break;from+=page;
    }
    if(isAdmin&&coll==='responses'){
      var nr=await sb.from('adv_notes').select('id,data');
      if(!nr.error&&nr.data){var nm={};nr.data.forEach(function(x){nm[x.id]=x.data});
        out.forEach(function(o){var n=nm[o.id];if(!n||!n.ideas)return;var base=o.data;o.data=function(){var d=base();if(Array.isArray(d.data&&d.data.ideas))d.data.ideas=d.data.ideas.map(function(e,i){return Object.assign({},e,n.ideas[i]||{})});return d}})}
    }
    return out;
  }
  var db={
    doc:function(path){var p=path.split('/');return ref(p[0],p[1])},
    collection:function(coll){
      return {
        add:async function(d){var id=newId();await ref(coll,id).set(d);return ref(coll,id)},
        doc:function(id){return ref(coll,id||newId())},
        onSnapshot:function(cb,errCb){
          var timer=0,dead=false;
          async function load(){try{var docs=await loadAll(coll);if(!dead)cb({docs:docs})}catch(e){if(errCb)errCb(e)}}
          function soon(){clearTimeout(timer);timer=setTimeout(load,250)}
          (loaders[coll]=loaders[coll]||[]).push(soon);
          load();
          if(isAdmin||coll!=='candidates')sb.channel('rt-'+coll).on('postgres_changes',{event:'*',schema:'public',table:coll},soon).subscribe();
          setInterval(load,isAdmin?60000:20000);
          return function(){dead=true};
        }};
    },
    rpc:async function(name,args){var r=await sb.rpc(name,args);if(r.error)throw fail(r.error);if(name!=='my_case')bump();return r.data},
    deleteCase:async function(cid){
      if(!isAdmin)throw new Error('Only administrators can delete cases.');
      if(!cid)throw new Error('Missing case ID.');
      // Do not leave an orphaned authentication account with access to a deleted case.
      var users=await sb.from('profiles').select('id').eq('case_id',cid).limit(1);
      if(users.error)throw fail(users.error);
      if(users.data&&users.data.length)throw new Error('This case has a linked login. Remove the candidate login through People before deleting the case.');
      var docs=await sb.from('docs').select('data').eq('case_id',cid);
      if(docs.error)throw fail(docs.error);
      var paths=(docs.data||[]).map(function(x){return x.data&&x.data.path}).filter(Boolean);
      // Delete dependent rows before the case record; surface any database permission failure.
      for(var i=0,colls=['adv_notes','responses','log','tasks','docs','assignments','invites'];i<colls.length;i++){
        var d=await sb.from(colls[i]).delete().eq('case_id',cid);
        if(d.error)throw fail(d.error);
      }
      var removed=await sb.from('candidates').delete().eq('id',cid).select('id');
      if(removed.error)throw fail(removed.error);
      if(!removed.data||!removed.data.length)throw new Error('Case could not be deleted. Verify administrator permissions and retry.');
      bump();
      if(paths.length){var storage=await sb.storage.from('case-files').remove(paths);if(storage.error)throw new Error('Case deleted, but uploaded files could not be removed: '+storage.error.message)}
      return true;
    },
    invite:async function(email,cid){var al='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=new Uint8Array(8);crypto.getRandomValues(b);var code='';for(var i=0;i<8;i++)code+=al[b[i]%al.length];var r=await sb.from('invites').upsert({email:email.trim().toLowerCase(),case_id:cid,code:code});if(r.error)throw fail(r.error);return code},
    sendCandidateInvite:async function(cid,action,email){
      var ss=await sb.auth.getSession(),tk=ss.data.session&&ss.data.session.access_token;
      if(!tk)throw new Error('Sign in again to send an invitation.');
      var r=await fetch(cfg.SUPABASE_URL+'/functions/v1/invite-candidate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk,apikey:cfg.SUPABASE_ANON_KEY},body:JSON.stringify({case_id:cid,action:action||'invite',email:email||undefined})});
      var j={};try{j=await r.json()}catch(_){}
      if(!r.ok)throw new Error(j.error||'Could not send invitation ('+r.status+')');
      return j;
    },
    setPassword:function(pw){return sb.auth.updateUser({password:pw})},
    accounts:async function(body){
      var ss=await sb.auth.getSession(),tk=ss.data.session&&ss.data.session.access_token;
      var r=await fetch(cfg.SUPABASE_URL+'/functions/v1/accounts',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk,apikey:cfg.SUPABASE_ANON_KEY},body:JSON.stringify(body)});
      var j={};try{j=await r.json()}catch(_){}
      if(!r.ok)throw new Error(j.error||'Request failed ('+r.status+')');return j},
    users:async function(){
      var p=await sb.from('profiles').select('id,username,email,role,case_id,display_name,contact_email,must_change');if(p.error)throw fail(p.error);
      var a=await sb.from('assignments').select('user_id,case_id');
      return {profiles:p.data||[],assign:(a&&a.data)||[]}},
    setAssign:async function(uid,cids){
      var d=await sb.from('assignments').delete().eq('user_id',uid);if(d.error)throw fail(d.error);
      if(cids.length){var r=await sb.from('assignments').insert(cids.map(function(c){return {user_id:uid,case_id:c}}));if(r.error)throw fail(r.error)}},
    inviteCode:async function(cid){var r=await sb.from('invites').select('code').eq('case_id',cid).maybeSingle();return (r.data&&r.data.code)||''},
    uninvite:async function(cid){await sb.from('invites').delete().eq('case_id',cid)},
    upload:async function(cid,file){
      var safe=file.name.replace(/[^A-Za-z0-9._-]+/g,'_').slice(-120);
      var path=cid+'/'+newId().slice(0,12)+'-'+safe;
      var r=await sb.storage.from('case-files').upload(path,file,{contentType:file.type||'application/octet-stream'});
      if(r.error)throw fail(r.error);return path;
    },
    signedUrl:async function(path){var r=await sb.storage.from('case-files').createSignedUrl(path,120);if(r.error)throw fail(r.error);return r.data.signedUrl},
    removeFiles:async function(paths){await sb.storage.from('case-files').remove(paths)},
    signOut:async function(){await sb.auth.signOut();location.reload()}
  };
  return db;
}

/* Analysis calls go through a Supabase Edge Function that holds the API key and only answers admins. */
function makeSample(sb,cfg){
  async function run(prompt,opts){
    opts=opts||{};
    var s=await sb.auth.getSession();var tok=s.data&&s.data.session&&s.data.session.access_token;
    var res;
    try{res=await fetch(cfg.SUPABASE_URL+'/functions/v1/analysis',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok,'apikey':cfg.SUPABASE_ANON_KEY},body:JSON.stringify({prompt:prompt,tier:opts.modelTier||'default',web:!!opts.web}),signal:opts.signal})}
    catch(e){var ce=new Error(e.name==='AbortError'?'Stopped':'Network error');ce.code=e.name==='AbortError'?'cancelled':'network';throw ce}
    var body={};try{body=await res.json()}catch(_){}
    if(!res.ok){var er=new Error(body.error||('Analysis function returned '+res.status));er.code=res.status===429?'rate_limited':(res.status===401||res.status===403)?'not_granted':'error';throw er}
    run.sources=body.sources||[];
    if(body.usage&&f&&f.onUsage)f.onUsage(body.usage);
    return body.text||'';
  }
  var f=async function(prompt,opts){return {text:await run(prompt,opts)}};
  f.json=async function(prompt,opts){
    var t=await run(prompt,opts),a=t.indexOf('{'),b=t.lastIndexOf('}');
    try{var o=JSON.parse(t.slice(a,b+1));if(opts&&opts.web)Object.defineProperty(o,'_sources',{value:run.sources,enumerable:false});return o}catch(_){var e=new Error('Analysis returned an unreadable answer');e.code='invalid_json';throw e}
  };
  return f;
}

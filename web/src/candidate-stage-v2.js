/* Candidate-only nine-stage step projection. No database writes. */
(function(){
  var original=candidateView;
  candidateView=function(c){
    var html=original(c);
    if(S.openForm)return html;
    var stage=Math.max(0,Math.min(8,Number(S.cvp!==undefined?S.cvp:(c.stage||0))||0));
    var tasks=tasksOf(c.id).filter(function(t){return !t.draft&&t.req!==false&&pathwayV2Stage(t)===stage&&!/^speak-/.test(t.key||'')});
    if(stage===5&&!pathwayV2Approved(c))tasks=tasks.filter(function(t){return !/article|award|review panel|media|membership|talk proposal/i.test(t.title||'')});
    var rows=tasks.map(function(t){
      var who=pathwayV2Role(t.owner),done=isDone(t.status),waiting=waitingFor(t).length>0;
      var state=done?'Completed':waiting?'Waiting for preceding step':t.status==='Not started'?'Not assigned yet':t.status;
      var action=t.owner==='Candidate'&&!waiting&&t.status!=='Not started'&&!done?cxTask(c,t):'';
      return '<article class="cx-steplist" style="padding:12px 0;border-bottom:1px solid #e1e5e9"><div class="cx-sb"><b>'+esc(t.title||t.key)+'</b><small>Owner: '+esc(who)+' · '+esc(state)+'</small></div>'+action+'</article>';
    }).join('');
    var note=stage===5&&!pathwayV2Approved(c)?'<p class="cx-none">Evidence work for individual EB-1A criteria will appear only after the FOE and criteria strategy are approved.</p>':'';
    var start=html.indexOf('<h5>Steps in this stage</h5>');
    if(start>=0){
      var end=html.indexOf('</div></section>',start);
      if(end>=0)html=html.slice(0,start)+'<h5>Steps in this stage ('+tasks.length+')</h5>'+note+(rows||'<p class="cx-none">No steps assigned to this stage.</p>')+html.slice(end);
    }
    if(!pathwayV2Approved(c)){
      html=html.replace(/<details class="cx-sec cx-details cx-rhythm"[\\s\\S]*?<\\/details>/,'');
    }
    return html;
  };
})();
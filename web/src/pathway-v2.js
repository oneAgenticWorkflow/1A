/* Arcanam Pathway v2: non-destructive workflow projections and approval guards.
 * Compatibility: older tasks keep their IDs, stages, owners, and statuses.
 * An empty approved strategy deliberately exposes NO evidence build criteria.
 */
var PATHWAY_V2_STAGES=['Onboarding','Profile Intake','Project Intake','FOE Lock','Criteria Strategy','Evidence Build','Final Review','Attorney Handover','Filing'];
var PATHWAY_V2_STAGE_KEYS={foew:3,foe:3,'foe-ai':3,'foe-mkt':3,'foe-mkt-ok':3,analysis:3,review:3,'art-topic':4,art1:5,art2:5,art3:5,art4:5,art5:5,art6:5,'judge-apply':5,f10:2,r10:2};
var PATHWAY_V2_CRITERIA={judging:'c4',memberships:'c2',awards:'c1',media:'c3',articles:'c6',critical:'c8',contributions:'c5',salary:'c9'};
function pathwayV2Stage(t){
  if(t&&Number.isInteger(Number(t.pathwayStage))&&t.pathwayStage!==undefined&&t.pathwayStage!==null&&t.pathwayStage!=='')return Math.max(0,Math.min(8,Number(t.pathwayStage)));
  return Object.prototype.hasOwnProperty.call(PATHWAY_V2_STAGE_KEYS,(t||{}).key)?PATHWAY_V2_STAGE_KEYS[t.key]:Math.max(0,Math.min(8,Number((t||{}).stage)||0));
}
function pathwayV2Approved(c){
  var f=c&&c.criteriaFinalization||{},foe=c&&c.foe||{};
  var list=Array.isArray(f.criteria)?f.criteria:[];
  return !!(f.approvedAt&&foe.locked&&f.foe===foe.locked&&list.length)&&list.slice();
}
function pathwayV2Evidence(c){
  var selected=pathwayV2Approved(c);
  return !selected?[]:EB_CRITERIA.filter(function(k){return selected.indexOf(PATHWAY_V2_CRITERIA[k[0]])>=0});
}
function pathwayV2Gate(c,gate){
  var g=(c&&c.gates||{})[gate]||{};
  return g.status==='approved'&&!!g.at;
}
function pathwayV2Readiness(c,ts){
  var evidence=pathwayV2Evidence(c),findings=Array.isArray(c.evidenceFindings)?c.evidenceFindings:[],articles=Array.isArray(c.scholarlyArticles)?c.scholarlyArticles:[],issues=[];
  if(!pathwayV2Gate(c,'foe')||!(c.foe&&c.foe.locked))issues.push('Field of endeavor has not been formally approved.');
  if(!pathwayV2Approved(c))issues.push('No approved criteria strategy matches the currently locked FOE.');
  if(!evidence.length)issues.push('No approved evidence build criteria are available.');
  evidence.forEach(function(row){
    var key=row[0],record=ebCriterion(c,key);
    if(record.status!=='Evidence ready')issues.push(row[1]+' evidence is not marked ready.');
    var linked=findings.filter(function(x){return x.criterionId===PATHWAY_V2_CRITERIA[key]&&x.status==='accepted'});
    if(!linked.length)issues.push(row[1]+' needs a validated, source-linked evidence finding.');
    if(key==='articles'&&!articles.some(function(x){return x.status==='Published'&&x.publishedDate}))issues.push('Scholarly authorship needs a documented published article.');
  });
  if((c.redFlags||[]).some(function(x){return !x.done}))issues.push('There are unresolved review flags.');
  var review=ts.filter(function(t){return pathwayV2Stage(t)===6&&t.req!==false&&!isDone(t.status)});
  if(review.length)issues.push(review.length+' required final-review steps remain open.');
  return {ready:issues.length===0,issues:issues,approved:evidence};
}
function pathwayV2Role(role){return role==='Advisor'?'Supervisor':role==='Analysis'?'Analysis':role==='Attorney'?'Attorney':'Candidate'}

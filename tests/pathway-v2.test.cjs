const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/src/pathway-v2.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../web/src/ui.js'),'utf8');
const context={
 EB_CRITERIA:[['judging','Judging'],['articles','Scholarly Articles'],['critical','Critical Role']],
 ebCriterion:(c,k)=>(c.ebCriteriaTracker||{})[k]||{status:'Not started'},
 isDone:(x)=>x==='Done'||x==='Skipped'
};
vm.createContext(context);vm.runInContext(source,context);
const caseBase=()=>({foe:{locked:'Applied AI in enterprise automation'},gates:{foe:{status:'approved',at:'2026-10-26'}},ebCriteriaTracker:{articles:{status:'Evidence ready'}}});
test('unapproved or stale strategies never expose evidence',()=>{
 const c=caseBase();assert.equal(context.pathwayV2Evidence(c).length,0);
 c.criteriaFinalization={criteria:['c6'],approvedAt:'2026-10-26',foe:'Other FOE'};
 assert.equal(context.pathwayV2Evidence(c).length,0);
});
test('approved criteria expose only their selected evidence tracks',()=>{
 const c=caseBase();c.criteriaFinalization={criteria:['c6'],approvedAt:'2026-10-26',foe:c.foe.locked};
 assert.deepEqual(Array.from(context.pathwayV2Evidence(c),r=>r[0]),['articles']);
 assert.ok(!context.pathwayV2Readiness(c,[]).ready);
});
test('published article alone does not bypass source evidence verification',()=>{
 const c=caseBase();c.criteriaFinalization={criteria:['c6'],approvedAt:'2026-10-26',foe:c.foe.locked};
 c.scholarlyArticles=[{status:'Published',publishedDate:'2026-10-25'}];
 assert.ok(context.pathwayV2Readiness(c,[]).issues.some(x=>x.includes('source-linked')));
});
test('legacy stages stay display-only and the explicit mapping is stable',()=>{
 assert.equal(context.pathwayV2Stage({stage:2,key:'art1'}),5);
 assert.equal(context.pathwayV2Stage({stage:2,key:'f2'}),2);
 assert.equal(context.pathwayV2Stage({stage:2,key:'art1',pathwayStage:4}),4);
});
test('both advisor and candidate evidence panes use the approval filter',()=>{
 assert.match(ui,/scope=pathwayV2Evidence\(c\)/);
 assert.match(ui,/scope\.forEach/);
 assert.match(ui,/scope\.some\(function\(x\)\{return x\[0\]==='articles'\}\)/);
 assert.match(ui,/if\(!pathwayV2Evidence\(c\)\.some/);
});
test('article edits preserve original metadata',()=>{
 assert.match(ui,/Object\.assign\(\{\},prior\|\|\{\},\{title:title/);
});
test('no automatic writes or destructive migrations in compatibility module',()=>{
 assert.doesNotMatch(source,/\.update\(|\.delete\(|\.insert\(|\.rpc\(|drop table|truncate/i);
});

test('nine-stage candidate schedule has a duration and label for every stage',()=>{
 assert.match(ui,/var PLAN=\[10,14,35,21,21,75,34,14,14\]/);
 assert.match(ui,/sg=\{n:PATHWAY_V2_STAGES\[st\]\}/);
 assert.match(ui,/pathwayV2Stage\(t\)===si/);
});

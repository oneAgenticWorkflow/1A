const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync(require('node:path').join(__dirname,'../web/src/ui.js'),'utf8');
const start=ui.indexOf('function evidenceIntelligence(c){');
const end=ui.indexOf('function evidenceIntelligencePanel(c){',start);
const source=ui.slice(start,end);
test('evidence triage is defined and embedded in advisor scorecard',()=>{
 assert.ok(start>=0 && end>start);
 const score=ui.slice(ui.indexOf('function scoreTab(c){'),ui.indexOf('function activityTab(c){'));
 assert.match(score,/evidenceIntelligencePanel\(c\)/);
});
test('priority is grounded in targets and written gaps, not invented probabilities',()=>{
 assert.match(source,/chosen\.indexOf\(k\.id\)/);
 assert.match(source,/x\.evidence/);
 assert.match(source,/x\.gaps/);
 assert.doesNotMatch(source,/Math\.random|approvalProbability|likelihood/);
});
test('evidence is not claimed to be independently verified',()=>{
 assert.match(ui,/No independent document verification has occurred/);
 assert.match(ui,/not petition eligibility, likelihood of approval, or legal advice/);
});
test('unassessed cases receive a caution',()=>{
 assert.match(ui,/if\(!c\.scoredAt\)/);
 assert.match(ui,/A full evidence assessment has not been recorded/);
});

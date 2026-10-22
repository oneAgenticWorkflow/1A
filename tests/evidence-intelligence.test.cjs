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

test('source review requires an uploaded file, source location, and excerpt',()=>{
 assert.match(ui,/function evidenceSourceReview\(c\)/);
 assert.match(ui,/d\.cid===c\.id&&d\.kind==='file'&&d\.path/);
 assert.match(ui,/if\(!locator\|\|!excerpt\)/);
});
test('advisor review is separate from criterion ratings and supports rejection',()=>{
 assert.match(ui,/case 'ev-accept':case 'ev-reject':case 'ev-remove'/);
 assert.match(ui,/status:'pending'/);
 assert.match(ui,/status:a==='ev-accept'\?'accepted':'rejected'/);
 assert.match(ui,/Findings remain advisor-only and do not change criterion ratings automatically/);
});
test('source-linked review is shown on advisor scorecard',()=>{
 const score=ui.slice(ui.indexOf('function scoreTab(c){'),ui.indexOf('function activityTab(c){'));
 assert.match(score,/evidenceSourceReview\(c\)/);
});

test('NIW evidence track covers EB-2 threshold and all three Dhanasar prongs',()=>{
 assert.match(ui,/niw_endeavor/);
 assert.match(ui,/niw_importance/);
 assert.match(ui,/niw_position/);
 assert.match(ui,/niw_balance/);
 assert.match(ui,/eb2_degree/);
});
test('dual pathway development keeps distinct tracks and deduplicates requests',()=>{
 assert.match(ui,/decision==='both'\?\['niw','eb1a'\]/);
 assert.match(ui,/pathway:'\+track\+':'\+item\[0\]/);
 assert.match(ui,/existing\.some\(function\(d\)\{return d\.pathwayKey===key\}\)/);
 assert.match(ui,/function pathwayDevelopment\(c\)/);
});

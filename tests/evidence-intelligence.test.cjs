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

test('candidate pathway guide covers NIW, EB-1A, priority dates and F-1',()=>{
 assert.match(ui,/function pathwayGuide\(\)/);
 assert.match(ui,/NIW is a waiver within EB-2/);
 assert.match(ui,/priority date generally is the properly filed I-140 receipt date/);
 assert.match(ui,/An I-140 does not extend F-1 status/);
 assert.match(ui,/h\+=pathwayGuide\(\)/);
});
test('strategy is advisor-only and requires a written rationale',()=>{
 assert.match(ui,/function pathwayStrategy\(c\)/);
 assert.match(ui,/case 'strategy-save'/);
 assert.match(ui,/if\(!v\.rationale\)/);
 assert.match(ui,/S\.locked\|\|S\.role==='Candidate'/);
});

test('pathway guide compares EB-1A and NIW and explains post-I-140 steps',()=>{
 assert.match(ui,/Compare the two green-card pathways/);
 assert.match(ui,/After an I-140 is approved/);
 assert.match(ui,/NIW I-140 filed November 2026 and approved May 2027/);
 assert.match(ui,/I-140 approval grants work authorization\?/);
 assert.match(ui,/h\+=comparison/);
});

test('NIW evidence review supports independent source-linked prongs',()=>{
 assert.match(ui,/evidenceSourceReview\(c,tracks\)/);
 assert.match(ui,/PATHWAY_REQUIREMENTS\.niw\.forEach/);
 assert.match(ui,/NIW — /);
 assert.match(ui,/\['niw','both'\]\.indexOf/);
});

test('NIW lifecycle requires candidate acknowledgement and advisor activation',()=>{
 assert.match(ui,/var NIW_PHASES=/);
 assert.match(ui,/case 'niw-agree'/);
 assert.match(ui,/if\(!S\.locked\)/);
 assert.match(ui,/case 'niw-activate'/);
 assert.match(ui,/if\(!p\.agreement\|\|!p\.agreement\.acceptedAt\)/);
 assert.match(ui,/data-draft-chk="niw_agree"/);
});
test('NIW case separates USCIS filing and visa availability',()=>{
 assert.match(ui,/\['filing','I-140 filing'/);
 assert.match(ui,/\['uscis','USCIS adjudication'/);
 assert.match(ui,/\['visa','Visa availability'/);
 assert.match(ui,/\['residence','Green-card process'/);
 assert.match(ui,/case 'niw-filing'/);
 assert.match(ui,/niwCaseFlow\(c,true\)/);
 assert.match(ui,/niwCaseFlow\(c,false\)/);
});

test('NIW readiness checks requested documents, uploads and reviewed source findings',()=>{
 assert.match(ui,/function niwReadiness\(c\)/);
 assert.match(ui,/pathway:niw:/);
 assert.match(ui,/f\.status==='accepted'/);
 assert.match(ui,/function niwReadinessPanel\(c\)/);
});
test('NIW filing and legal milestones require advisor-recorded attorney review',()=>{
 assert.match(ui,/case 'niw-signoff'/);
 assert.match(ui,/legalSignoff:/);
 assert.match(ui,/Record attorney review before filing details/);
 assert.match(ui,/Record USCIS receipt and filing date first/);
});

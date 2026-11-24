const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'..','web','src','ui.js'),'utf8');
test('Remind opens an editable message instead of a copy box',()=>{
  const i=ui.indexOf("case 'nudge':");
  const block=ui.slice(i,ui.indexOf("case 'rem-cancel'",i));
  assert.match(block,/S\.remind=\{tid:nt\.id,cid:nc\.id/);
  assert.match(block,/S\.draft\.rem=/);
  assert.doesNotMatch(block,/S\.copyText='Hello/);
});
test('rem-send posts a shared message to the candidate thread and guards duplicates',()=>{
  const i=ui.indexOf("case 'rem-send':");
  const block=ui.slice(i,ui.indexOf("case 'sync-tpl'",i));
  assert.match(block,/Staff access required/);
  assert.match(block,/db\.collection\('log'\)\.add\(/);
  assert.match(block,/shared:true/);
  assert.match(block,/by:'Admin'/);
  assert.match(block,/remindTid:rm\.tid/);
  assert.match(block,/43200000/);
});
test('reminder panel renders on both dashboard views',()=>{
  assert.equal(ui.split('h+=remindPanel();').length-1,2);
  assert.match(ui,/data-a="rem-send"/);
});
test('Upcoming reminders send a real message and mark the 7/3-day reminder sent',()=>{
  const i=ui.indexOf("case 'up-copy':");
  const block=ui.slice(i,ui.indexOf("case 'foe-open'",i));
  assert.match(block,/S\.remind=\{tid:'up:'/);
  assert.doesNotMatch(block,/S\.copyText='Hello/);
  assert.match(ui,/nq\[rm\.st\]=nowIso\(\)/);
  assert.match(ui,/Send reminder<\/button>/);
});

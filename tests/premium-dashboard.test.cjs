const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'..','web','src','ui.js'),'utf8');
const start=ui.indexOf('function casesView(){');
const end=ui.indexOf('\nfunction newCaseView(){',start);
const portfolio=ui.slice(start,end);
test('portfolio overview uses actual case and task collections',()=>{
  assert.match(portfolio,/S\.cands\.slice\(\)/);
  assert.match(portfolio,/S\.tasks\.forEach/);
  assert.match(portfolio,/caseProgress\(c\)/);
});
test('case navigation and overdue task actions preserve existing handlers',()=>{
  assert.match(portfolio,/data-a="open"/);
  assert.match(portfolio,/data-a="gotask"/);
});
test('portfolio readiness and evidence labels come from existing calculations',()=>{
  assert.match(portfolio,/readiness\(c\)/);
  assert.match(portfolio,/counts\(c\)/);
  assert.match(portfolio,/n\.High/);
});
test('dashboard CSS is installed only once and supports mobile',()=>{
  assert.match(ui,/getElementById\('pathway-dashboard-style'\)/);
  assert.match(ui,/@media\(max-width:760px\)/);
});
test('candidate-only route remains separate from staff case portfolio',()=>{
  assert.match(ui,/if\(S\.locked\)h\+=c\?candidateView\(c\)/);
  assert.match(ui,/else h\+=casesView\(\)/);
});

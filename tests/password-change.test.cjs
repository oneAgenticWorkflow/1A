/* Zero-dependency regression checks for the mandatory password-change gate. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'web', 'src', 'main.js'), 'utf8');

test('no client-callable password acknowledgement RPC remains', () => {
  assert.doesNotMatch(source, /sb\.rpc\(['"]password_changed['"]\)/);
});

test('the password gate cannot be skipped with a changed parameter', () => {
  assert.match(source, /async function enter\(session\)/);
  assert.match(source, /if\(prof\.must_change\)\{mustChange\(session\);return\}/);
  assert.doesNotMatch(source, /must_change\s*&&\s*!changed/);
});

test('first-login updates Auth before checking server-backed profile state', () => {
  const authUpdate = source.indexOf('sb.auth.updateUser({password:a})');
  const profileRead = source.indexOf("sb.from('profiles').select('must_change')");
  const gateCheck = source.indexOf('if(p.data.must_change)');
  const proceed = source.indexOf('enter(session);', gateCheck);
  assert.ok(authUpdate > 0 && profileRead > authUpdate && gateCheck > profileRead && proceed > gateCheck);
});

test('first-login blocks when the password update or verification fails', () => {
  assert.match(source, /if\(u\.error\)\{err\(u\.error\.message\);return\}/);
  assert.match(source, /if\(p\.error\)\{err\('Password updated, but account verification failed:/);
  assert.match(source, /if\(p\.data\.must_change\)\{err\('Password updated, but verification is still pending/);
});

test('first-login requires matching passwords of at least eight characters', () => {
  assert.match(source, /if\(a\.length<8\)/);
  assert.match(source, /if\(a!==b\)/);
});

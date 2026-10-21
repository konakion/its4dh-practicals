const fs = require('node:fs'); const vm=require('node:vm'); const assert=require('node:assert/strict');
const sandbox={window:{},document:{currentScript:{src:'http://localhost/assets/learning.js'}},localStorage:{getItem(){return null}},URL,fetch(){return new Promise(()=>{})}};
vm.runInNewContext(fs.readFileSync('docs/assets/learning.js','utf8'),sandbox);
const check=sandbox.window.ITS4DH.accepts;
const steps=JSON.parse(fs.readFileSync('docs/assets/learning.json'));
for(const s of steps){
  if(s.kind==='report') { const r={schema:'its4dh-work-v1',checks:Object.fromEntries(['sources','review_copy','upload_errors','platform_errors','storage_errors','incident_structure'].map(k=>[k,true]))}; assert(check(s,JSON.stringify(r))); r.checks.sources=false;assert(!check(s,JSON.stringify(r))); }
  else {const answer=Array.isArray(s.answer)?s.answer.slice().reverse().join('\n'):s.kind==='path'?'/workspaces/another-repo'+s.answer+'/' :String(s.answer);assert(check(s,' '+answer+'\n'));}
  assert(!check(s,'wrong')); assert(!check(s,'')); assert(!check(s,'<script>alert(1)</script>'));
}
assert(!check(steps.find(s=>s.id==='logs'),'4 errors'));
console.log('PASS: all browser validators; whitespace/order/path variants; wrong and unsafe answers; failed file checks');

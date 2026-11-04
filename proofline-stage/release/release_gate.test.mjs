import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluate} from './release_gate.mjs';
const original=JSON.parse(readFileSync(new URL('./production-readiness.json',import.meta.url)));
const clone=()=>structuredClone(original);
test('verified synthetic work does not count as production',()=>{
 const r=evaluate(clone());assert.equal(r.decision,'NO_GO');assert.equal(r.liveGatesPassed,0);
 assert.equal(r.blocked.length,8);assert.equal(r.verifiedStaging,4);
});
test('production no-go holds all customer switches off',()=>{
 const r=evaluate(clone());assert.equal(r.protectiveState,true);
});
test('missing or duplicated release gate refused',()=>{
 let m=clone();m.launch_gates.pop();assert.throws(()=>evaluate(m),/incomplete/);
 m=clone();m.launch_gates[1].id=m.launch_gates[0].id;assert.throws(()=>evaluate(m),/duplicated/);
});
test('unknown verified status refused',()=>{
 const m=clone();m.launch_gates[0].status='passed_mock';assert.throws(()=>evaluate(m),/Unknown/);
});
test('blocked gate cannot claim release evidence',()=>{
 const m=clone();m.launch_gates[0].evidence_url='https://github.com/owner/repo/actions/runs/123';assert.throws(()=>evaluate(m),/Blocked/);
});
test('unproven production success refused',()=>{
 const m=clone();m.launch_gates[0].status='verified_production';assert.throws(()=>evaluate(m),/lacks evidence/);
});
test('synthetic evidence must remain distinctly scoped',()=>{
 const m=clone();m.staging_evidence[0].status='verified_production';assert.throws(()=>evaluate(m),/Staging provenance/);
});
test('approved checkbox with unresolved gates remains no-go',()=>{
 const m=clone();m.approval={status:'approved',approved_by:'reviewer',approved_at:'2026-11-03T00:00:00Z',protected_environment_review:'example'};
 assert.equal(evaluate(m).decision,'NO_GO');
});
test('unsafe premature opening is refused',()=>{
 const m=clone();m.customer_intake='enabled';assert.throws(()=>evaluate(m),/Unsafe activation/);
});
test('even fully evidenced record only permits independent approval validation',()=>{
 const m=clone();
 m.launch_gates.forEach(x=>{x.status='verified_production';x.evidence_url='https://github.com/org/repo/actions/runs/123';});
 m.approval={status:'approved',approved_by:'external-reviewer',approved_at:'2026-11-03T00:00:00Z',protected_environment_review:'protected Github environment'};
 const result=evaluate(m);
 assert.equal(result.decision,'READY_FOR_INDEPENDENT_APPROVAL_VALIDATION');
 assert.equal(m.production_activation,'disabled');
});

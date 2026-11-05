import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {run} from './rehearse-pilot-package.mjs';
test('three synthetic scenarios generate validated initial and retest files without allowing delivery',async()=>{
 const out=await mkdtemp(join(tmpdir(),'proofline-six-cases-'));
 try{
  const receipt=await run(out);
  assert.equal(receipt.runs.length,6);
  assert.equal(receipt.commercial_release,'NO_GO');
  assert.equal(receipt.real_entra_collection,false);
  assert.equal(receipt.independent_human_review,false);
  assert.equal(receipt.real_recipient_delivery,false);
  for(const x of receipt.runs){
   assert.equal(x.status,'SYNTHETIC_CONTRACT_PASS');
   assert.equal(x.artifacts,x.phase==='initial'?3:4);
   assert.ok(x.elapsed_ms>=0);
   const pdf=await readFile(join(out,x.scenario,x.phase,'assessment.pdf'));
   assert.ok(pdf.toString('latin1').startsWith('%PDF-1.4'));
   assert.ok(pdf.toString('latin1').includes('%%EOF'));
  }
  const initial=await readFile(join(out,'exception','initial','assessment.pdf'));
  const preserved=await readFile(join(out,'exception','retest','original-report-preserved.pdf'));
  assert.deepEqual(preserved,initial);
  const manifest=JSON.parse(await readFile(join(out,'exception','initial','manifest.json'),'utf8'));
  assert.equal(manifest.delivery_approved,false);
  assert.match(manifest.review.independence_receipt_id,/SIMULATED/);
 }finally{await rm(out,{recursive:true,force:true});}
});

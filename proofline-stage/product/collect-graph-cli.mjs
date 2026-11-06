// Opt-in operator CLI. Requires explicit signed-off scope JSON and ephemeral Graph bearer token.
// Does not authenticate interactively, save tokens, modify tenant objects, or transmit reports.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {collectAccessAssurance} from './graph-access-collector.mjs';
async function main(){
 const [scopePath,outputPath]=process.argv.slice(2);
 if(!scopePath||!outputPath)throw Error('Usage: node collect-graph-cli.mjs <approved-scope.json> <new-output.json>');
 if(process.env.PROOFLINE_ALLOW_LIVE_GRAPH!=='YES')throw Error('LIVE_GRAPH_NO_GO: explicit operator opt-in missing');
 const token=process.env.PROOFLINE_GRAPH_TOKEN;
 if(!token||token.length<40)throw Error('LIVE_GRAPH_NO_GO: short-lived delegated bearer token required');
 const scope=JSON.parse(readFileSync(resolve(scopePath),'utf8'));
 const transport=async url=>{
  const response=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
 };
 const result=await collectAccessAssurance(scope,transport);
 // Prevent overwriting earlier evidence; restricted local file permissions.
 writeFileSync(resolve(outputPath),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('PASS: collected scoped read-only observations; review status NOT_REVIEWED; evidence written to approved local path');
}
main().catch(e=>{console.error(String(e.message||e));process.exitCode=1});

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const CATALOG_URL=new URL('./access-assurance-catalog.json',import.meta.url);
export const REQUIRED_IDS=['offboarding-evidence-review','m365-access-assurance-assessment','continuous-access-assurance'];
export function validateCatalog(c){
 const errors=[];
 const require=(ok,msg)=>{if(!ok)errors.push(msg)};
 require(c?.schema_version===1,'schema version');
 require(c?.brand==='Proofline Assurance','brand');
 require(c?.product_family==='Access Assurance','product family');
 require(c?.publication_status==='PRELAUNCH','prelaunch status');
 for(const k of ['intake_enabled','billing_enabled','customer_data_collection_enabled','delivery_enabled'])
  require(c?.[k]===false,'activation lock: '+k);
 const ss=c?.services;
 require(Array.isArray(ss)&&ss.length===3,'exactly three offerings');
 if(!Array.isArray(ss))return errors;
 const ids=ss.map(s=>s.id);
 require(new Set(ids).size===3 && REQUIRED_IDS.every(id=>ids.includes(id)),'service IDs');
 for(const s of ss){
  require(['DESIGN_ONLY','DEVELOPMENT_TENANT_VALIDATION_PARTIAL'].includes(s.implementation_status),'status: '+s.id);
  require(s.price_status?.endsWith('NOT_FOR_SALE'),'price label: '+s.id);
  require(typeof s.delivery_gate==='string'&&s.delivery_gate.length>20,'delivery gate: '+s.id);
  if(s.id!=='offboarding-evidence-review'){
   require(s.implementation_status==='DESIGN_ONLY','new tier cannot claim implemented: '+s.id);
   require(s.price_status==='HYPOTHESIS_NOT_FOR_SALE','unvalidated price: '+s.id);
   require(s.scope_freeze_required===true || s.type==='recurring','scope control: '+s.id);
   require(Array.isArray(s.preflight)&&s.preflight.length>=7,'preflight: '+s.id);
   require(Array.isArray(s.mandatory_exclusions)&&s.mandatory_exclusions.length>=4,'exclusions: '+s.id);
  }
 }
 require(ss.find(s=>s.id==='offboarding-evidence-review')?.price_usd===1950,'defined offboarding price');
 const assessment=ss.find(s=>s.id==='m365-access-assurance-assessment');
 require(assessment?.price_min_usd===3500&&assessment?.price_max_usd===5000,'assessment proposal price range');
 const continuous=ss.find(s=>s.id==='continuous-access-assurance');
 require(continuous?.price_min_usd===299&&continuous?.price_max_usd===799&&continuous?.price_period==='month','subscription proposal price range');
 return errors;
}
export const productCatalog=JSON.parse(readFileSync(CATALOG_URL,'utf8'));
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const errors=validateCatalog(productCatalog);
 if(errors.length){console.error('CATALOG_NO_GO:',errors.join('; '));process.exitCode=1;}
 else console.log('PASS: three planned Proofline offers, price hypotheses, scoped exclusions and all commercial activation locks preserved');
}

// Pure admission rules used by BOTH staging signup and live Auth acceptance.
// A role-prefixed dedicated mailbox is supported for legacy test domains.
// Alternatively, owner-controlled plus aliases require the exact base address
// in PROOFLINE_OWNER_EMAIL. No customer names, domains or API keys are stored here.
const ADDRESS=/^[a-z0-9][a-z0-9._+-]*@[a-z0-9.-]+\.[a-z]{2,}$/i;
const PLUS=/^([a-z0-9][a-z0-9._-]*)\+proofline-(collector|reviewer)-test@([a-z0-9.-]+\.[a-z]{2,})$/i;
export function validateTestMailboxes(env){
 const collector=env?.PROOFLINE_COLLECTOR_EMAIL?.trim().toLowerCase();
 const reviewer=env?.PROOFLINE_REVIEWER_EMAIL?.trim().toLowerCase();
 if(typeof collector!=='string'||typeof reviewer!=='string'||!ADDRESS.test(collector)||!ADDRESS.test(reviewer))
   throw Error('Two dedicated test mailboxes required');
 if(collector===reviewer)throw Error('Distinct collector/reviewer mailboxes required');
 const emails=[['collector',collector],['reviewer',reviewer]];
 const legacy=emails.every(([role,email])=>
   new RegExp('^proofline-'+role+'-test(?:\\+[a-z0-9_-]+)?@[a-z0-9.-]+\\.[a-z]{2,}$','i').test(email));
 if(legacy)return {collector,reviewer,mode:'dedicated'};
 const matches=emails.map(([,email])=>PLUS.exec(email));
 if(matches.every(Boolean)){
   if(matches[0][2]!=='collector'||matches[1][2]!=='reviewer')
     throw Error('Test mailbox role tag mismatch');
   const owners=matches.map(x=>x[1]+'@'+x[3]);
   if(owners[0]!==owners[1])throw Error('Both test aliases must belong to same owner mailbox');
   const owner=env.PROOFLINE_OWNER_EMAIL?.trim().toLowerCase();
   if(!owner||owner!==owners[0])throw Error('Owner mailbox verification input required for plus aliases');
   return {collector,reviewer,mode:'owner-plus-alias'};
 }
 throw Error('Refusing nondedicated test account or mismatched alias');
}

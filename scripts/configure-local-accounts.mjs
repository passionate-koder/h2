import {randomBytes,scryptSync} from 'node:crypto';import fs from 'node:fs/promises';
const entries={HC_SESSION_SECRET:randomBytes(48).toString('hex')};
for(const[variable,source]of [['HC_STUDENT_PASSWORD_HASH','HC_STUDENT_PASSWORD'],['HC_PRO_PASSWORD_HASH','HC_PRO_PASSWORD']]){const password=process.env[source];if(!password)throw new Error('Missing password environment variable');const salt=randomBytes(24).toString('hex');entries[variable]=salt+':'+scryptSync(password,salt,64).toString('hex');}
let existing='';try{existing=await fs.readFile('.env.local','utf8');}catch{}for(const[key,value]of Object.entries(entries)){const expression=new RegExp('^'+key+'=.*$','m');existing=expression.test(existing)?existing.replace(expression,key+'='+value):existing+'\n'+key+'='+value;}
await fs.writeFile('.env.local',existing.trim()+'\n');console.log('Configured local password hashes and session signing key. No plaintext passwords saved.');

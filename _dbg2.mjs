import fs from 'fs';
import admin from 'firebase-admin';
const env={};
for(const line of fs.readFileSync('.env.local','utf8').split('\n')){
  const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(!m)continue;
  let v=m[2].trim(); if(v.startsWith('"')&&v.endsWith('"'))v=v.slice(1,-1); env[m[1]]=v;
}
const c=admin.credential.cert({projectId:env.FIREBASE_PROJECT_ID,clientEmail:env.FIREBASE_CLIENT_EMAIL,privateKey:env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,"\n")});
try{const t=await c.getAccessToken();console.log("TOKEN OK len",t.access_token.length);}catch(e){console.log("TOKEN ERR:",e.message);}
process.exit(0);

import fs from 'fs';
const env={};
for(const line of fs.readFileSync('.env.local','utf8').split('\n')){
  const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(!m)continue;
  let v=m[2].trim(); if(v.startsWith('"')&&v.endsWith('"'))v=v.slice(1,-1); env[m[1]]=v;
}
console.log("projectId:",env.FIREBASE_PROJECT_ID);
console.log("clientEmail:",env.FIREBASE_CLIENT_EMAIL);
const pk=env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n")||"";
console.log("pk starts:",JSON.stringify(pk.slice(0,30)));
console.log("pk ends:",JSON.stringify(pk.slice(-30)));
console.log("pk newlines:",(pk.match(/\n/g)||[]).length);

import fs from 'fs';
import admin from 'firebase-admin';
const env={};
for(const line of fs.readFileSync('.env.local','utf8').split('\n')){
  const m=line.match(/^([A-Z0-9_]+)=(.*)$/s); if(!m)continue;
  let v=m[2].trim(); if(v.startsWith('"')&&v.endsWith('"'))v=v.slice(1,-1); env[m[1]]=v;
}
admin.initializeApp({credential: admin.credential.cert({
  projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n"),
})});
const email="eran-sh@mei-rg.co.il";
try{
  const u=await admin.auth().getUserByEmail(email);
  console.log("AUTH USER FOUND  uid:",u.uid,"disabled:",u.disabled,"lastSignIn:",u.metadata.lastSignInTime,"providers:",u.providerData.map(p=>p.providerId).join(","));
  const d=await admin.firestore().collection("users").doc(u.uid).get();
  console.log("FIRESTORE users doc exists:",d.exists);
  if(d.exists) console.log("doc data:",JSON.stringify(d.data()));
}catch(e){console.log("AUTH ERROR:",e.code||e.message);}
process.exit(0);

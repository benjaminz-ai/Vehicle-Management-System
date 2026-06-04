// Cross-reference: every login account (Auth) -> its Firestore users/{uid} profile -> tenant
const admin = require("firebase-admin");
const key = require("../vehicle-management-syste-3b7df-firebase-adminsdk-fbsvc-d91377718c.json");
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();
const FLAG = (process.argv[2] || "benntzy@gmail.com").toLowerCase();

(async () => {
  // tenants: id -> name
  const tenants = {};
  (await db.collection("tenants").get()).forEach(t => tenants[t.id] = t.data().name || t.id);

  // users collection: uid -> data
  const users = {};
  (await db.collection("users").get()).forEach(d => users[d.id] = d.data());

  console.log("\n===== כל חשבונות ההתחברות (Firebase Auth) =====");
  const res = await admin.auth().listUsers(1000);
  res.users.forEach(u => {
    const prof = users[u.uid] || null;
    const tName = prof && prof.tenantId ? (tenants[prof.tenantId] || prof.tenantId) : "—";
    const flag = (u.email || "").toLowerCase() === FLAG ? "   <<<<< זה החשבון שבדקת" : "";
    console.log(`\n• ${u.email || "(ללא מייל)"}  ${flag}`);
    console.log(`   uid: ${u.uid}  | disabled: ${u.disabled} | created: ${u.metadata.creationTime}`);
    if (prof) console.log(`   פרופיל Firestore: role=${prof.role || "?"} | tenant=${tName} | email-במסמך=${prof.email || "(אין)"}`);
    else console.log(`   פרופיל Firestore: אין מסמך users/${u.uid}`);
  });

  console.log(`\nסה"כ ${res.users.length} חשבונות התחברות, ${Object.keys(users).length} מסמכי users, ${Object.keys(tenants).length} טננטים.`);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });

// Disables the leftover benntzy login and removes its stale Firestore profile.
// Reversible: re-enable later in Firebase Console > Authentication if needed.
const admin = require("firebase-admin");
const key = require("../vehicle-management-syste-3b7df-firebase-adminsdk-fbsvc-d91377718c.json");
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();
const UID = "cQ82OEGCZvS1Z1qUtGRCAQkzY362";
const EXPECT = "benntzy@gmail.com";

(async () => {
  const u = await admin.auth().getUser(UID);
  if ((u.email || "").toLowerCase() !== EXPECT) {
    console.log(`ABORT: uid ${UID} email is "${u.email}", expected ${EXPECT}. Nothing changed.`);
    process.exit(1);
  }
  await admin.auth().updateUser(UID, { disabled: true });
  console.log(`✓ Disabled login: ${EXPECT}`);
  const ref = db.doc("users/" + UID);
  if ((await ref.get()).exists) { await ref.delete(); console.log("✓ Deleted Firestore profile users/" + UID); }
  else console.log("• No users profile to delete.");
  console.log("Done — benntzy can no longer access מי רמת גן. eran-sh is unaffected.");
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });

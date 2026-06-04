// Permanently removes the benntzy ghost: its Auth login AND its Firestore profile.
// This frees benntzy@gmail.com so it can be assigned cleanly later.
const admin = require("firebase-admin");
const key = require("../vehicle-management-syste-3b7df-firebase-adminsdk-fbsvc-d91377718c.json");
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();
const UID = "cQ82OEGCZvS1Z1qUtGRCAQkzY362";
const EXPECT = "benntzy@gmail.com";

(async () => {
  const u = await admin.auth().getUser(UID).catch(() => null);
  if (u && (u.email || "").toLowerCase() !== EXPECT) {
    console.log(`ABORT: uid ${UID} email is "${u.email}", expected ${EXPECT}. Nothing changed.`);
    process.exit(1);
  }
  const ref = db.doc("users/" + UID);
  if ((await ref.get()).exists) { await ref.delete(); console.log("✓ Deleted Firestore profile users/" + UID); }
  else console.log("• No Firestore profile to delete.");
  if (u) { await admin.auth().deleteUser(UID); console.log("✓ Deleted Auth account " + EXPECT); }
  else console.log("• Auth account already gone.");
  console.log("Done — benntzy@gmail.com is now free, and the ghost is fully removed from פתח תקווה.");
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });

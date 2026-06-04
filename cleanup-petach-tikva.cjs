// Keep פתח תקווה with admin benntzy@gmail.com; remove the empty binyamin-z duplicate.
// Safety-checked: aborts if ids/emails don't match or if the deleted tenant has data.
const admin = require("firebase-admin");
const key = require("../vehicle-management-syste-3b7df-firebase-adminsdk-fbsvc-d91377718c.json");
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const KEEP_TENANT   = "Vy3HWvrsyvnqoMEqqz58";          // פתח תקווה (benntzy) — keep
const DEL_TENANT    = "dlFPpVrQVOr6rctmZ0Mq";          // פתח תקווה (binyamin-z) — delete
const BENNTZY_UID   = "cQ82OEGCZvS1Z1qUtGRCAQkzY362";
const BINYAMINZ_UID = "eAGekdYDbddYKG8lxEySUC1DdrQ2";

(async () => {
  // ---- safety checks ----
  const ben = await admin.auth().getUser(BENNTZY_UID).catch(() => null);
  if (!ben || (ben.email || "").toLowerCase() !== "benntzy@gmail.com")
    return console.log("ABORT: benntzy uid/email mismatch:", ben && ben.email), process.exit(1);
  const keepDoc = await db.doc("tenants/" + KEEP_TENANT).get();
  const delDoc  = await db.doc("tenants/" + DEL_TENANT).get();
  if (!keepDoc.exists || !delDoc.exists) return console.log("ABORT: a tenant doc is missing"), process.exit(1);
  if ((delDoc.data().adminEmail || "").toLowerCase() !== "binyamin-z@mei-rg.co.il")
    return console.log("ABORT: delete-tenant adminEmail is", delDoc.data().adminEmail), process.exit(1);
  const dv = (await db.collection(`tenants/${DEL_TENANT}/vehicles`).get()).size;
  const dd = (await db.collection(`tenants/${DEL_TENANT}/drivers`).get()).size;
  if (dv > 0 || dd > 0) return console.log(`ABORT: delete-tenant not empty (vehicles=${dv}, drivers=${dd})`), process.exit(1);

  // ---- 1) re-enable benntzy login ----
  await admin.auth().updateUser(BENNTZY_UID, { disabled: false });
  console.log("✓ Re-enabled benntzy@gmail.com login");

  // ---- 2) make sure benntzy's profile points to the kept פתח תקווה ----
  await db.doc("users/" + BENNTZY_UID).set(
    { tenantId: KEEP_TENANT, role: "tenant_admin", email: "benntzy@gmail.com" }, { merge: true });
  console.log("✓ benntzy profile -> פתח תקווה (" + KEEP_TENANT + ")");

  // ---- 3) delete the duplicate tenant (with all seeded subcollections) ----
  await db.recursiveDelete(db.doc("tenants/" + DEL_TENANT));
  console.log("✓ Deleted duplicate tenant פתח תקווה (" + DEL_TENANT + ")");

  // ---- 4) delete the duplicate's admin profile ----
  if ((await db.doc("users/" + BINYAMINZ_UID).get()).exists) {
    await db.doc("users/" + BINYAMINZ_UID).delete();
    console.log("✓ Deleted users/" + BINYAMINZ_UID + " (binyamin-z profile)");
  }

  // ---- 5) disable the now-orphaned binyamin-z login (reversible) ----
  const bz = await admin.auth().getUser(BINYAMINZ_UID).catch(() => null);
  if (bz) { await admin.auth().updateUser(BINYAMINZ_UID, { disabled: true });
    console.log("✓ Disabled orphan login binyamin-z@mei-rg.co.il (reversible)"); }

  console.log("\nDone — פתח תקווה now exists once, admin = benntzy@gmail.com (active).");
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });

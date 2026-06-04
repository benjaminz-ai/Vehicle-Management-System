// Lists every tenant with its id, admin email, status, and data counts —
// so we can tell the real "פתח תקווה" from an empty duplicate before deleting anything.
const admin = require("firebase-admin");
const key = require("../vehicle-management-syste-3b7df-firebase-adminsdk-fbsvc-d91377718c.json");
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

(async () => {
  const tenants = await db.collection("tenants").get();
  for (const t of tenants.docs) {
    const d = t.data();
    const vehicles = (await db.collection(`tenants/${t.id}/vehicles`).get()).size;
    const drivers  = (await db.collection(`tenants/${t.id}/drivers`).get()).size;
    const created  = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString().slice(0,10) : (d.createdAt || "-");
    console.log(`\n• ${d.name}   (id: ${t.id})`);
    console.log(`   adminEmail = ${d.adminEmail || "-"}`);
    console.log(`   isActive = ${d.isActive} | created = ${created}`);
    console.log(`   vehicles = ${vehicles} | drivers = ${drivers}`);
  }
  console.log(`\nTotal ${tenants.size} tenants.`);
  process.exit(0);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });

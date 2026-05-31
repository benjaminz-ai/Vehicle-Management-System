import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const db = admin.firestore();
    const auth = admin.auth();

    // 1. Get Firebase Auth user
    const authUser = await auth.getUserByEmail(email);
    const uid = authUser.uid;

    // 2. Check if users doc already exists
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      return NextResponse.json({ status: "already_exists", uid, data: userDoc.data() });
    }

    // 3. Find matching tenant by adminEmail
    const tenantsSnap = await db.collection("tenants")
      .where("adminEmail", "==", email)
      .limit(1)
      .get();

    let tenantId: string | null = null;
    if (!tenantsSnap.empty) {
      tenantId = tenantsSnap.docs[0].id;
    }

    // 4. Create the users doc
    const docData = {
      email,
      role: "tenant_admin",
      firstName: "",
      lastName: "",
      ...(tenantId ? { tenantId } : {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(uid).set(docData);

    return NextResponse.json({ status: "created", uid, tenantId, data: docData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unexpected error";
    console.error("fix-user-doc error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

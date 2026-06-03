import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (singleton)
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
    const { uid, newEmail } = await req.json();
    if (!uid || !newEmail) {
      return NextResponse.json({ error: "נדרש uid ומייל חדש" }, { status: 400 });
    }

    // Safety: never change a super_admin login through this route.
    const profile = await admin.firestore().doc(`users/${uid}`).get();
    if (profile.exists && profile.data()?.role === "super_admin") {
      return NextResponse.json({ error: "לא ניתן לשנות מייל של אדמין-על" }, { status: 403 });
    }

    // Update the actual Firebase Auth login in place (same uid, same password).
    // The old email immediately stops working; the new one becomes the login.
    await admin.auth().updateUser(uid, { email: newEmail });
    return NextResponse.json({ ok: true, uid });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    let message = err instanceof Error ? err.message : "שגיאה בלתי צפויה";
    if (code === "auth/email-already-exists") message = "המייל כבר משויך לחשבון התחברות אחר";
    if (code === "auth/invalid-email") message = "כתובת מייל לא תקינה";
    if (code === "auth/user-not-found") message = "לא נמצא חשבון התחברות לעדכון";
    console.error("update-user-email error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

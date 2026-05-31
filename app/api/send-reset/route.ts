import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

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
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "נדרש אימייל" }, { status: 400 });
    }

    // Verify user exists in Firebase Auth
    try {
      await admin.auth().getUserByEmail(email);
    } catch {
      return NextResponse.json(
        { error: "משתמש לא רשום" },
        { status: 404 }
      );
    }

    // Get service account access token directly (bypasses SDK wrapper that has internal assertion issues)
    const credential = admin.app().options.credential as admin.credential.Credential;
    const { access_token } = await credential.getAccessToken();

    // Call Firebase Identity Toolkit REST API directly with returnOobLink=true
    const oobRes = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email,
          returnOobLink: true,
        }),
      }
    );

    const oobData = await oobRes.json();
    if (!oobRes.ok || !oobData.oobLink) {
      console.error("oobCode API error:", JSON.stringify(oobData));
      throw new Error(oobData.error?.message ?? "שגיאה בייצור קישור איפוס");
    }

    // Extract oobCode from Firebase link and build our own branded reset URL
    const firebaseLink = oobData.oobLink as string;
    const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
    if (!oobCode) throw new Error("לא התקבל קוד איפוס");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const resetLink = `${appUrl}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;

    // Send via Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"ניהול צי רכבים" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "איפוס סיסמה – ניהול צי רכבים",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #032147;">איפוס סיסמה</h2>
          <p>קיבלת הודעה זו מכיוון שהמנהל ביקש לאפס את הסיסמה שלך במערכת ניהול צי רכבים.</p>
          <p>לחץ על הכפתור הבא כדי לאפס את הסיסמה שלך:</p>
          <a href="${resetLink}"
             style="display:inline-block; background-color:#032147; color:white; padding:12px 24px;
                    text-decoration:none; border-radius:6px; margin:16px 0;">
            אפס סיסמה
          </a>
          <p style="color:#666; font-size:12px;">הקישור תקף לשעה אחת בלבד.</p>
          <p style="color:#666; font-size:12px;">לאחר איפוס הסיסמה, חזור לאתר המערכת והתחבר עם הסיסמה החדשה.</p>
          <p style="color:#666; font-size:12px;">אם לא ביקשת איפוס סיסמה, התעלם מהודעה זו.</p>
          <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
          <p style="color:#999; font-size:11px;">מערכת ניהול צי רכבים</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "שגיאה בלתי צפויה";
    console.error("send-reset error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

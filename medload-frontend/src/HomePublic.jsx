import React from "react";
import { startLogin, isLoggedIn, getUserEmail } from "./auth";


export default function HomePublic() {

  const loggedIn = isLoggedIn();
  const email = getUserEmail();

  const styles = {
    page: {
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif",
      background:
        "radial-gradient(1000px 500px at 20% 10%, rgba(59,130,246,0.25), transparent 60%), linear-gradient(180deg, #0b1220 0%, #070b14 100%)",
      color: "#eaf2ff",
      direction: "rtl",
    },
    container: {
      maxWidth: 1000,
      margin: "0 auto",
      padding: "40px 20px 90px",
    },

    /* Top bar */
    topBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 70,
    },
    brand: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    logo: {
      width: 46,
      height: 46,
      borderRadius: 14,
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(135deg, #60a5fa, #34d399)",
      color: "#07101f",
      fontWeight: 900,
    },
    brandText: {
      fontWeight: 800,
      fontSize: 18,
    },
    loginBtn: {
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(255,255,255,0.06)",
      color: "#eaf2ff",
      padding: "10px 18px",
      borderRadius: 14,
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      transition: "background 0.25s ease",
    },

    /* Hero */
    hero: {
      maxWidth: 720,
      marginBottom: 60,
    },
    h1: {
      fontSize: 44,
      lineHeight: 1.15,
      marginBottom: 22,
    },
    subtitle: {
      fontSize: 17,
      lineHeight: 1.85,
      color: "rgba(234,242,255,0.85)",
      marginBottom: 36,
    },
    primaryBtn: {
      border: "none",
      padding: "14px 28px",
      borderRadius: 18,
      fontSize: 15,
      fontWeight: 800,
      cursor: "pointer",
      background: "linear-gradient(135deg, #60a5fa, #34d399)",
      color: "#07101f",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    },
    note: {
      marginTop: 16,
      fontSize: 13,
      color: "rgba(234,242,255,0.65)",
    },

    /* Benefits */
    benefits: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 18,
      maxWidth: 900,
    },
    benefitCard: {
      padding: "18px 20px",
      borderRadius: 18,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.14)",
    },
    benefitTitle: {
      fontWeight: 800,
      marginBottom: 6,
      fontSize: 14.5,
    },
    benefitText: {
      fontSize: 13.5,
      lineHeight: 1.7,
      color: "rgba(234,242,255,0.78)",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <div style={styles.brand}>
            <div style={styles.logo}>ML</div>
            <div style={styles.brandText}>MedLoad</div>
          </div>

        </div>

        {/* Hero */}
        <div style={styles.hero}>
          <h1 style={styles.h1}>
            יודעים מראש מתי המרפאה עמוסה
            <br />
            ומתי הכי כדאי להגיע
          </h1>

          <p style={styles.subtitle}>
            <b>MedLoad</b> מציגה עומסים ותחזיות במרפאות ובסניפים,
            על בסיס נתונים תפעוליים והדמיות,
            כדי לאפשר לך לבחור את המקום והזמן
            עם זמן ההמתנה הקצר ביותר.
          </p>

          <button
            style={styles.primaryBtn}
            onClick={startLogin}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 14px 40px rgba(0,0,0,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(0,0,0,0.35)";
            }}
          >
            {loggedIn ? "כניסה לדאשבורד" : "הרשמה / התחברות למערכת"}
          </button>

          <div style={styles.note}>
            {loggedIn
              ? <>הינך מחובר/ת{email ? <> כ־ <span style={{ direction: "ltr" }}>{email}</span></> : ""} — ניתן להיכנס לדאשבורד</>
              : "לצפייה בעומסים, גרפים ותחזיות – יש להתחבר למערכת"}
          </div>


        </div>

        {/* Benefits */}
        <div style={styles.benefits}>
          <div style={styles.benefitCard}>
            <div style={styles.benefitTitle}>⏱️ פחות זמן המתנה</div>
            <div style={styles.benefitText}>
              השוואה ברורה בין סניפים כדי לבחור איפה ההמתנה צפויה להיות קצרה יותר.
            </div>
          </div>

          <div style={styles.benefitCard}>
            <div style={styles.benefitTitle}>📊 החלטה מבוססת נתונים</div>
            <div style={styles.benefitText}>
              עומסים נוכחיים לצד תחזיות לשעות הקרובות ודפוסים יומיים.
            </div>
          </div>

          <div style={styles.benefitCard}>
            <div style={styles.benefitTitle}>🧠 פחות ניחושים</div>
            <div style={styles.benefitText}>
              תמונת מצב אחידה וברורה- עוד לפני שיוצאים מהבית.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { signIn } from "aws-amplify/auth";

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
};
const card = {
  width: 420, maxWidth: "92vw", background: "white", borderRadius: 16,
  padding: 18, fontFamily: "Arial", boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

export default function AdminLoginModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await signIn({ username: email, password });
      onSuccess?.();
    } catch (e2) {
      setErr(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={card} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>ניהול – התחברות</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          <button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>

        {err ? <div style={{ marginTop: 12, color: "crimson" }}>{err}</div> : null}
        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          רק משתמש בקבוצת <b>Admins</b> יכול לבצע פעולות ניהול.
        </div>
      </div>
    </div>
  );
}

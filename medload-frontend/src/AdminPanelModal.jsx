import React, { useState } from "react";
import { signOut } from "aws-amplify/auth";
import { setClinicActive } from "./adminApi";

const overlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
};
const card = {
    width: 520, maxWidth: "94vw", background: "white", borderRadius: 16,
    padding: 18, fontFamily: "Arial", boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

export default function AdminPanelModal({ onClose, onUpdated }) {
    const [clinicId, setClinicId] = useState("CLINIC_1");
    const [isActive, setIsActive] = useState(true);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    async function update(e) {
        e.preventDefault();
        setMsg("");
        setLoading(true);
        try {
            const res = await setClinicActive(clinicId, isActive);
            setMsg(`✅ עודכן בהצלחה. IsActive=${res?.clinic?.IsActive ?? isActive}`);
             onUpdated?.();
        } catch (e2) {
            setMsg(`❌ ${e2.message}`);
        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        await signOut();
        onClose?.();
    }

    return (
        <div style={overlay} onMouseDown={onClose}>
            <div style={card} onMouseDown={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>ניהול מרפאות</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={logout}>Sign out</button>
                        <button onClick={onClose}>Close</button>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: 10,
                        marginBottom: 14,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(0,0,0,0.05)",
                        fontSize: 13,
                        lineHeight: 1.5,
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                    }}
                >
                    <span
                        style={{
                            fontSize: 18,
                            lineHeight: "18px",
                            marginTop: 2,
                            opacity: 0.8,
                        }}
                        aria-hidden
                    >
                        ℹ️
                    </span>

                    <div>
                        במסך זה ניתן לנהל את זמינות המרפאות במערכת.
                        <br />
                        אדמין יכול <b>להפעיל</b> או <b>להשבית</b> מרפאה לפי <code>ClinicId</code>.
                        <br />
                        מרפאה מושבתת לא תופיע למשתמשים הציבוריים ולא תיכלל בחישובי עומס.
                    </div>
                </div>


                <form onSubmit={update} style={{ display: "grid", gap: 12, marginTop: 14 }}>
                    <label>
                        ClinicId:
                        <input value={clinicId} onChange={(e) => setClinicId(e.target.value)} />
                    </label>

                    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                        פעיל (IsActive)
                    </label>

                    <button disabled={loading}>{loading ? "Updating..." : "Update"}</button>
                </form>

                {msg ? <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</div> : null}

                <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                    שינויים במצב מרפאה נכנסים לתוקף מיידית.
                    ניהול זמין למשתמשים בעלי הרשאת Admin בלבד.        </div>
            </div>
        </div>
    );
}

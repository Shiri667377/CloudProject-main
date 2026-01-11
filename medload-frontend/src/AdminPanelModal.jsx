import React, { useEffect, useMemo, useState } from "react";
import { setClinicActive, getAllClinicsAdmin } from "./adminApi";

const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
};
const card = {
    width: 520,
    maxWidth: "94vw",
    background: "white",
    borderRadius: 16,
    padding: 18,
    fontFamily: "Arial",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

export default function AdminPanelModal({ onClose, onUpdated }) {
    const [clinicId, setClinicId] = useState("CLINIC_1");
    const [isActive, setIsActive] = useState(true);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [clinics, setClinics] = useState([]);
    const [search, setSearch] = useState("");
    const [loadingClinics, setLoadingClinics] = useState(false);

    async function refreshClinics({ keepMsg = true } = {}) {
        if (!keepMsg) setMsg("");
        setLoadingClinics(true);
        try {
            const data = await getAllClinicsAdmin();
            setClinics(data?.items || []);
        } catch (err) {
            setMsg(`❌ ${err.message}`);
        } finally {
            setLoadingClinics(false);
        }
    }

    async function update(e) {
        e.preventDefault();
        setMsg("");
        setLoading(true);

        try {
            const res = await setClinicActive(clinicId, isActive);

            const newVal = res?.clinic?.IsActive ?? isActive;
            setMsg(`✅ המרפאה ${clinicId} ${newVal ? "הופעלה" : "הושבתה"} בהצלחה`);

            onUpdated?.();

            // רענון הרשימה בלי למחוק את הודעת ההצלחה
            await refreshClinics({ keepMsg: true });
        } catch (e2) {
            setMsg(`❌ ${e2.message}`);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refreshClinics({ keepMsg: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredClinics = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return clinics;

        return clinics.filter((c) => {
            const id = String(c?.ClinicId || "").toLowerCase();
            const name = String(c?.ClinicName || "").toLowerCase();
            const city = String(c?.City || "").toLowerCase();
            return id.includes(q) || name.includes(q) || city.includes(q);
        });
    }, [clinics, search]);

    return (
        <div style={overlay} onMouseDown={onClose}>
            <div style={card} onMouseDown={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>ניהול מרפאות</h3>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>גישה למנהלים בלבד</div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => refreshClinics({ keepMsg: true })}
                            disabled={loadingClinics}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 12,
                                border: "1px solid rgba(99,102,241,0.35)",
                                background:
                                    "linear-gradient(180deg, rgba(99,102,241,0.95) 0%, rgba(79,70,229,0.95) 100%)",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 12,
                                fontFamily: "Arial, system-ui, -apple-system, Roboto, sans-serif",
                                boxShadow: "0 8px 20px rgba(79,70,229,0.25)",
                                cursor: loadingClinics ? "not-allowed" : "pointer",
                                opacity: loadingClinics ? 0.75 : 1,
                            }}
                        >
                            {loadingClinics ? "מרענן..." : "רענון"}
                        </button>

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
                    <span style={{ fontSize: 18, lineHeight: "18px", marginTop: 2, opacity: 0.8 }} aria-hidden>
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

                {/* חיפוש ובחירת מרפאה */}
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        חיפוש מרפאה:
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ClinicId / שם / עיר"
                            style={{
                                padding: 10,
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.18)",
                            }}
                        />
                    </label>

                    {search.trim().length < 2 ? (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>התחילי להקליד (לפחות 2 תווים) כדי לראות תוצאות.</div>
                    ) : (
                        <div
                            style={{
                                border: "1px solid rgba(0,0,0,0.12)",
                                borderRadius: 12,
                                maxHeight: 200,
                                overflowY: "auto",
                            }}
                        >
                            {loadingClinics ? (
                                <div style={{ padding: 10, fontSize: 13 }}>טוען מרפאות…</div>
                            ) : filteredClinics.length === 0 ? (
                                <div style={{ padding: 10, fontSize: 13, opacity: 0.7 }}>אין תוצאות</div>
                            ) : (
                                filteredClinics.map((c) => (
                                    <button
                                        type="button"
                                        key={c.ClinicId}
                                        onClick={() => {
                                            setClinicId(c.ClinicId);
                                            setIsActive(!!c.IsActive);
                                            setMsg("");     // אפשר להשאיר, או למחוק אם את רוצה לשמר הודעות
                                            setSearch("");
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "none",
                                            borderTop: "1px solid rgba(0,0,0,0.08)",
                                            background: clinicId === c.ClinicId ? "rgba(59,130,246,0.12)" : "white",
                                            cursor: "pointer",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            fontFamily: "Arial",
                                        }}
                                    >
                                        <span>
                                            <b>{c.ClinicId}</b>
                                            {c.ClinicName ? ` — ${c.ClinicName}` : ""}
                                        </span>

                                        <span style={{ fontSize: 12, opacity: 0.7 }}>{c.IsActive ? "פעילה" : "לא פעילה"}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <form onSubmit={update} style={{ display: "grid", gap: 12, marginTop: 14 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        המרפאה שנבחרה (ID):
                        <input
                            value={clinicId}
                            readOnly
                            style={{
                                background: "#F3F4F6",
                                color: "#111827",
                                cursor: "not-allowed",
                            }}
                        />
                    </label>

                    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                        פעיל (IsActive)
                    </label>

                    <button disabled={loading}>{loading ? "Updating..." : "Update"}</button>
                </form>

                {msg ? <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</div> : null}

                <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                    שינויים במצב מרפאה נכנסים לתוקף מיידית. ניהול זמין למשתמשים בעלי הרשאת Admin בלבד.
                </div>
            </div>
        </div>
    );
}

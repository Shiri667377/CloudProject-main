import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleAuthCallback, isLoggedIn, startLogin } from "./auth";

export default function Callback() {
    const nav = useNavigate();
    const ran = useRef(false);
    const [msg, setMsg] = useState("...מתחבר");

    useEffect(() => {

        
        if (ran.current) return;          
        ran.current = true;

        if (isLoggedIn()) {
            nav("/dashboard", { replace: true });
            return;
        }

        handleAuthCallback()
            .then((ok) => {
                if (ok) nav("/dashboard", { replace: true });
                else {
                    setMsg("לא התקבל code. נסי להתחבר שוב.");
                    setTimeout(() => nav("/", { replace: true }), 1000);
                }
            })
            .catch((e) => {
                const em = String(e?.message || "");

                if (em.includes("Missing PKCE verifier")) {
                    startLogin(); 
                    return;
                }

                setMsg("שגיאה: " + em);
                setTimeout(() => nav("/", { replace: true }), 1500);
            });
    }, [nav]);

    return <div style={{ padding: 24, fontFamily: "Arial" }}>{msg}</div>;
}

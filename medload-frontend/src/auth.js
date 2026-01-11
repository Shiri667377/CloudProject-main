import { AUTH } from "./authConfig";

// ----- PKCE helpers -----
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  return await crypto.subtle.digest("SHA-256", data);
}

function randomString(len = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// 1) התחברות/הרשמה — עם PKCE
export async function startLogin() {
  const verifier = randomString(64);
  sessionStorage.setItem("pkce_verifier", verifier);

  const challenge = base64UrlEncode(await sha256(verifier));

  const url =
    `https://${AUTH.domain}/oauth2/authorize` +
    `?client_id=${encodeURIComponent(AUTH.clientId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(AUTH.scope)}` +
    `&redirect_uri=${encodeURIComponent(AUTH.redirectUri)}` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256`;

  window.location.href = url;
}

// 2) Callback — החלפת code לטוקנים (עם code_verifier)
export async function handleAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return false;

  const verifier = sessionStorage.getItem("pkce_verifier");
  if (!verifier) throw new Error("Missing PKCE verifier. Please login again.");

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", AUTH.clientId);
  body.set("code", code);
  body.set("redirect_uri", AUTH.redirectUri);
  body.set("code_verifier", verifier);

  const res = await fetch(`https://${AUTH.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(txt);

  const data = JSON.parse(txt);
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("id_token", data.id_token);

  // ניקוי כדי שלא יהיו שגיאות בהתחברות הבאה
  sessionStorage.removeItem("pkce_verifier");

  window.history.replaceState({}, document.title, "/dashboard");


  return true;
}

export function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}

export function logoutLocal() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("id_token");
}


export function startLogout() {
  logoutLocal();
  const url =
    `https://${AUTH.domain}/logout` +
    `?client_id=${encodeURIComponent(AUTH.clientId)}` +
    `&logout_uri=${encodeURIComponent(window.location.origin + "/")}`;
  window.location.href = url;
}



function parseJwt(token) {
  const payload = token.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent(escape(json)));
}

export function isAdmin() {
  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) return false;

  const claims = parseJwt(accessToken);
  const groups = claims["cognito:groups"] || [];

  return Array.isArray(groups)
    ? groups.includes("Admins")
    : String(groups)
        .split(",")
        .map((s) => s.trim())
        .includes("Admins");
}

export function getUserEmail() {
  const idToken = localStorage.getItem("id_token");
  if (!idToken) return null;
  const claims = parseJwt(idToken);
  return claims.email || null;
}

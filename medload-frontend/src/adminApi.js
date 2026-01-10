import { fetchAuthSession } from "aws-amplify/auth";

export const API_BASE = "https://52x01kpdfk.execute-api.us-east-1.amazonaws.com/prod";

async function getIdToken() {
  const s = await fetchAuthSession();
  const t = s?.tokens?.idToken?.toString();
  if (!t) throw new Error("Not logged in");
  return t;
}

export async function setClinicActive(clinicId, isActive) {
  const token = await getIdToken();

  const res = await fetch(
    `${API_BASE}/admin/clinics/${encodeURIComponent(clinicId)}/active`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive }),
    }
  );

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

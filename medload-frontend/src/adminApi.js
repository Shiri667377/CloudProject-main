export const API_BASE = "https://52x01kpdfk.execute-api.us-east-1.amazonaws.com/prod";

function getBearerToken() {
  const access = localStorage.getItem("access_token");
  if (!access) throw new Error("Not logged in");
  return access;
}

export async function setClinicActive(clinicId, isActive) {
  const token = getBearerToken();

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
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}


export async function getAllClinicsAdmin() {
  const token = getBearerToken();

  const res = await fetch(`${API_BASE}/admin/clinics`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
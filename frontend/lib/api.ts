/**
 * API client for the Emergency SOS backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IncidentPayload {
  latitude: number;
  longitude: number;
  address_hint?: string;
  audio_base64?: string;
  text_description?: string;
  reporter_phone?: string;
  line_user_id?: string;
  display_name?: string;
  skip_ai?: boolean;
}

interface TriageResult {
  severity_level: string;
  severity_score: number;
  category: string;
  victim_count: number | null;
  key_symptoms: string[];
  summary_th: string;
  required_units: string[];
  first_aid_advice: string;
  confidence_score: number;
}

export interface IncidentResponse {
  incident_id: string;
  status: string;
  triage_result: TriageResult | null;
  line_sent: boolean;
  message: string;
  audio_url?: string | null;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
  full_name: string;
  phone: string;
  blood_type: string;
  allergies: string;
  chronic_diseases: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  pdpa_accepted: boolean;
}

/**
 * Get stored LIFF access token (if available).
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("liff-token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch { }
  }
  return headers;
}

export async function submitIncident(
  payload: IncidentPayload
): Promise<IncidentResponse> {
  const response = await fetch(`${API_BASE}/api/report-incident`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || `Server error: ${response.status}`
    );
  }

  return response.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}

export async function getMyProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/api/me`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to get profile");
  return response.json();
}

export async function checkPdpaStatus(): Promise<{ accepted: boolean }> {
  const response = await fetch(`${API_BASE}/api/pdpa-status`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to check PDPA");
  return response.json();
}

export async function acceptPdpa(): Promise<{ accepted: boolean }> {
  const response = await fetch(`${API_BASE}/api/pdpa-consent`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to accept PDPA");
  return response.json();
}

export async function updateProfile(data: {
  full_name?: string;
  phone?: string;
  blood_type?: string;
  allergies?: string;
  chronic_diseases?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}): Promise<{ updated: boolean }> {
  const response = await fetch(`${API_BASE}/api/me/profile`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
}

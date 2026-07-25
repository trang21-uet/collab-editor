const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const rawMessage = data?.message ?? data?.error ?? res.statusText;
    const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type CurrentUser = { id: string; email: string; name: string };
export type Document = { id: string; title: string; createdAt?: string; updatedAt?: string };
export type Role = "owner" | "editor" | "viewer";
export type Permission = {
  documentId: string;
  userId: string;
  role: Role;
  user: { id: string; email: string; name: string };
};
export type Version = { version: number; savedAt: string };

export const api = {
  register: (body: { email: string; name: string; password: string }) =>
    apiFetch<CurrentUser>("/auth/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    apiFetch<{ accessToken: string }>("/auth/login", { method: "POST", body }),
  me: (token: string) => apiFetch<CurrentUser>("/auth/me", { token }),
  listDocuments: (token: string) => apiFetch<Document[]>("/documents", { token }),
  createDocument: (token: string, title: string) =>
    apiFetch<Document>("/documents", { method: "POST", body: { title }, token }),
  getDocument: (token: string, id: string) => apiFetch<Document>(`/documents/${id}`, { token }),
  listPermissions: (token: string, documentId: string) =>
    apiFetch<Permission[]>(`/documents/${documentId}/permissions`, { token }),
  assignPermission: (token: string, documentId: string, email: string, role: Role) =>
    apiFetch<Permission>(`/documents/${documentId}/permissions`, {
      method: "POST",
      body: { email, role },
      token,
    }),
  updatePermissionRole: (token: string, documentId: string, userId: string, role: Role) =>
    apiFetch<Permission>(`/documents/${documentId}/permissions/${userId}`, {
      method: "PATCH",
      body: { role },
      token,
    }),
  revokePermission: (token: string, documentId: string, userId: string) =>
    apiFetch<void>(`/documents/${documentId}/permissions/${userId}`, {
      method: "DELETE",
      token,
    }),
  listVersions: (token: string, documentId: string) =>
    apiFetch<Version[]>(`/documents/${documentId}/versions`, { token }),
  restoreVersion: (token: string, documentId: string, version: number) =>
    apiFetch<void>(`/documents/${documentId}/restore`, {
      method: "POST",
      body: { version },
      token,
    }),
};

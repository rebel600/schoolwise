export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | null;

interface UserSession {
  token: string | null;
  role: UserRole;
}

const SESSION_KEY = "school_user_session";

export const authStore = {
  saveSession(token: string, role: UserRole) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, role }));
    window.dispatchEvent(new Event("auth-change"));
  },
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("auth-change"));
  },
  getSession(): UserSession {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : { token: null, role: null };
  },
};

import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api.get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (mode, form) => {
    const { data } = await api.post(`/auth/${mode}`, form);
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };
  const logout = () => { localStorage.removeItem("token"); setUser(null); };

  return <Ctx.Provider value={{ user, loading, authenticate, logout }}>{children}</Ctx.Provider>;
}

import { createContext, useContext, useState, useEffect } from "react";

export const SEZIONI = [
  { id: "dashboard",  label: "Dashboard",      icon: "dashboard" },
  { id: "padroncini", label: "Padroncini",      icon: "users" },
  { id: "conteggi",   label: "Conteggi",        icon: "calculator" },
  { id: "mezzi",      label: "Mezzi Flotta",    icon: "truck" },
  { id: "ricariche",  label: "Ricariche",       icon: "euro" },
  { id: "ricerca",    label: "Ricerca Globale", icon: "search" },
];

const AUTH_KEY = "gls_auth_users";
const SESS_KEY = "gls_auth_session";

const defaultAdmin = {
  id: "admin",
  username: "admin",
  password: "admin123",
  nome: "Amministratore",
  ruolo: "admin",
  sezioni: SEZIONI.map(s => s.id),
  attivo: true,
};

const loadUsers = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial = [defaultAdmin];
  localStorage.setItem(AUTH_KEY, JSON.stringify(initial));
  return initial;
};

const saveUsers = (users) => localStorage.setItem(AUTH_KEY, JSON.stringify(users));

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers]             = useState([]);
  const [loginError, setLoginError]   = useState("");
  const [authReady, setAuthReady]     = useState(false);

  useEffect(() => {
    const us = loadUsers();
    setUsers(us);
    try {
      const sess = JSON.parse(localStorage.getItem(SESS_KEY) || "null");
      if (sess) {
        const u = us.find(x => x.id === sess.id && x.attivo !== false);
        if (u) setCurrentUser(u);
      }
    } catch {}
    setAuthReady(true);
  }, []);

  const login = (username, password) => {
    const us = loadUsers();
    const u = us.find(x =>
      x.username.toLowerCase() === username.toLowerCase() &&
      x.password === password &&
      x.attivo !== false
    );
    if (!u) { setLoginError("Credenziali non valide o account disattivato"); return false; }
    setCurrentUser(u);
    setLoginError("");
    localStorage.setItem(SESS_KEY, JSON.stringify({ id: u.id }));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESS_KEY);
  };

  const canAccess = (sezioneId) => {
    if (!currentUser) return false;
    if (currentUser.ruolo === "admin") return true;
    return (currentUser.sezioni || []).includes(sezioneId);
  };

  const isAdmin = currentUser?.ruolo === "admin";

  const saveUtente = (u) => {
    const all = loadUsers();
    const isNew = !all.find(x => x.id === u.id);
    const entry = isNew ? { ...u, id: `user_${Date.now()}` } : u;
    const updated = isNew ? [...all, entry] : all.map(x => x.id === entry.id ? entry : x);
    saveUsers(updated);
    setUsers(updated);
    if (currentUser?.id === entry.id) setCurrentUser(entry);
  };

  const deleteUtente = (id) => {
    if (id === "admin") return;
    const updated = loadUsers().filter(x => x.id !== id);
    saveUsers(updated);
    setUsers(updated);
  };

  return (
    <AuthContext.Provider value={{
      currentUser, users, loginError, login, logout,
      canAccess, isAdmin, saveUtente, deleteUtente, authReady
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

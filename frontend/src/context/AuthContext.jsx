import { createContext, useContext, useState } from 'react';

function decodeJwt(token) {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    // Treat expired tokens as invalid
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function loadFromStorage() {
  const t = localStorage.getItem('token');
  if (!t) return { token: null, user: null };
  const user = decodeJwt(t);
  if (!user) {
    localStorage.removeItem('token');
    return { token: null, user: null };
  }
  return { token: t, user };
}

const AuthContext = createContext(null);

export function AuthContextProvider({ children }) {
  const [{ token, user }, setAuth] = useState(loadFromStorage);

  function login(newToken) {
    const newUser = decodeJwt(newToken);
    localStorage.setItem('token', newToken);
    setAuth({ token: newToken, user: newUser });
  }

  function logout() {
    localStorage.removeItem('token');
    setAuth({ token: null, user: null });
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

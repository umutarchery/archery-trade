import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, type Player } from "./api";

interface AuthCtx {
  player: Player | null;
  loading: boolean;
  login: (token: string, player: Player) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);

export function useAuth() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) {
      setPlayer(null);
      setLoading(false);
      return;
    }
    try {
      const { player } = await api.me();
      setPlayer(player);
    } catch {
      setToken(null);
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function login(token: string, p: Player) {
    setToken(token);
    setPlayer(p);
  }
  function logout() {
    setToken(null);
    setPlayer(null);
  }

  return (
    <Ctx.Provider value={{ player, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

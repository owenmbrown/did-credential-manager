'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SessionContextType {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const login = () => setIsLoggedIn(true);
  const logout = () => setIsLoggedIn(false);

  return (
    <SessionContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserInfo {
  name: string;
  address: string;
  licenseNumber: string;
  [key: string]: any; // Allow additional properties
}

interface SessionContextType {
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
  login: (userInfo?: UserInfo) => void;
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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const login = (info?: UserInfo) => {
    setIsLoggedIn(true);
    if (info) {
      setUserInfo(info);
    } else {
      setUserInfo({
        name: 'Bank Customer',
        licenseNumber: '',
      });
    }
  };
  
  const logout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
  };

  return (
    <SessionContext.Provider value={{ isLoggedIn, userInfo, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
};
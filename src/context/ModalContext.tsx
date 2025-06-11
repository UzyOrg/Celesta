'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ModalContextType {
  isLeadModalOpen: boolean;
  openLeadModal: () => void;
  closeLeadModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  const openLeadModal = () => setIsLeadModalOpen(true);
  const closeLeadModal = () => setIsLeadModalOpen(false);

  return (
    <ModalContext.Provider value={{ isLeadModalOpen, openLeadModal, closeLeadModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

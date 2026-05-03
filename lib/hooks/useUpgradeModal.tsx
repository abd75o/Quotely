"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type { LucideProps } from "lucide-react";
import { UpgradeProModal } from "@/components/upgrade/UpgradeProModal";

export type UpgradeIcon = ComponentType<LucideProps>;

export interface UpgradeModalConfig {
  featureName: string;
  featureDescription: string;
  featureIcon: UpgradeIcon | null;
}

interface UpgradeModalContextValue {
  isOpen: boolean;
  config: UpgradeModalConfig;
  showUpgradeModal: (
    featureName: string,
    featureDescription: string,
    featureIcon?: UpgradeIcon
  ) => void;
  closeModal: () => void;
}

const DEFAULT_CONFIG: UpgradeModalConfig = {
  featureName: "",
  featureDescription: "",
  featureIcon: null,
};

const UpgradeModalContext = createContext<UpgradeModalContextValue>({
  isOpen: false,
  config: DEFAULT_CONFIG,
  showUpgradeModal: () => {},
  closeModal: () => {},
});

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<UpgradeModalConfig>(DEFAULT_CONFIG);

  const showUpgradeModal = useCallback(
    (featureName: string, featureDescription: string, featureIcon?: UpgradeIcon) => {
      setConfig({
        featureName,
        featureDescription,
        featureIcon: featureIcon ?? null,
      });
      setIsOpen(true);
    },
    []
  );

  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <UpgradeModalContext.Provider
      value={{ isOpen, config, showUpgradeModal, closeModal }}
    >
      {children}
      <UpgradeProModal
        isOpen={isOpen}
        onClose={closeModal}
        featureName={config.featureName}
        featureDescription={config.featureDescription}
        featureIcon={config.featureIcon}
      />
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  return useContext(UpgradeModalContext);
}

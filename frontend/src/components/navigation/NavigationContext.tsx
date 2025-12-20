import { ReactNode, createContext, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { isPlacementPath } from "./RoleNavConfig";

type NavigationContextValue = {
  placementMode: boolean;
  placementDerived: boolean;
  setPlacementMode: (mode: boolean) => void;
  clearPlacementOverride: () => void;
  pathname: string;
};

const NavigationContext = createContext<NavigationContextValue | undefined>(
  undefined
);

export const NavigationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const location = useLocation();
  const [overridePlacement, setOverridePlacement] = useState<boolean | null>(
    null
  );

  const placementDerived = useMemo(
    () => isPlacementPath(location.pathname),
    [location.pathname]
  );

  const placementMode = overridePlacement ?? placementDerived;

  const value = useMemo(
    () => ({
      placementMode,
      placementDerived,
      setPlacementMode: (mode: boolean) => setOverridePlacement(mode),
      clearPlacementOverride: () => setOverridePlacement(null),
      pathname: location.pathname,
    }),
    [placementMode, placementDerived, location.pathname]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);

  if (!ctx) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return ctx;
};

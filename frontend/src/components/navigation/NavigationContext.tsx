import { ReactNode, createContext, useContext, useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isPlacementPath } from "./RoleNavConfig";

type NavigationContextValue = {
  placementMode: boolean;
  placementDerived: boolean;
  setPlacementMode: (mode: boolean) => void;
  clearPlacementOverride: () => void;
  pathname: string;
  // Sidebar collapsed state
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
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

  // Ensure overrides are cleaned up when route changes: do not let placementMode persist on non-placement routes
  useEffect(() => {
    if (!placementDerived) {
      // Clear any temporary overrides when not on placement routes
      setOverridePlacement(null);
    } else {
      // If we are on a placement route and an explicit false override exists, clear it so derived mode resumes
      setOverridePlacement((prev) => (prev === false ? null : prev));
    }
  }, [placementDerived]);

  // Set placementMode function: only allow enabling placement when the current route is a placement route
  const setPlacementModeSafe = (mode: boolean) => {
    if (mode === true && !placementDerived) {
      // Do not allow forcing placement mode on non-placement routes
      return;
    }
    setOverridePlacement(mode);
  };

  // Sidebar collapsed state (persist in session/local storage later if needed)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const raw = sessionStorage.getItem('sf_sidebar_collapsed');
      return raw === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('sf_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  const value = useMemo(
    () => ({
      placementMode,
      placementDerived,
      setPlacementMode: setPlacementModeSafe,
      clearPlacementOverride: () => setOverridePlacement(null),
      pathname: location.pathname,
      collapsed,
      setCollapsed,
    }),
    [placementMode, placementDerived, location.pathname, collapsed]
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

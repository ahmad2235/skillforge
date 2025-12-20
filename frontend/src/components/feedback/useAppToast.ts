type ToastHandler = (message: string) => void;

type UseAppToastReturn = {
  toastSuccess: ToastHandler;
  toastError: ToastHandler;
};

export const useAppToast = (): UseAppToastReturn => {
  const toastSuccess: ToastHandler = (message) => {
    // TODO: wire to shared toast system (shadcn/ui or equivalent)
    console.info(`[toast:success] ${message}`);
  };

  const toastError: ToastHandler = (message) => {
    // TODO: wire to shared toast system (shadcn/ui or equivalent)
    console.error(`[toast:error] ${message}`);
  };

  return { toastSuccess, toastError };
};

export default useAppToast;

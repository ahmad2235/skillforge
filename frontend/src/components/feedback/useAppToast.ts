import { useToast } from "./ToastProvider";

type ToastHandler = (message: string) => void;

type UseAppToastReturn = {
  toastSuccess: ToastHandler;
  toastError: ToastHandler;
  toastInfo: ToastHandler;
  toastWarning: ToastHandler;
};

export const useAppToast = (): UseAppToastReturn => {
  const { toastSuccess, toastError, toastInfo, toastWarning } = useToast();
  
  return { 
    toastSuccess, 
    toastError, 
    toastInfo, 
    toastWarning 
  };
};

export default useAppToast;

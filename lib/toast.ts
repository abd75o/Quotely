import { toast } from "sonner";

export const toastSuccess = (message: string) => toast.success(message);
export const toastError = (message: string) => toast.error(message);
export const toastInfo = (message: string) => toast.info(message);
export const toastWarning = (message: string) => toast.warning(message);

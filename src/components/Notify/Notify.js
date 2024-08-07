// notify.js
import { toast } from 'react-toastify';

export const notify = (message, type) => {
  const toastTypes = {
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
    default: toast,
  };

  const showToast = toastTypes[type] || toastTypes.default;

  showToast(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });
};

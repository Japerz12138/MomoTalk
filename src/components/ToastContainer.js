import React, { useImperativeHandle, useState, forwardRef } from "react";
import Toast from "./Toast";
import { useTranslation } from 'react-i18next';

const ToastContainer = forwardRef((_, ref) => {
    const [toasts, setToasts] = useState([]);
    const { t } = useTranslation();
    
    useImperativeHandle(ref, () => ({
        addToast: (title, message) => {
            const id = new Date().getTime();
            setToasts((prev) => [...prev, { id, title, message, timestamp: "just now" }]);

            setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== id));
            }, 5000);
        },
    }));

    return (
        <div className="toast-container position-fixed top-0 end-0 p-3">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    title={toast.title}
                    message={toast.message}
                    timestamp={toast.timestamp}
                    onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                />
            ))}
        </div>
    );
});

export default ToastContainer;

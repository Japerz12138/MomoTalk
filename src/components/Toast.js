import React from "react";

function Toast({ title, message, timestamp, onClose }) {
    return (
        <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div className="toast-header">
                <strong className="me-auto">{title}</strong>
                <small className="text-muted">{timestamp}</small>
                <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="toast"
                    aria-label="Close"
                    onClick={onClose}
                ></button>
            </div>
            <div className="toast-body">{message}</div>
        </div>
    );
}

export default Toast;

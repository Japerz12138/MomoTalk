import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

const ImageUpload = ({ onUpload, buttonText = "Upload Image", accept = "image/*", maxSize = 5 * 1024 * 1024 }) => {
    const { t } = useTranslation();
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
        setError(null);

        // Handle rejected files
        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors.some(e => e.code === 'file-too-large')) {
                setError(t('toast.fileTooLarge'));
            } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
                setError(t('toast.invalidFileType'));
            } else {
                setError(t('toast.fileRejected'));
            }
            return;
        }

        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Call the onUpload callback
        if (onUpload) {
            setUploading(true);
            try {
                await onUpload(file);
                setError(null);
            } catch (err) {
                setError(err.message || 'Upload failed');
                setPreview(null);
            } finally {
                setUploading(false);
            }
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        },
        maxSize,
        multiple: false
    });

    return (
        <div>
            <div
                {...getRootProps()}
                style={{
                    border: '2px dashed #ccc',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragActive ? '#f0f0f0' : '#fafafa',
                    transition: 'background-color 0.2s'
                }}
            >
                <input {...getInputProps()} />
                {uploading ? (
                    <div>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">{t('toast.uploading')}</span>
                        </div>
                        <p className="mt-2">{t('toast.uploading')}</p>
                    </div>
                ) : preview ? (
                    <div>
                        <img 
                            src={preview} 
                            alt="Preview" 
                            style={{ 
                                maxWidth: '200px', 
                                maxHeight: '200px', 
                                objectFit: 'contain',
                                marginBottom: '10px'
                            }} 
                        />
                        <p className="text-muted">{t('imageUpload.clickOrDragToChange')}</p>
                    </div>
                ) : (
                    <div>
                        <i className="bi bi-cloud-upload" style={{ fontSize: '48px', color: '#6c757d' }}></i>
                        {isDragActive ? (
                            <p className="mt-2">{t('imageUpload.dropTheImageHere')}</p>
                        ) : (
                            <p className="mt-2">
                                {t('imageUpload.dragAndDrop')}
                                <small className="text-muted">{t('imageUpload.maximumFileSize')}</small>
                            </p>
                        )}
                    </div>
                )}
            </div>
            {error && (
                <div className="alert alert-danger mt-2" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;


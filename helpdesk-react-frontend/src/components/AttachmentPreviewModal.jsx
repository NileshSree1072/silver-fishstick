import React, { useEffect } from 'react';

/**
 * Full-screen preview for image / PDF / text attachments.
 * `onEditImage` is optional; when given, images can be opened in the markup editor.
 */
const AttachmentPreviewModal = ({ attachment, onClose, onEditImage }) => {
  useEffect(() => {
    if (!attachment) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attachment, onClose]);

  if (!attachment) return null;
  const isImage = attachment.kind === 'image';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 anim-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={attachment.fileName}
        className="w-full max-w-4xl overflow-hidden rounded-xl border border-outline-variant bg-popover shadow-[var(--shadow-xl)] anim-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <span className="material-symbols-outlined text-on-surface-variant">
            {isImage ? 'image' : attachment.kind === 'pdf' ? 'picture_as_pdf' : 'description'}
          </span>
          <p className="flex-1 min-w-0 text-[14px] font-medium truncate text-on-surface">{attachment.fileName}</p>
          {isImage && onEditImage && (
            <button type="button" onClick={onEditImage} className="btn btn-secondary btn-sm">
              <span className="material-symbols-outlined !text-[16px]">draw</span>Annotate
            </button>
          )}
          <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Open in new tab" title="Open in new tab">
            <span className="material-symbols-outlined !text-[18px]">open_in_new</span>
          </a>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <span className="material-symbols-outlined !text-[18px]">close</span>
          </button>
        </div>
        <div className="bg-[#0c0e12] p-3 flex items-center justify-center" style={{ minHeight: '60vh' }}>
          {isImage ? (
            <img src={attachment.fileUrl} alt={attachment.fileName} className="max-h-[72vh] w-auto rounded-md object-contain" />
          ) : (
            <iframe src={attachment.fileUrl} title={attachment.fileName} className="w-full h-[72vh] rounded-md bg-white" />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentPreviewModal;

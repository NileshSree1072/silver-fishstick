import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import FormattedMessage from './FormattedMessage';
import { Skeleton } from './ui/Primitives';
import { formatDate } from '../utils/ticketMeta';

/**
 * Read-only knowledge article viewer.
 * Pass either a loaded `article` object or an `articleId` to fetch.
 */
const ArticleModal = ({ article: initialArticle, articleId, onClose }) => {
  const [article, setArticle] = useState(initialArticle || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialArticle || !articleId) return;
    let alive = true;
    api.get(`/api/knowledge/${articleId}`)
      .then(res => alive && setArticle(res.data))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [articleId, initialArticle]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 anim-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-outline-variant bg-popover shadow-[var(--shadow-xl)] anim-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-outline-variant">
          <span className="material-symbols-outlined text-on-surface-variant mt-0.5">description</span>
          <div className="flex-1 min-w-0">
            {article ? (
              <>
                <h2 className="text-base font-semibold text-on-surface">{article.title}</h2>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  {article.categoryName || 'General'}{article.createdAt ? ` · ${formatDate(article.createdAt)}` : ''}
                </p>
              </>
            ) : error ? (
              <h2 className="text-base font-semibold text-on-surface">Article unavailable</h2>
            ) : (
              <Skeleton className="h-4 w-2/3" />
            )}
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <span className="material-symbols-outlined !text-[18px]">close</span>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          {article ? (
            <FormattedMessage content={article.content} className="text-[13.5px] text-on-surface" />
          ) : error ? (
            <p className="text-sm text-on-surface-variant">This article may have been unpublished or removed.</p>
          ) : (
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-11/12" /><Skeleton className="h-3 w-4/5" /><Skeleton className="h-3 w-2/3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleModal;

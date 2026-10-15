import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * FormattedMessage parses and renders markdown content (such as AI bot responses,
 * agent replies, ticket descriptions) with proper bolding (**text**), lists,
 * code blocks, and headings.
 */
export default function FormattedMessage({ content, className = '', style = {} }) {
  if (!content) return null;

  return (
    <div className={`formatted-message text-[13px] leading-relaxed break-words ${className}`} style={style}>
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-inherit" style={{ fontWeight: 700 }} {...props} />
          ),
          b: ({ node, ...props }) => (
            <strong className="font-bold text-inherit" style={{ fontWeight: 700 }} {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-inherit" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 my-2 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1.5" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="text-base font-bold my-2 text-inherit" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm font-bold my-1.5 text-inherit" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs font-bold my-1 text-inherit" {...props} />
          ),
          code: ({ node, inline, ...props }) => (
            <code className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-black/10 dark:bg-white/10" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic opacity-85" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

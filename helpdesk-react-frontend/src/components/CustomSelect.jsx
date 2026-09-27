import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({
  options = [],
  value = '',
  onChange,
  disabled = false,
  className = '',
  triggerClassName = '',
  optionsClassName = '',
  style = {},
  placeholder = 'Select...',
  renderTrigger = null,
  renderOption = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (val) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className || 'w-full'}`}>
      {/* Trigger */}
      {renderTrigger ? (
        <div onClick={() => !disabled && setIsOpen(!isOpen)} className="cursor-pointer">
          {renderTrigger(selectedOption || { value, label: placeholder }, isOpen)}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between w-full bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`}
          style={style}
        >
          <span className="truncate mr-2">{selectedOption ? selectedOption.label : placeholder}</span>
          <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-180 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
      )}

      {/* Options Panel */}
      {isOpen && (
        <div 
          className={`absolute z-50 left-0 right-0 mt-1.5 bg-surface-elevated border border-outline-variant/60 rounded-xl shadow-xl max-h-60 overflow-y-auto anim-fade-in divide-y divide-outline-variant/10 ${optionsClassName}`}
          style={{ 
            backgroundColor: 'var(--bg-elevated)', 
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value ?? idx}
                onClick={() => handleSelect(opt.value)}
                className={`px-3.5 py-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between text-on-surface hover:bg-primary/10 ${
                  isSelected ? 'bg-primary/5 font-semibold text-primary' : ''
                }`}
              >
                {renderOption ? (
                  renderOption(opt, isSelected)
                ) : (
                  <span>{opt.label}</span>
                )}
                {isSelected && (
                  <span className="material-symbols-outlined text-[14px] text-primary shrink-0 ml-2">check</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;

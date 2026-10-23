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
    const handleEscape = (event) => event.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
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
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex items-center justify-between w-full bg-[var(--bg-input)] border border-outline rounded-lg px-3 py-2 text-[13px] text-on-surface shadow-[var(--shadow-xs)] focus:outline-none focus-visible:border-primary focus-visible:shadow-[var(--shadow-brand)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`}
          style={style}
        >
          <span className="truncate mr-2">{selectedOption ? selectedOption.label : placeholder}</span>
          <span className={`material-symbols-outlined !text-[17px] text-on-surface-variant transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
      )}

      {/* Options Panel */}
      {isOpen && (
        <div 
          role="listbox"
          className={`absolute z-50 left-0 right-0 mt-1 p-1 bg-popover border border-outline-variant rounded-lg shadow-[var(--shadow-lg)] max-h-64 overflow-y-auto anim-fade-in ${optionsClassName}`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value ?? idx}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors flex items-center justify-between text-on-surface hover:bg-surface-container-high ${
                  isSelected ? 'font-medium' : ''
                }`}
              >
                {renderOption ? (
                  renderOption(opt, isSelected)
                ) : (
                  <span>{opt.label}</span>
                )}
                {isSelected && (
                  <span className="material-symbols-outlined !text-[16px] text-primary shrink-0 ml-2">check</span>
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

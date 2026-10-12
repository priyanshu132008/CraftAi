import React, { useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FloatingInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  /** Inline validation message — also triggers the soft shake. */
  error?: string | null;
  autoComplete?: string;
  disabled?: boolean;
  /** Right-aligned affordance (e.g. the password visibility eye). */
  trailing?: React.ReactNode;
}

/**
 * Floating-label input: real <label htmlFor> association (never
 * placeholder-only), an indigo underline that draws in on focus, and a
 * soft shake + inline message on validation errors.
 */
export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  error = null,
  autoComplete,
  disabled = false,
  trailing = null
}) => {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const floated = focused || value.length > 0;

  return (
    <motion.div
      key={error ?? 'ok'}
      initial={false}
      animate={
        error && !reduceMotion
          ? { x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.4 } }
          : { x: 0 }
      }
    >
      <div style={{ position: 'relative' }}>
        <motion.label
          htmlFor={id}
          aria-live="polite"
          animate={{
            y: floated ? -13 : 0,
            scale: floated ? 0.74 : 1,
            color: focused
              ? 'var(--accent-indigo-bright)'
              : error
                ? '#F87171'
                : 'var(--text-muted)'
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'absolute',
            left: 14,
            top: 16,
            transformOrigin: 'left center',
            pointerEvents: 'none',
            fontWeight: 500,
            fontSize: '0.95rem',
            zIndex: 1
          }}
        >
          {label}
        </motion.label>
        <input
          id={id}
          type={type}
          className="floating-input"
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            paddingRight: trailing ? 42 : 14,
            borderColor: error
              ? '#F87171'
              : focused
                ? 'var(--accent-indigo-bright)'
                : undefined
          }}
        />
        {/* Focus underline — draws in from the left */}
        <motion.div
          aria-hidden="true"
          initial={false}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            borderRadius: 2,
            background: 'var(--accent-indigo-bright)',
            boxShadow: '0 0 12px var(--accent-indigo-bright)',
            transformOrigin: 'left center',
            pointerEvents: 'none'
          }}
        />
        {trailing && (
          <div
            style={{
              position: 'absolute',
              right: 10,
              top: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {trailing}
          </div>
        )}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          style={{
            marginTop: 6,
            fontSize: '0.78rem',
            color: '#F87171',
            lineHeight: 1.4
          }}
        >
          {error}
        </p>
      )}
    </motion.div>
  );
};

export default FloatingInput;
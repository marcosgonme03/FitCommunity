import { useEffect, useRef } from 'react';

interface TotpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

/**
 * Input de 6 dígitos estilo authenticator: 6 cajas separadas, navegación con
 * teclado, paste inteligente y autosubmit cuando se completa el código.
 */
export default function TotpCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: TotpCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  function setDigitAt(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join('').replace(/\s/g, '');
    onChange(joined);
    if (joined.length === 6 && onComplete) onComplete(joined);
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1); // último dígito tecleado
    if (!digit) return;
    setDigitAt(index, digit);
    if (index < 5) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index] !== ' ') {
        setDigitAt(index, ' ');
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigitAt(index - 1, ' ');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const lastIdx = Math.min(pasted.length - 1, 5);
    inputsRef.current[lastIdx]?.focus();
    if (pasted.length === 6 && onComplete) onComplete(pasted);
  }

  const baseBox =
    'w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-extrabold rounded-xl border-2 ' +
    'transition-all outline-none bg-white shadow-sm focus:ring-2 focus:ring-brand-500/20 ' +
    'tabular-nums';
  const stateBox = hasError
    ? 'border-red-400 text-red-700 focus:border-red-500'
    : 'border-surface-200 text-surface-900 focus:border-brand-500';

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Dígito ${i + 1} del código 2FA`}
          className={`${baseBox} ${stateBox} disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}

/**
 * Logo de FitCommunity. Renderiza la imagen del icono de la app.
 *
 * El archivo `logo.png` debe estar en `apps/frontend/public/logo.png`
 * (servido por Vite como `/logo.png` en runtime).
 *
 * Si la imagen no carga (usuario no la ha colocado todavía), muestra un
 * fallback con la inicial sobre el gradient brand para que la UI no se rompa.
 */

import { useState } from 'react';

interface LogoProps {
  /** Tamaño en píxeles (cuadrado). Default 40 */
  size?: number;
  /** Clases adicionales sobre el contenedor */
  className?: string;
  /** Bordes redondeados. Default 'lg' */
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const ROUNDED: Record<NonNullable<LogoProps['rounded']>, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export default function Logo({ size = 40, className = '', rounded = 'xl' }: LogoProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`${ROUNDED[rounded]} bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-extrabold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-label="FitCommunity"
      >
        FC
      </div>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="FitCommunity"
      width={size}
      height={size}
      className={`${ROUNDED[rounded]} object-cover shrink-0 ${className}`}
      onError={() => setErrored(true)}
      loading="eager"
      decoding="async"
    />
  );
}

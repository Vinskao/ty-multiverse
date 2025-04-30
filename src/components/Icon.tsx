// src/components/Icon.tsx
import React from 'react';
import { iconPaths } from './IconPaths';

interface IconProps {
  icon: keyof typeof iconPaths;
  color?: string;
  size?: string;
  gradient?: boolean;
}

export function Icon({ icon, color = 'currentColor', size = '1em', gradient = false }: IconProps) {
  const svgContent = iconPaths[icon];
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={gradient ? 'gradient' : ''}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
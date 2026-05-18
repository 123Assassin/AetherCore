import type { ButtonHTMLAttributes } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ type = 'button', ...props }: ButtonProps) => {
  return <button type={type} {...props} />;
};

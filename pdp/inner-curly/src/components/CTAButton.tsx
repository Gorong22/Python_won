
import { ReactNode } from 'react';

interface CTAButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

const CTAButton = ({ children, onClick, className = '' }: CTAButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`bg-pink-500 text-white font-bold py-3 px-8 rounded-full hover:bg-pink-600 transition-colors ${className}`}
    >
      {children}
    </button>
  );
};

export default CTAButton;

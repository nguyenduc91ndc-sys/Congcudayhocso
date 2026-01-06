
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 6px 0 #4c51bf, 0 10px 20px rgba(102, 126, 234, 0.4)'
        };
      case 'success':
        return {
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          boxShadow: '0 6px 0 #0d7d71, 0 10px 20px rgba(17, 153, 142, 0.4)'
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          boxShadow: '0 6px 0 #d64469, 0 10px 20px rgba(245, 87, 108, 0.4)'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 6px 0 #4c51bf, 0 10px 20px rgba(102, 126, 234, 0.4)'
        };
    }
  };

  return (
    <button
      className={`cute-3d-button ${className}`}
      style={getVariantStyles()}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

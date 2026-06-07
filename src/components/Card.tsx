import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, className, ...props }) => {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all duration-200 ${
        hoverable ? "hover:-translate-y-1 hover:border-gray-200 hover:shadow-md" : ""
      } ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action
}) => {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-gray-50 pb-3">
      <div>
        <h3 className="text-sm font-bold tracking-tight text-gray-800 leading-none">{title}</h3>
        {subtitle && <p className="mt-1 text-4xs font-mono text-gray-400">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
};

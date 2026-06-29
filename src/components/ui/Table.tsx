import React from 'react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-sm">
      <table className={`w-full border-collapse text-left text-sm text-gray-300 ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => {
  return (
    <thead className="bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-white/5" {...props}>
      {children}
    </thead>
  );
};

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => {
  return (
    <tbody className="divide-y divide-white/5 bg-transparent" {...props}>
      {children}
    </tbody>
  );
};

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tr
      className={`hover:bg-white/[0.02] transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <th className={`px-6 py-4.5 font-semibold text-gray-400 ${className}`} {...props}>
      {children}
    </th>
  );
};

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <td className={`px-6 py-4 whitespace-nowrap align-middle ${className}`} {...props}>
      {children}
    </td>
  );
};

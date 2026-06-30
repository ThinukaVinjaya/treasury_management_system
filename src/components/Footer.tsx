import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full py-4 px-6 border-t border-white/5 bg-[#080c14]/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 shrink-0 select-none">
      <div className="text-center sm:text-left">
        © {new Date().getFullYear()} UTMS Treasury. All rights reserved.
      </div>
      <button 
        onClick={() => navigate('/developers')}
        className="flex items-center gap-1.5 hover:text-brand-purple transition-all duration-200 cursor-pointer font-medium hover:scale-[1.02] focus:outline-none"
      >
        <Code2 size={14} className="text-brand-purple" />
        <span>Meet the Developers</span>
      </button>
    </footer>
  );
};

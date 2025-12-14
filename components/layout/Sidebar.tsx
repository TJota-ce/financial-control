
import React, { useState, ReactNode } from 'react';
import type { Page } from '../../types';
import { useFinance } from '../../contexts/FinanceContext';

interface HeaderProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

interface NavItemProps {
  page: Page;
  activePage: Page;
  setActivePage: (page: Page) => void;
  icon: ReactNode;
  isMobile?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ page, activePage, setActivePage, icon, isMobile = false }) => {
  const isActive = activePage === page;
  
  if (isMobile) {
      return (
        <li>
        <a
            href="#"
            onClick={(e) => {
            e.preventDefault();
            setActivePage(page);
            }}
            className={`flex items-center p-4 transition-colors duration-200 ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
        >
            <div className={isActive ? "text-primary" : "text-gray-400"}>{icon}</div>
            <span className="ml-3">{page}</span>
        </a>
        </li>
      );
  }

  return (
    <li>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setActivePage(page);
        }}
        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive 
            ? 'text-white bg-white/10 shadow-sm ring-1 ring-white/10' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className={`mr-2.5 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</div>
        <span>{page}</span>
      </a>
    </li>
  );
};

const Header = ({ activePage, setActivePage }: HeaderProps) => {
  const { profile, logout } = useFinance();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems: { page: Page; icon: ReactNode }[] = [
    { page: 'Dashboard', icon: <DashboardIcon /> },
    { page: 'Plantões', icon: <StethoscopeIcon /> },
    { page: 'Recebíveis', icon: <ReceiptIcon /> },
    { page: 'Despesas', icon: <CreditCardIcon /> },
    { page: 'Relatórios', icon: <ChartBarIcon /> },
    { page: 'Perfil', icon: <CogIcon /> },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-dark border-b border-white/5 shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-18 py-3">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-xl shadow-lg shadow-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">Shifts</h1>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Financeiro</span>
             </div>
          </div>

          <nav className="hidden lg:flex items-center ml-8">
            <ul className="flex items-center space-x-1">
              {navItems.map((item) => (
                <NavItem key={item.page} {...item} activePage={activePage} setActivePage={setActivePage} />
              ))}
            </ul>
          </nav>

          <div className="flex items-center ml-auto gap-4">
             {profile && (
               <div className="flex items-center pl-4 border-l border-white/10">
                  <div className="hidden md:block text-right mr-3">
                    <p className="text-sm font-semibold text-white leading-tight">{profile.nome}</p>
                    <p className="text-xs text-slate-400 leading-tight truncate max-w-[120px]">{profile.especialidade || 'Médico(a)'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                    {profile.nome ? profile.nome.charAt(0).toUpperCase() : 'D'}
                  </div>
                </div>
              )}
             <button
              onClick={handleLogout}
              title="Sair"
              className="hidden md:flex items-center justify-center w-9 h-9 text-slate-400 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
             >
                <LogoutIcon />
             </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 rounded-md hover:bg-white/10 focus:outline-none"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white shadow-xl absolute top-full left-0 right-0 border-t border-gray-100 animate-fade-in">
          <nav>
            <ul className="flex flex-col py-2">
              {navItems.map((item) => (
                <NavItem key={item.page} {...item} activePage={activePage} setActivePage={(page) => {
                  setActivePage(page);
                  setIsMobileMenuOpen(false);
                }} isMobile />
              ))}
               <li className="border-t border-gray-100 mt-2 pt-2">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                  className="flex items-center p-4 text-red-600 hover:bg-red-50"
                >
                  <div className=""><LogoutIcon /></div>
                  <span className="ml-3 font-medium">Sair do Sistema</span>
                </a>
               </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

// Icons Cleaned up
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const StethoscopeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
const ReceiptIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

export default Header;

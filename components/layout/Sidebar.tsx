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
  return (
    <li>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setActivePage(page);
        }}
        className={`flex items-center transition-colors duration-200 ${
          isMobile
            ? `p-4 text-gray-700 ${isActive ? 'bg-primary-light/20' : 'hover:bg-gray-100'}`
            : `p-2 rounded-md ${isActive ? 'text-white bg-primary-dark/80 font-semibold' : 'text-primary-light hover:text-white'}`
        }`}
      >
        <div className={isMobile ? "text-primary" : ""}>{icon}</div>
        <span className="ml-3">{page}</span>
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
    <header className="bg-primary shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-2xl font-bold text-white">MedFin</h1>

          <nav className="hidden md:flex items-center space-x-2">
            <ul className="flex items-center space-x-2">
              {navItems.map((item) => (
                <NavItem key={item.page} {...item} activePage={activePage} setActivePage={setActivePage} />
              ))}
            </ul>
          </nav>

          <div className="flex items-center">
             {profile && (
               <div className="flex items-center mr-2">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-white mr-3">
                    {profile.nome ? profile.nome.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-semibold text-white leading-tight">{profile.nome}</p>
                    <p className="text-xs text-primary-light leading-tight">{profile.especialidade}</p>
                  </div>
                </div>
              )}
             <button
              onClick={handleLogout}
              title="Sair"
              className="hidden md:flex items-center p-2 text-primary-light rounded-md hover:text-white hover:bg-primary-dark/50"
             >
                <LogoutIcon />
             </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <nav>
            <ul className="flex flex-col">
              {navItems.map((item) => (
                <NavItem key={item.page} {...item} activePage={activePage} setActivePage={(page) => {
                  setActivePage(page);
                  setIsMobileMenuOpen(false);
                }} isMobile />
              ))}
               <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                  className="flex items-center p-4 text-gray-700 hover:bg-gray-100"
                >
                  <div className="text-primary"><LogoutIcon /></div>
                  <span className="ml-3">Sair</span>
                </a>
               </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const StethoscopeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m12.728 0L12 12m-6.364 0L12 12m0 0v9.172a2.828 2.828 0 004 0V12m-4 0a2.828 2.828 0 01-4 0V12m4 0c0-1.657 1.343-3 3-3s3 1.343 3 3v9.172a2.828 2.828 0 004 0V12c0-4.97-4.03-9-9-9s-9 4.03-9 9v.172a2.828 2.828 0 004 0V12c0-1.657 1.343-3 3-3s3 1.343 3 3z" /></svg>;
const ReceiptIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;


export default Header;
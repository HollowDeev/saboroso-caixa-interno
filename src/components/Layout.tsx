
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  adminData?: {
    id: string;
    name: string;
    email: string;
  };
  employeeData?: {
    id: string;
    name: string;
    owner_id: string;
  };
  onLogout?: () => void;
  isEmployee?: boolean;
}

export const Layout = ({ children, adminData, employeeData, onLogout, isEmployee }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = adminData || employeeData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onMenuClick={() => setSidebarOpen(true)} 
        adminData={adminData}
        employeeData={employeeData}
        onLogout={onLogout}
        isEmployee={isEmployee}
      />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar isEmployee={isEmployee} />
        </div>
        
        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="absolute inset-0 bg-black opacity-50" 
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative">
              <Sidebar onClose={() => setSidebarOpen(false)} isEmployee={isEmployee} />
            </div>
          </div>
        )}
        
        <main className="flex-1 p-4 md:p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

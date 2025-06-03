
import React from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

interface EmployeeLayoutProps {
  children: React.ReactNode;
  employee: {
    id: string;
    name: string;
    owner_id: string;
  };
  onLogout: () => void;
}

export const EmployeeLayout = ({ children, employee, onLogout }: EmployeeLayoutProps) => {
  const employeeMenuItems = [
    {
      title: 'Comandas',
      path: '/employee/orders',
      icon: 'clipboard-list',
    },
    {
      title: 'Vendas',
      path: '/employee/sales',
      icon: 'shopping-cart',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={{ 
          name: employee.name, 
          role: 'funcionario' as any 
        }} 
        onLogout={onLogout} 
      />
      <div className="flex">
        <Sidebar 
          menuItems={employeeMenuItems}
          userRole="funcionario" 
        />
        <main className="flex-1 p-6 ml-64">
          {children}
        </main>
      </div>
    </div>
  );
};

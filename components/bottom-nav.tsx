'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Armchair, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Ballina',
      href: '/',
      icon: Home,
    },
    {
      label: 'Vendi juaj',
      href: '/find-seat',
      icon: Armchair,
    },
    {
      label: 'Ngarko',
      href: '/upload',
      icon: Camera,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-t border-border px-6 pb-6 pt-3 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors',
              isActive ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground'
            )}
          >
            <item.icon className={cn('w-6 h-6', isActive && 'fill-current opacity-20')} />
            <span className="text-[10px] font-sans font-medium tracking-wide uppercase">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

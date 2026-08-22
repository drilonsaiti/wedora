'use client';

import {Link, usePathname} from '@/lib/navigation';
import {Armchair, Camera, Home} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ThemeToggle} from '@/components/theme-toggle';
import {useTranslations} from 'next-intl';

interface BottomNavProps {
    slug: string;
    enableFindSeat?: boolean;
    enablePhotoUpload?: boolean;
}

export function BottomNav({slug, enableFindSeat = true, enablePhotoUpload = true}: BottomNavProps) {
    const pathname = usePathname();
    const t = useTranslations('wedding');

    const navItems = [
        {label: t('nav.home'), href: `/${slug}`, icon: Home, show: true},
        {label: t('nav.findSeat'), href: `/${slug}/find-seat`, icon: Armchair, show: enableFindSeat},
        {label: t('nav.upload'), href: `/${slug}/upload`, icon: Camera, show: enablePhotoUpload},
    ].filter((item) => item.show);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-t border-border px-4 pb-6 pt-3 flex items-center">
            <div className="flex-1 flex justify-around items-center">
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
                            <item.icon className={cn('w-6 h-6', isActive && 'fill-current opacity-20')}/>
                            <span className="text-[10px] font-sans font-medium tracking-wide uppercase">
                {item.label}
              </span>
                        </Link>
                    );
                })}
            </div>
            <ThemeToggle className="ml-2 shrink-0"/>
        </nav>
    );
}
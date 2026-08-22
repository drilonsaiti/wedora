'use client';

import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/lib/navigation';
import {locales, localeNames} from '@/lib/i18n';
import {useSearchParams} from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Button} from '@/components/ui/button';
import {Languages} from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onLocaleChange(newLocale: string) {
    const queryString = searchParams.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;
    
    router.replace(target, {locale: newLocale});
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 px-0">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('switchLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => onLocaleChange(l)}
            className={locale === l ? 'bg-accent font-bold' : ''}
          >
            {localeNames[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

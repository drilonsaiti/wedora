import {getTranslations} from 'next-intl/server'
import {Heart} from 'lucide-react'
import {CoupleLoginForm} from '@/components/couple/couple-login-form'

export default async function CoupleLoginPage() {
    const t = await getTranslations('auth')

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60"/>
                        <Heart
                            className="w-3 h-3 text-[hsl(var(--primary))] fill-current"
                        />
                        <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60"/>
                    </div>

                    <h1 className="font-serif text-2xl font-light text-foreground">
                        {t('welcome')}
                    </h1>

                    <p className="text-xs text-muted-foreground mt-1">
                        {t('loginSubtitle')}
                    </p>
                </div>

                <CoupleLoginForm/>
            </div>
        </div>
    )
}
import {redirect} from '@/lib/navigation'
import {createClient} from '@/lib/supabase/server'
import {AdminLoginForm} from '@/components/admin/login-form'
import {getTranslations} from 'next-intl/server'
import {getLocale} from 'next-intl/server'

export default async function AdminLoginPage() {
    const t = await getTranslations('auth')
    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <p className="font-sans text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                        {t('privateAccess')}
                    </p>

                    <h1 className="font-serif text-4xl font-light text-[hsl(var(--dark))]">
                        {t('adminPortal')}
                    </h1>

                    <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60 mx-auto mt-4" />
                </div>

                <div className="card-wedding p-8">
                    <AdminLoginForm />
                </div>
            </div>
        </main>
    )
}
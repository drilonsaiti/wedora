import {ResetPasswordForm} from '@/components/admin/reset-password-form'

export default function ResetPasswordPage() {
    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <p className="font-sans text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                        Authentication
                    </p>
                    <h1 className="font-serif text-4xl font-light text-[hsl(var(--dark))]">
                        Admin Portal
                    </h1>
                    <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60 mx-auto mt-4"/>
                </div>

                <div className="card-wedding p-8">
                    <ResetPasswordForm/>
                </div>
            </div>
        </main>
    )
}

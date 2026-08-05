import { Heart } from 'lucide-react'
import { CoupleResetPasswordForm } from '@/components/couple/couple-reset-password-form'

export default function CoupleResetPasswordPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60" />
                        <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current" />
                        <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60" />
                    </div>
                </div>
                <CoupleResetPasswordForm />
            </div>
        </div>
    )
}
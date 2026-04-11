import Link from 'next/link'
import { CheckCircle, Heart, Camera } from 'lucide-react'

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(var(--blush))] opacity-20 blur-3xl" />
      </div>

      <div className="text-center max-w-sm mx-auto relative z-10 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-10 h-10 text-[hsl(var(--primary))]" strokeWidth={1.5} />
        </div>

        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60" />
          <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current" />
          <div className="h-px w-12 bg-[hsl(var(--gold))] opacity-60" />
        </div>

        <h1 className="font-serif text-4xl font-light text-[hsl(var(--dark))] mb-3">
          Faleminderit!
        </h1>
        <p className="font-serif italic text-xl text-[hsl(var(--primary))] mb-6">
          Fotoja juaj u nda me sukses
        </p>

        <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-10">
          Kujtimi juaj u pranua me sukses. Sara &amp; Drilon do ta ruajnë me kënaqësi.
        </p>

        <div className="space-y-3">
          <Link href="/upload" className="btn-primary w-full justify-center">
            <Camera className="w-4 h-4" />
            Ndaj një tjetër foto
          </Link>
          <Link href="/" className="btn-ghost w-full justify-center">
            Kthehu në faqen kryesore
          </Link>
        </div>
      </div>
    </main>
  )
}

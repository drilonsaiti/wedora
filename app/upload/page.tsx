import { UploadForm } from '@/components/upload-form'

export default function UploadPage() {
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID ?? ''

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 pt-8 pb-4 text-center">
        <p className="font-sans text-xs tracking-[0.25em] uppercase text-muted-foreground">
            Ndaj kujtimin tënd
        </p>
        <h1 className="font-serif text-3xl font-light text-[hsl(var(--dark))] mt-1">
            Ngarko një foto
        </h1>
        <div className="h-px w-16 bg-[hsl(var(--gold))] opacity-60 mx-auto mt-4" />
      </header>

      <div className="flex-1 px-6 py-4 max-w-lg mx-auto w-full">
        <UploadForm eventId={eventId} />
      </div>
    </main>
  )
}

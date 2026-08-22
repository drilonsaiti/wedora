'use client'

import {useState} from 'react'
import {useLocale, useTranslations} from 'next-intl'
import {useRouter} from '@/lib/navigation'
import {ExternalLink, Heart, Plus} from 'lucide-react'
import {Modal} from '@/components/ui/modal'
import {CreateWeddingForm} from '@/components/admin/create-wedding-form'
import {WeddingRowActions} from '@/components/admin/wedding-row-actions'
import {getWeddingStatus, WEDDING_STATUS_COLORS, WEDDING_STATUS_LABELS} from '@/lib/wedding-status'

type WeddingRow = {
    id: string
    groom_name: string | null
    bride_name: string | null
    slug: string | null
    wedding_date: string | null
    created_at: string | null
}

export function WeddingsPageClient({weddings, adminEmail}: { weddings: WeddingRow[]; adminEmail: string }) {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations('weddings')
    const tc = useTranslations('common')
    const ts = useTranslations('status')
    const [modalOpen, setModalOpen] = useState(false)

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="font-serif text-2xl font-light text-[hsl(var(--dark))]">{t('title')}</h1>
                <button onClick={() => setModalOpen(true)} className="btn-primary text-sm py-2.5 px-5">
                    <Plus className="w-4 h-4"/>
                    {t('newWedding')}
                </button>
            </div>

            {weddings.length === 0 ? (
                <div className="card-wedding p-12 text-center">
                    <div
                        className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-[hsl(var(--primary))]" strokeWidth={1.5}/>
                    </div>
                    <h2 className="font-serif text-xl font-light mb-2">{t('noWeddings')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">{t('noWeddingsDescription')}</p>
                    <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex">
                        <Plus className="w-4 h-4"/>
                        {t('createFirstWedding')}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {weddings.map((w) => {
                        const status = getWeddingStatus(w.wedding_date)
                        return (
                            <div key={w.id}
                                 className="card-wedding p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
                                <a href={`/${locale}/admin/weddings/${w.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                                    <div
                                        className="w-12 h-12 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center shrink-0">
                                        <Heart className="w-5 h-5 text-[hsl(var(--primary))]"/>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-serif text-lg text-[hsl(var(--dark))] truncate">
                                                {(w.groom_name ?? t('groom'))} & {(w.bride_name ?? t('bride'))}
                                            </p>
                                            <span
                                                className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full shrink-0 ${WEDDING_STATUS_COLORS[status]}`}>
                                                {ts(WEDDING_STATUS_LABELS[status])}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            /{w.slug ?? '—'}
                                            <ExternalLink className="w-3 h-3"/>
                                            {w.wedding_date && (
                                                <>
                                                    <span className="mx-1">·</span>
                                                    {new Intl.DateTimeFormat(locale).format(new Date(w.wedding_date))}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </a>
                                <WeddingRowActions weddingId={w.id}/>
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="max-w-xl">
                <CreateWeddingForm
                    adminEmail={adminEmail}
                    onSuccess={(weddingId) => {
                        setModalOpen(false)
                        router.push(`/admin/weddings/${weddingId}`)
                        router.refresh()
                    }}
                />
            </Modal>
        </div>
    )
}
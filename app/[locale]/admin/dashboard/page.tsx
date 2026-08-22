import {Link} from '@/lib/navigation'
import {ArrowRight, Heart, Images, Plus, Users} from 'lucide-react'
import {getAdminDashboardStats} from '@/actions/admin'
import {getTranslations} from 'next-intl/server'

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats()
    const t = await getTranslations('dashboard')
    const tc = await getTranslations('common')

    if (!stats || stats.weddings.length === 0) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-muted-foreground" strokeWidth={1.5}/>
                </div>
                <h1 className="font-serif text-2xl font-light mb-2">{t('noWeddings')}</h1>
                <p className="text-sm text-muted-foreground mb-6">{t('noWeddingsDescription')}</p>
                <Link href="/admin/weddings/new" className="btn-primary inline-flex">
                    <Plus className="w-4 h-4"/>
                    {t('createWedding')}
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl font-light text-[hsl(var(--dark))]">{t('overview')}</h1>
                <Link href="/admin/weddings" className="btn-ghost text-xs py-2 px-4">
                    {t('viewAllWeddings')}
                    <ArrowRight className="w-3.5 h-3.5"/>
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card-wedding p-5">
                    <Heart className="w-5 h-5 text-[hsl(var(--primary))] mb-2"/>
                    <p className="font-serif text-2xl">{stats.weddings.length}</p>
                    <p className="text-xs text-muted-foreground">{t('activeWeddings')}</p>
                </div>
                <div className="card-wedding p-5">
                    <Users className="w-5 h-5 text-[hsl(var(--primary))] mb-2"/>
                    <p className="font-serif text-2xl">{stats.totalGuests}</p>
                    <p className="text-xs text-muted-foreground">{t('totalGuests')}</p>
                </div>
                <div className="card-wedding p-5">
                    <Images className="w-5 h-5 text-[hsl(var(--primary))] mb-2"/>
                    <p className="font-serif text-2xl">{stats.totalPhotos}</p>
                    <p className="text-xs text-muted-foreground">
                        {t('photos')} {stats.pendingPhotos > 0 && `(${t('newPhotos', {count: stats.pendingPhotos})})`}
                    </p>
                </div>
            </div>

            <div>
                <h2 className="font-sans text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    {t('recentWeddings')}
                </h2>
                <div className="space-y-3">
                    {stats.weddings.slice(0, 5).map((w) => (
                        <Link
                            key={w.id}
                            href={`/admin/weddings/${w.id}`}
                            className="card-wedding p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                        >
                            <div>
                                <p className="font-serif text-lg">{w.groom_name} & {w.bride_name}</p>
                                <p className="text-xs text-muted-foreground">/{w.slug}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground"/>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
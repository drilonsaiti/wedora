import Link from 'next/link'
import { Plus, Users, Images, Heart, ArrowRight } from 'lucide-react'
import { getAdminDashboardStats } from '@/actions/admin'

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats()

    if (!stats || stats.weddings.length === 0) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h1 className="font-serif text-2xl font-light mb-2">Ende s'keni asnjë dasmë</h1>
                <p className="text-sm text-muted-foreground mb-6">Krijoni dasmën tuaj të parë për të filluar</p>
                <Link href="/admin/weddings/new" className="btn-primary inline-flex">
                    <Plus className="w-4 h-4" />
                    Krijo Dasmën
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl font-light text-[hsl(var(--dark))]">Përmbledhje</h1>
                <Link href="/admin/weddings" className="btn-ghost text-xs py-2 px-4">
                    Shiko të gjitha dasmat
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card-wedding p-5">
                    <Heart className="w-5 h-5 text-[hsl(var(--primary))] mb-2" />
                    <p className="font-serif text-2xl">{stats.weddings.length}</p>
                    <p className="text-xs text-muted-foreground">Dasma aktive</p>
                </div>
                <div className="card-wedding p-5">
                    <Users className="w-5 h-5 text-[hsl(var(--primary))] mb-2" />
                    <p className="font-serif text-2xl">{stats.totalGuests}</p>
                    <p className="text-xs text-muted-foreground">Të ftuar gjithsej</p>
                </div>
                <div className="card-wedding p-5">
                    <Images className="w-5 h-5 text-[hsl(var(--primary))] mb-2" />
                    <p className="font-serif text-2xl">{stats.totalPhotos}</p>
                    <p className="text-xs text-muted-foreground">
                        Foto {stats.pendingPhotos > 0 && `(${stats.pendingPhotos} të reja)`}
                    </p>
                </div>
            </div>

            <div>
                <h2 className="font-sans text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    Dasmat e fundit
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
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
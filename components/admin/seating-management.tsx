'use client'

import {useMemo, useState, useTransition} from 'react'
import dynamic from 'next/dynamic'
import {Edit2, LayoutGrid, Loader2, LogOut, Map as MapIcon, Plus, Printer, Search, Trash2, Users} from 'lucide-react'
import {GuestWithTable, Table, VenueElement} from '@/types/seating'
import {deleteGuest, deleteTable} from '@/actions/seating'
import {signOutAction} from '@/actions/admin'
import {cn} from '@/lib/utils'
import {GuestAvatar} from '@/components/guest-avatar'
import {GuestForm} from '@/components/admin/guest-form'
import {TableForm} from '@/components/admin/table-form'
import {useRouter} from "next/navigation";

const SeatingDesigner = dynamic(() => import('@/components/admin/designer/seating-designer').then(mod => mod.SeatingDesigner), {
    loading: () => (
        <div
            className="flex-1 flex items-center justify-center bg-muted/20 rounded-2xl border border-dashed border-border min-h-[600px]">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground"/>
                <p className="text-sm text-muted-foreground font-sans">Duke ngarkuar planin e uljes...</p>
            </div>
        </div>
    ),
    ssr: false
})

interface SeatingManagementProps {
    initialGuests: GuestWithTable[]
    initialTables: Table[]
    initialVenueElements: VenueElement[]
    adminEmail: string
    weddingId: string
}

type Tab = 'guests' | 'tables' | 'designer'

export function SeatingManagement({
                                      initialGuests,
                                      initialTables,
                                      initialVenueElements,
                                      adminEmail,
                                      weddingId
                                  }: SeatingManagementProps) {
    const router = useRouter()
    const [, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<Tab>('guests')
    const [searchQuery, setSearchQuery] = useState('')

    // Modals state
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false)
    const [isTableModalOpen, setIsTableModalOpen] = useState(false)
    const [editingGuest, setEditingGuest] = useState<GuestWithTable | null>(null)
    const [editingTable, setEditingTable] = useState<Table | null>(null)

    const filteredGuests = useMemo(() => {
        return initialGuests.filter(g =>
            `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [initialGuests, searchQuery])

    const guestStats = useMemo(() => {
        const total = initialGuests.length
        const seated = initialGuests.filter(g => g.table_id).length
        const unseated = total - seated
        return {total, seated, unseated}
    }, [initialGuests])

    const handleDeleteGuest = async (id: string) => {
        if (!confirm('A jeni të sigurt që dëshironi të fshini këtë të ftuar?')) return
        try {
            startTransition(async () => {
                await deleteGuest(id)
                router.refresh()
            })
        } catch (err) {
            alert('Dështoi fshirja e të ftuarit')
        }
    }

    const handleDeleteTable = async (id: string) => {
        if (!confirm('A jeni të sigurt që dëshironi të fshini këtë tavolinë? Të gjithë të ftuarit e caktuar do të mbeten pa tavolinë.')) return
        try {
            startTransition(async () => {
                await deleteTable(id)
                router.refresh()
            })
        } catch (err) {
            alert('Dështoi fshirja e tavolinës')
        }
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        <div>
                            <h1 className="font-serif text-xl font-light text-[hsl(var(--dark))]">Sistemimi i të
                                ftuarve</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="btn-ghost text-xs py-2 px-3 print:hidden"
                        >
                            <Printer className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Printo PDF</span>
                        </button>
                        <button onClick={async () => await signOutAction()}
                                className="btn-ghost text-xs py-2 px-3 print:hidden">
                            <LogOut className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Çkyçu</span>
                        </button>
                    </div>
                </div>

                {/* ── TABS ── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex gap-8 print:hidden">
                        <TabButton
                            active={activeTab === 'guests'}
                            onClick={() => setActiveTab('guests')}
                            icon={<Users className="w-4 h-4"/>}
                            label="Të ftuarit"
                        />
                        <TabButton
                            active={activeTab === 'tables'}
                            onClick={() => setActiveTab('tables')}
                            icon={<LayoutGrid className="w-4 h-4"/>}
                            label="Tavolinat"
                        />
                        <TabButton
                            active={activeTab === 'designer'}
                            onClick={() => setActiveTab('designer')}
                            icon={<MapIcon className="w-4 h-4"/>}
                            label="Organizimi"
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
                {/* Print view */}
                {/* Print view */}
                <div className="hidden print:block print:w-full"
                     style={{colorAdjust: 'exact', WebkitPrintColorAdjust: 'exact'}}>
                    <h2 className="text-2xl font-serif mb-6 text-center" style={{color: '#000000'}}>
                        Lista e të Ftuarve sipas Tavolinave
                    </h2>
                    <div className="space-y-8">
                        {initialTables.sort((a, b) => a.number - b.number).map(table => (
                            <div key={table.id} className="border-b pb-4" style={{borderColor: '#000000'}}>
                                <h3 className="text-lg  mb-2 font-extrabold" style={{color: '#000000'}}>
                                    Tavolina <span
                                    className="text-2xl"> {table.number}</span> {table.label ? `- "${table.label}"` : ''}
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {initialGuests
                                        .filter(g => g.table_id === table.id)
                                        .sort((a, b) => a.first_name.localeCompare(b.first_name))
                                        .map(guest => (
                                            <div key={guest.id} className="text-sm" style={{color: '#000000'}}>
                                                • {guest.first_name} {guest.last_name}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}

                    </div>
                </div>

                {activeTab === 'guests' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4 print:hidden">
                            <div className="card-wedding p-4 text-center">
                                <p className="font-serif text-2xl text-[hsl(var(--primary))]">{guestStats.total}</p>
                                <p className="font-sans text-xs text-muted-foreground mt-1">Total i të ftuarve</p>
                            </div>
                            <div className="card-wedding p-4 text-center">
                                <p className="font-serif text-2xl text-[hsl(var(--primary))]">{guestStats.seated}</p>
                                <p className="font-sans text-xs text-muted-foreground mt-1">Të vendosur</p>
                            </div>
                            <div className="card-wedding p-4 text-center">
                                <p className="font-serif text-2xl text-[hsl(var(--primary))]">{guestStats.unseated}</p>
                                <p className="font-sans text-xs text-muted-foreground mt-1">Pa Tavolinë</p>
                            </div>
                        </div>

                        <div
                            className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center print:hidden">
                            <div className="relative w-full sm:w-72">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                <input
                                    type="text"
                                    placeholder="Kërko të ftuarit..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input-wedding pl-10 py-2"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    setEditingGuest(null);
                                    setIsGuestModalOpen(true);
                                }}
                                className="btn-primary py-2 px-4 text-xs w-full sm:w-auto"
                            >
                                <Plus className="w-4 h-4"/>
                                Shto të ftuar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredGuests.map(guest => (
                                <div key={guest.id} className="card-wedding p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <GuestAvatar initials={guest.initials}/>
                                        <div>
                                            <h3 className="font-sans font-medium text-sm">{guest.first_name} {guest.last_name}</h3>
                                            <p className="font-sans text-xs text-muted-foreground">
                                                {guest.tables ? `Tavolina ${guest.tables.number}` : 'Pa Tavolinë'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 print:hidden">
                                        <button
                                            onClick={() => {
                                                setEditingGuest(guest);
                                                setIsGuestModalOpen(true);
                                            }}
                                            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit2 className="w-4 h-4"/>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteGuest(guest.id)}
                                            className="p-2 hover:bg-destructive/10 rounded-full transition-colors text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredGuests.length === 0 && (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    Nuk u gjet asnjë i ftuar.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'tables' && (activeTab === 'tables' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setEditingTable(null);
                                    setIsTableModalOpen(true);
                                }}
                                className="btn-primary py-2 px-4 text-xs w-full sm:w-auto"
                            >
                                <Plus className="w-4 h-4"/>
                                Shto tavolinë
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {initialTables.map(table => (
                                <div key={table.id}
                                     className="card-wedding p-6 flex flex-col items-center text-center relative">
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingTable(table);
                                                setIsTableModalOpen(true);
                                            }}
                                            className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit2 className="w-3.5 h-3.5"/>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTable(table.id)}
                                            className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors text-destructive"
                                        >
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </button>
                                    </div>

                                    <div
                                        className="w-20 h-20 rounded-full border-2 border-dashed border-[hsl(var(--gold))] flex flex-col items-center justify-center mb-4">
                                        <span
                                            className="text-[10px] uppercase tracking-widest text-muted-foreground">Tavolina</span>
                                        <span
                                            className="text-2xl font-serif text-[hsl(var(--primary))]">{table.number}</span>
                                    </div>

                                    <h3 className="font-sans font-medium text-sm">Tavolina {table.number}</h3>
                                    {table.label && (
                                        <p className="font-sans text-[10px] text-[hsl(var(--gold))] font-medium mt-0.5">
                                            {table.label}
                                        </p>
                                    )}
                                    <p className="font-sans text-xs text-muted-foreground mt-1">
                                        {initialGuests.filter(g => g.table_id === table.id).length} / {table.seats} Vende
                                        të zëna
                                    </p>
                                </div>
                            ))}
                            {initialTables.length === 0 && (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    Nuk është krijuar asnjë tavolinë ende.
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {activeTab === 'designer' && (
                    <div className="h-[calc(100vh-250px)]">
                        <SeatingDesigner guests={initialGuests} tables={initialTables}
                                         venueElements={initialVenueElements} weddingId={weddingId}/>
                    </div>
                )}
            </main>

            {/* ── MODALS ── */}
            {isGuestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <h2 className="font-serif text-2xl font-light text-[hsl(var(--dark))] mb-6">
                            {editingGuest ? 'Edit Guest' : 'Add New Guest'}
                        </h2>
                        <GuestForm
                            initialValues={editingGuest || undefined}
                            tables={initialTables}
                            onSuccess={() => {
                                setIsGuestModalOpen(false)
                                startTransition(() => router.refresh())
                            }}
                            onCancel={() => setIsGuestModalOpen(false)}
                        />
                    </div>
                </div>
            )}

            {isTableModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <h2 className="font-serif text-2xl font-light text-[hsl(var(--dark))] mb-6">
                            {editingTable ? 'Edit Table' : 'Add New Table'}
                        </h2>
                        <TableForm
                            initialValues={editingTable || undefined}
                            onSuccess={() => {
                                setIsTableModalOpen(false)
                                startTransition(() => router.refresh())
                            }}
                            onCancel={() => setIsTableModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function TabButton({
                       active,
                       onClick,
                       icon,
                       label
                   }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 py-4 border-b-2 transition-all font-sans text-sm font-medium",
                active
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
        >
            {icon}
            {label}
        </button>
    )
}

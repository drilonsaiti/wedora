'use client'

import {useState} from 'react'
import {Modal} from '@/components/ui/modal'
import {VENUE_COLORS, VENUE_ICONS, VENUE_PRESETS, VenueColorKey, VenueIconKey} from '@/lib/venue-icons'
import {VenueElementShape} from '@/types/seating'
import {cn} from '@/lib/utils'

interface VenueElementModalProps {
    open: boolean
    onClose: () => void
    onCreate: (data: {
        type: string
        label: string
        icon: VenueIconKey
        shape: VenueElementShape
        color: VenueColorKey
    }) => void
}

export function VenueElementModal({open, onClose, onCreate}: VenueElementModalProps) {
    const [label, setLabel] = useState('')
    const [icon, setIcon] = useState<VenueIconKey>('MapPin')
    const [shape, setShape] = useState<VenueElementShape>('square')
    const [color, setColor] = useState<VenueColorKey>('gray')

    const handlePresetClick = (preset: typeof VENUE_PRESETS[number]) => {
        onCreate({type: preset.type, label: preset.label, icon: preset.icon, shape: preset.shape, color: preset.color})
        onClose()
    }

    const handleCustomCreate = () => {
        if (!label.trim()) return
        onCreate({type: 'custom', label: label.trim(), icon, shape, color})
        setLabel('')
        onClose()
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            <div className="space-y-6">
                <h2 className="font-serif text-xl font-light text-[hsl(var(--dark))]">Shto Element Sallë</h2>

                <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">
                        Shabllone të shpejta
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {VENUE_PRESETS.map((preset) => {
                            const Icon = VENUE_ICONS[preset.icon]
                            return (
                                <button
                                    key={preset.type}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                                        VENUE_COLORS[preset.color]
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5"/>
                                    {preset.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="h-px bg-border"/>

                <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground block">
                        Ose krijo elementin tënd
                    </label>

                    <div>
                        <label className="font-sans text-xs text-muted-foreground block mb-1.5">Emri</label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="p.sh. Foto Booth, Kek Dasme"
                            className="input-wedding py-2.5 w-full"
                            maxLength={30}
                        />
                    </div>

                    <div>
                        <label className="font-sans text-xs text-muted-foreground block mb-1.5">Ikona</label>
                        <div className="grid grid-cols-8 gap-1.5">
                            {(Object.keys(VENUE_ICONS) as VenueIconKey[]).map((key) => {
                                const Icon = VENUE_ICONS[key]
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setIcon(key)}
                                        className={cn(
                                            'aspect-square rounded-lg border flex items-center justify-center transition-colors',
                                            icon === key ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))]' : 'border-border hover:bg-muted'
                                        )}
                                    >
                                        <Icon className="w-4 h-4"/>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="font-sans text-xs text-muted-foreground block mb-1.5">Forma</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['circle', 'square', 'rectangle'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setShape(s)}
                                    className={cn(
                                        'py-2 rounded-lg border text-xs font-medium transition-colors capitalize',
                                        shape === s ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))]' : 'border-border hover:bg-muted'
                                    )}
                                >
                                    {s === 'circle' ? 'Rreth' : s === 'square' ? 'Katror' : 'Drejtkëndësh'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="font-sans text-xs text-muted-foreground block mb-1.5">Ngjyra</label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(VENUE_COLORS) as VenueColorKey[]).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setColor(key)}
                                    className={cn(
                                        'w-8 h-8 rounded-full border-2 transition-all',
                                        VENUE_COLORS[key].split(' ')[1],
                                        color === key ? 'border-[hsl(var(--dark))] scale-110' : 'border-transparent'
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleCustomCreate}
                        disabled={!label.trim()}
                        className="btn-primary w-full py-3 disabled:opacity-50"
                    >
                        Krijo Elementin
                    </button>
                </div>
            </div>
        </Modal>
    )
}
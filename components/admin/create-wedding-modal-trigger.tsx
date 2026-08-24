'use client'

import {
    type ReactNode,
    useState,
} from 'react'

import { CreateWeddingForm } from '@/components/admin/create-wedding-form'
import { Modal } from '@/components/ui/modal'
import { useRouter } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface CreateWeddingModalTriggerProps {
    adminEmail: string
    children: ReactNode
    className?: string
}

export function CreateWeddingModalTrigger({
                                              adminEmail,
                                              children,
                                              className,
                                          }: CreateWeddingModalTriggerProps) {
    const router = useRouter()

    const [
        open,
        setOpen,
    ] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() =>
                    setOpen(true)
                }
                className={cn(
                    className
                )}
            >
                {children}
            </button>

            <Modal
                open={open}
                onClose={() =>
                    setOpen(false)
                }
                maxWidth="max-w-2xl"
            >
                <CreateWeddingForm
                    adminEmail={
                        adminEmail
                    }
                    onSuccess={(
                        weddingId
                    ) => {
                        setOpen(false)

                        router.push(
                            `/admin/weddings/${weddingId}`
                        )

                        router.refresh()
                    }}
                />
            </Modal>
        </>
    )
}
import {redirect} from 'next/navigation'

type Props = { params: Promise<{ weddingId: string }> }

export default async function CoupleWeddingEntryPage({params}: Props) {
    const {weddingId} = await params
    redirect(`/couple/weddings/${weddingId}/photos`)
}
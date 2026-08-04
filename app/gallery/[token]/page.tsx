import { redirect } from 'next/navigation'

type Props = { params: { token: string } }

export default function LegacyGalleryRedirect({ params }: Props) {
  redirect(`/g/${params.token}`)
}

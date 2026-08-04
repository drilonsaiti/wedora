import { getGalleryPhotosAction } from '@/actions/gallery'

type Props = { params: { token: string } }

export const dynamic = 'force-dynamic'

export default async function PublicGalleryPage({ params }: Props) {
  const { photos, error } = await getGalleryPhotosAction(params.token, 0)

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-10">
        <h1 className="text-xl font-semibold mb-4">Galeria</h1>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-xl font-semibold mb-4">Galeria</h1>
      {(!photos || photos.length === 0) ? (
        <p className="text-muted-foreground">Nuk ka foto ende.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((p) => (
            <a key={p.id} href={p.originalUrl ?? '#'} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbUrl ?? p.originalUrl ?? ''}
                alt={p.guest_name ?? 'Foto'}
                className="w-full h-40 object-cover rounded-md border"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Share a Photo — Wedding',
  description: 'Upload your wedding photo',
}

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

import DocumentCompressor from '@/components/document-compressor'

export const metadata = {
  title: 'Compresor de archivos',
}

export default function Page() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Compresor de archivos</h1>
      <p>Selecciona documentos permitidos y descarga el ZIP generado con fflate.</p>
      <DocumentCompressor multiple />
    </div>
  )
}

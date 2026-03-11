import InvoiceImportForm from '../../../components/invoice-import/InvoiceImportForm'

export const metadata = {
  title: 'Importar factura (XML)',
}

export default function Page() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Importar factura (XML)</h1>
      <InvoiceImportForm />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

interface Props {
  donneesPdf: Uint8Array
  nomFichier?: string
  estDuplicata?: boolean
}

export function ApercuPdf({ donneesPdf, nomFichier = 'document', estDuplicata }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [urlPdf, setUrlPdf] = useState('')

  useEffect(() => {
    const blob = new Blob([new Uint8Array(donneesPdf)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setUrlPdf(url)
    return () => URL.revokeObjectURL(url)
  }, [donneesPdf])

  const telecharger = () => {
    const lien = document.createElement('a')
    lien.href = urlPdf
    lien.download = `${nomFichier}.pdf`
    lien.click()
  }

  const imprimer = () => {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div>
      {estDuplicata && (
        <div className="bandeau-avertissement" style={{ marginBottom: 12 }}>
          <span className="icone">⚠</span>
          DUPLICATA
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="bouton" onClick={telecharger}>
          Télécharger
        </button>
        <button className="bouton-secondaire" onClick={imprimer}>
          Imprimer
        </button>
      </div>
      {urlPdf && (
        <iframe
          ref={iframeRef}
          src={urlPdf}
          style={{ width: '100%', height: 600, border: '1px solid var(--separator)', borderRadius: 'var(--radius-ctl)' }}
          title="Aperçu PDF"
        />
      )}
    </div>
  )
}

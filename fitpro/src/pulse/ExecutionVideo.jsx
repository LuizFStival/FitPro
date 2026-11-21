import { useState } from 'react'

export default function ExecutionVideo({ guide, title, compact = false }) {
  const [playing, setPlaying] = useState(false)
  if (!guide && compact) return <p className="execution-missing">Demonstração indisponível para esta variação.</p>
  if (!guide) return <div className="execution-unavailable"><strong>Demonstração ainda não vinculada</strong><p>Não encontramos um vídeo confirmado para esta variação. Confira a execução na Hevy.</p></div>
  return <section className={`execution${compact ? ' execution-compact' : ''}`} aria-label={`Execução de ${title}`}>
    {!compact && <div className="section-head"><h3>Como fazer</h3><span>{guide.language || 'Português'}</span></div>}
    {playing ? <><iframe className="execution-player" src={`https://www.youtube-nocookie.com/embed/${guide.video}?playsinline=1&rel=0&hl=pt-BR`}
      title={`Demonstração: ${title}`} allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      <button className="text" onClick={() => setPlaying(false)}>Fechar vídeo</button></>
      : <button className="execution-play" onClick={() => setPlaying(true)} aria-label={`Ver execução de ${title}`}><span aria-hidden="true">▶</span><div><strong>Ver execução</strong>{!compact && <small>{guide.label}</small>}</div></button>}
    {playing && guide.note && <p className="muted">{guide.note}</p>}
    {playing && <p className="muted">Vídeo no aplicativo · requer internet.</p>}
  </section>
}

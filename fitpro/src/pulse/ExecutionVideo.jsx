import { useState } from 'react'

export default function ExecutionVideo({ guide, title }) {
  const [playing, setPlaying] = useState(false)
  if (!guide) return <div className="execution-unavailable"><strong>Demonstração ainda não vinculada</strong><p>Não encontramos um vídeo confirmado para esta variação. Confira a execução na Hevy.</p></div>
  return <section className="execution" aria-label={`Execução de ${title}`}>
    <div className="section-head"><h3>Como fazer</h3><span>{guide.language || 'Português'}</span></div>
    {playing ? <><iframe className="execution-player" src={`https://www.youtube-nocookie.com/embed/${guide.video}?playsinline=1&rel=0&hl=pt-BR`}
      title={`Demonstração: ${title}`} allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      <button className="text" onClick={() => setPlaying(false)}>Fechar vídeo</button></>
      : <button className="execution-play" onClick={() => setPlaying(true)} aria-label={`Ver execução de ${title}`}><span aria-hidden="true">▶</span><div><strong>Ver execução</strong><small>{guide.label}</small></div></button>}
    <p className="execution-credit"><a href={guide.source} target="_blank" rel="noreferrer">{guide.author} ↗</a><span> · </span><a href={`https://www.youtube.com/watch?v=${guide.video}`} target="_blank" rel="noreferrer">Abrir no YouTube ↗</a></p>
    {guide.note && <p className="muted">{guide.note}</p>}
    {playing && <p className="muted">Se o player não carregar, use “Abrir no YouTube”. Requer internet.</p>}
  </section>
}

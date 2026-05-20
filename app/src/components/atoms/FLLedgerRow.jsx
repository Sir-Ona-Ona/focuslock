import FLFavicon from './FLFavicon'

export default function FLLedgerRow({ num, domain, meta, value, last = false }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 28px 1fr auto',
      alignItems: 'center',
      gap: 14,
      padding: '14px 24px',
      borderBottom: last ? 0 : '1px solid var(--stone-line)',
    }}>
      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
        {String(num).padStart(2, '0')}
      </span>
      <FLFavicon char={(domain || '?')[0].toUpperCase()} />
      <div>
        <div style={{ fontSize: 14, color: 'var(--ink)' }}>{domain}</div>
        {meta && <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{meta}</div>}
      </div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{value}</div>
    </div>
  )
}

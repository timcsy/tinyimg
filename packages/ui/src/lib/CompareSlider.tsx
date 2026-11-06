/** 疊在畫布上：右側顯示壓縮後的結果，左側露出下方未壓縮的畫布 */
export function CompareSlider({
  after,
  value,
  onChange,
}: {
  after: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <>
      <img
        className="compare-after"
        src={after}
        alt="壓縮後"
        style={{ clipPath: `inset(0 0 0 ${value}%)` }}
      />
      <div className="compare-divider" style={{ left: `${value}%` }} aria-hidden="true" />
      <input
        className="compare-slider"
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        aria-label="前後對比"
        aria-valuetext={`${value}%（左側未壓縮、右側壓縮後）`}
      />
    </>
  )
}

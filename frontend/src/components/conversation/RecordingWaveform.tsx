import { cn } from '@/lib/utils'

interface RecordingWaveformProps {
  levels: number[]
  className?: string
}

export function RecordingWaveform({ levels, className }: RecordingWaveformProps) {
  return (
    <div
      className={cn('flex h-20 items-center justify-center gap-0.5', className)}
      role="img"
      aria-label="マイク入力レベル"
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="w-1.5 rounded-full bg-primary transition-[height,opacity] duration-75 ease-out"
          style={{
            height: `${Math.round(4 + level * 64)}px`,
            opacity: 0.35 + level * 0.65,
          }}
        />
      ))}
    </div>
  )
}

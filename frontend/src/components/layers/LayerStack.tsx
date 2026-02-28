import type { Layer } from '@/types/layers'
import { LayerCard } from './LayerCard'

interface LayerStackProps {
  layers: Layer[]
  revealedCount: number
}

export function LayerStack({ layers, revealedCount }: LayerStackProps) {
  return (
    <div className="relative space-y-4">
      {layers.map((layer, index) => {
        const isVisible = index < revealedCount
        const showConnector = index < layers.length - 1

        return (
          <div key={layer.layerIndex}>
            <LayerCard layer={layer} visible={isVisible} />

            {/* Connector arrow between layers */}
            {showConnector && (
              <div
                className="flex justify-center py-1 transition-all duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transitionDelay: `${150}ms`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="h-3 w-px bg-border" />
                  <svg
                    className="h-2.5 w-2.5 text-muted-foreground"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                  >
                    <polygon points="5,10 0,0 10,0" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

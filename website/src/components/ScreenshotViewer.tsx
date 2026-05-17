import { useState } from 'react';
import { X } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

interface Shot {
  label: string;
  src: string;
  srcDark: string;
}

interface ScreenshotViewerProps {
  images: Shot[];
}

export default function ScreenshotViewer({ images }: ScreenshotViewerProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: false,
  });

  return (
    <>
      <div className="overflow-hidden touch-pan-x" ref={emblaRef}>
        <div className="flex gap-6">
          {images.map((shot, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-64 sm:w-72 cursor-pointer"
              onClick={() => setOpenIndex(i)}
            >
              <div className="p-2">
                <div className="relative aspect-[9/19] overflow-hidden rounded-2xl shadow-lg dark:shadow-white/10">
                  <img
                    src={shot.src}
                    alt={shot.label}
                    draggable="false"
                    className="h-full w-full object-cover dark:hidden"
                  />
                  <img
                    src={shot.srcDark}
                    alt={shot.label}
                    draggable="false"
                    className="hidden h-full w-full object-cover dark:block"
                  />
                </div>
                <p className="mt-3 text-center text-sm font-medium">{shot.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setOpenIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex(null);
            }}
            className="absolute right-4 top-4 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={images[openIndex].src}
            alt={images[openIndex].label}
            className="max-h-[90vh] max-w-[90vw] object-contain dark:hidden"
            onClick={(e) => e.stopPropagation()}
          />
          <img
            src={images[openIndex].srcDark}
            alt={images[openIndex].label}
            className="hidden max-h-[90vh] max-w-[90vw] object-contain dark:block"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

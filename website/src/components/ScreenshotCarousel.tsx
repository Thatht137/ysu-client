import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Calendar, ClipboardList, BarChart3 } from 'lucide-react';

interface Slide {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  src: string;
  srcDark: string;
  alt: string;
}

const slides: Slide[] = [
  {
    icon: BookOpen,
    title: '查成绩',
    description: '按学期筛选，查看统计、分布和排名',
    src: '/images/screenshots/grades-light.svg',
    srcDark: '/images/screenshots/grades-dark.svg',
    alt: '成绩查询',
  },
  {
    icon: Calendar,
    title: '看课表',
    description: '合并理论课与实验课，按周切换，实时高亮当前课程',
    src: '/images/screenshots/schedule-light.svg',
    srcDark: '/images/screenshots/schedule-dark.svg',
    alt: '课程表',
  },
  {
    icon: ClipboardList,
    title: '查考试',
    description: '按学期查看考试安排',
    src: '/images/screenshots/exams-light.svg',
    srcDark: '/images/screenshots/exams-dark.svg',
    alt: '考试安排',
  },
  {
    icon: BarChart3,
    title: '看绩点',
    description: '学分和绩点一目了然',
    src: '/images/screenshots/gpa-light.svg',
    srcDark: '/images/screenshots/gpa-dark.svg',
    alt: '绩点统计',
  },
];

export default function ScreenshotCarousel({ title }: { title: string }) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, goNext]);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <section
      id="screenshots"
      className="px-4 py-20 sm:px-6 lg:px-8"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>

        <div className="mt-12 lg:mt-16">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
            {/* Text side */}
            <div className="flex max-w-sm flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>

              <div className="relative h-20 w-full overflow-hidden">
                {slides.map((s, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 flex flex-col items-center transition-all duration-500 ease-out lg:items-start"
                    style={{
                      opacity: i === current ? 1 : 0,
                      transform: i === current ? 'translateY(0)' : 'translateY(16px)',
                      pointerEvents: i === current ? 'auto' : 'none',
                    }}
                  >
                    <h3 className="text-2xl font-bold sm:text-3xl">{s.title}</h3>
                    <p className="mt-2 text-base text-muted-foreground">{s.description}</p>
                  </div>
                ))}
              </div>

              {/* Navigation dots */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={goPrev}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === current
                          ? 'w-6 bg-primary'
                          : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Phone mockup side */}
            <div className="relative flex-shrink-0">
              <div className="relative mx-auto w-64 sm:w-72 lg:w-80">
                {/* Phone frame */}
                <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-border bg-border p-2 shadow-2xl">
                  {/* Notch */}
                  <div className="absolute left-1/2 top-0 z-10 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-border" />

                  {/* Screen */}
                  <div className="relative aspect-[9/19] overflow-hidden rounded-[2rem] bg-muted">
                    {slides.map((s, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 transition-opacity duration-500 ease-out"
                        style={{
                          opacity: i === current ? 1 : 0,
                        }}
                      >
                        <img
                          src={s.src}
                          alt={s.alt}
                          className="h-full w-full object-cover dark:hidden"
                          loading={i === 0 ? 'eager' : 'lazy'}
                        />
                        <img
                          src={s.srcDark}
                          alt={s.alt}
                          className="hidden h-full w-full object-cover dark:block"
                          loading={i === 0 ? 'eager' : 'lazy'}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decorative glow */}
                <div className="absolute -inset-4 -z-10 rounded-full bg-primary/5 blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

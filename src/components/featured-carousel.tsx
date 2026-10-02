"use client";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function FeaturedCarousel({
  slides,
  className,
}: {
  slides: ReactNode[];
  className: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(0);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      5500,
    );
    return () => clearInterval(timer);
  }, [paused, slides.length]);
  const move = (by: number) =>
    setIndex((i) => (i + by + slides.length) % slides.length);
  return (
    <div
      className={className + " hc-featured"}
      aria-roledescription="carousel"
      aria-label="Featured programs"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="overflow-hidden rounded-lg shadow-md w-full aspect-[16/9]"
        style={{ touchAction: "pan-y pinch-zoom" }}
        onTouchStart={(e) => {
          touch.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const delta = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(delta) > 40) move(delta < 0 ? 1 : -1);
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <Fragment key={i}>{slide}</Fragment>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label="Previous slide"
        className="hc-carousel-arrow hc-carousel-prev"
        onClick={() => move(-1)}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        className="hc-carousel-arrow hc-carousel-next"
        onClick={() => move(1)}
      >
        <ChevronRight size={16} />
      </button>
      <div className="flex justify-center mt-2">
        {slides.map((_, i) => (
          <button
            type="button"
            key={i}
            className={`h-2 mx-1 rounded-full transition-all ${index === i ? "bg-amber-500 w-4" : "bg-gray-300 w-2 hover:bg-gray-400"}`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={index === i}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

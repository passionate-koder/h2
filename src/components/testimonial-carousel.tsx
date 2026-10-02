"use client";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function TestimonialCarousel({
  slides,
  className,
}: {
  slides: ReactNode[];
  className: string;
}) {
  const [index, setIndex] = useState(0);
  return (
    <div className={className} aria-roledescription="carousel">
      <div aria-live="polite" className="hc-testimonial-slide">
        {slides[index]}
      </div>
      <button
        type="button"
        aria-label="Previous testimonial"
        className="hc-testimonial-prev"
        onClick={() => setIndex((index - 1 + slides.length) % slides.length)}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        className="hc-testimonial-next"
        onClick={() => setIndex((index + 1) % slides.length)}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

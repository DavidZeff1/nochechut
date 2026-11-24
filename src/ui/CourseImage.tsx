import { useState } from 'react';
import { courseImage } from '../lib/images';
import type { Course } from '../lib/types';

/**
 * The painted illustration for a course. If the picture file is missing it removes itself
 * rather than leaving an empty box, so cards still look finished.
 */
export function CourseImage({
  course,
  className = '',
  sizes = '(max-width: 600px) 100vw, 400px',
  eager = false,
}: {
  course: Pick<Course, 'name' | 'image'>;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const img = courseImage(course);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === img.src) return null;
  return (
    <img
      className={`art ${className}`}
      src={img.src}
      srcSet={img.srcSet}
      sizes={img.srcSet ? sizes : undefined}
      width={1600}
      height={1000}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      alt=""
      onError={() => setFailed(img.src)}
    />
  );
}

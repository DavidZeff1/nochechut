import type { Course } from './types';

/**
 * Painted course illustrations live in public/courses/<slug>-800.webp and <slug>-1280.webp
 * (made by `npm run images` from art/raw). A course uses, in order:
 *   1. course.image — an image an admin uploaded for that course
 *   2. the first activity whose Hebrew keywords appear in the course name
 *   3. the "community" illustration
 */
export interface ActivityImage {
  slug: string;
  label: string;
  keywords: string[];
}

export const ACTIVITY_IMAGES: ActivityImage[] = [
  {
    slug: 'martial-arts',
    label: 'אומנויות לחימה',
    keywords: ['לחימה', 'קרב מגע', 'ג׳ודו', "ג'ודו", 'גודו', 'קראטה', 'טאקוונדו', 'קפוארה', 'הגנה עצמית', 'אגרוף'],
  },
  { slug: 'hairstyling', label: 'תסרוקות', keywords: ['תסרוק', 'שיער', 'צמות', 'איפור', 'קוסמטיקה', 'ציפורניים'] },
  { slug: 'zumba', label: 'זומבה וכושר', keywords: ['זומבה', 'אירובי', 'כושר', 'פילאטיס', 'יוגה', 'התעמלות'] },
  { slug: 'theatre', label: 'תאטרון', keywords: ['תאטרון', 'תיאטרון', 'דרמה', 'במה', 'סטנדאפ'] },
  { slug: 'jewish-dance', label: 'מחול', keywords: ['מחול', 'ריקוד', 'רוקדים', 'בלט', 'היפ הופ', 'ג׳אז', 'דבקה'] },
  { slug: 'surfing', label: 'גלישה', keywords: ['גלישה', 'גלישת', 'שחייה', 'קייאק', 'שייט'] },
  { slug: 'chess', label: 'שחמט', keywords: ['שחמט', 'שח-מט', 'משחקי חשיבה', 'בריג׳'] },
  {
    slug: 'music',
    label: 'מוזיקה',
    keywords: ['מוזיקה', 'מוסיקה', 'גיטרה', 'תופים', 'פסנתר', 'מקהלה', 'שירה', 'כינור', 'אורגן', 'דרבוקה'],
  },
  { slug: 'sports', label: 'ספורט', keywords: ['כדור', 'ספורט', 'טניס', 'אתלטיקה', 'ריצה', 'אופניים', 'קטרגל'] },
  { slug: 'cooking', label: 'בישול', keywords: ['בישול', 'אפייה', 'שף', 'קונדיטוריה', 'עוגות', 'מטבח'] },
  { slug: 'science', label: 'מדע', keywords: ['מדע', 'רובוט', 'מחשב', 'תכנות', 'מדעים', 'אסטרונומיה'] },
  { slug: 'sewing', label: 'תפירה וסריגה', keywords: ['תפיר', 'סריג', 'רקמה', 'טלאים', 'מקרמה'] },
  { slug: 'mishnah-crafts', label: 'משניות ומלאכות', keywords: ['משני', 'משנה', 'גמרא', 'תורה', 'מלאכות'] },
  // Checked last: generic words like "יצירה" would otherwise swallow more specific names.
  { slug: 'art', label: 'אומנות', keywords: ['אומנות', 'אמנות', 'ציור', 'יצירה', 'קרמיקה', 'פיסול', 'רישום', 'צילום'] },
];

export const FALLBACK_SLUG = 'community';

export function activitySlug(name: string): string {
  const n = (name || '').replace(/[״"]/g, '');
  for (const a of ACTIVITY_IMAGES) if (a.keywords.some((k) => n.includes(k))) return a.slug;
  return FALLBACK_SLUG;
}

export interface CourseImageSource {
  src: string;
  srcSet?: string;
  custom: boolean;
  slug: string;
}

export function courseImage(course: Pick<Course, 'name' | 'image'>): CourseImageSource {
  const slug = activitySlug(course.name);
  if (course.image) return { src: course.image, custom: true, slug };
  return {
    src: `/courses/${slug}-800.webp`,
    srcSet: `/courses/${slug}-800.webp 800w, /courses/${slug}-1280.webp 1280w`,
    custom: false,
    slug,
  };
}

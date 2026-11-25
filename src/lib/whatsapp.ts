import { compact, dayName, dm } from './dates';
import { normPhone } from './format';

/** An Israeli number as WhatsApp wants it (972XXXXXXXXX), or '' when it isn't a usable number. */
export function waNumber(phone?: string) {
  const p = normPhone(phone);
  return /^0\d{8,9}$/.test(p) ? '972' + p.slice(1) : '';
}

/**
 * A link that opens WhatsApp with the message typed in. With a phone number it opens that chat;
 * without one WhatsApp asks which contact to send it to.
 */
export function waHref(phone: string | undefined, text: string) {
  const n = waNumber(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || '';

/** Reminder to an instructor to mark a session that already happened. */
export function reminderText(instructor: string, course: string, cid: string, date: string, origin: string) {
  const hi = instructor ? `היי ${firstName(instructor)}` : 'היי';
  return `${hi}, תזכורת קטנה לסמן נוכחות בחוג ${course} מיום ${dayName(date)} ${dm(date)}:\n${origin}/course/${cid}/${compact(date)}\nתודה!`;
}

/** Friendly check-in to a parent whose child hasn't come lately. */
export function parentText(mother: string | undefined, child: string, course: string) {
  const hi = mother ? `שלום ${firstName(mother)}` : 'שלום';
  return `${hi}, כאן מגרעין אומץ עכו. שמנו לב ש${child} לא הגיע/ה לחוג ${course} בפעמים האחרונות. רצינו לשאול שהכול בסדר, ונשמח לראות אותו/ה שוב!`;
}

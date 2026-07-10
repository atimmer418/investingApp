import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Renders chat markdown (GFM: tables, lists, code) to sanitized HTML.
 * Pure pipe — Angular memoizes per binding, so streaming messages only
 * re-parse when their content actually changes.
 *
 * DOMPurify is the sanitizer; the result is marked trusted so Angular's
 * DomSanitizer doesn't re-parse (and re-strip) the whole message per token.
 * Images are forbidden — model-emitted remote images would be a tracking
 * vector, and charts are the supported visual.
 */
@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private domSanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const html = marked.parse(value, { gfm: true, breaks: true, async: false }) as string;
    const clean = DOMPurify.sanitize(html, { FORBID_TAGS: ['img'] });
    return this.domSanitizer.bypassSecurityTrustHtml(clean);
  }
}

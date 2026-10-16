/**
 * Read the structure of an Adressa article page: lead, «Kort oppsummert», main photo and body.
 * Self-contained so Playwright can run it with page.evaluate (see browser.py).
 *
 * `visibleText` is the set of paragraphs extractPage judged visible and ungated; the structured
 * body only keeps blocks from that set, so it can never include more than the logged-in page shows.
 */
function extractStructure(visibleText) {
  const clean = value => String(value ?? '').replace(/[-]/g, '').replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  const shown = el => Boolean(el?.checkVisibility?.({checkOpacity: true, checkVisibilityCSS: true}));
  const visible = new Set(visibleText);
  const root = document.querySelector('article#main-article');
  const header = root?.querySelector('.article-header');
  const lead = clean(header?.querySelector('p.lead')?.innerText) || null;

  const summary = root?.querySelector('.ArticleSummary');
  const bullets = summary && shown(summary)
    ? Array.from(summary.querySelectorAll('li')).filter(shown).map(el => clean(el.innerText)).filter(Boolean)
    : [];
  // The disclosure under the summary is attribution (AI use and editorial review), kept as is.
  const disclosure = summary?.querySelector('small');
  const disclosureLink = disclosure?.querySelector('a[href]');
  const disclosureText = disclosure
    ? clean(Array.from(disclosure.childNodes).filter(n => n !== disclosureLink).map(n => n.textContent).join(' '))
    : null;

  const image = Array.from(header?.querySelectorAll('figure img') || []).find(el => shown(el) && el.naturalWidth >= 400);
  const caption = image?.closest('figure')?.querySelector('figcaption')
    || Array.from(header?.querySelectorAll('figcaption') || []).find(el => shown(el) && clean(el.innerText));

  const blocks = [];
  const skip = '.ArticleSummary, article, figure, aside, nav, form, .polarisMarketing, .media, .integration, [data-ad-placement]';
  for (const el of root?.querySelector('.article-body')?.children || []) {
    if (el.matches(skip) || !shown(el)) continue;
    const value = clean(el.innerText);
    if (/^H[2-6]$/.test(el.tagName) && visible.has(value)) blocks.push({type: 'heading', text: value});
    else if (el.tagName === 'P' && visible.has(value)) blocks.push({type: 'paragraph', text: value});
    else if (el.tagName === 'UL' || el.tagName === 'OL') {
      const items = Array.from(el.querySelectorAll(':scope > li')).map(li => clean(li.innerText)).filter(t => visible.has(t));
      if (items.length) blocks.push({type: 'list', items});
    }
  }
  return {
    lead,
    summary: bullets.length ? {
      heading: clean(summary.querySelector('h2, h3')?.innerText) || 'Kort oppsummert',
      bullets,
      disclosure: disclosureText || null,
      disclosureUrl: disclosureLink?.href || null,
    } : null,
    image: image ? {
      url: image.currentSrc || image.src,
      alt: clean(image.alt) || null,
      caption: clean(caption?.innerText) || null,
      width: image.naturalWidth,
      height: image.naturalHeight,
    } : null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    blocks,
  };
}

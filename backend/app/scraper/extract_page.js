/**
 * Read the currently rendered page. This function is deliberately self-contained
 * so Playwright can run it with page.evaluate (see browser.py).
 *
 * `available` describes this rendered view, never a guarantee of completeness.
 * Account state is inferred only from the visible page, never from cookies.
 */
function extractPage() {
  const clean = (value) => String(value ?? '')
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  const articlePath = (path) => /(?:^|\/)i\/[a-z0-9]+(?:\/|$)/i.test(path)
    || /\/article(?:\d|[\/_?.-])/i.test(path);
  const localUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, window.location.href);
      if (url.protocol !== 'https:' || url.username || url.password
          || !['adressa.no', 'www.adressa.no'].includes(url.hostname)
          || (url.port && url.port !== '443')) return null;
      url.hash = '';
      url.search = '';
      return url.href;
    } catch {
      return null;
    }
  };
  const currentUrl = localUrl(window.location.href);
  const canonical = localUrl(document.querySelector('link[rel="canonical"]')?.href);
  const url = canonical || currentUrl;
  const hasLayout = document.documentElement.getClientRects().length > 0;
  const visible = (element) => {
    if (!element || !element.isConnected) return false;
    for (let node = element; node?.nodeType === 1; node = node.parentElement) {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true'
          || node.hasAttribute('inert')) return false;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden'
          || style.visibility === 'collapse' || style.contentVisibility === 'hidden'
          || style.opacity === '0') return false;
      if (node.tagName === 'DETAILS' && !node.open
          && !node.querySelector('summary')?.contains(element)) return false;
    }
    if (hasLayout && !Array.from(element.getClientRects()).some(
      (rect) => rect.width > 0 && rect.height > 0,
    )) return false;
    // Do not return a whole paragraph when a collapsed preview clips its text.
    if (hasLayout) {
      const box = element.getBoundingClientRect();
      for (let node = element.parentElement; node; node = node.parentElement) {
        const style = window.getComputedStyle(node);
        const clipX = ['hidden', 'clip'].includes(style.overflowX || style.overflow);
        const clipY = ['hidden', 'clip'].includes(style.overflowY || style.overflow);
        if (!clipX && !clipY) continue;
        const parentBox = node.getBoundingClientRect();
        if ((clipX && (box.left < parentBox.left - 1 || box.right > parentBox.right + 1))
            || (clipY && (box.top < parentBox.top - 1 || box.bottom > parentBox.bottom + 1))) {
          return false;
        }
      }
    }
    return true;
  };
  const text = (element) => {
    if (!visible(element)) return '';
    if (typeof element.innerText === 'string') return clean(element.innerText);
    // A fallback for DOM test environments. Browsers use rendered innerText.
    const read = (node) => {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1 || !visible(node)
          || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(node.tagName)) return '';
      if (node.tagName === 'BR') return '\n';
      return Array.from(node.childNodes, read).join('');
    };
    return clean(read(element));
  };
  const excludedSelector = [
    'nav', 'footer', 'aside', 'figcaption', '[role="navigation"]',
    '[role="dialog"]', '.Teaser', '.teaser', '.related', '.related-articles',
    '.relatedArticles', '.recommended', '.recommendations', '.comments',
    '.comment-section', '[id*="comment" i]', '[class*="comment-" i]',
    '[data-testid*="related" i]', '[data-testid*="comment" i]',
    '.share', '.share-buttons', '.byline', '.authors', '.author', '.advertisement',
    '[data-ad]', '[data-advertisement]',
  ].join(',');
  const excluded = (element) => Boolean(element.closest(excludedSelector));
  const mainArticle = document.querySelector('article#main-article')
    || Array.from(document.querySelectorAll('main article, article'))
      .find((element) => !element.matches('.Teaser, .teaser') && element.querySelector('h1'));
  const scope = mainArticle || document.querySelector('main') || document.body;
  const heading = Array.from(scope.querySelectorAll('.article-header h1, h1'))
    .find((element) => visible(element) && !excluded(element));
  const headingText = text(heading);
  const meta = (selector) => clean(document.querySelector(selector)?.getAttribute('content'));

  // Only metadata fields are inspected. articleBody and other hidden story text
  // are intentionally never read or used as a content source.
  const articleMetadata = [];
  const collectMetadata = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 8) return;
    if (Array.isArray(value)) {
      for (const item of value) collectMetadata(item, depth + 1);
      return;
    }
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.some((type) => /(?:^|[/#])(?:\w*Article|BlogPosting)$/i.test(String(type)))) {
      articleMetadata.push(value);
    }
    collectMetadata(value['@graph'], depth + 1);
    collectMetadata(value.mainEntity, depth + 1);
  };
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      if (script.textContent.length <= 2_000_000) collectMetadata(JSON.parse(script.textContent));
    } catch {
      // A malformed metadata block must not prevent rendered content extraction.
    }
  }
  const scoreMetadata = (entry) => {
    let score = 0;
    if (headingText && clean(entry.headline || entry.name) === headingText) score += 4;
    if (url && localUrl(entry.url || entry['@id']) === url) score += 2;
    if (entry.headline) score += 1;
    return score;
  };
  articleMetadata.sort((a, b) => scoreMetadata(b) - scoreMetadata(a));
  const metadata = articleMetadata[0] || {};
  const authors = [];
  const addAuthor = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) addAuthor(item);
      return;
    }
    const name = clean(typeof value === 'string' ? value : value?.name);
    if (name && name.length <= 200 && !authors.includes(name)) authors.push(name);
  };
  addAuthor(metadata.author);
  if (!authors.length) {
    for (const element of scope.querySelectorAll('[rel="author"], [itemprop="author"] [itemprop="name"], .byline .name')) {
      addAuthor(text(element));
    }
    if (!authors.length) addAuthor(meta('meta[name="author"]'));
  }
  const title = headingText || clean(metadata.headline || metadata.name)
    || meta('meta[property="og:title"]') || clean(document.title);
  const description = meta('meta[name="description"]')
    || meta('meta[property="og:description"]') || clean(metadata.description) || null;
  const published = clean(metadata.datePublished)
    || meta('meta[property="article:published_time"]')
    || clean(scope.querySelector('time[datetime]')?.getAttribute('datetime')) || null;
  const modified = clean(metadata.dateModified)
    || meta('meta[property="article:modified_time"]') || null;

  const articlePage = Boolean(heading && (mainArticle || (url && articlePath(new URL(url).pathname))));
  const gateSelector = [
    'iframe#dakapopaywall', 'iframe[id*="paywall" i]', '.dakapo',
    '[data-testid*="paywall" i]', '[data-paywall]', '.subscription-gate',
    '.paywall', '#paywall',
  ].join(',');
  const gateElements = articlePage
    ? Array.from(scope.querySelectorAll(gateSelector))
      .filter((element) => visible(element) && !excluded(element))
    : [];
  const gatePattern = /(?:denne\s+)?artikkelen\s+er\s+(?:kun\s+)?for\s+abonnenter|logg\s+inn\s+for\s+å\s+lese|(?:bli|må\s+være)\s+abonnent|kjøp\s+abonnement|abonner\s+(?:for\s+å\s+)?lese|for\s+å\s+lese\s+(?:hele|videre)/i;
  if (articlePage && !gateElements.length) {
    for (const element of scope.querySelectorAll('p, h2, h3, h4, button, div')) {
      if (!visible(element) || excluded(element)) continue;
      const value = text(element);
      if (value.length > 600 || !value) continue;
      if (gatePattern.test(value)
          || (/allerede\s+abonnent\??/i.test(value) && /logg\s+inn/i.test(value))) {
        gateElements.push(element);
        break;
      }
    }
  }
  const hasGate = gateElements.length > 0;
  const explicitBodies = articlePage ? Array.from(scope.querySelectorAll([
    '[itemprop="articleBody"]', '.article-body', '.article__body', '.articleBody',
    '.article-content', '.article__content', '.articleContent', '.article-text',
    '.article__text', '.articleText', '.bodytext',
    '[data-testid="article-body"]', '[data-testid="article-content"]', '[data-article-body]',
  ].join(','))).filter((element) => visible(element) && !excluded(element)) : [];
  // Keep the outermost explicit body to avoid processing nested body selectors twice.
  const bodyRoots = explicitBodies.filter((element) => !explicitBodies.some(
    (other) => other !== element && other.contains(element),
  ));
  if (!bodyRoots.length && articlePage && mainArticle) bodyRoots.push(mainArticle);
  const paragraphs = [];
  const seenParagraphs = new Set();
  const addParagraph = (element) => {
    if (!visible(element) || excluded(element)
        || element.closest('header, .article-header, .dakapo, .paywall, #paywall')
        || gateElements.some((gate) => gate.contains(element) || element.contains(gate))) return;
    const value = text(element);
    if (!value || value.length < 2 || seenParagraphs.has(value)) return;
    seenParagraphs.add(value);
    paragraphs.push(value);
  };
  // A visible gate can cover otherwise rendered DOM. Return only a separate,
  // visible lead in that case rather than assume the article underneath is readable.
  if (!hasGate) {
    for (const root of bodyRoots) {
      for (const element of root.querySelectorAll('p, h2, h3, h4, li')) addParagraph(element);
    }
  }
  const lead = articlePage ? Array.from(scope.querySelectorAll('.article-header p.lead, .article-header .lead, p.lead'))
    .find((element) => visible(element) && !excluded(element)) : null;
  const leadText = text(lead);
  if (leadText && !seenParagraphs.has(leadText)
      && !gateElements.some((gate) => gate.contains(lead))) paragraphs.unshift(leadText);
  const body = paragraphs.join('\n\n');
  const substantiveParagraphs = paragraphs.filter((value) => value.length >= 40);
  let access = { state: 'unknown', reason: 'No confidently identifiable rendered article text was found.' };
  if (!articlePage) {
    access = { state: 'unknown', reason: 'This is a listing or an unrecognized article page; only article links were extracted.' };
  } else if (hasGate) {
    access = {
      state: body ? 'partial' : 'restricted',
      reason: 'A visible subscription or login gate is present. Only a separate visible introduction, if any, is returned.',
    };
  } else if (body.length >= 500 && substantiveParagraphs.length >= 3) {
    access = {
      state: 'available',
      reason: 'Substantial article text is visibly rendered and no gate was detected. This does not guarantee completeness.',
    };
  } else if (body) {
    access = {
      state: 'partial',
      reason: 'Only a short amount of rendered article text was identified; access and completeness cannot be confirmed.',
    };
  }

  const articles = [];
  const seenUrls = new Set();
  for (const anchor of document.querySelectorAll('a[href]')) {
    const link = localUrl(anchor.getAttribute('href'));
    if (!link || !articlePath(new URL(link).pathname) || seenUrls.has(link)
        || !visible(anchor) || anchor.closest('nav, footer, [role="navigation"]')) continue;
    const linkHeading = anchor.querySelector('h1, h2, h3, h4') || anchor.closest('h1, h2, h3, h4');
    const card = anchor.closest('.Teaser, .teaser, article, [data-testid*="teaser" i]');
    let linkTitle = text(linkHeading);
    if (!linkTitle && card) linkTitle = text(anchor);
    if (!linkTitle || linkTitle.length < 4 || linkTitle.length > 500) continue;
    seenUrls.add(link);
    articles.push({ title: linkTitle, url: link });
  }
  return { title, description, published, modified, authors, url, articles, body, access };
}

export interface EntityMapping {
  name: string;
  type: 'Organization' | 'FinancialProduct' | 'Thing' | 'GovernmentOrganization';
  sameAs: string;
  keywords: string[];
}

export const CROWDFUNDING_ENTITIES: EntityMapping[] = [
  {
    name: 'Sermaye Piyasası Kurulu',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q5035620',
    keywords: ['SPK', 'Sermaye Piyasası Kurulu'],
  },
  {
    name: 'Kitle Fonlaması',
    type: 'Thing',
    sameAs: 'https://www.wikidata.org/wiki/Q348303',
    keywords: ['kitle fonlaması', 'kitle fonlama', 'crowdfunding'],
  },
  {
    name: 'Girişim Sermayesi',
    type: 'FinancialProduct',
    sameAs: 'https://www.wikidata.org/wiki/Q219409',
    keywords: ['girişim sermayesi', 'venture capital', 'GSYO', 'GSYF', 'risk sermayesi'],
  },
  {
    name: 'TÜBİTAK',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q2096577',
    keywords: ['TÜBİTAK', 'TUBITAK'],
  },
  {
    name: 'Melek Yatırımcı',
    type: 'Thing',
    sameAs: 'https://www.wikidata.org/wiki/Q778274',
    keywords: ['melek yatırımcı', 'melek yatırım', 'angel investor'],
  },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchEntities(text: string) {
  if (!text) return [];
  const about: Array<{ '@type': string; name: string; sameAs: string }> = [];
  const lower = text.toLocaleLowerCase('tr-TR');

  for (const ent of CROWDFUNDING_ENTITIES) {
    const matched = ent.keywords.some((kw) => {
      const lowerKw = kw.toLocaleLowerCase('tr-TR');
      const escaped = escapeRegex(lowerKw);
      // For short acronyms (e.g. SPK, GSYO), strictly enforce both start and end word-boundaries
      // to avoid substring false positives (e.g. 'başpiskopos').
      // Suffixes with apostrophe like "SPK'nın" will still match because apostrophe is not a letter/number.
      // For multi-word phrases (e.g. 'melek yatırımcı'), require word-boundary at the start so inflected
      // forms like 'melek yatırımcılar' or 'melek yatırımcılara' match seamlessly.
      const isShortAcronym = kw.length <= 5;
      const pattern = isShortAcronym
        ? new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u')
        : new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'u');
      return pattern.test(lower);
    });

    if (matched) {
      about.push({
        '@type': ent.type,
        name: ent.name,
        sameAs: ent.sameAs,
      });
    }
  }

  return about.slice(0, 4);
}

export function findEntities(text: string) {
  const matched = matchEntities(text);
  return {
    about: matched.slice(0, 2),
    mentions: matched.slice(2),
  };
}

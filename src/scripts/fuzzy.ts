// Fuzzy search for terminal menus, in the style of fzf: every query term must
// appear in one of an entry's fields, either as a substring or as characters in
// order starting at the beginning of a word ("rbuf" finds "ring buffer").
// Numeric terms such as dates match exact substrings only, so "2026-10" does not
// find "2026-01-02". Consecutive characters and word starts score higher; a field
// earlier in the list (the title) counts more than later ones. Long text such as
// a post body also matches exact substrings only.

export interface Searchable {
    // Short fields, most important first: title, then date or format, then summary.
    fields: string[];
    // Optional long text, matched by substring only.
    body: string;
}

const FIELD_WEIGHTS = [3, 2, 1] as const;
const BODY_SCORE = 1;
const TERMS_MAX = 8;

function is_word_start(text: string, index: number): boolean {
    if (index === 0) { return true; }
    return !/[\p{L}\p{N}]/u.test(text[index - 1] ?? '');
}

function scattered_score(text: string, term: string, start: number): number {
    let score = 0;
    let previous = start - 2;
    let position = start;
    for (const character of term) {
        const found = text.indexOf(character, position);
        if (found < 0) { return 0; }
        score += 1;
        if (found === previous + 1) { score += 3; }
        if (is_word_start(text, found)) { score += 2; }
        previous = found;
        position = found + 1;
    }
    return score;
}

// Returns a positive score when term matches text, or 0 when it does not. Both
// arguments must already be lower case.
export function subsequence_score(text: string, term: string): number {
    if (term.length === 0) { throw new Error('Empty search term'); }
    // Prefer a contiguous match: it is what people usually mean.
    const exact = text.indexOf(term);
    if (exact >= 0) { return term.length * 4 + (is_word_start(text, exact) ? 6 : 0) + 2; }
    if (is_numeric(term)) { return 0; }
    let best = 0;
    for (let start = text.indexOf(term[0] ?? ''); start >= 0; start = text.indexOf(term[0] ?? '', start + 1)) {
        if (is_word_start(text, start)) { best = Math.max(best, scattered_score(text, term, start)); }
    }
    return best;
}

function is_numeric(term: string): boolean {
    return /^[\d./:-]+$/.test(term);
}

export function search_terms(query: string): string[] {
    return query.toLowerCase().split(/\s+/).filter(term => term.length > 0).slice(0, TERMS_MAX);
}

// Scores an entry against the terms; 0 means it does not match.
export function entry_score(entry: Searchable, terms: string[]): number {
    let total = 0;
    for (const term of terms) {
        let best = 0;
        entry.fields.forEach((field, index) => {
            const weight = FIELD_WEIGHTS[index] ?? 1;
            best = Math.max(best, subsequence_score(field.toLowerCase(), term) * weight);
        });
        if (best === 0 && entry.body.toLowerCase().includes(term)) { best = BODY_SCORE; }
        if (best === 0) { return 0; }
        total += best;
    }
    return total;
}

// Returns the indices of matching entries, best first; ties keep their original order.
export function fuzzy_filter(entries: Searchable[], query: string): number[] {
    const terms = search_terms(query);
    if (terms.length === 0) { return entries.map((_, index) => index); }
    return entries
        .map((entry, index) => ({ index, score: entry_score(entry, terms) }))
        .filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(match => match.index);
}

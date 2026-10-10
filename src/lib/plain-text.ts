// Reduces Markdown to plain words for search: drops syntax, keeps code text.
export function markdown_plain_text(markdown: string): string {
    return markdown
        .replace(/```[^\n]*\n/g, ' ')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[#>*_`~|-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

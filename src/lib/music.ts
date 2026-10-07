import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type MusicKind = 'recording' | 'project';
export interface MusicFile { title: string; href: string; format: string; kind: MusicKind; size: string }

// Files placed here are published at /music/<name>. Astro runs from the project root.
const MUSIC_DIRECTORY = join(process.cwd(), 'public', 'music');

// Logic projects are macOS bundle directories, so they are published zipped.
const FORMATS: readonly { suffix: string; label: string; kind: MusicKind }[] = [
    { suffix: '.flac', label: 'FLAC', kind: 'recording' },
    { suffix: '.mp3', label: 'MP3', kind: 'recording' },
    { suffix: '.flp', label: 'FL STUDIO', kind: 'project' },
    { suffix: '.bwproject', label: 'BITWIG', kind: 'project' },
    { suffix: '.logicx.zip', label: 'LOGIC PRO', kind: 'project' },
];

function format_size(bytes: number): string {
    if (bytes < 1024 * 1024) { return `${Math.max(1, Math.round(bytes / 1024))} KB`; }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function read_music_files(): MusicFile[] {
    let names: string[];
    try { names = readdirSync(MUSIC_DIRECTORY); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') { return []; }
        throw error;
    }
    const files = names.filter(name => !name.startsWith('.')).map(name => {
        const format = FORMATS.find(({ suffix }) => name.toLowerCase().endsWith(suffix));
        if (!format) {
            const supported = FORMATS.map(({ suffix }) => suffix).join(', ');
            throw new Error(`public/music/${name} has an unsupported format. Use one of: ${supported}`);
        }
        return {
            title: name.slice(0, -format.suffix.length),
            href: `/music/${encodeURIComponent(name)}`,
            format: format.label,
            kind: format.kind,
            size: format_size(statSync(join(MUSIC_DIRECTORY, name)).size),
        };
    });
    // Recordings first, then project files, each alphabetically.
    return files.sort((a, b) => a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === 'recording' ? -1 : 1);
}

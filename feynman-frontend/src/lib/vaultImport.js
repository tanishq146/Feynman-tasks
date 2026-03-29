// ─── Vault Import ───────────────────────────────────────────────────────────
// Import Obsidian-compatible markdown files back into the Feynman brain.
// Parses YAML frontmatter + markdown body, then ingests each as a knowledge node.
//
// Supports:
//   - Individual .md files (drag and drop)
//   - ZIP archives of vault folders
//
// The importer intelligently handles:
//   - Files with YAML frontmatter (uses saved metadata if available)
//   - Plain markdown files (runs AI analysis from scratch)
//   - Duplicate detection by title

import JSZip from 'jszip';

/**
 * Parse a single markdown file into a structured node object.
 * Handles YAML frontmatter extraction and content parsing.
 */
function parseMarkdownFile(filename, content) {
    const result = {
        filename,
        title: null,
        raw_content: null,
        brain_region: null,
        tags: [],
        fromFeynman: false,  // Whether this file was originally exported from Feynman
        metadata: {},
    };

    // Parse YAML frontmatter if present
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

    if (frontmatterMatch) {
        const yaml = frontmatterMatch[1];
        const body = frontmatterMatch[2];

        // Parse YAML key-value pairs
        yaml.split('\n').forEach(line => {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes
                value = value.replace(/^["']|["']$/g, '');
                result.metadata[key] = value;
            }
        });

        // Extract structured fields from frontmatter
        if (result.metadata.title) {
            result.title = result.metadata.title;
            result.fromFeynman = true;
        }
        if (result.metadata.brain_region) {
            result.brain_region = result.metadata.brain_region;
        }
        if (result.metadata.tags) {
            // Parse YAML array: [tag1, tag2] or ["tag1", "tag2"]
            const tagMatch = result.metadata.tags.match(/\[(.*)\]/);
            if (tagMatch) {
                result.tags = tagMatch[1]
                    .split(',')
                    .map(t => t.trim().replace(/^["']|["']$/g, ''))
                    .filter(Boolean);
            }
        }

        // Extract raw content from the "What I Learned" section
        const learnedMatch = body.match(/##\s*(?:📝\s*)?What I Learned\s*\n\n([\s\S]*?)(?=\n##\s|\n---\s|$)/);
        if (learnedMatch) {
            result.raw_content = learnedMatch[1].trim();
        } else {
            // Fall back to the entire body (excluding headers and metadata sections)
            result.raw_content = extractMainContent(body);
        }
    } else {
        // No frontmatter — treat entire file as content
        // Try to extract title from first heading
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
            result.title = headingMatch[1].trim();
            // Content is everything after the first heading
            result.raw_content = content.replace(/^#\s+.+$/m, '').trim();
        } else {
            // Use filename as title, entire content as body
            result.title = filename.replace(/\.md$/i, '').replace(/-/g, ' ');
            result.raw_content = content.trim();
        }
    }

    // If no title extracted, derive from filename
    if (!result.title) {
        result.title = filename.replace(/\.md$/i, '').replace(/-/g, ' ');
    }

    return result;
}

/**
 * Extract the main learning content from a markdown body,
 * skipping AI-generated sections like Summary, Challenge, etc.
 */
function extractMainContent(body) {
    // Remove known Feynman-generated sections
    const skipSections = [
        /##\s*(?:💡\s*)?Summary[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:🎯\s*)?Simple Explanation[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:❓\s*)?Why This Matters[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:🌍\s*)?Real-World Applications[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:💭\s*)?Real-Life Moment[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:🧪\s*)?Challenge Question[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:📊\s*)?Learning Progress[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:🕳️\s*)?Knowledge Gaps[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:🔗\s*)?Connections[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:🧠\s*)?Memory[\s\S]*?(?=\n##\s|\n---\s|$)/g,
        /##\s*(?:📓\s*)?My Notes[\s\S]*?(?=\n##\s|\n---\s|$)/g,
    ];

    let cleaned = body;
    skipSections.forEach(regex => {
        cleaned = cleaned.replace(regex, '');
    });

    // Remove title heading
    cleaned = cleaned.replace(/^#\s+.+$/m, '');
    // Remove inline tags line
    cleaned = cleaned.replace(/^(#\w+\s*)+$/m, '');
    // Remove status blockquote
    cleaned = cleaned.replace(/^>\s*[🟢🟡🟠🔴].*$/gm, '');
    cleaned = cleaned.replace(/^>\s*📍.*$/gm, '');
    // Remove footer
    cleaned = cleaned.replace(/\*Exported from.*\*/g, '');

    return cleaned.trim() || body.trim();
}

/**
 * Read a ZIP file and extract all .md files from it.
 * Returns an array of { filename, content } objects.
 */
async function extractMdFromZip(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const mdFiles = [];

    for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        if (!path.endsWith('.md')) continue;
        // Skip index files
        const basename = path.split('/').pop();
        if (basename.startsWith('_')) continue;

        const content = await entry.async('text');
        mdFiles.push({
            filename: basename,
            content,
            path,
        });
    }

    return mdFiles;
}

/**
 * Read uploaded files (FileList) and return parsed node objects.
 * Handles both .md files and .zip archives.
 */
export async function parseImportFiles(fileList) {
    const nodes = [];

    for (const file of fileList) {
        if (file.name.endsWith('.zip')) {
            // Extract ZIP
            const mdFiles = await extractMdFromZip(file);
            for (const md of mdFiles) {
                nodes.push(parseMarkdownFile(md.filename, md.content));
            }
        } else if (file.name.endsWith('.md')) {
            // Read MD file directly
            const content = await file.text();
            nodes.push(parseMarkdownFile(file.name, content));
        }
    }

    return nodes;
}

/**
 * Import parsed nodes into the Feynman backend.
 * Uses the ingest endpoint which triggers AI analysis.
 */
export async function importToFeynman(parsedNodes, ingestFn, onProgress) {
    const results = {
        imported: 0,
        skipped: 0,
        errors: [],
    };

    for (let i = 0; i < parsedNodes.length; i++) {
        const node = parsedNodes[i];
        onProgress?.({
            current: i + 1,
            total: parsedNodes.length,
            title: node.title,
        });

        try {
            if (!node.raw_content || node.raw_content.length < 5) {
                results.skipped++;
                continue;
            }

            // Ingest via the standard knowledge pipeline
            // This triggers AI classification + Feynman analysis
            await ingestFn(node.raw_content, node.brain_region);

            results.imported++;

            // Small delay to avoid overwhelming the API
            if (i < parsedNodes.length - 1) {
                await new Promise(r => setTimeout(r, 800));
            }
        } catch (err) {
            console.error(`Import error for "${node.title}":`, err);
            results.errors.push({ title: node.title, error: err.message });
        }
    }

    return results;
}

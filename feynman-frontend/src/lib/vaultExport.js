// ─── Vault Export ───────────────────────────────────────────────────────────
// Obsidian-style local vault export. Generates a ZIP of markdown (.md) files
// organized by brain region, with YAML frontmatter containing metadata.
//
// Structure:
//   feynman-vault/
//   ├── hippocampus/
//   │   ├── My-Knowledge-Node.md
//   │   └── Another-Node.md
//   ├── prefrontal_cortex/
//   │   └── ...
//   ├── _connections.md   (index of all connections)
//   ├── _goals.md         (learning goals)
//   └── _vault-index.md   (master index)
//
// Files are plain markdown — open with Obsidian, VS Code, Typora, any text editor.
// Sync with Google Drive, iCloud, Dropbox, Git — your data, your choice.

import JSZip from 'jszip';

/**
 * Convert a node title to a safe filename.
 */
function safeFilename(title) {
    return title
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);
}

/**
 * Format a date string for YAML frontmatter.
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toISOString().split('T')[0];
    } catch {
        return dateStr;
    }
}

/**
 * Format a date with time for display.
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Generate an ASCII progress bar for strength visualization.
 */
function strengthBar(strength) {
    const filled = Math.round(strength / 10);
    const empty = 10 - filled;
    return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${Math.round(strength)}%`;
}

/**
 * Generate a status emoji based on strength.
 */
function statusEmoji(strength) {
    if (strength >= 80) return '🟢';
    if (strength >= 60) return '🟡';
    if (strength >= 30) return '🟠';
    return '🔴';
}

/**
 * Generate markdown content for a single knowledge node.
 */
function nodeToMarkdown(node, connections, allNodes) {
    const lines = [];
    const strength = Math.round(node.current_strength || 0);

    // ── YAML Frontmatter ──────────────────────────────────────────────
    lines.push('---');
    lines.push(`title: "${(node.title || '').replace(/"/g, '\\"')}"`);
    lines.push(`id: ${node.id}`);
    lines.push(`brain_region: ${node.brain_region || 'unknown'}`);
    lines.push(`topic: ${node.topic_category || 'general'}`);
    lines.push(`strength: ${strength}`);
    lines.push(`status: ${node.status || 'active'}`);
    lines.push(`decay_rate: ${node.decay_rate || 0}`);
    lines.push(`created: ${formatDate(node.created_at)}`);
    lines.push(`last_reviewed: ${formatDate(node.last_reviewed_at)}`);
    if (node.tags?.length > 0) {
        lines.push(`tags: [${node.tags.map(t => `"${t}"`).join(', ')}]`);
    }
    if (node.feynman?.is_crucial) {
        lines.push(`crucial: true`);
    }
    if (node.feynman?.feynman_certified) {
        lines.push(`feynman_certified: true`);
    }
    // Challenge & teach attempt counts for analytics
    const challengeAttempts = node.feynman?.challenge_attempts?.length || 0;
    const teachAttempts = node.feynman?.teach_attempts?.length || 0;
    if (challengeAttempts > 0) lines.push(`challenge_attempts: ${challengeAttempts}`);
    if (teachAttempts > 0) lines.push(`teach_attempts: ${teachAttempts}`);
    lines.push('---');
    lines.push('');

    // ── Title + Status Badge ──────────────────────────────────────────
    lines.push(`# ${node.title}`);
    lines.push('');

    // Inline Obsidian tags
    if (node.tags?.length > 0) {
        lines.push(node.tags.map(t => `#${t.replace(/\s+/g, '-')}`).join(' '));
        lines.push('');
    }

    // Status line
    const crucialBadge = node.feynman?.is_crucial ? ' ⭐ **CRUCIAL**' : '';
    const certifiedBadge = node.feynman?.feynman_certified ? ' 🏅 **Feynman Certified**' : '';
    lines.push(`> ${statusEmoji(strength)} **Strength:** \`${strengthBar(strength)}\`${crucialBadge}${certifiedBadge}`);
    lines.push(`> 📍 *${regionLabels[node.brain_region] || node.brain_region}* · 📂 *${node.topic_category || 'general'}*`);
    lines.push('');

    // ── What I Learned ────────────────────────────────────────────────
    lines.push('## 📝 What I Learned');
    lines.push('');
    lines.push(node.raw_content || '*No content*');
    lines.push('');

    // ── AI Summary ────────────────────────────────────────────────────
    if (node.summary) {
        lines.push('## 💡 Summary');
        lines.push('');
        lines.push(node.summary);
        lines.push('');
    }

    // ── Personal Notes ────────────────────────────────────────────────
    if (node.personal_notes?.length > 0) {
        lines.push('## 📓 My Notes');
        lines.push('');
        node.personal_notes.forEach((note, i) => {
            const noteDate = formatDateTime(note.created_at);
            lines.push(`### Note ${i + 1} — ${noteDate}`);
            lines.push('');
            lines.push(note.content || '');
            // If note has images
            if (note.image_url) {
                lines.push('');
                lines.push(`![Note image](${note.image_url})`);
            }
            lines.push('');
        });
    }

    // ── Feynman Analysis ──────────────────────────────────────────────
    const f = node.feynman;
    if (f) {
        if (f.simple_explanation) {
            lines.push('## 🎯 Simple Explanation');
            lines.push('');
            lines.push(f.simple_explanation);
            lines.push('');
        }

        if (f.why_important) {
            lines.push('## ❓ Why This Matters');
            lines.push('');
            lines.push(f.why_important);
            lines.push('');
        }

        if (f.real_world_applications?.length > 0) {
            lines.push('## 🌍 Real-World Applications');
            lines.push('');
            f.real_world_applications.forEach(app => {
                lines.push(`- ${app}`);
            });
            lines.push('');
        }

        if (f.real_life_moment) {
            lines.push('## 💭 Real-Life Moment');
            lines.push('');
            lines.push(`> ${f.real_life_moment}`);
            lines.push('');
        }

        if (f.challenge_question) {
            lines.push('## 🧪 Challenge Question');
            lines.push('');
            lines.push(f.challenge_question);
            lines.push('');
        }

        // ── Learning Progress ─────────────────────────────────────────
        if (challengeAttempts > 0 || teachAttempts > 0) {
            lines.push('## 📊 Learning Progress');
            lines.push('');

            if (f.challenge_attempts?.length > 0) {
                lines.push('### Challenge Attempts');
                lines.push('');
                lines.push('| # | Date | Score | Verdict |');
                lines.push('|---|------|-------|---------|');
                f.challenge_attempts.forEach((a, i) => {
                    const verdict = a.score >= 80 ? '✅ Pass' : a.score >= 50 ? '🟡 Partial' : '❌ Fail';
                    lines.push(`| ${i + 1} | ${formatDate(a.created_at)} | ${a.score}/100 | ${verdict} |`);
                });
                lines.push('');
            }

            if (f.teach_attempts?.length > 0) {
                lines.push('### Teach-Back Attempts');
                lines.push('');
                lines.push('| # | Date | Score | Verdict |');
                lines.push('|---|------|-------|---------|');
                f.teach_attempts.forEach((a, i) => {
                    const verdict = a.score >= 80 ? '✅ Pass' : a.score >= 50 ? '🟡 Partial' : '❌ Fail';
                    lines.push(`| ${i + 1} | ${formatDate(a.created_at)} | ${a.score}/100 | ${verdict} |`);
                });
                lines.push('');
            }
        }

        if (f.knowledge_gaps?.length > 0) {
            lines.push('## 🕳️ Knowledge Gaps');
            lines.push('');
            f.knowledge_gaps.forEach(gap => {
                const diffBadge = gap.difficulty === 'hard' ? '🔴' : gap.difficulty === 'medium' ? '🟡' : '🟢';
                lines.push(`### ${diffBadge} ${gap.title}`);
                lines.push(`- **Teaser:** ${gap.teaser}`);
                lines.push(`- **Why it matters:** ${gap.why_it_matters}`);
                lines.push(`- **Difficulty:** ${gap.difficulty}`);
                lines.push('');
            });
        }
    }

    // ── Connections (Obsidian-style [[wikilinks]]) ─────────────────────
    const nodeConnections = connections.filter(
        e => e.source_node_id === node.id || e.target_node_id === node.id
    );

    if (nodeConnections.length > 0) {
        lines.push('## 🔗 Connections');
        lines.push('');
        nodeConnections.forEach(conn => {
            const otherId = conn.source_node_id === node.id
                ? conn.target_node_id
                : conn.source_node_id;
            const otherNode = allNodes.find(n => n.id === otherId);
            const otherTitle = otherNode?.title || 'Unknown';
            const type = conn.connection_type || 'related';
            const reason = conn.reason ? ` — ${conn.reason}` : '';
            const connStrength = conn.connection_strength ? ` (${conn.connection_strength}%)` : '';
            lines.push(`- **${type}**${connStrength} → [[${otherTitle}]]${reason}`);
        });
        lines.push('');
    }

    // ── Memory Stats ──────────────────────────────────────────────────
    lines.push('## 🧠 Memory');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Strength | ${strengthBar(strength)} |`);
    lines.push(`| Status | ${node.status || 'active'} |`);
    lines.push(`| Decay Rate | ${((node.decay_rate || 0) * 100).toFixed(1)}%/day |`);
    lines.push(`| Created | ${formatDateTime(node.created_at)} |`);
    lines.push(`| Last Reviewed | ${formatDateTime(node.last_reviewed_at)} |`);
    if (challengeAttempts > 0) lines.push(`| Challenge Attempts | ${challengeAttempts} |`);
    if (teachAttempts > 0) lines.push(`| Teach Attempts | ${teachAttempts} |`);
    if (node.personal_notes?.length > 0) lines.push(`| Personal Notes | ${node.personal_notes.length} |`);
    lines.push('');

    // ── Footer ────────────────────────────────────────────────────────
    lines.push('---');
    lines.push(`*Exported from [Feynman](https://feynman-tasks.vercel.app) on ${formatDate(new Date().toISOString())}*`);
    lines.push('');

    return lines.join('\n');
}

/**
 * Region display labels with emojis.
 */
const regionLabels = {
    hippocampus: '🔮 Hippocampus (Facts & Memory)',
    prefrontal_cortex: '🧩 Prefrontal Cortex (Planning & Logic)',
    amygdala: '❤️ Amygdala (Emotions & Values)',
    cerebellum: '⚡ Cerebellum (Skills & Procedures)',
    wernickes_area: '📝 Wernickes Area (Language & Communication)',
    occipital_lobe: '👁️ Occipital Lobe (Visual & Spatial)',
    temporal_lobe: '🎵 Temporal Lobe (Audio & Patterns)',
    uncategorized: '📂 Uncategorized',
};

/**
 * Generate the master vault index file.
 */
function generateVaultIndex(nodes, edges, exportedAt, goals) {
    const lines = [];
    lines.push('---');
    lines.push(`title: Feynman Vault`);
    lines.push(`exported: ${formatDate(exportedAt)}`);
    lines.push(`total_nodes: ${nodes.length}`);
    lines.push(`total_connections: ${edges.length}`);
    lines.push('---');
    lines.push('');
    lines.push('# ✦ Feynman Vault');
    lines.push('');
    lines.push(`> Exported on ${new Date(exportedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    lines.push(`> **${nodes.length}** knowledge nodes · **${edges.length}** connections`);
    lines.push('');

    // Stats overview
    const strongCount = nodes.filter(n => (n.current_strength || 0) >= 80).length;
    const fadingCount = nodes.filter(n => (n.current_strength || 0) < 60 && (n.current_strength || 0) >= 30).length;
    const criticalCount = nodes.filter(n => (n.current_strength || 0) < 30).length;
    const crucialCount = nodes.filter(n => n.feynman?.is_crucial).length;
    const certifiedCount = nodes.filter(n => n.feynman?.feynman_certified).length;
    const totalNotes = nodes.reduce((sum, n) => sum + (n.personal_notes?.length || 0), 0);

    lines.push('## 📊 Brain Stats');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| 🟢 Strong (80%+) | ${strongCount} |`);
    lines.push(`| 🟡 Stable (60-79%) | ${nodes.length - strongCount - fadingCount - criticalCount} |`);
    lines.push(`| 🟠 Fading (30-59%) | ${fadingCount} |`);
    lines.push(`| 🔴 Critical (<30%) | ${criticalCount} |`);
    lines.push(`| ⭐ Crucial | ${crucialCount} |`);
    lines.push(`| 🏅 Feynman Certified | ${certifiedCount} |`);
    lines.push(`| 📓 Personal Notes | ${totalNotes} |`);
    lines.push('');

    lines.push('## 📂 Your Knowledge');
    lines.push('');
    lines.push('This vault contains your entire knowledge brain exported as plain markdown files.');
    lines.push('');
    lines.push('**No lock-in** — these are just files. Open them with:');
    lines.push('- [Obsidian](https://obsidian.md) *(recommended — wikilinks work natively)*');
    lines.push('- VS Code');
    lines.push('- Any text editor');
    lines.push('');
    lines.push('**Sync anywhere** — store this folder in:');
    lines.push('- Google Drive / iCloud / Dropbox');
    lines.push('- Git *(track your learning over time)*');
    lines.push('');

    // Goals section
    if (goals?.length > 0) {
        lines.push('## 🎯 Learning Goals');
        lines.push('');
        goals.forEach(goal => {
            lines.push(`- ${goal}`);
        });
        lines.push('');
    }

    // Group by brain region
    const byRegion = {};
    nodes.forEach(n => {
        const region = n.brain_region || 'uncategorized';
        if (!byRegion[region]) byRegion[region] = [];
        byRegion[region].push(n);
    });

    Object.entries(byRegion)
        .sort(([, a], [, b]) => b.length - a.length)
        .forEach(([region, regionNodes]) => {
            const label = regionLabels[region] || region;
            lines.push(`### ${label}`);
            lines.push('');
            regionNodes
                .sort((a, b) => (b.current_strength || 0) - (a.current_strength || 0))
                .forEach(n => {
                    const strength = Math.round(n.current_strength || 0);
                    const emoji = statusEmoji(strength);
                    const crucial = n.feynman?.is_crucial ? ' ⭐' : '';
                    const certified = n.feynman?.feynman_certified ? ' 🏅' : '';
                    const noteCount = n.personal_notes?.length > 0 ? ` 📓${n.personal_notes.length}` : '';
                    lines.push(`- ${emoji} [[${n.title}]] — ${strength}%${crucial}${certified}${noteCount}`);
                });
            lines.push('');
        });

    lines.push('---');
    lines.push('');
    lines.push('**Other vault files:**');
    lines.push('- [[_connections]] — All knowledge connections');
    if (goals?.length > 0) lines.push('- [[_goals]] — Your learning goals');
    lines.push('');

    return lines.join('\n');
}

/**
 * Generate a connection graph index file.
 */
function generateConnectionsIndex(nodes, edges) {
    const lines = [];
    lines.push('---');
    lines.push('title: Knowledge Connections');
    lines.push('---');
    lines.push('');
    lines.push('# 🔗 Knowledge Connections');
    lines.push('');
    lines.push(`> ${edges.length} connections between ${nodes.length} nodes`);
    lines.push('');

    if (edges.length === 0) {
        lines.push('*No connections yet. As you add more knowledge, Feynman automatically discovers connections between your nodes.*');
        return lines.join('\n');
    }

    // Group by connection type
    const byType = {};
    edges.forEach(e => {
        const type = e.connection_type || 'related';
        if (!byType[type]) byType[type] = [];
        byType[type].push(e);
    });

    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n.title; });

    Object.entries(byType)
        .sort(([, a], [, b]) => b.length - a.length)
        .forEach(([type, typeEdges]) => {
            lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)} (${typeEdges.length})`);
            lines.push('');
            typeEdges.forEach(e => {
                const source = nodeMap[e.source_node_id] || 'Unknown';
                const target = nodeMap[e.target_node_id] || 'Unknown';
                const strength = e.connection_strength ? ` (${e.connection_strength}%)` : '';
                const reason = e.reason ? ` — *${e.reason}*` : '';
                lines.push(`- [[${source}]] ↔ [[${target}]]${strength}${reason}`);
            });
            lines.push('');
        });

    return lines.join('\n');
}

/**
 * Generate a goals file.
 */
function generateGoalsFile(goals) {
    const lines = [];
    lines.push('---');
    lines.push('title: Learning Goals');
    lines.push('---');
    lines.push('');
    lines.push('# 🎯 Learning Goals');
    lines.push('');
    lines.push('These are the learning goals you\'ve set in Feynman.');
    lines.push('');
    goals.forEach((goal, i) => {
        lines.push(`${i + 1}. ${goal}`);
    });
    lines.push('');
    return lines.join('\n');
}


/**
 * Main export function. Fetches data, generates markdown, bundles as ZIP.
 */
export async function generateVaultZip(exportData) {
    const { nodes, edges, exported_at, goals } = exportData;
    const zip = new JSZip();
    const vault = zip.folder('feynman-vault');

    // Generate individual node files, organized by brain region
    nodes.forEach(node => {
        const region = node.brain_region || 'uncategorized';
        const filename = safeFilename(node.title || 'untitled');
        const markdown = nodeToMarkdown(node, edges, nodes);
        vault.folder(region).file(`${filename}.md`, markdown);
    });

    // Generate vault index
    const indexMd = generateVaultIndex(nodes, edges, exported_at, goals);
    vault.file('_vault-index.md', indexMd);

    // Generate connections index
    const connectionsMd = generateConnectionsIndex(nodes, edges);
    vault.file('_connections.md', connectionsMd);

    // Generate goals file
    if (goals?.length > 0) {
        const goalsMd = generateGoalsFile(goals);
        vault.file('_goals.md', goalsMd);
    }

    // Generate ZIP and trigger download using native Blob URL
    console.log('📦 Generating ZIP blob...');
    const blob = await zip.generateAsync({ type: 'blob' });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `feynman-vault-${dateStr}.zip`;
    console.log(`📦 ZIP ready: ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);

    // Native browser download via anchor element
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    console.log('📦 Download triggered');

    // Cleanup — longer delay to ensure download starts
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 1500);

    return { nodeCount: nodes.length, edgeCount: edges.length };
}

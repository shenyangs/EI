// 增强的参考文献管理系统
// 批量导入、引用格式、去重检测

import { logger } from '@/lib/server/logger';

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'IEEE' | 'GB/T7714';

export interface Reference {
  id: string;
  type: 'journal' | 'conference' | 'book' | 'thesis' | 'report' | 'online';
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  abstract?: string;
  keywords?: string[];
  citedCount?: number;
  importedAt: string;
  lastModified: string;
}

export interface DuplicateGroup {
  id: string;
  references: Reference[];
  similarity: number;
  suggestedAction: 'merge' | 'keep_both' | 'review';
}

// CSL样式配置
const CSL_TEMPLATES: Record<CitationStyle, (ref: Reference) => string> = {
  APA: (ref) => {
    const authors = ref.authors.join(', ');
    const journal = ref.journal ? `*${ref.journal}*` : '';
    const volume = ref.volume ? `, *${ref.volume}*` : '';
    const issue = ref.issue ? `(${ref.issue})` : '';
    const pages = ref.pages ? `, ${ref.pages}` : '';
    const doi = ref.doi ? ` https://doi.org/${ref.doi}` : '';
    return `${authors} (${ref.year}). ${ref.title}. ${journal}${volume}${issue}${pages}.${doi}`;
  },
  
  MLA: (ref) => {
    const authors = ref.authors.join(', ');
    const journal = ref.journal ? `*${ref.journal}*` : '';
    const volume = ref.volume ? `, vol. ${ref.volume}` : '';
    const issue = ref.issue ? `, no. ${ref.issue}` : '';
    const pages = ref.pages ? `, pp. ${ref.pages}` : '';
    const doi = ref.doi ? `, doi:${ref.doi}` : '';
    return `${authors}. "${ref.title}." ${journal}${volume}${issue} (${ref.year})${pages}.${doi}`;
  },
  
  Chicago: (ref) => {
    const authors = ref.authors.join(', ');
    const journal = ref.journal ? `*${ref.journal}*` : '';
    const volume = ref.volume ? ` ${ref.volume}` : '';
    const issue = ref.issue ? `, no. ${ref.issue}` : '';
    const pages = ref.pages ? ` (${ref.year}): ${ref.pages}` : ` (${ref.year})`;
    const doi = ref.doi ? `. doi:${ref.doi}` : '';
    return `${authors}. "${ref.title}." ${journal}${volume}${issue}${pages}.${doi}`;
  },
  
  IEEE: (ref) => {
    const authors = ref.authors.map((a, i) => i === 0 ? a : ` and ${a}`).join('');
    const journal = ref.journal ? `, *${ref.journal}*` : '';
    const volume = ref.volume ? `, vol. ${ref.volume}` : '';
    const issue = ref.issue ? `, no. ${ref.issue}` : '';
    const pages = ref.pages ? `, pp. ${ref.pages}` : '';
    const doi = ref.doi ? `, doi: ${ref.doi}` : '';
    return `[1] ${authors}, "${ref.title}"${journal}${volume}${issue}${pages}, ${ref.year}.${doi}`;
  },
  
  'GB/T7714': (ref) => {
    const authors = ref.authors.join(', ');
    const journal = ref.journal ? `${ref.journal}` : '';
    const volume = ref.volume ? `, ${ref.volume}` : '';
    const issue = ref.issue ? `(${ref.issue})` : '';
    const pages = ref.pages ? `:${ref.pages}` : '';
    const doi = ref.doi ? `. DOI:${ref.doi}` : '';
    return `${authors}. ${ref.title}[J]. ${journal}${volume}${issue}, ${ref.year}${pages}.${doi}`;
  }
};

export class EnhancedReferenceManager {
  private references: Map<string, Reference> = new Map();
  private citationStyle: CitationStyle = 'APA';

  // 批量导入BibTeX
  async importFromBibtex(bibtexContent: string): Promise<Reference[]> {
    const references: Reference[] = [];
    const entries = this.parseBibtex(bibtexContent);

    for (const entry of entries) {
      const reference = this.convertBibtexToReference(entry);
      this.references.set(reference.id, reference);
      references.push(reference);
    }

    logger.info(`Imported ${references.length} references from BibTeX`);
    return references;
  }

  // 批量导入RIS
  async importFromRis(risContent: string): Promise<Reference[]> {
    const references: Reference[] = [];
    const entries = this.parseRis(risContent);

    for (const entry of entries) {
      const reference = this.convertRisToReference(entry);
      this.references.set(reference.id, reference);
      references.push(reference);
    }

    logger.info(`Imported ${references.length} references from RIS`);
    return references;
  }

  // 从Zotero导入
  async importFromZotero(apiKey: string, userId: string): Promise<Reference[]> {
    try {
      const response = await fetch(`https://api.zotero.org/users/${userId}/items`, {
        headers: {
          'Zotero-API-Key': apiKey,
          'Zotero-API-Version': '3'
        }
      });

      if (!response.ok) {
        throw new Error(`Zotero API error: ${response.status}`);
      }

      const items = await response.json();
      const references: Reference[] = [];

      for (const item of items) {
        const reference = this.convertZoteroToReference(item);
        this.references.set(reference.id, reference);
        references.push(reference);
      }

      logger.info(`Imported ${references.length} references from Zotero`);
      return references;
    } catch (error) {
      logger.error('Failed to import from Zotero', error as Error);
      throw error;
    }
  }

  // 检测重复
  detectDuplicates(): DuplicateGroup[] {
    const refs = Array.from(this.references.values());
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < refs.length; i++) {
      if (processed.has(refs[i].id)) continue;

      const duplicates: Reference[] = [refs[i]];
      processed.add(refs[i].id);

      for (let j = i + 1; j < refs.length; j++) {
        if (processed.has(refs[j].id)) continue;

        const similarity = this.calculateSimilarity(refs[i], refs[j]);
        if (similarity > 0.85) {
          duplicates.push(refs[j]);
          processed.add(refs[j].id);
        }
      }

      if (duplicates.length > 1) {
        groups.push({
          id: `dup_${Date.now()}_${i}`,
          references: duplicates,
          similarity: this.calculateGroupSimilarity(duplicates),
          suggestedAction: duplicates.length === 2 ? 'merge' : 'review'
        });
      }
    }

    return groups;
  }

  // 合并重复文献
  mergeDuplicates(groupId: string, primaryId: string): Reference | null {
    const group = this.detectDuplicates().find(g => g.id === groupId);
    if (!group) return null;

    const primary = group.references.find(r => r.id === primaryId);
    if (!primary) return null;

    // 合并其他文献的信息到主文献
    for (const ref of group.references) {
      if (ref.id === primaryId) continue;
      
      // 补充缺失信息
      if (!primary.doi && ref.doi) primary.doi = ref.doi;
      if (!primary.url && ref.url) primary.url = ref.url;
      if (!primary.abstract && ref.abstract) primary.abstract = ref.abstract;
      if (!primary.citedCount && ref.citedCount) primary.citedCount = ref.citedCount;
      
      // 删除重复文献
      this.references.delete(ref.id);
    }

    primary.lastModified = new Date().toISOString();
    logger.info('Merged duplicates', { groupId, primaryId });
    
    return primary;
  }

  // 格式化引用
  formatCitation(referenceId: string, style?: CitationStyle): string {
    const ref = this.references.get(referenceId);
    if (!ref) return '';

    const citationStyle = style || this.citationStyle;
    const formatter = CSL_TEMPLATES[citationStyle];
    
    return formatter(ref);
  }

  // 批量格式化
  formatCitations(referenceIds: string[], style?: CitationStyle): string[] {
    return referenceIds.map(id => this.formatCitation(id, style));
  }

  // 导出到Word
  async exportToWord(referenceIds?: string[]): Promise<Blob> {
    const ids = referenceIds || Array.from(this.references.keys());
    const citations = this.formatCitations(ids);
    
    // 创建简单的HTML文档
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>References</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; }
            .reference { margin-bottom: 12px; text-indent: -24px; padding-left: 24px; }
          </style>
        </head>
        <body>
          <h1>References</h1>
          ${citations.map((cite, i) => `<div class="reference">[${i + 1}] ${cite}</div>`).join('')}
        </body>
      </html>
    `;

    return new Blob([html], { type: 'application/msword' });
  }

  // 导出到BibTeX
  exportToBibtex(referenceIds?: string[]): string {
    const ids = referenceIds || Array.from(this.references.keys());
    const entries: string[] = [];

    for (const id of ids) {
      const ref = this.references.get(id);
      if (!ref) continue;

      const entry = this.convertReferenceToBibtex(ref);
      entries.push(entry);
    }

    return entries.join('\n\n');
  }

  // 设置引用样式
  setCitationStyle(style: CitationStyle): void {
    this.citationStyle = style;
  }

  // 获取所有文献
  getAllReferences(): Reference[] {
    return Array.from(this.references.values());
  }

  // 搜索文献
  searchReferences(query: string): Reference[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.references.values()).filter(ref =>
      ref.title.toLowerCase().includes(lowerQuery) ||
      ref.authors.some(a => a.toLowerCase().includes(lowerQuery)) ||
      ref.journal?.toLowerCase().includes(lowerQuery) ||
      ref.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }

  // 私有辅助方法
  private parseBibtex(content: string): any[] {
    const entries: any[] = [];
    const regex = /@(\w+)\s*\{([^,]+),([^@]+)\}/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const type = match[1];
      const key = match[2];
      const fieldsText = match[3];
      
      const fields: Record<string, string> = { key, type };
      const fieldRegex = /(\w+)\s*=\s*\{([^}]+)\}/g;
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(fieldsText)) !== null) {
        fields[fieldMatch[1]] = fieldMatch[2];
      }

      entries.push(fields);
    }

    return entries;
  }

  private convertBibtexToReference(entry: any): Reference {
    return {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapBibtexType(entry.type),
      title: entry.title || 'Untitled',
      authors: entry.author ? entry.author.split(' and ').map((a: string) => a.trim()) : ['Unknown'],
      year: parseInt(entry.year) || new Date().getFullYear(),
      journal: entry.journal,
      volume: entry.volume,
      issue: entry.number,
      pages: entry.pages,
      doi: entry.doi,
      url: entry.url,
      publisher: entry.publisher,
      abstract: entry.abstract,
      keywords: entry.keywords ? entry.keywords.split(',').map((k: string) => k.trim()) : [],
      importedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  private parseRis(content: string): any[] {
    const entries: any[] = [];
    const lines = content.split('\n');
    let currentEntry: Record<string, string> = {};

    for (const line of lines) {
      if (line.startsWith('TY  - ')) {
        if (Object.keys(currentEntry).length > 0) {
          entries.push(currentEntry);
        }
        currentEntry = { type: line.substring(6).trim() };
      } else if (line.match(/^\w\w  - /)) {
        const tag = line.substring(0, 2);
        const value = line.substring(6).trim();
        currentEntry[tag] = value;
      }
    }

    if (Object.keys(currentEntry).length > 0) {
      entries.push(currentEntry);
    }

    return entries;
  }

  private convertRisToReference(entry: any): Reference {
    return {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapRisType(entry.type),
      title: entry.T1 || entry.TI || 'Untitled',
      authors: entry.AU ? [entry.AU] : ['Unknown'],
      year: parseInt(entry.PY) || new Date().getFullYear(),
      journal: entry.JO || entry.JF,
      volume: entry.VL,
      issue: entry.IS,
      pages: entry.SP,
      doi: entry.DO,
      url: entry.UR,
      abstract: entry.AB,
      keywords: entry.KW ? [entry.KW] : [],
      importedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  private convertZoteroToReference(item: any): Reference {
    const data = item.data;
    return {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapZoteroType(data.itemType),
      title: data.title || 'Untitled',
      authors: data.creators
        ?.filter((c: any) => c.creatorType === 'author')
        .map((c: any) => `${c.firstName} ${c.lastName}`) || ['Unknown'],
      year: parseInt(data.date) || new Date().getFullYear(),
      journal: data.publicationTitle,
      volume: data.volume,
      issue: data.issue,
      pages: data.pages,
      doi: data.DOI,
      url: data.url,
      abstract: data.abstractNote,
      importedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  private calculateSimilarity(ref1: Reference, ref2: Reference): number {
    let score = 0;
    let total = 0;

    // 标题相似度（使用简单的包含检查）
    if (ref1.title && ref2.title) {
      const titleSim = this.stringSimilarity(ref1.title, ref2.title);
      score += titleSim * 0.4;
      total += 0.4;
    }

    // 作者相似度
    if (ref1.authors.length > 0 && ref2.authors.length > 0) {
      const authorSim = this.arraySimilarity(ref1.authors, ref2.authors);
      score += authorSim * 0.3;
      total += 0.3;
    }

    // 年份
    if (ref1.year && ref2.year) {
      score += (ref1.year === ref2.year ? 1 : 0) * 0.1;
      total += 0.1;
    }

    // DOI
    if (ref1.doi && ref2.doi) {
      score += (ref1.doi === ref2.doi ? 1 : 0) * 0.2;
      total += 0.2;
    }

    return total > 0 ? score / total : 0;
  }

  private calculateGroupSimilarity(refs: Reference[]): number {
    let totalSim = 0;
    let count = 0;

    for (let i = 0; i < refs.length; i++) {
      for (let j = i + 1; j < refs.length; j++) {
        totalSim += this.calculateSimilarity(refs[i], refs[j]);
        count++;
      }
    }

    return count > 0 ? totalSim / count : 1;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // 简单的编辑距离计算
    const len = Math.max(s1.length, s2.length);
    if (len === 0) return 1;
    
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - distance / len;
  }

  private arraySimilarity(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1.map(a => a.toLowerCase()));
    const set2 = new Set(arr2.map(a => a.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private mapBibtexType(type: string): Reference['type'] {
    const map: Record<string, Reference['type']> = {
      article: 'journal',
      inproceedings: 'conference',
      book: 'book',
      thesis: 'thesis',
      techreport: 'report',
      misc: 'online'
    };
    return map[type.toLowerCase()] || 'journal';
  }

  private mapRisType(type: string): Reference['type'] {
    const map: Record<string, Reference['type']> = {
      JOUR: 'journal',
      CONF: 'conference',
      BOOK: 'book',
      THES: 'thesis',
      RPRT: 'report',
      ELEC: 'online'
    };
    return map[type] || 'journal';
  }

  private mapZoteroType(type: string): Reference['type'] {
    const map: Record<string, Reference['type']> = {
      journalArticle: 'journal',
      conferencePaper: 'conference',
      book: 'book',
      thesis: 'thesis',
      report: 'report',
      webpage: 'online'
    };
    return map[type] || 'journal';
  }

  private convertReferenceToBibtex(ref: Reference): string {
    const type = this.reverseMapType(ref.type);
    const firstAuthor = ref.authors[0] || 'unknown';
    const authorKey = firstAuthor.split(' ').pop()?.toLowerCase() || 'unknown';
    const key = authorKey + ref.year;
    
    let entry = `@${type}{${key},\n`;
    entry += `  title = {${ref.title}},\n`;
    entry += `  author = {${ref.authors.join(' and ')}},\n`;
    entry += `  year = {${ref.year}},\n`;
    
    if (ref.journal) entry += `  journal = {${ref.journal}},\n`;
    if (ref.volume) entry += `  volume = {${ref.volume}},\n`;
    if (ref.issue) entry += `  number = {${ref.issue}},\n`;
    if (ref.pages) entry += `  pages = {${ref.pages}},\n`;
    if (ref.doi) entry += `  doi = {${ref.doi}},\n`;
    if (ref.url) entry += `  url = {${ref.url}},\n`;
    if (ref.publisher) entry += `  publisher = {${ref.publisher}},\n`;
    if (ref.abstract) entry += `  abstract = {${ref.abstract}},\n`;
    
    entry += '}';
    
    return entry;
  }

  private reverseMapType(type: Reference['type']): string {
    const map: Record<Reference['type'], string> = {
      journal: 'article',
      conference: 'inproceedings',
      book: 'book',
      thesis: 'thesis',
      report: 'techreport',
      online: 'misc'
    };
    return map[type];
  }
}

// 创建全局实例
export const referenceManager = new EnhancedReferenceManager();

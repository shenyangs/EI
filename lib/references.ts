export type Reference = {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords?: string[];
  citationCount?: number;
  source: "academic_search" | "manual" | "import";
  addedAt: string;
  notes?: string;
};

export type ReferenceSearchResult = {
  references: Reference[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReferenceFilter = {
  keywords?: string[];
  yearFrom?: number;
  yearTo?: number;
  venue?: string;
  source?: Reference["source"];
};

export type ReferenceSort = "relevance" | "year_desc" | "year_asc" | "citations";

export class ReferenceManager {
  private static STORAGE_KEY = "ei_references";

  static async searchReferences(
    query: string,
    options: {
      filter?: ReferenceFilter;
      sort?: ReferenceSort;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<ReferenceSearchResult> {
    const { filter = {}, sort = "relevance", page = 1, pageSize = 10 } = options;

    try {
      // 调用学术搜索 API
      const response = await fetch("/api/academic/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query,
          filter,
          sort,
          page,
          pageSize
        })
      });

      if (!response.ok) {
        throw new Error("搜索失败");
      }

      const data = await response.json();
      
      return {
        references: data.references.map((ref: any) => ({
          ...ref,
          source: "academic_search" as const,
          addedAt: new Date().toISOString()
        })),
        total: data.total,
        page,
        pageSize
      };
    } catch (error) {
      console.error("参考文献搜索失败:", error);
      // 返回空结果
      return {
        references: [],
        total: 0,
        page,
        pageSize
      };
    }
  }

  static async addReference(reference: Omit<Reference, "id" | "addedAt">): Promise<Reference> {
    const newReference: Reference = {
      ...reference,
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString()
    };

    const references = this.getStoredReferences();
    references.push(newReference);
    this.saveReferences(references);

    return newReference;
  }

  static async importReferences(
    references: Array<Omit<Reference, "id" | "addedAt" | "source">>
  ): Promise<Reference[]> {
    const newReferences: Reference[] = references.map((ref) => ({
      ...ref,
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: "import",
      addedAt: new Date().toISOString()
    }));

    const existingReferences = this.getStoredReferences();
    const allReferences = [...existingReferences, ...newReferences];
    this.saveReferences(allReferences);

    return newReferences;
  }

  static async importFromBibtex(bibtex: string): Promise<Reference[]> {
    const references = this.parseBibtex(bibtex);
    return this.importReferences(references);
  }

  static async importFromRis(ris: string): Promise<Reference[]> {
    const references = this.parseRis(ris);
    return this.importReferences(references);
  }

  static getReferences(filter?: ReferenceFilter): Reference[] {
    let references = this.getStoredReferences();

    if (filter) {
      if (filter.keywords && filter.keywords.length > 0) {
        references = references.filter((ref) =>
          filter.keywords!.some(
            (keyword) =>
              ref.title.toLowerCase().includes(keyword.toLowerCase()) ||
              ref.abstract?.toLowerCase().includes(keyword.toLowerCase()) ||
              ref.keywords?.some((k) => k.toLowerCase().includes(keyword.toLowerCase()))
          )
        );
      }

      if (filter.yearFrom) {
        references = references.filter((ref) => ref.year >= filter.yearFrom!);
      }

      if (filter.yearTo) {
        references = references.filter((ref) => ref.year <= filter.yearTo!);
      }

      if (filter.venue) {
        references = references.filter((ref) =>
          ref.venue.toLowerCase().includes(filter.venue!.toLowerCase())
        );
      }

      if (filter.source) {
        references = references.filter((ref) => ref.source === filter.source);
      }
    }

    return references;
  }

  static async updateReference(id: string, updates: Partial<Reference>): Promise<Reference | null> {
    const references = this.getStoredReferences();
    const index = references.findIndex((ref) => ref.id === id);

    if (index === -1) {
      return null;
    }

    references[index] = { ...references[index], ...updates };
    this.saveReferences(references);

    return references[index];
  }

  static async deleteReference(id: string): Promise<boolean> {
    const references = this.getStoredReferences();
    const filtered = references.filter((ref) => ref.id !== id);

    if (filtered.length === references.length) {
      return false;
    }

    this.saveReferences(filtered);
    return true;
  }

  static exportToBibtex(references?: Reference[]): string {
    const refs = references || this.getStoredReferences();
    
    return refs
      .map((ref) => {
        const authors = ref.authors.join(" and ");
        return `@article{${ref.id},
  title = {${ref.title}},
  author = {${authors}},
  year = {${ref.year}},
  journal = {${ref.venue}},
  ${ref.doi ? `doi = {${ref.doi}},` : ""}
  ${ref.url ? `url = {${ref.url}},` : ""}
}`;
      })
      .join("\n\n");
  }

  static exportToRis(references?: Reference[]): string {
    const refs = references || this.getStoredReferences();
    
    return refs
      .map((ref) => {
        const lines = [
          "TY  - JOUR",
          `TI  - ${ref.title}`,
          ...ref.authors.map((author) => `AU  - ${author}`),
          `PY  - ${ref.year}`,
          `JO  - ${ref.venue}`
        ];

        if (ref.doi) {
          lines.push(`DO  - ${ref.doi}`);
        }

        if (ref.url) {
          lines.push(`UR  - ${ref.url}`);
        }

        if (ref.abstract) {
          lines.push(`AB  - ${ref.abstract}`);
        }

        lines.push("ER  -");
        return lines.join("\n");
      })
      .join("\n\n");
  }

  private static getStoredReferences(): Reference[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static saveReferences(references: Reference[]): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(references));
    } catch (error) {
      console.error("保存参考文献失败:", error);
    }
  }

  private static parseBibtex(bibtex: string): Array<Omit<Reference, "id" | "addedAt"> & { source: "import" }> {
    const references: Array<Omit<Reference, "id" | "addedAt"> & { source: "import" }> = [];
    const entries = bibtex.split(/@\w+\{/).filter(Boolean);

    for (const entry of entries) {
      try {
        const title = entry.match(/title\s*=\s*\{([^}]+)\}/)?.[1] || "";
        const author = entry.match(/author\s*=\s*\{([^}]+)\}/)?.[1] || "";
        const year = parseInt(entry.match(/year\s*=\s*\{?(\d{4})\}?/)?.[1] || "0", 10);
        const journal = entry.match(/journal\s*=\s*\{([^}]+)\}/)?.[1] || "";
        const doi = entry.match(/doi\s*=\s*\{([^}]+)\}/)?.[1];
        const url = entry.match(/url\s*=\s*\{([^}]+)\}/)?.[1];

        if (title && author) {
          references.push({
            title,
            authors: author.split(" and ").map((a) => a.trim()),
            year,
            venue: journal || "Unknown",
            doi,
            url,
            source: "import"
          });
        }
      } catch {
        // 跳过解析失败的条目
      }
    }

    return references;
  }

  private static parseRis(ris: string): Array<Omit<Reference, "id" | "addedAt"> & { source: "import" }> {
    const references: Array<Omit<Reference, "id" | "addedAt"> & { source: "import" }> = [];
    const entries = ris.split("ER  -").filter(Boolean);

    for (const entry of entries) {
      try {
        const title = entry.match(/TI\s+-\s+(.+)/)?.[1] || "";
        const authors = entry.match(/AU\s+-\s+(.+)/g)?.map((m) => m.replace(/AU\s+-\s+/, "")) || [];
        const year = parseInt(entry.match(/PY\s+-\s+(\d{4})/)?.[1] || "0", 10);
        const journal = entry.match(/JO\s+-\s+(.+)/)?.[1] || "";
        const doi = entry.match(/DO\s+-\s+(.+)/)?.[1];
        const url = entry.match(/UR\s+-\s+(.+)/)?.[1];
        const abstract = entry.match(/AB\s+-\s+(.+)/)?.[1];

        if (title) {
          references.push({
            title,
            authors,
            year,
            venue: journal || "Unknown",
            doi,
            url,
            abstract,
            source: "import"
          });
        }
      } catch {
        // 跳过解析失败的条目
      }
    }

    return references;
  }
}

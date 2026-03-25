import { isCertificateChainError, requestTextWithCurl } from "@/lib/curl-transport";

export type AcademicPaperSource = "OpenAlex" | "arXiv";

export type AcademicPaper = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number | null;
  source: AcademicPaperSource;
  url: string;
  venue: string | null;
  citations: number | null;
  matchedQueries: string[];
};

export type AcademicSearchSummary = {
  total: number;
  bySource: Record<AcademicPaperSource, number>;
  yearRange: string;
  topVenues: string[];
  highlights: string[];
};

export type AcademicSearchResult = {
  queries: string[];
  papers: AcademicPaper[];
  summary: AcademicSearchSummary;
};

type OpenAlexResponse = {
  results?: Array<{
    id?: string;
    display_name?: string;
    publication_year?: number;
    cited_by_count?: number;
    doi?: string | null;
    primary_location?: {
      landing_page_url?: string | null;
      source?: {
        display_name?: string | null;
      } | null;
    } | null;
    authorships?: Array<{
      author?: {
        display_name?: string | null;
      } | null;
    }>;
    abstract_inverted_index?: Record<string, number[]>;
  }>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripXmlTags(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

function normalizeTitleKey(title: string) {
  return normalizeWhitespace(title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function buildSearchSummary(papers: AcademicPaper[]): AcademicSearchSummary {
  const years = papers.map((paper) => paper.year).filter((item): item is number => typeof item === "number");
  const venues = papers
    .map((paper) => paper.venue)
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const venueRanking = [...new Set(venues)].slice(0, 3);
  const yearRange =
    years.length > 0 ? `${Math.min(...years)} - ${Math.max(...years)}` : "暂无年份信息";
  const topCited = [...papers]
    .filter((paper) => typeof paper.citations === "number")
    .sort((left, right) => (right.citations ?? 0) - (left.citations ?? 0))
    .slice(0, 2)
    .map((paper) => `${paper.title}（${paper.citations} 次引用）`);

  return {
    total: papers.length,
    bySource: {
      OpenAlex: papers.filter((paper) => paper.source === "OpenAlex").length,
      arXiv: papers.filter((paper) => paper.source === "arXiv").length
    },
    yearRange,
    topVenues: venueRanking,
    highlights: [
      years.length > 0 ? `结果覆盖年份 ${yearRange}。` : "当前结果缺少年份信息。",
      topCited.length > 0 ? `高被引结果包括：${topCited.join("；")}。` : "当前结果以新近或预印本论文为主。",
      venueRanking.length > 0 ? `高频来源包括：${venueRanking.join("、")}。` : "当前结果尚未形成稳定来源集中度。"
    ]
  };
}

async function fetchTextWithFallback(url: string, timeoutMs = 15000) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs)
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`请求失败：${response.status} ${text}`);
    }

    return text;
  } catch (error) {
    if (!isCertificateChainError(error)) {
      throw error;
    }

    const { status, text } = await requestTextWithCurl({
      url,
      timeoutSeconds: Math.max(6, Math.ceil(timeoutMs / 1000))
    });

    if (status < 200 || status >= 300) {
      throw new Error(`请求失败：${status} ${text}`);
    }

    return text;
  }
}

function rebuildAbstractFromInvertedIndex(index?: Record<string, number[]>) {
  if (!index) {
    return "";
  }

  const entries = Object.entries(index).flatMap(([word, positions]) =>
    positions.map((position) => [position, word] as const)
  );

  return entries
    .sort((left, right) => left[0] - right[0])
    .map(([, word]) => word)
    .join(" ");
}

async function searchOpenAlex(query: string, limit = 8) {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", String(limit));
  url.searchParams.set(
    "select",
    "id,display_name,publication_year,cited_by_count,doi,primary_location,authorships,abstract_inverted_index"
  );

  const text = await fetchTextWithFallback(url.toString(), 20000);
  const parsed = JSON.parse(text) as OpenAlexResponse;

  return (parsed.results ?? [])
    .map((item) => ({
      id: item.id ?? item.doi ?? `openalex-${normalizeTitleKey(item.display_name ?? "")}`,
      title: normalizeWhitespace(item.display_name ?? ""),
      abstract: normalizeWhitespace(rebuildAbstractFromInvertedIndex(item.abstract_inverted_index)),
      authors:
        item.authorships
          ?.map((authorShip) => authorShip.author?.display_name?.trim() ?? "")
          .filter(Boolean) ?? [],
      year: item.publication_year ?? null,
      source: "OpenAlex" as const,
      url:
        item.primary_location?.landing_page_url?.trim() ||
        item.doi?.trim() ||
        item.id?.trim() ||
        "",
      venue: item.primary_location?.source?.display_name?.trim() ?? null,
      citations: typeof item.cited_by_count === "number" ? item.cited_by_count : null,
      matchedQueries: [query]
    }))
    .filter((paper) => paper.title);
}

function getEntryBlocks(feed: string) {
  return [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
}

function extractTagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? stripXmlTags(match[1]) : "";
}

function extractAuthorNames(block: string) {
  return [...block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi)]
    .map((match) => stripXmlTags(match[1]))
    .filter(Boolean);
}

async function searchArxiv(query: string, limit = 8) {
  const url = new URL("http://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(limit));
  url.searchParams.set("sortBy", "relevance");
  url.searchParams.set("sortOrder", "descending");

  const feed = await fetchTextWithFallback(url.toString(), 20000);

  return getEntryBlocks(feed)
    .map((block, index) => {
      const id = extractTagValue(block, "id");
      const title = extractTagValue(block, "title");
      const summary = extractTagValue(block, "summary");
      const published = extractTagValue(block, "published");
      const year = published ? Number.parseInt(published.slice(0, 4), 10) : null;
      const primaryCategory =
        block.match(/<arxiv:primary_category[^>]*term="([^"]+)"/i)?.[1]?.trim() ?? null;

      return {
        id: id || `arxiv-${index}-${normalizeTitleKey(title)}`,
        title,
        abstract: summary,
        authors: extractAuthorNames(block),
        year: Number.isFinite(year) ? year : null,
        source: "arXiv" as const,
        url: id,
        venue: primaryCategory,
        citations: null,
        matchedQueries: [query]
      };
    })
    .filter((paper) => paper.title);
}

function mergePapers(paperGroups: AcademicPaper[][], limit = 18) {
  const merged = new Map<string, AcademicPaper>();

  for (const papers of paperGroups) {
    for (const paper of papers) {
      const key = normalizeTitleKey(paper.title);
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, paper);
        continue;
      }

      merged.set(key, {
        ...existing,
        citations: Math.max(existing.citations ?? 0, paper.citations ?? 0) || existing.citations || paper.citations,
        venue: existing.venue || paper.venue,
        abstract: existing.abstract.length >= paper.abstract.length ? existing.abstract : paper.abstract,
        url: existing.url || paper.url,
        matchedQueries: [...new Set([...existing.matchedQueries, ...paper.matchedQueries])]
      });
    }
  }

  return [...merged.values()]
    .sort((left, right) => {
      const citationDelta = (right.citations ?? 0) - (left.citations ?? 0);

      if (citationDelta !== 0) {
        return citationDelta;
      }

      return (right.year ?? 0) - (left.year ?? 0);
    })
    .slice(0, limit);
}

export async function searchAcademicPapers(input: {
  queries: string[];
  limitPerSource?: number;
}) {
  const queries = [...new Set(input.queries.map((item) => normalizeWhitespace(item)).filter(Boolean))].slice(0, 4);

  if (queries.length === 0) {
    return {
      queries: [],
      papers: [],
      summary: buildSearchSummary([])
    } satisfies AcademicSearchResult;
  }

  const limitPerSource = input.limitPerSource ?? 6;
  const paperGroups = await Promise.all(
    queries.flatMap((query) => [searchOpenAlex(query, limitPerSource), searchArxiv(query, limitPerSource)])
  );
  const papers = mergePapers(paperGroups);

  return {
    queries,
    papers,
    summary: buildSearchSummary(papers)
  } satisfies AcademicSearchResult;
}

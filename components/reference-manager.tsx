"use client";

import { useCallback, useEffect, useState } from "react";

import { ReferenceManager, type Reference, type ReferenceFilter } from "@/lib/references";

type ReferenceManagerProps = {
  projectId: string;
};

type ViewMode = "list" | "search" | "import" | "detail";

export function ReferenceManagerPanel({ projectId }: ReferenceManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [references, setReferences] = useState<Reference[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Reference[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [filter, setFilter] = useState<ReferenceFilter>({});
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"bibtex" | "ris">("bibtex");
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState("");
  const boundCount = references.filter((item) => item.notes?.trim()).length;
  const doiCount = references.filter((item) => Boolean(item.doi)).length;
  const importCount = references.filter((item) => item.source === "import").length;
  const searchCount = references.filter((item) => item.source === "academic_search").length;
  const latestYear = references.reduce((latest, item) => Math.max(latest, item.year || 0), 0);

  const loadReferences = useCallback(() => {
    const refs = ReferenceManager.getReferences(filter);
    setReferences(refs);
  }, [filter]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setMessage("正在搜索学术文献...");

    try {
      const result = await ReferenceManager.searchReferences(searchQuery, {
        filter,
        page: 1,
        pageSize: 10
      });

      setSearchResults(result.references);
      setMessage(`找到 ${result.total} 篇相关文献`);
    } catch (error) {
      setMessage("搜索失败，请稍后重试");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddReference = async (reference: Omit<Reference, "id" | "addedAt">) => {
    try {
      await ReferenceManager.addReference(reference);
      loadReferences();
      setMessage("文献已添加到库中");
    } catch (error) {
      setMessage("添加文献失败");
    }
  };

  const handleDeleteReference = async (id: string) => {
    try {
      await ReferenceManager.deleteReference(id);
      loadReferences();
      setMessage("文献已删除");
    } catch (error) {
      setMessage("删除文献失败");
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;

    setIsImporting(true);
    setMessage("正在导入文献...");

    try {
      let imported: Reference[] = [];
      
      if (importFormat === "bibtex") {
        imported = await ReferenceManager.importFromBibtex(importText);
      } else {
        imported = await ReferenceManager.importFromRis(importText);
      }

      loadReferences();
      setImportText("");
      setMessage(`成功导入 ${imported.length} 篇文献`);
      setViewMode("list");
    } catch (error) {
      setMessage("导入失败，请检查格式是否正确");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = (format: "bibtex" | "ris") => {
    let content = "";
    let filename = "";
    
    if (format === "bibtex") {
      content = ReferenceManager.exportToBibtex(references);
      filename = `references_${projectId}.bib`;
    } else {
      content = ReferenceManager.exportToRis(references);
      filename = `references_${projectId}.ris`;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMessage(`已导出 ${references.length} 篇文献`);
  };

  const renderListView = () => (
    <div className="reference-list">
      <div className="reference-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索文献库..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch} className="secondary-button">
            搜索
          </button>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => setViewMode("search")} className="secondary-button">
            学术搜索
          </button>
          <button onClick={() => setViewMode("import")} className="secondary-button">
            导入
          </button>
          <button onClick={() => handleExport("bibtex")} className="secondary-button">
            导出 BibTeX
          </button>
          <button onClick={() => handleExport("ris")} className="secondary-button">
            导出 RIS
          </button>
        </div>
      </div>

      {message && <div className="message-banner">{message}</div>}

      <div className="references-container">
        {references.length === 0 ? (
          <div className="empty-state">
            <p>文献库为空</p>
            <p>使用学术搜索或导入功能添加文献</p>
          </div>
        ) : (
          references.map((ref) => (
            <div key={ref.id} className="reference-item">
              <div className="reference-header">
                <h4 className="reference-title">{ref.title}</h4>
                <div className="reference-actions">
                  <button
                    onClick={() => {
                      setSelectedReference(ref);
                      setViewMode("detail");
                    }}
                    className="text-button"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => handleDeleteReference(ref.id)}
                    className="text-button danger"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p className="reference-authors">{ref.authors.join(", ")}</p>
              <p className="reference-meta">
                {ref.year} · {ref.venue}
                {ref.doi && ` · DOI: ${ref.doi}`}
              </p>
              {ref.notes && <p className="reference-notes">备注: {ref.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderSearchView = () => (
    <div className="reference-search">
      <div className="search-header">
        <h3>学术文献搜索</h3>
        <button onClick={() => setViewMode("list")} className="text-button">
          返回列表
        </button>
      </div>

      <div className="search-form">
        <input
          type="text"
          placeholder="输入关键词搜索学术文献..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="search-input"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="primary-button"
        >
          {isSearching ? "搜索中..." : "搜索"}
        </button>
      </div>

      {message && <div className="message-banner">{message}</div>}

      <div className="search-results">
        {searchResults.map((ref) => (
          <div key={ref.id} className="reference-item">
            <div className="reference-header">
              <h4 className="reference-title">{ref.title}</h4>
              <button
                onClick={() => handleAddReference(ref)}
                className="secondary-button"
              >
                添加到库
              </button>
            </div>
            <p className="reference-authors">{ref.authors.join(", ")}</p>
            <p className="reference-meta">
              {ref.year} · {ref.venue}
            </p>
            {ref.abstract && (
              <p className="reference-abstract">
                {ref.abstract.substring(0, 200)}...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderImportView = () => (
    <div className="reference-import">
      <div className="import-header">
        <h3>导入文献</h3>
        <button onClick={() => setViewMode("list")} className="text-button">
          返回列表
        </button>
      </div>

      <div className="import-format">
        <label>
          <input
            type="radio"
            value="bibtex"
            checked={importFormat === "bibtex"}
            onChange={(e) => setImportFormat(e.target.value as "bibtex")}
          />
          BibTeX
        </label>
        <label>
          <input
            type="radio"
            value="ris"
            checked={importFormat === "ris"}
            onChange={(e) => setImportFormat(e.target.value as "ris")}
          />
          RIS
        </label>
      </div>

      <textarea
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        placeholder={`粘贴${importFormat === "bibtex" ? "BibTeX" : "RIS"}格式的文献数据...`}
        rows={15}
        className="import-textarea"
      />

      {message && <div className="message-banner">{message}</div>}

      <div className="import-actions">
        <button
          onClick={handleImport}
          disabled={isImporting || !importText.trim()}
          className="primary-button"
        >
          {isImporting ? "导入中..." : "导入"}
        </button>
      </div>
    </div>
  );

  const renderDetailView = () => {
    if (!selectedReference) return null;

    return (
      <div className="reference-detail">
        <div className="detail-header">
          <button onClick={() => setViewMode("list")} className="text-button">
            返回列表
          </button>
        </div>

        <div className="detail-content">
          <h2>{selectedReference.title}</h2>
          <p className="detail-authors">{selectedReference.authors.join(", ")}</p>
          <p className="detail-meta">
            {selectedReference.year} · {selectedReference.venue}
          </p>

          {selectedReference.doi && (
            <p className="detail-doi">
              DOI: <a href={`https://doi.org/${selectedReference.doi}`} target="_blank" rel="noopener noreferrer">
                {selectedReference.doi}
              </a>
            </p>
          )}

          {selectedReference.url && (
            <p className="detail-url">
              URL: <a href={selectedReference.url} target="_blank" rel="noopener noreferrer">
                {selectedReference.url}
              </a>
            </p>
          )}

          {selectedReference.abstract && (
            <div className="detail-abstract">
              <h4>摘要</h4>
              <p>{selectedReference.abstract}</p>
            </div>
          )}

          {selectedReference.keywords && selectedReference.keywords.length > 0 && (
            <div className="detail-keywords">
              <h4>关键词</h4>
              <div className="keyword-list">
                {selectedReference.keywords.map((keyword, index) => (
                  <span key={index} className="keyword-tag">{keyword}</span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-notes">
            <h4>备注</h4>
            <textarea
              value={selectedReference.notes || ""}
              onChange={(e) => {
                const updated = { ...selectedReference, notes: e.target.value };
                setSelectedReference(updated);
                ReferenceManager.updateReference(selectedReference.id, { notes: e.target.value });
              }}
              placeholder="添加备注..."
              rows={4}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="content-card stitch-panel reference-manager-panel">
      <div className="manager-header">
        <div>
          <h2>参考文献与材料中心</h2>
          <p className="reference-count">这里负责收文献、补备注、导出引用，不只是做一个静态列表。</p>
        </div>
        <span className="reference-count">{references.length} 篇文献</span>
      </div>

      <div className="decision-metrics">
        <div className="decision-metric">
          <span>已入库</span>
          <strong>{references.length}</strong>
          <p>当前项目已经纳入文献库的条目数。</p>
        </div>
        <div className="decision-metric">
          <span>有 DOI</span>
          <strong>{doiCount}</strong>
          <p>这些条目后面做引用核验会更稳。</p>
        </div>
        <div className="decision-metric">
          <span>有备注</span>
          <strong>{boundCount}</strong>
          <p>备注越清楚，写作时越容易知道这篇文献为什么要用。</p>
        </div>
      </div>

      <div className="stitch-tab-navigation">
        <button
          className={viewMode === "list" ? "stitch-tab-button active" : "stitch-tab-button"}
          onClick={() => setViewMode("list")}
          type="button"
        >
          文献总览
        </button>
        <button
          className={viewMode === "search" ? "stitch-tab-button active" : "stitch-tab-button"}
          onClick={() => setViewMode("search")}
          type="button"
        >
          学术搜索
        </button>
        <button
          className={viewMode === "import" ? "stitch-tab-button active" : "stitch-tab-button"}
          onClick={() => setViewMode("import")}
          type="button"
        >
          批量导入
        </button>
        {selectedReference ? (
          <button
            className={viewMode === "detail" ? "stitch-tab-button active" : "stitch-tab-button"}
            onClick={() => setViewMode("detail")}
            type="button"
          >
            当前条目
          </button>
        ) : null}
      </div>

      <div className="reference-command-grid">
        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前工作状态</span>
            <h3>文献库现在最需要你补什么</h3>
          </div>
          <div className="stack-list">
            <div className="line-item line-item--column">
              <strong>导入来源分布</strong>
              <p>学术搜索添加 {searchCount} 篇，手动或导入补入 {importCount} 篇。</p>
            </div>
            <div className="line-item line-item--column">
              <strong>最新年份</strong>
              <p>{latestYear > 0 ? `${latestYear} 年` : "暂无年份信息"}，投稿前最好保证核心综述里有近两年的关键文献。</p>
            </div>
            <div className="line-item line-item--column">
              <strong>下一步建议</strong>
              <p>先补备注，再筛 DOI 和出处，最后再导出 BibTeX 或 RIS，避免正文写完才发现引用信息不完整。</p>
            </div>
          </div>
        </section>

        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">使用顺序</span>
            <h3>这页建议按这个流程来走</h3>
          </div>
          <div className="stack-list">
            <div className="line-item line-item--column">
              <strong>1. 先搜或导入</strong>
              <p>把可能会用到的条目先纳入文献库，不急着一开始就写完整备注。</p>
            </div>
            <div className="line-item line-item--column">
              <strong>2. 再筛与补注</strong>
              <p>留下真正支撑方法、结果和讨论的关键文献，并说明它们分别用在哪里。</p>
            </div>
            <div className="line-item line-item--column">
              <strong>3. 最后导出</strong>
              <p>等正文结构稳定后再导出引用文件，能减少反复清理无效条目。</p>
            </div>
          </div>
        </section>
      </div>

      {viewMode === "list" && renderListView()}
      {viewMode === "search" && renderSearchView()}
      {viewMode === "import" && renderImportView()}
      {viewMode === "detail" && renderDetailView()}
    </section>
  );
}

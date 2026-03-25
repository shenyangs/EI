"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    loadReferences();
  }, [filter]);

  const loadReferences = () => {
    const refs = ReferenceManager.getReferences(filter);
    setReferences(refs);
  };

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
    <div className="reference-manager">
      <div className="manager-header">
        <h2>参考文献管理</h2>
        <span className="reference-count">{references.length} 篇文献</span>
      </div>

      {viewMode === "list" && renderListView()}
      {viewMode === "search" && renderSearchView()}
      {viewMode === "import" && renderImportView()}
      {viewMode === "detail" && renderDetailView()}

      <style jsx>{`
        .reference-manager {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin: 16px 0;
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .manager-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .reference-count {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .reference-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          gap: 8px;
          flex: 1;
          min-width: 300px;
        }

        .search-box input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .toolbar-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .message-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 0.875rem;
        }

        .references-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reference-item {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          background: #fafafa;
        }

        .reference-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          gap: 12px;
        }

        .reference-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          flex: 1;
        }

        .reference-actions {
          display: flex;
          gap: 8px;
        }

        .reference-authors {
          margin: 0 0 4px 0;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .reference-meta {
          margin: 0;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .reference-notes {
          margin: 8px 0 0 0;
          font-size: 0.875rem;
          color: #374151;
          font-style: italic;
        }

        .reference-abstract {
          margin: 8px 0 0 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .search-header,
        .import-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .search-form {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .search-input {
          flex: 1;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }

        .search-results {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .import-format {
          display: flex;
          gap: 20px;
          margin-bottom: 16px;
        }

        .import-format label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .import-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.875rem;
          resize: vertical;
        }

        .import-actions {
          margin-top: 16px;
          text-align: right;
        }

        .detail-header {
          margin-bottom: 20px;
        }

        .detail-content h2 {
          margin: 0 0 12px 0;
          font-size: 1.5rem;
          color: #1f2937;
        }

        .detail-authors {
          margin: 0 0 8px 0;
          font-size: 1rem;
          color: #4b5563;
        }

        .detail-meta {
          margin: 0 0 16px 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .detail-doi,
        .detail-url {
          margin: 8px 0;
          font-size: 0.875rem;
        }

        .detail-doi a,
        .detail-url a {
          color: #3b82f6;
          text-decoration: none;
        }

        .detail-doi a:hover,
        .detail-url a:hover {
          text-decoration: underline;
        }

        .detail-abstract,
        .detail-keywords,
        .detail-notes {
          margin-top: 20px;
        }

        .detail-abstract h4,
        .detail-keywords h4,
        .detail-notes h4 {
          margin: 0 0 8px 0;
          font-size: 1rem;
          color: #374151;
        }

        .detail-abstract p {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.6;
          color: #4b5563;
        }

        .keyword-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .keyword-tag {
          background: #eff6ff;
          color: #1e40af;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .detail-notes textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          resize: vertical;
        }

        .text-button {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 4px 8px;
        }

        .text-button:hover {
          text-decoration: underline;
        }

        .text-button.danger {
          color: #dc2626;
        }

        .primary-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .primary-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary-button {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .secondary-button:hover:not(:disabled) {
          background: #f9fafb;
        }

        .secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

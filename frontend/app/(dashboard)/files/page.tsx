"use client";

import React, { useState, useEffect } from "react";
import { Database, Search, UploadCloud, Trash2, Loader2, Copy, Check, Sparkles, RefreshCw, Play, Table, Network, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFiles, Document } from "@/hooks/useFiles";
import { FileTable } from "@/components/files/FileTable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import KnowledgeGraph from "@/components/knowledge/KnowledgeGraph";
import { exportExecutiveDossierPdf } from "@/lib/exportPdf";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function KnowledgeBasePage() {
  const { t } = useLanguage();
  const {
    filteredFiles,
    isLoading,
    isUploading,
    searchQuery,
    setSearchQuery,
    fileInputRef,
    handleFileUpload,
    handleDelete,
    handleReindex
  } = useFiles();

  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [viewDetailsDoc, setViewDetailsDoc] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");

  // Extracted Document Chunks States
  const [docChunks, setDocChunks] = useState<{ index: number; content: string }[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkSearchQuery, setChunkSearchQuery] = useState("");
  const [copiedChunkIdx, setCopiedChunkIdx] = useState<number | null>(null);
  const [docSummary, setDocSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    if (!viewDetailsDoc) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch(`/api/proxy/documents/${viewDetailsDoc.id}/summary`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setDocSummary(data.summary);
      } else {
        const err = await res.json().catch(() => ({ detail: "Failed to generate briefing" }));
        alert(err.detail || "Failed to generate AI briefing");
      }
    } catch (e) {
      console.error(e);
      alert("Network error while generating briefing");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (viewDetailsDoc) {
      setIsLoadingChunks(true);
      setDocChunks([]);
      setDocSummary(null);
      setChunkSearchQuery("");
      fetch(`/api/proxy/documents/${viewDetailsDoc.id}/chunks`)
        .then((res) => {
          if (res.ok) return res.json();
          return { chunks: [], summary: null };
        })
        .then((data) => {
          if (data && data.chunks) {
            setDocChunks(data.chunks);
            setDocSummary(data.summary || null);
          } else {
            setDocChunks(Array.isArray(data) ? data : []);
            setDocSummary(null);
          }
          setIsLoadingChunks(false);
        })
        .catch((err) => {
          console.error("Failed to load chunks:", err);
          setIsLoadingChunks(false);
        });
    } else {
      setDocChunks([]);
      setDocSummary(null);
      setChunkSearchQuery("");
    }
  }, [viewDetailsDoc]);

  useEffect(() => {
    if (!viewDetailsDoc) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setViewDetailsDoc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewDetailsDoc]);

  const someSelected = selectedFileIds.size > 0;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
    } else {
      setSelectedFileIds(new Set());
    }
  };

  const handleSelectFile = (id: number) => {
    const newSet = new Set(selectedFileIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedFileIds(newSet);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedFileIds) {
      await handleDelete(id);
    }
    setSelectedFileIds(new Set());
  };

  const handleCopyChunk = async (text: string, index: number) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedChunkIdx(index);
      setTimeout(() => setCopiedChunkIdx(null), 2000);
    } catch (err) {
      console.error("Failed to copy chunk:", err);
    }
  };

  const filteredChunks = docChunks.filter(c =>
    c.content.toLowerCase().includes(chunkSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground font-sans pt-16 px-8 pb-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* Hidden file input for uploading */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          multiple
          accept=".pdf,.docx,.pptx,.epub,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.json,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.mkv,.webm,.avi"
        />

        {/* Dynamic Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.files.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.files.subtitle}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Switcher: Table vs Knowledge Graph */}
            <div className="flex items-center p-1 bg-card border border-border rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>File List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("graph")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "graph"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Knowledge Graph</span>
              </button>
            </div>

            {someSelected && (
              <Button 
                onClick={handleBulkDelete}
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all font-medium cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.common.delete} ({selectedFileIds.size})
              </Button>
            )}
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all border border-primary/50 font-medium cursor-pointer"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {isUploading ? t.common.loading : 'Upload File'}
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar (in Table view) */}
        {viewMode === "table" && (
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t.files.searchPlaceholder}
              placeholder={t.files.searchPlaceholder} 
              className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans"
            />
          </div>
        )}

        {/* Data Table / Knowledge Graph / Empty State Management */}
        {viewMode === "graph" ? (
          <KnowledgeGraph 
            documents={filteredFiles} 
            onSelectDocument={(doc) => setViewDetailsDoc(doc)} 
          />
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : filteredFiles.length > 0 || searchQuery ? (
          <FileTable 
            files={filteredFiles} 
            searchQuery={searchQuery}
            selectedFileIds={selectedFileIds}
            handleSelectAll={handleSelectAll}
            handleSelectFile={handleSelectFile}
            handleDelete={handleDelete}
            handleReindex={handleReindex}
            setViewDetailsDoc={setViewDetailsDoc}
          />
        ) : (
          <div className="rounded-xl border border-border border-dashed bg-card/40 p-16 text-center flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="p-4 rounded-full bg-muted mb-5">
              <Database className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2">{t.files.noFilesFound}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
              {t.files.supportedFormats}
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all rounded-lg border border-primary/50 cursor-pointer">
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewDetailsDoc && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setViewDetailsDoc(null)}
        >
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative" 
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Database className="w-5 h-5" />
                </div>
                <h3 id="modal-title" className="text-lg font-medium text-foreground">Document Details</h3>
              </div>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              <div>
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">Filename</div>
                <div className="text-sm text-foreground/90 break-all">{viewDetailsDoc.filename}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">File Size</div>
                  <div className="text-sm font-mono text-primary">
                    {viewDetailsDoc.file_size ? `${(viewDetailsDoc.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">Vectors Extracted</div>
                  <div className="text-sm font-mono text-emerald-500">
                    {viewDetailsDoc.chunk_count !== undefined && viewDetailsDoc.chunk_count !== null ? viewDetailsDoc.chunk_count : 'Processing...'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">Upload Time</div>
                  <div className="text-sm text-foreground/80">
                    {new Date(viewDetailsDoc.upload_timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">Status</div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    viewDetailsDoc.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' :
                    viewDetailsDoc.status === 'PROCESSING' ? 'bg-primary/10 text-primary border-primary/20 animate-pulse' :
                    viewDetailsDoc.status === 'FAILED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      viewDetailsDoc.status === 'COMPLETED' ? 'bg-emerald-500' :
                      viewDetailsDoc.status === 'PROCESSING' ? 'bg-primary animate-ping' :
                      viewDetailsDoc.status === 'FAILED' ? 'bg-destructive' :
                      'bg-muted-foreground'
                    }`} />
                    {viewDetailsDoc.status}
                  </span>
                </div>
              </div>

              {/* AI Executive Briefing / Meeting Intelligence Report Card */}
              {(() => {
                const isMedia = /\.(mp3|wav|m4a|ogg|flac|aac|wma|mp4|mov|mkv|webm|avi)$/i.test(viewDetailsDoc.filename);
                const title = isMedia ? "Meeting Intelligence & Action Items" : "AI Executive Briefing";
                const generateLabel = isMedia ? "Extract Action Items" : "Generate Briefing";
                const analyzingLabel = isMedia ? "Analyzing recording & action items..." : "Analyzing document...";

                if (docSummary) {
                  return (
                    <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2.5 shadow-[0_0_12px_rgba(99,102,241,0.05)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span>{title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              exportExecutiveDossierPdf({
                                title: "Executive Intelligence Dossier",
                                filename: viewDetailsDoc.filename,
                                category: isMedia ? "Meeting Recording & Audio Sync" : "Enterprise Document",
                                summary: docSummary || "No briefing generated yet.",
                                fileSize: viewDetailsDoc.file_size,
                                chunkCount: viewDetailsDoc.chunk_count,
                                createdAt: viewDetailsDoc.upload_timestamp,
                              });
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-100 border border-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Export print-ready Executive PDF Dossier"
                          >
                            <Download className="w-3 h-3 text-indigo-400" />
                            <span>Export PDF Dossier</span>
                          </button>
                          <button
                            onClick={handleGenerateSummary}
                            disabled={isGeneratingSummary}
                            className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingSummary ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3" />
                                <span>Regenerate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="chat-prose text-foreground/90 text-xs leading-relaxed max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children, ...props }: any) => {
                              if (href && href.startsWith("#seek-ts-")) {
                                const ts = href.replace("#seek-ts-", "");
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const parts = ts.split(":").map(Number);
                                      const secs = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
                                      window.dispatchEvent(new CustomEvent("seek-audio-timestamp", { detail: { seconds: secs, timestamp: ts } }));
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-100 border border-indigo-500/30 transition-all cursor-pointer shadow-sm active:scale-95 not-prose align-middle"
                                    title={`Click to seek audio to ${ts}`}
                                  >
                                    <Play className="w-2.5 h-2.5 fill-indigo-400 text-indigo-400" />
                                    <span>{ts}</span>
                                  </button>
                                );
                              }
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline" {...props}>
                                  {children}
                                </a>
                              );
                            }
                          }}
                        >
                          {docSummary.replace(/(?<=\s|^|[(])\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, "[$1](#seek-ts-$1)")}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                }

                if (viewDetailsDoc.status === "COMPLETED") {
                  return (
                    <div className="p-3.5 rounded-xl border border-dashed border-border bg-card/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>No {title.toLowerCase()} generated yet</span>
                      </div>
                      <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingSummary ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{analyzingLabel}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{generateLabel}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Extracted Text Segments with Search & Copy */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Extracted Text Segments (Knowledge Base)</div>
                  {docChunks.length > 0 && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {filteredChunks.length} of {docChunks.length}
                    </div>
                  )}
                </div>

                {docChunks.length > 0 && (
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter segments..."
                      value={chunkSearchQuery}
                      onChange={(e) => setChunkSearchQuery(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all font-sans"
                    />
                  </div>
                )}

                {isLoadingChunks ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : filteredChunks.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-border bg-background/50 rounded-xl p-3.5 space-y-3.5">
                    {filteredChunks.map((chunk) => (
                      <div key={chunk.index} className="text-xs leading-relaxed text-muted-foreground pb-3 border-b border-border last:border-b-0 last:pb-0 last:mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Segment {chunk.index + 1}</div>
                          <button
                            onClick={() => handleCopyChunk(chunk.content, chunk.index)}
                            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1 text-[9px] font-semibold"
                          >
                            {copiedChunkIdx === chunk.index ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-sans whitespace-pre-wrap">{chunk.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic py-6 text-center border border-border border-dashed rounded-xl bg-muted/20">
                    {docChunks.length > 0 ? "No matching segments found." : "No text segments indexed for this file."}
                  </div>
                )}
              </div>

              {viewDetailsDoc.status === 'FAILED' && viewDetailsDoc.error_log && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                  <div className="text-xs font-semibold tracking-wider text-destructive uppercase mb-1">Reason for Failure</div>
                  <div className="font-mono text-xs leading-relaxed break-words">{viewDetailsDoc.error_log}</div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end sticky bottom-0 z-10">
              <Button onClick={() => setViewDetailsDoc(null)} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border cursor-pointer">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

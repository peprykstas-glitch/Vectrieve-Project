"use client";

import React, { useState, useEffect } from "react";
import { Database, Search, UploadCloud, Trash2, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFiles, Document } from "@/hooks/useFiles";
import { FileTable } from "@/components/files/FileTable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AudioBrief from "@/components/chat/AudioBrief";

export default function KnowledgeBasePage() {
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

  // Extracted Document Chunks States
  const [docChunks, setDocChunks] = useState<{ index: number; content: string }[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkSearchQuery, setChunkSearchQuery] = useState("");
  const [copiedChunkIdx, setCopiedChunkIdx] = useState<number | null>(null);
  const [docSummary, setDocSummary] = useState<string | null>(null);

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

  const handleCopyChunk = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkIdx(index);
    setTimeout(() => setCopiedChunkIdx(null), 2000);
  };

  const filteredChunks = docChunks.filter(c =>
    c.content.toLowerCase().includes(chunkSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* Hidden file input for uploading */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          multiple
        />

        {/* Dynamic Action Bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium tracking-tight">Knowledge Base</h1>
          
          <div className="flex items-center gap-3">
            {someSelected && (
              <Button 
                onClick={handleBulkDelete}
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all font-medium cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedFileIds.size} Selected
              </Button>
            )}
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all border border-indigo-500/50 font-medium cursor-pointer"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search vectorized files"
            placeholder="Search vectorized files..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white shadow-xl placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
          />
        </div>

        {/* Data Table / Empty State Management */}
        {isLoading ? (
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
          <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-16 text-center flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="p-4 rounded-full bg-zinc-800/50 mb-5">
              <Database className="w-10 h-10 text-zinc-500" />
            </div>
            <h2 className="text-xl font-medium text-white mb-2">No Vectorized Files</h2>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-8">
              Upload your first document to extract intelligence. We support PDFs, text files, and markdown logs natively.
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all rounded-lg border border-indigo-500/50 cursor-pointer">
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload First File
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
            className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative" 
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                <h3 id="modal-title" className="text-lg font-medium text-white">Document Details</h3>
              </div>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              <div>
                <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">Filename</div>
                <div className="text-sm text-zinc-200 break-all">{viewDetailsDoc.filename}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">File Size</div>
                  <div className="text-sm font-mono text-indigo-300">
                    {viewDetailsDoc.file_size ? `${(viewDetailsDoc.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">Vectors Extracted</div>
                  <div className="text-sm font-mono text-emerald-400">
                    {viewDetailsDoc.chunk_count !== undefined && viewDetailsDoc.chunk_count !== null ? viewDetailsDoc.chunk_count : 'Processing...'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">Upload Time</div>
                  <div className="text-sm text-zinc-300">
                    {new Date(viewDetailsDoc.upload_timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">Status</div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    viewDetailsDoc.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    viewDetailsDoc.status === 'PROCESSING' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' :
                    viewDetailsDoc.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      viewDetailsDoc.status === 'COMPLETED' ? 'bg-emerald-500' :
                      viewDetailsDoc.status === 'PROCESSING' ? 'bg-indigo-500 animate-ping' :
                      viewDetailsDoc.status === 'FAILED' ? 'bg-red-500' :
                      'bg-zinc-500'
                    }`} />
                    {viewDetailsDoc.status}
                  </span>
                </div>
              </div>

              {/* AI Executive Briefing Report Card */}
              {docSummary && (
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2.5 shadow-[0_0_12px_rgba(99,102,241,0.05)]">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>AI Executive Briefing</span>
                  </div>
                  <div className="prose prose-invert prose-zinc text-zinc-300 text-xs leading-relaxed max-w-none prose-p:leading-relaxed prose-p:mb-2 last:prose-p:mb-0 prose-ul:list-disc prose-ul:pl-4 prose-li:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {docSummary}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* AI Audio Podcast Briefing */}
              {viewDetailsDoc.status === "COMPLETED" && (
                <div className="pt-2">
                  <AudioBrief 
                    documentId={viewDetailsDoc.id} 
                    filename={viewDetailsDoc.filename} 
                  />
                </div>
              )}

              {/* Extracted Text Segments with Search & Copy */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Extracted Text Segments (Knowledge Base)</div>
                  {docChunks.length > 0 && (
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {filteredChunks.length} of {docChunks.length}
                    </div>
                  )}
                </div>

                {docChunks.length > 0 && (
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter segments..."
                      value={chunkSearchQuery}
                      onChange={(e) => setChunkSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 transition-all font-sans"
                    />
                  </div>
                )}

                {isLoadingChunks ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  </div>
                ) : filteredChunks.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 bg-zinc-950/60 rounded-xl p-3.5 space-y-3.5">
                    {filteredChunks.map((chunk) => (
                      <div key={chunk.index} className="text-xs leading-relaxed text-zinc-400 pb-3 border-b border-white/5 last:border-b-0 last:pb-0 last:mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-wider">Segment {chunk.index + 1}</div>
                          <button
                            onClick={() => handleCopyChunk(chunk.content, chunk.index)}
                            className="p-1 hover:bg-zinc-800/50 rounded text-zinc-500 hover:text-zinc-200 transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1 text-[9px] font-semibold"
                          >
                            {copiedChunkIdx === chunk.index ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
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
                  <div className="text-xs text-zinc-500 italic py-6 text-center border border-zinc-800/50 border-dashed rounded-xl bg-zinc-950/20">
                    {docChunks.length > 0 ? "No matching segments found." : "No text segments indexed for this file."}
                  </div>
                )}
              </div>

              {viewDetailsDoc.status === 'FAILED' && viewDetailsDoc.error_log && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl">
                  <div className="text-xs font-semibold tracking-wider text-red-500 uppercase mb-1">Reason for Failure</div>
                  <div className="font-mono text-xs leading-relaxed break-words">{viewDetailsDoc.error_log}</div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-950/50 border-t border-white/5 flex justify-end sticky bottom-0 z-10">
              <Button onClick={() => setViewDetailsDoc(null)} className="bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

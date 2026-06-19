"use client";

import React, { useState } from "react";
import { Database, Search, UploadCloud, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFiles, Document } from "@/hooks/useFiles";
import { FileTable } from "@/components/files/FileTable";

export default function KnowledgeBasePage() {
  const {
    filteredFiles,
    isLoading,
    isUploading,
    searchQuery,
    setSearchQuery,
    fileInputRef,
    handleFileUpload,
    handleDelete
  } = useFiles();

  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [viewDetailsDoc, setViewDetailsDoc] = useState<Document | null>(null);

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
    // Basic bulk delete sequentially for now
    for (const id of selectedFileIds) {
      await handleDelete(id);
    }
    setSelectedFileIds(new Set());
  };

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
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all font-medium"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedFileIds.size} Selected
              </Button>
            )}
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all border border-indigo-500/50 font-medium"
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
            <Button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all rounded-lg border border-indigo-500/50">
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload First File
            </Button>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewDetailsDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={() => setViewDetailsDoc(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative" onMouseDown={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium text-white">Document Details</h3>
              </div>
            </div>
            
            <div className="px-6 py-6 space-y-5">
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

              <div>
                <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">Upload Time</div>
                <div className="text-sm text-zinc-300">
                  {new Date(viewDetailsDoc.upload_timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-950/50 border-t border-white/5 flex justify-end">
              <Button onClick={() => setViewDetailsDoc(null)} className="bg-zinc-800 text-white hover:bg-zinc-700">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { FileText, MoreVertical, Trash2, Eye, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/hooks/useFiles";

interface FileTableProps {
  files: Document[];
  searchQuery: string;
  selectedFileIds: Set<number>;
  handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectFile: (id: number) => void;
  handleDelete: (id: number) => void;
  handleReindex: (id: number) => void;
  setViewDetailsDoc: (doc: Document | null) => void;
}

export function FileTable({ 
  files, 
  searchQuery,
  selectedFileIds,
  handleSelectAll,
  handleSelectFile,
  handleDelete,
  handleReindex,
  setViewDetailsDoc 
}: FileTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  // Close custom dropdown when clicking anywhere outside
  useEffect(() => {
    if (activeDropdown !== null) {
      const clickHandler = () => setActiveDropdown(null);
      setTimeout(() => document.addEventListener("click", clickHandler), 0);
      return () => document.removeEventListener("click", clickHandler);
    }
  }, [activeDropdown]);

  const allFilteredSelected = files.length > 0 && files.every(f => selectedFileIds.has(f.id));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md shadow-2xl relative">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/80 text-[10px] text-zinc-500 font-bold">
          <tr>
            <th className="px-6 py-4 w-12 text-center">
              <label className="relative flex h-4 w-4 cursor-pointer items-center justify-center mx-auto">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={allFilteredSelected}
                  aria-label="Select all files" 
                  className="sr-only peer"
                />
                <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900/50 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white hidden peer-checked:block" />
                </div>
              </label>
            </th>
            <th className="px-6 py-4">Filename</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4 w-24">Size</th>
            <th className="px-6 py-4 w-32">Status</th>
            <th className="px-6 py-4">Uploaded</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {files.map((file, idx) => {
            const ext = file.filename.split('.').pop()?.toUpperCase() || 'FILE';
            const dateStr = new Date(file.upload_timestamp).toLocaleString();
            const isNearBottom = idx >= files.length - 2 && files.length > 3;
            return (
              <tr key={file.id} className="hover:bg-zinc-800/30 transition-colors group">
                <td className="px-6 py-4 w-12 text-center">
                  <label className="relative flex h-4 w-4 cursor-pointer items-center justify-center mx-auto">
                    <input 
                      type="checkbox" 
                      checked={selectedFileIds.has(file.id)}
                      onChange={() => handleSelectFile(file.id)}
                      aria-label={`Select ${file.filename}`} 
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900/50 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white hidden peer-checked:block" />
                    </div>
                  </label>
                </td>
                <td className="px-6 py-4 w-full max-w-[300px]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 group-hover:border-blue-500/40 transition-colors flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-zinc-200 truncate">{file.filename}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  <span className="bg-zinc-800 text-[11px] px-2 py-0.5 rounded-md border border-zinc-700">{ext}</span>
                </td>
                <td className="px-6 py-4 text-zinc-400 font-mono text-xs w-24">
                  {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : '-'}
                </td>
                <td className="px-6 py-4 w-32">
                  {file.status === 'COMPLETED' ? (
                    <div className="inline-flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-emerald-400 text-[11px] uppercase tracking-wider font-bold leading-none">Ready</span>
                    </div>
                  ) : file.status === 'FAILED' ? (
                    <div className="inline-flex items-center gap-2" title={file.error_log}>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-red-400 text-[11px] uppercase tracking-wider font-bold leading-none cursor-help">Failed</span>
                    </div>
                  ) : file.status === 'EMBEDDING' ? (
                    <div className="inline-flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                      <span className="text-amber-400 text-[11px] uppercase tracking-wider font-bold leading-none">Embedding...</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
                      <span className="text-indigo-400 text-[11px] uppercase tracking-wider font-bold leading-none">Processing...</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-zinc-500 text-xs">{dateStr}</td>
                <td className="px-6 py-4 text-right relative">
                  <Button 
                    onClick={() => setActiveDropdown(activeDropdown === file.id ? null : file.id)}
                    aria-label={`More actions for ${file.filename}`} 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg focus:bg-zinc-800"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>

                  {/* Custom Native Dropdown Menu */}
                  {activeDropdown === file.id && (
                    <div 
                      className={`absolute right-6 z-50 w-48 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col p-1 ${isNearBottom ? "bottom-10" : "top-10"}`}
                      onMouseDown={(e) => e.stopPropagation()} // Prevent closing before action executes
                    >
                      <button 
                        onMouseDown={(e) => { e.stopPropagation(); setViewDetailsDoc(file); setActiveDropdown(null); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors text-left cursor-pointer border-0 bg-transparent"
                      >
                        <Eye className="w-4 h-4" /> View Details
                      </button>
                      <button 
                        onMouseDown={(e) => { e.stopPropagation(); handleReindex(file.id); setActiveDropdown(null); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors text-left cursor-pointer border-0 bg-transparent"
                      >
                        <RefreshCw className="w-4 h-4" /> Force Re-index
                      </button>
                      <div className="h-px bg-zinc-800 my-1" />
                      <button 
                        onMouseDown={(e) => { 
                          e.stopPropagation(); 
                          handleDelete(file.id); 
                          setActiveDropdown(null); 
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left cursor-pointer border-0 bg-transparent"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Vector
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Empty Search State */}
      {files.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No files matching &quot;{searchQuery}&quot; found.</p>
        </div>
      )}
    </div>
  );
}

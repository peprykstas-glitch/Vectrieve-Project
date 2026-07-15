import React, { useRef, useState, KeyboardEvent } from "react";
import { Paperclip, ArrowUp, FileText, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  isLoading: boolean;
  isProcessingFiles?: boolean;
  onSubmit: (query: string, files: File[]) => void;
}

export function ChatInput({ isLoading, isProcessingFiles = false, onSubmit }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const submit = () => {
    if (!inputValue.trim() && files.length === 0 && !isLoading) return;
    
    onSubmit(inputValue, files);
    setInputValue("");
    setFiles([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const isDisabled = isLoading || isProcessingFiles;

  return (
    <div className="shrink-0 px-4 pb-8 pt-2 w-full flex justify-center bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent relative z-10">
      <div className="w-full max-w-3xl relative">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 mb-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 border rounded-xl py-1.5 pl-3 pr-2 text-xs shadow-xl transition-all duration-300 ${
                  isProcessingFiles
                    ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                    : "bg-zinc-900 border-white/10 text-zinc-300"
                }`}
              >
                {isProcessingFiles ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                {isProcessingFiles ? (
                  <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide pr-1">
                    Indexing...
                  </span>
                ) : (
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
                    disabled={isDisabled}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Premium Breathing Focus Container */}
        <div className={`relative flex items-end w-full bg-zinc-900/40 backdrop-blur-xl border rounded-3xl shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/30 focus-within:bg-zinc-900/70 p-2 ${
          isProcessingFiles ? "border-amber-500/20" : "border-white/5"
        }`}>
          {/* Attachment Button */}
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.docx,.epub,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.json,.png,.jpg,.jpeg,.webp" />
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-zinc-400 hover:text-zinc-200 transition-colors rounded-xl hover:bg-zinc-800/30 flex-shrink-0 border-0 bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Attach file"
            disabled={isDisabled}
          >
            <Paperclip size={18} />
          </motion.button>

          {/* Auto-resizing Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isProcessingFiles ? "Indexing files, please wait..." : "Query Vectrieve Core..."}
            className="w-full max-h-[200px] min-h-[44px] bg-transparent border-0 resize-none py-3 px-2 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:ring-0 focus:outline-none overflow-y-auto custom-scrollbar"
            rows={1}
            disabled={isDisabled}
          />

          {/* Spring-powered Submission Button */}
          <motion.button
            whileHover={(!inputValue.trim() && files.length === 0) || isDisabled ? {} : { scale: 1.05 }}
            whileTap={(!inputValue.trim() && files.length === 0) || isDisabled ? {} : { scale: 0.95 }}
            onClick={submit}
            disabled={(!inputValue.trim() && files.length === 0) || isDisabled}
            className={`p-3 rounded-2xl flex-shrink-0 transition-all duration-300 border-0 cursor-pointer ${
              (inputValue.trim() || files.length > 0) && !isDisabled
               ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
                : "bg-zinc-800/30 text-zinc-600 cursor-not-allowed"
            }`}
            aria-label="Send query"
          >
            {isProcessingFiles ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowUp size={18} className={isLoading ? "animate-pulse" : ""} />
            )}
          </motion.button>
        </div>
        
        <div className="text-center mt-3 text-[10px] text-zinc-600 tracking-wide">
          {isProcessingFiles
            ? "⚡ Indexing files into the knowledge base — query will fire automatically when ready."
            : "Vectrieve Core may produce inaccurate intelligence. Verify critical assertions."}
        </div>
      </div>
    </div>
  );
}


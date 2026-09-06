import React, { useRef, useState, KeyboardEvent } from "react";
import { Plus, ArrowUp, FileText, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ChatInputProps {
  isLoading: boolean;
  isProcessingFiles?: boolean;
  onSubmit: (query: string, files: File[]) => void;
}

export function ChatInput({ isLoading, isProcessingFiles = false, onSubmit }: ChatInputProps) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const pastedFiles = Array.from(e.clipboardData.files);
      setFiles((prev) => [...prev, ...pastedFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
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
  const hasContent = (inputValue.trim().length > 0 || files.length > 0) && !isDisabled;

  return (
    <div className="w-full flex flex-col items-center">
      {/* File Upload Attachment Chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 mb-2 w-full justify-start">
          {files.map((file, idx) => {
            const isImg = isImageFile(file);
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 border rounded-xl py-1 pl-3 pr-2 text-xs shadow-lg transition-all duration-200 ${
                  isProcessingFiles
                    ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                    : "bg-zinc-900/90 border-white/10 text-zinc-300 backdrop-blur-md"
                }`}
              >
                {isProcessingFiles ? (
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                ) : isImg ? (
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                ) : (
                  <FileText className="w-3 h-3 text-indigo-400" />
                )}
                <span className="truncate max-w-[140px] font-medium text-[11px]">{file.name}</span>
                {isProcessingFiles ? (
                  <span className="text-[9px] text-amber-400 font-semibold uppercase tracking-wide">
                    {t.files.statusProcessing}
                  </span>
                ) : (
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-0.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
                    disabled={isDisabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Capsule Input Bar (ChatGPT / Claude style) */}
      <div className={`relative flex items-center w-full bg-zinc-900/80 hover:bg-zinc-900/90 backdrop-blur-2xl border rounded-[28px] shadow-2xl transition-all duration-200 focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:bg-zinc-900/95 px-2.5 py-1.5 ${
        isProcessingFiles ? "border-amber-500/30" : "border-white/10"
      }`}>
        {/* Hidden File Input */}
        <input 
          type="file" 
          multiple 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept=".pdf,.docx,.pptx,.epub,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.json,.png,.jpg,.jpeg,.webp" 
        />
        
        {/* Attach (+) Button */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all flex-shrink-0 border-0 bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.chat.attachFile}
          title={t.chat.attachFile}
          disabled={isDisabled}
        >
          <Plus size={18} />
        </button>

        {/* Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isProcessingFiles ? t.files.statusProcessing : t.chat.inputPlaceholder}
          className="w-full max-h-[180px] min-h-[36px] bg-transparent border-0 resize-none py-2 px-2.5 text-sm sm:text-[14.5px] text-zinc-100 placeholder:text-zinc-500 focus:ring-0 focus:outline-none overflow-y-auto custom-scrollbar leading-relaxed"
          rows={1}
          disabled={isDisabled}
        />

        {/* Circular Send Button */}
        <button
          onClick={submit}
          disabled={!hasContent}
          className={`flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 transition-all duration-200 border-0 cursor-pointer ${
            hasContent
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95"
              : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
          }`}
          aria-label="Send query"
        >
          {isProcessingFiles ? (
            <Loader2 size={15} className="animate-spin text-amber-400" />
          ) : (
            <ArrowUp size={16} className={isLoading ? "animate-pulse" : ""} />
          )}
        </button>
      </div>

      {/* Subtle Micro-Disclaimer */}
      <div className="text-center mt-1.5 text-[10px] text-zinc-500/80 tracking-wide select-none">
        {isProcessingFiles
          ? "⚡ Processing in-memory attachments..."
          : "Neurach may produce inaccurate intelligence. Verify critical assertions."}
      </div>
    </div>
  );
}

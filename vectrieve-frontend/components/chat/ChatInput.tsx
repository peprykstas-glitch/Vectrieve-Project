import React, { useRef, useState, KeyboardEvent } from "react";
import { Paperclip, ArrowUp, FileText, X } from "lucide-react";

interface ChatInputProps {
  isLoading: boolean;
  onSubmit: (query: string, files: File[]) => void;
}

export function ChatInput({ isLoading, onSubmit }: ChatInputProps) {
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

  return (
    <div className="shrink-0 px-4 pb-8 pt-2 w-full flex justify-center bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent relative z-10">
      <div className="w-full max-w-3xl relative">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 mb-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-zinc-800/80 border border-white/10 rounded-lg py-1.5 pl-2.5 pr-1.5 text-xs text-zinc-300 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 shadow-lg">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="p-0.5 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Glassmorphism Input Container */}
        <div className="relative flex items-end w-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl transition-all focus-within:ring-1 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/30 focus-within:bg-zinc-900/80 p-2">
          {/* Attachment Button */}
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-zinc-400 hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-800/50 flex-shrink-0"
            aria-label="Attach file"
            disabled={isLoading}
          >
            <Paperclip size={20} />
          </button>

          {/* Auto-resizing Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Query Vectrieve Core..."
            className="w-full max-h-[200px] min-h-[44px] bg-transparent border-0 resize-none py-3 px-2 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:ring-0 focus:outline-none overflow-y-auto custom-scrollbar"
            rows={1}
          />

          {/* Submission Button */}
          <button
            onClick={submit}
            disabled={(!inputValue.trim() && files.length === 0) || isLoading}
            className={`p-3 rounded-full flex-shrink-0 transition-all duration-300 ${
              (inputValue.trim() || files.length > 0) && !isLoading
               ? "bg-indigo-500 text-white shadow-lg hover:bg-indigo-400 hover:scale-105"
                : "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
            }`}
            aria-label="Send query"
          >
            <ArrowUp size={20} className={isLoading ? "animate-bounce" : ""} />
          </button>
        </div>
        
        <div className="text-center mt-3 text-[10px] text-zinc-500 tracking-wide">
          Vectrieve Core may produce inaccurate intelligence. Verify critical assertions.
        </div>
      </div>
    </div>
  );
}

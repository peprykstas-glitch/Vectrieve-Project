def chunk_codebase(filtered_files: dict[str, str], chunk_size: int = 1000, overlap: int = 100) -> list[dict[str, str]]:
    """
    Chunks source code files into overlapping character-based segments, 
    prepending a context header to each chunk.
    """
    if overlap >= chunk_size:
        raise ValueError("Overlap must be strictly less than chunk_size.")

    dataset = []
    step = chunk_size - overlap

    for file_path, content in filtered_files.items():
        header = f"### FILE: {file_path} ###\n\n"
        
        # Handle edge case: empty file
        if not content:
            dataset.append({
                "path": file_path, 
                "content": header
            })
            continue

        # Handle edge case: content is smaller than or equal to chunk_size
        if len(content) <= chunk_size:
            dataset.append({
                "path": file_path, 
                "content": header + content
            })
            continue

        # Sliding window chunking
        start = 0
        while start < len(content):
            end = start + chunk_size
            chunk = content[start:end]
            
            dataset.append({
                "path": file_path,
                "content": header + chunk
            })
            
            # If the current chunk reaches or exceeds the end of the file, we are done
            if end >= len(content):
                break
                
            start += step

    return dataset
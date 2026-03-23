import os
from pathlib import Path

def extract_from_pdf(filepath):
    try:
        from pypdf import PdfReader
        reader = PdfReader(filepath)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip()
    except Exception as e:
        print(f"Failed to read PDF {filepath}: {e}")
        return ""

def extract_from_txt(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        print(f"Failed to read TXT {filepath}: {e}")
        return ""

def load_all_sources(data_folder="data"):
    Path(data_folder).mkdir(exist_ok=True)
    all_text = ""
    found = 0

    for filename in os.listdir(data_folder):
        filepath = os.path.join(data_folder, filename)

        if filename.endswith(".pdf"):
            print(f"Reading PDF: {filename}")
            text = extract_from_pdf(filepath)
            if text:
                all_text += f"\n\n--- Source: {filename} ---\n{text}"
                found += 1

        elif filename.endswith(".txt") and filename != "knowledge_base.txt":
            print(f"Reading TXT: {filename}")
            text = extract_from_txt(filepath)
            if text:
                all_text += f"\n\n--- Source: {filename} ---\n{text}"
                found += 1

    return all_text.strip(), found

def build_knowledge_base(data_folder="data", output_file="data/knowledge_base.txt"):
    print("Building RAG knowledge base...\n")

    all_text, found = load_all_sources(data_folder)

    if found == 0:
        print("No source files found in data/ folder.")
        print("Add PDF or TXT files to data/ folder and run again.")
        return False

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(all_text)

    size = len(all_text)
    print(f"\nDone. Processed {found} file(s).")
    print(f"Knowledge base saved to {output_file}")
    print(f"Total characters: {size}")
    print(f"First 500 characters preview:\n{all_text[:500]}")
    return True

if __name__ == "__main__":
    build_knowledge_base()
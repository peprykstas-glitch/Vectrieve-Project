import re
import os
from collections import defaultdict

def clean_auto_replies(text: str) -> str:
    # Remove repetitive bot greeting blocks
    text = re.sub(r'¡Hola! 👋.*?Leave us a message" https://tinyurl\.com/msv3skzm', '', text, flags=re.DOTALL)
    text = re.sub(r'Welcome to Animafest\. Please add this number.*?to get it\.', '', text, flags=re.DOTALL)
    text = re.sub(r'Bienvenido a la Animafest.*?para recibirlo\.', '', text, flags=re.DOTALL)
    return text.strip()

def process_whatsapp_backup():
    input_file = "BACK UP WA·.txt"
    if not os.path.exists(input_file):
        print(f"File {input_file} not found.")
        return

    with open(input_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Split by WhatsApp timestamp message header
    pattern = r'(\[\d{1,2}:\d{2},\s*\d{1,2}/\d{2}/\d{4}\]\s*([^:]+):\s*)'
    splits = re.split(pattern, content)

    # Reconstruct messages: list of (timestamp_header, sender, message_text)
    messages = []
    # re.split with 2 capturing groups produces: [prematch, header, sender, body, header, sender, body...]
    i = 1
    while i < len(splits) - 2:
        header = splits[i]
        sender = splits[i+1].strip()
        body = splits[i+2]
        messages.append((header, sender, body))
        i += 3

    print(f"Parsed {len(messages)} total messages.")

    # Group messages by Student/Thread
    # We identify the current student thread
    conversations = defaultdict(list)
    current_student = "General / Unknown"

    for header, sender, body in messages:
        # Check if sender is a student (not Animafest)
        if "Animafest" not in sender and sender != "":
            current_student = sender

        clean_body = clean_auto_replies(body)
        if clean_body:
            # Extract timestamp from header: e.g. [17:14, 13/08/2026]
            ts_match = re.search(r'\[(.*?)\]', header)
            ts = ts_match.group(1) if ts_match else ""
            conversations[current_student].append({
                "time": ts,
                "sender": sender,
                "text": clean_body
            })

    print(f"Grouped into {len(conversations)} student conversations.")

    # Categorize conversations into thematic knowledge files
    categories = {
        "documents_and_contracts": [],
        "visa_nie_and_residence": [],
        "insurance_and_flights": [],
        "hotel_placement_and_vacancies": [],
        "eligibility_and_general": []
    }

    def categorize_convo(convo_text: str) -> str:
        lower = convo_text.lower()
        if any(w in lower for w in ["nie", "visa", "visado", "extranjeria", "residencia", "passport", "pasaporte", "ex-04", "ex04", "89 d", "89d"]):
            return "visa_nie_and_residence"
        if any(w in lower for w in ["seguro", "insurance", "vuelo", "flight", "billete", "tarjeta sanitaria"]):
            return "insurance_and_flights"
        if any(w in lower for w in ["hotel", "vacante", "entrevista", "interview", "cocina", "recepcion", "animacion", "empresa"]):
            return "hotel_placement_and_vacancies"
        if any(w in lower for w in ["contrato", "documentos", "subir", "firma", "upload", "convenio", "school", "universidad"]):
            return "documents_and_contracts"
        return "eligibility_and_general"

    output_dir = "animafest_knowledge_base"
    os.makedirs(output_dir, exist_ok=True)

    # Build formatted case entries
    case_counter = 1
    total_valid_cases = 0

    for student, msg_list in conversations.items():
        if len(msg_list) < 2:
            # Skip one-off noise/greetings without real resolution
            continue

        # Combine text for classification
        full_text = " ".join([m["text"] for m in msg_list])
        cat = categorize_convo(full_text)

        case_entry = [
            f"### Case #{case_counter}: Student {student}",
            f"**Context / Participant:** {student}",
            "**Conversation Transcript & Support Resolution:**"
        ]

        for m in msg_list:
            role_label = "Animafest Support" if "Animafest" in m["sender"] else "Student"
            # Collapse multiple inner newlines into single clean space to keep clean markdown bullets
            cleaned_msg = " ".join([line.strip() for line in m["text"].splitlines() if line.strip()])
            if cleaned_msg:
                case_entry.append(f"- **[{m['time']}] {role_label}:** {cleaned_msg}")

        case_entry.append("\n---\n")
        categories[cat].append("\n".join(case_entry))
        case_counter += 1
        total_valid_cases += 1

    # Write thematic knowledge files
    category_titles = {
        "documents_and_contracts": "Animafest Knowledge Base: Contracts, School Agreements & Required Documents",
        "visa_nie_and_residence": "Animafest Knowledge Base: Visa, NIE, TIE, EX-04 & Legal Residence Guidelines",
        "insurance_and_flights": "Animafest Knowledge Base: Health Insurance, European Health Card & Travel Logistics",
        "hotel_placement_and_vacancies": "Animafest Knowledge Base: Hotel Placements, Vacancies & Student Selection Cases",
        "eligibility_and_general": "Animafest Knowledge Base: Student Eligibility, General Inquiries & FAQ Cases"
    }

    created_files = []
    for cat, cases in categories.items():
        if not cases:
            continue
        filepath = os.path.join(output_dir, f"{cat}.md")
        with open(filepath, "w", encoding="utf-8") as out_f:
            out_f.write(f"# {category_titles[cat]}\n\n")
            out_f.write(f"Total Verified Cases: {len(cases)}\n\n---\n\n")
            out_f.write("\n".join(cases))
        created_files.append((filepath, len(cases), os.path.getsize(filepath)))

    # Also convert Audio MESSAGE.docx.txt into a clean operational guide
    audio_msg_file = "Audio MESSAGE.docx.txt"
    if os.path.exists(audio_msg_file):
        with open(audio_msg_file, "r", encoding="utf-8", errors="ignore") as f:
            manual_text = f.read()
        manual_path = os.path.join(output_dir, "animafest_internal_operations_manual.md")
        with open(manual_path, "w", encoding="utf-8") as out_f:
            out_f.write("# Animafest Official Operations Manual & System Guidelines\n\n")
            out_f.write(manual_text)
        created_files.append((manual_path, 1, os.path.getsize(manual_path)))

    print("\nSuccessfully generated knowledge base files:")
    for path, count, size in created_files:
        print(f"  - {path}: {count} items ({size / 1024:.1f} KB)")

if __name__ == "__main__":
    process_whatsapp_backup()

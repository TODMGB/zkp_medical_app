from pathlib import Path
import json
from PyPDF2 import PdfReader

folder = Path(r"g:\biyesheji\MEDICAL_ZKP_APP\foreneded\doc\文献")
results = []
for pdf_path in sorted(folder.glob("*.pdf")):
    preview = ""
    try:
        reader = PdfReader(str(pdf_path))
        for page in reader.pages[:3]:
            preview += page.extract_text() or ""
    except Exception as exc:
        preview = f"ERROR: {exc}"
    results.append({
        "file": pdf_path.name,
        "preview": preview[:2000]
    })

output_path = folder / "preview.json"
output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote previews for {len(results)} PDFs to {output_path}")

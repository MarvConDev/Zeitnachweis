from pathlib import Path
import base64

root = Path(__file__).resolve().parents[1]
logo = root / "assets" / "logo.png"
out = root / "src" / "logoBase64.ts"
b64 = base64.b64encode(logo.read_bytes()).decode("ascii")
out.write_text(
    f"export const LOGO_DATA_URI = 'data:image/png;base64,{b64}';\n",
    encoding="utf-8",
)
print(f"wrote {out} ({len(b64)} chars)")

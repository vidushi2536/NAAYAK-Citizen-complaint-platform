import requests
from bs4 import BeautifulSoup

urls = [
    "https://mcdonline.nic.in/portal",
    "https://mcdonline.nic.in/portal/grievance",
]

all_text = ""

for url in urls:
    try:
        res = requests.get(url, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")
        text = soup.get_text(separator="\n")
        clean = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        all_text += f"\n\n--- Source: {url} ---\n{clean}"
        print(f"Scraped: {url}")
    except Exception as e:
        print(f"Failed: {url} — {e}")

with open("data/mcd_info.txt", "w", encoding="utf-8") as f:
    f.write(all_text)

print("Saved to data/mcd_info.txt")
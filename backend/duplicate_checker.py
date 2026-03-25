from datetime import datetime
import re

def is_within_7_days(filed_at):
    if not filed_at:
        return False
    try:
        complaint_date = datetime.strptime(filed_at, "%d %B %Y at %I:%M %p")
        now = datetime.now()
        diff = now - complaint_date
        return diff.days <= 7
    except:
        return False

def normalize_text(text):
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

def are_similar(text1, text2):
    t1 = normalize_text(text1)
    t2 = normalize_text(text2)
    
    words1 = set(t1.split())
    words2 = set(t2.split())
    intersection = words1 & words2
    union = words1 | words2
    
    if not union:
        return False
    
    similarity = len(intersection) / len(union)
    return similarity > 0.3

def check_duplicate(complaint_text, location, complaint_store):
    for cid, data in complaint_store.items():
        if data.get('location') == location and is_within_7_days(data['filed_at']):
            if are_similar(complaint_text, data['original_text']):
                return cid
    return None
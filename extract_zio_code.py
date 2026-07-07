with open("user_request_full.txt", "r") as f:
    text = f.read()

import re

# find all lines containing 'zero' or 'zernio' or 'zio' or 'platform' in the context of backend controllers
print("--- SEARCHING FOR BACKEND ZERNIO CODE ---")
sentences = text.split('.')
for s in sentences:
    s_lower = s.lower()
    if any(k in s_lower for k in ["zero", "zernio", "zio", "listaccounts", "connecturl"]):
        s_clean = s.strip().replace('\n', ' ')
        if len(s_clean) > 30:
            print("-", s_clean[:200])

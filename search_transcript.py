import re

with open("user_request_full.txt", "r") as f:
    text = f.read()

# Let's find occurrences of npm install or similar commands
print("--- NPM / INSTALL COMMANDS ---")
installs = re.findall(r'(npm install[^\n\.]+)', text, re.IGNORECASE)
for inst in set(installs):
    print(inst)

print("\n--- ZERO/ZIO/ZENO REFERENCES ---")
for line in text.split('.'):
    if any(k in line.lower() for k in ["zio", "zero", "zeno"]):
        # clean line
        l = line.strip().replace('\n', ' ')
        if len(l) > 10:
            print("-", l[:150])

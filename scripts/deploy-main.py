import json, os, subprocess, sys, base64

TOKEN = os.environ.get("GH_TOKEN", "")
if not TOKEN:
    sys.exit("GH_TOKEN required")
OWNER, REPO = "Wrhyija1379", "fuguang-notes"
API_HOST = "api.github.com"
API_IP = "140.82.113.6"

def api(method, path, data=None):
    cmd = ["curl", "-s", "--max-time", "180", "-X", method,
           "-H", f"Authorization: token {TOKEN}",
           "-H", "Accept: application/vnd.github+json",
           "-H", "User-Agent: fuguang-deploy",
           "--resolve", f"{API_HOST}:443:{API_IP}", f"https://{API_HOST}{path}"]
    payload = None
    if data is not None:
        payload = json.dumps(data).encode()
        cmd += ["-H", "Content-Type: application/json", "--data-binary", "@-"]
    r = subprocess.run(cmd, input=payload, capture_output=True)
    out = r.stdout.decode("utf-8", "replace")
    if r.returncode != 0:
        raise RuntimeError(f"{method} {path}: curl failed ({r.returncode})")
    if not out.strip():
        return None
    j = json.loads(out)
    if isinstance(j, dict) and "message" in j and "sha" not in j:
        raise RuntimeError(f"{method} {path}: {j['message']}")
    return j

ROOT = os.path.dirname(os.path.abspath(__file__))
def source_files():
    ignores = {"node_modules", "dist", ".astro", "visual-checks", ".git"}
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in ignores and not d.startswith(".")]
        for f in sorted(files):
            full = os.path.join(root, f)
            rel = os.path.relpath(full, ".").replace(os.sep, "/")
            if rel.startswith(".git/"):
                continue
            yield rel, full

def upload_blob(path):
    with open(path, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode()
    r = api("POST", f"/repos/{OWNER}/{REPO}/git/blobs",
            {"content": b64, "encoding": "base64"})
    return r["sha"]

def main():
    files = list(source_files())
    print(f"Uploading {len(files)} source files...")
    entries = []
    for i, (rel, full) in enumerate(files, 1):
        sha = upload_blob(full)
        entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": sha})
        if i % 20 == 0 or i == len(files):
            print(f"  {i}/{len(files)}")
    print("Building tree...")
    tree_sha = api("POST", f"/repos/{OWNER}/{REPO}/git/trees",
                   {"tree": entries})["sha"]
    print("tree:", tree_sha)
    head = api("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/main")["object"]["sha"]
    commit = api("POST", f"/repos/{OWNER}/{REPO}/git/commits",
                 {"message": "Update: 浮光note rename, real content, GitHub Pages setup",
                  "tree": tree_sha, "parents": [head]})["sha"]
    print("commit:", commit)
    api("PATCH", f"/repos/{OWNER}/{REPO}/git/refs/heads/main",
        {"sha": commit, "force": True})
    print("main updated.")

if __name__ == "__main__":
    main()

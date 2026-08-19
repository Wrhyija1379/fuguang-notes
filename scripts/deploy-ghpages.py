import json, os, subprocess, sys, hashlib

TOKEN = os.environ.get("GH_TOKEN", "")
if not TOKEN:
    sys.exit("GH_TOKEN environment variable is required")
OWNER = os.environ.get("GH_OWNER", "Wrhyija1379")
REPO = os.environ.get("GH_REPO", "fuguang-notes")
API_HOST = "api.github.com"
API_IP = os.environ.get("GH_API_IP", "140.82.113.6")
DIST = os.path.abspath("dist")

def api(method, path, data=None):
    url = f"https://{API_HOST}{path}"
    cmd = ["curl", "-s", "--max-time", "180", "-X", method,
           "-H", f"Authorization: token {TOKEN}",
           "-H", "Accept: application/vnd.github+json",
           "-H", "User-Agent: fuguang-deploy",
           "--resolve", f"{API_HOST}:443:{API_IP}", url]
    payload = None
    if data is not None:
        payload = json.dumps(data).encode()
        cmd += ["-H", "Content-Type: application/json", "--data-binary", "@-"]
    proc = subprocess.run(cmd, input=payload, capture_output=True)
    out = proc.stdout.decode("utf-8", "replace")
    if not out.strip():
        raise RuntimeError(f"{method} {path} -> empty response")
    try:
        j = json.loads(out)
    except json.JSONDecodeError:
        raise RuntimeError(f"{method} {path} -> bad json: {out[:200]}")
    if isinstance(j, dict) and "message" in j and "sha" not in j and "url" not in j:
        raise RuntimeError(f"{method} {path} -> API error: {j['message']}")
    return j

def list_files(base):
    for root, dirs, files in os.walk(base):
        dirs.sort(); files.sort()
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, base).replace(os.sep, "/")
            yield rel, full

def upload_blob(path):
    with open(path, "rb") as fh:
        content = fh.read()
    if len(content) > 90_000_000:
        raise RuntimeError(f"{path} too large")
    r = api("POST", f"/repos/{OWNER}/{REPO}/git/blobs",
            {"content": content.decode("utf-8", "surrogateescape"), "encoding": "utf-8"})
    return r["sha"]

def upload_blob_base64(path):
    import base64
    with open(path, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode()
    r = api("POST", f"/repos/{OWNER}/{REPO}/git/blobs",
            {"content": b64, "encoding": "base64"})
    return r["sha"]

def build_tree(entries, base_tree):
    # entries: list of (path, sha, mode)
    tree = [{"path": p, "mode": m, "type": "blob", "sha": s} for p, s, m in entries]
    r = api("POST", f"/repos/{OWNER}/{REPO}/git/trees",
            {"tree": tree, "base_tree": base_tree})
    return r["sha"]

def create_commit(tree_sha, parents, message):
    r = api("POST", f"/repos/{OWNER}/{REPO}/git/commits",
            {"message": message, "tree": tree_sha, "parents": parents})
    return r["sha"]

def update_ref(ref, sha):
    # 已存在则 PATCH，否则 POST 创建
    r = api("PATCH", f"/repos/{OWNER}/{REPO}/git/refs/{ref}",
            {"sha": sha, "force": True})
    return r

def create_ref(ref, sha):
    r = api("POST", f"/repos/{OWNER}/{REPO}/git/refs",
            {"ref": f"refs/{ref}", "sha": sha})
    return r

def main():
    files = list(list_files(DIST))
    print(f"Uploading {len(files)} files...")
    entries = []
    for i, (rel, full) in enumerate(files, 1):
        # 二进制文件用 base64，文本用 utf-8
        with open(full, "rb") as fh:
            head_bytes = fh.read(1024)
        is_text = True
        try:
            head_bytes.decode("utf-8")
        except UnicodeDecodeError:
            is_text = False
        if is_text:
            sha = upload_blob(full)
        else:
            sha = upload_blob_base64(full)
        entries.append((rel, sha, "100644"))
        if i % 20 == 0 or i == len(files):
            print(f"  {i}/{len(files)} uploaded")
    print("Building tree...")
    base_tree = None
    main_head = ref_sha("heads/main")
    if main_head:
        base_tree = api("GET", f"/repos/{OWNER}/{REPO}/git/commits/{main_head}")["tree"]["sha"]
    tree_sha = build_tree(entries, base_tree)
    print("tree:", tree_sha)
    parent = main_head
    commit_sha = create_commit(tree_sha, [parent] if parent else [], "Deploy to GitHub Pages")
    print("commit:", commit_sha)
    try:
        update_ref("heads/gh-pages", commit_sha)
    except Exception:
        create_ref("heads/gh-pages", commit_sha)
    print("gh-pages updated.")

def ref_sha(branch):
    try:
        r = api("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/{branch}")
        return r["object"]["sha"]
    except Exception:
        return None

if __name__ == "__main__":
    main()

import zipfile
import subprocess
import os

src_apk = r"C:\Users\edvan\Downloads\Delta-Lite-2.apk"
java_home = r"C:\Program Files\Android\Android Studio\jbr"
apksigner = r"C:\Users\edvan\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
keystore = r"C:\Users\edvan\.android\debug.keystore"

env = os.environ.copy()
env["JAVA_HOME"] = java_home
env["PATH"] = os.path.join(java_home, "bin") + os.pathsep + env["PATH"]

clones = [
    ("com.roblox.clienw", r"C:\Users\edvan\Downloads\Delta-Lite-4.apk"),
    ("com.roblox.clienx", r"C:\Users\edvan\Downloads\Delta-Lite-5.apk"),
    ("com.roblox.clieny", r"C:\Users\edvan\Downloads\Delta-Lite-6.apk")
]

for pkg, out_apk in clones:
    print(f"[*] Membuat {pkg} -> {out_apk}...")
    unsigned_apk = out_apk.replace(".apk", "_unsigned.apk")
    
    with zipfile.ZipFile(src_apk, "r") as zin, zipfile.ZipFile(unsigned_apk, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            fname = item.filename
            if fname.startswith("META-INF/"):
                continue
            data = zin.read(fname)
            if fname in ("AndroidManifest.xml", "resources.arsc"):
                data = data.replace(b"com.roblox.clienu", pkg.encode("ascii"))
            zout.writestr(item, data)
            
    print(f"[*] Menandatangani {out_apk}...")
    cmd = [
        apksigner, "sign",
        "--ks", keystore,
        "--ks-pass", "pass:android",
        "--key-pass", "pass:android",
        "--ks-key-alias", "androiddebugkey",
        "--out", out_apk,
        unsigned_apk
    ]
    subprocess.run(cmd, env=env, check=True)
    if os.path.exists(unsigned_apk):
        os.remove(unsigned_apk)
    print(f"[V] {out_apk} selesai dibuat dan ditandatangani!")

print("=== SEMUA CLONE 4, 5, 6 BERHASIL DIBUAT ===")

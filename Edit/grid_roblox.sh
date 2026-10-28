#!/system/bin/sh
echo "=== MENATA 6 ROBLOX KE GRID 2x3 ==="

PACKAGES="
com.roblox.client
com.roblox.clienu
com.roblox.clienv
com.roblox.clienw
com.roblox.clienx
com.roblox.clieny
"

SLOT=1
for PKG in $PACKAGES; do
    TID=$(am stack list | grep "$PKG/" | head -n 1 | awk '{print $1}' | cut -d'=' -f2 | cut -d':' -f1)
    if [ -n "$TID" ]; then
        case $SLOT in
            1) am task resize "$TID" 0 0 270 320 ;;
            2) am task resize "$TID" 270 0 540 320 ;;
            3) am task resize "$TID" 0 320 270 640 ;;
            4) am task resize "$TID" 270 320 540 640 ;;
            5) am task resize "$TID" 0 640 270 960 ;;
            6) am task resize "$TID" 270 640 540 960 ;;
        esac
        echo "[*] Slot $SLOT: $PKG (Task $TID) ditata."
        
        PID=$(pidof "$PKG")
        if [ -n "$PID" ]; then
            echo -1000 > "/proc/$PID/oom_score_adj" 2>/dev/null
        fi
    else
        echo "[!] Task untuk $PKG belum aktif."
    fi
    SLOT=$((SLOT + 1))
done

echo "=== TATA LETAK GRID 2x3 SELESAI ==="

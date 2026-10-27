#!/system/bin/sh
T1=$(am stack list | grep "com.roblox.client/" | head -n 1 | awk '{print $1}' | cut -d'=' -f2 | cut -d':' -f1)
T2=$(am stack list | grep "com.roblox.clienu/" | head -n 1 | awk '{print $1}' | cut -d'=' -f2 | cut -d':' -f1)

echo "Detected Tasks - Clone1: $T1, Clone2: $T2"
if [ -n "$T1" ] && [ -n "$T2" ]; then
    am task resize "$T1" 0 0 540 470
    am task resize "$T2" 0 470 540 960
    echo "Split screen layout (Top/Bottom) applied successfully!"
else
    echo "Error: One or both tasks not active."
fi

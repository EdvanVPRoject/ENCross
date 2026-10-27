#!/system/bin/sh
CUR_SIZE=$(cat /sys/block/zram0/disksize 2>/dev/null)
if [ "$CUR_SIZE" != "3221225472" ]; then
    swapoff /dev/block/zram0 2>/dev/null
    echo 3221225472 > /sys/block/zram0/disksize
    mkswap /dev/block/zram0
    swapon /dev/block/zram0
fi

#!/system/bin/sh
echo "=== MEMULAI DEBLOAT ANDROID 12 ==="

BLOATWARE="
com.google.android.apps.youtube.music
com.google.android.projection.gearhead
com.google.android.googlequicksearchbox
com.google.android.apps.wellbeing
com.google.android.deskclock
com.android.contacts
com.google.android.syncadapters.contacts
com.android.printspooler
com.google.android.printservice.recommendation
com.android.bips
com.android.bips.auto_generated_rro_product__
com.android.emergency
com.android.emergency.auto_generated_rro_product__
com.android.stk
com.android.cellbroadcastreceiver
com.google.android.cellbroadcastreceiver
com.google.android.cellbroadcastservice
com.android.providers.calendar
com.android.egg
com.breel.wallpapers18
com.google.android.apps.wallpaper
com.google.android.apps.wallpaper.nexus
com.android.wallpaper.livepicker
com.android.wallpaperbackup
com.google.android.markup
com.google.android.apps.restore
com.google.android.setupwizard
com.google.android.sdksetup
com.google.android.partnersetup
com.google.android.feedback
com.google.android.tts
com.google.android.tag
com.android.nfc
com.android.nfc.auto_generated_rro_product__
com.google.android.soundpicker
com.android.soundpicker
com.android.bluetooth
com.android.bluetoothmidiservice
com.android.traceur
com.android.traceur.auto_generated_rro_product__
com.android.cameraextensions
com.android.companiondevicemanager
com.android.bookmarkprovider
com.android.providers.partnerbookmarks
com.android.calllogbackup
com.android.sharedstoragebackup
com.android.dreams.basic
com.android.simappdialog
com.android.simappdialog.auto_generated_rro_product__
com.android.imsserviceentitlement
com.google.pixel.exo
"

for PKG in $BLOATWARE; do
    if pm list packages | grep -q "$PKG"; then
        echo "[*] Menghapus bloatware: $PKG"
        am force-stop "$PKG" 2>/dev/null
        pm disable-user --user 0 "$PKG" 2>/dev/null
        pm uninstall -k --user 0 "$PKG" 2>/dev/null
    fi
done

echo "=== MEMASTIKAN APLIKASI UTAMA AKTIF ==="
# Browser
cmd package install-existing com.android.chrome 2>/dev/null
pm enable com.android.chrome 2>/dev/null

# File Manager
cmd package install-existing com.google.android.documentsui 2>/dev/null
pm enable com.google.android.documentsui 2>/dev/null

# Settings
cmd package install-existing com.android.settings 2>/dev/null
pm enable com.android.settings 2>/dev/null

# Keyboard (Gboard)
cmd package install-existing com.google.android.inputmethod.latin 2>/dev/null
pm enable com.google.android.inputmethod.latin 2>/dev/null

# Launcher
cmd package install-existing com.google.android.apps.nexuslauncher 2>/dev/null
pm enable com.google.android.apps.nexuslauncher 2>/dev/null

# Delta Clones
pm enable com.roblox.client 2>/dev/null
pm enable com.roblox.clienu 2>/dev/null

echo "=== DEBLOAT SELESAI ==="

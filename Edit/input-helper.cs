using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;

namespace ENCrossInput {
    class Program {
        [DllImport("user32.dll")]
        static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

        [DllImport("user32.dll")]
        static extern bool LockWorkStation();

        [StructLayout(LayoutKind.Sequential)]
        struct POINT { public int X; public int Y; }

        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        const uint MOUSEEVENTF_WHEEL = 0x0800;
        const uint KEYEVENTF_KEYUP = 0x0002;

        static void Main(string[] args) {
            Console.WriteLine("ENCROSS_INPUT_READY");
            string line;
            while ((line = Console.ReadLine()) != null) {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;
                if (line == "exit" || line == "quit") break;

                try {
                    string[] parts = line.Split(' ');
                    string cmd = parts[0].ToLowerInvariant();

                    if (cmd == "m" && parts.Length >= 3) {
                        // Relative mouse move: m <dx> <dy>
                        int dx = int.Parse(parts[1]);
                        int dy = int.Parse(parts[2]);
                        POINT pt;
                        if (GetCursorPos(out pt)) {
                            SetCursorPos(pt.X + dx, pt.Y + dy);
                        }
                    } else if (cmd == "c" && parts.Length >= 2) {
                        // Click: c left / c right / c double
                        string btn = parts[1].ToLowerInvariant();
                        if (btn == "left") {
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                        } else if (btn == "right") {
                            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
                            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
                        } else if (btn == "double") {
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                            Thread.Sleep(50);
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                        }
                    } else if (cmd == "d" && parts.Length >= 2) {
                        // Mouse down: d left / d right
                        if (parts[1].ToLowerInvariant() == "left") mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                        else if (parts[1].ToLowerInvariant() == "right") mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
                    } else if (cmd == "u" && parts.Length >= 2) {
                        // Mouse up: u left / u right
                        if (parts[1].ToLowerInvariant() == "left") mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                        else if (parts[1].ToLowerInvariant() == "right") mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
                    } else if (cmd == "w" && parts.Length >= 2) {
                        // Scroll: w <amount>
                        int delta = int.Parse(parts[1]);
                        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)delta, 0);
                    } else if (cmd == "k" && parts.Length >= 2) {
                        // Single Key: k <key>
                        byte vk = ParseKey(parts[1]);
                        if (vk > 0) {
                            keybd_event(vk, 0, 0, 0);
                            keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
                        }
                    } else if ((cmd == "combo" || cmd == "hotkey") && parts.Length >= 2) {
                        // Arbitrary Multi-Key combination: combo ctrl shift esc / combo win d
                        List<byte> keys = new List<byte>();
                        for (int i = 1; i < parts.Length; i++) {
                            byte vk = ParseKey(parts[i]);
                            if (vk > 0) keys.Add(vk);
                        }
                        for (int i = 0; i < keys.Count; i++) {
                            keybd_event(keys[i], 0, 0, 0);
                        }
                        Thread.Sleep(30);
                        for (int i = keys.Count - 1; i >= 0; i--) {
                            keybd_event(keys[i], 0, KEYEVENTF_KEYUP, 0);
                        }
                    } else if (cmd == "lock") {
                        // Lock Windows Workstation
                        LockWorkStation();
                    } else if (cmd == "media" && parts.Length >= 2) {
                        // Media keys: volup, voldown, mute, playpause, next, prev
                        string m = parts[1].ToLowerInvariant();
                        byte vk = 0;
                        if (m == "volup") vk = 0xAF;
                        else if (m == "voldown") vk = 0xAE;
                        else if (m == "mute") vk = 0xAD;
                        else if (m == "playpause") vk = 0xB3;
                        else if (m == "next") vk = 0xB0;
                        else if (m == "prev") vk = 0xB1;
                        if (vk > 0) {
                            keybd_event(vk, 0, 0, 0);
                            keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
                        }
                    }
                } catch {
                    // Safe error absorption for continuous streaming
                }
            }
        }

        static byte ParseKey(string k) {
            k = k.ToLowerInvariant();
            if (k.Length == 1 && k[0] >= '0' && k[0] <= '9') return (byte)(0x30 + (k[0] - '0'));
            if (k.Length == 1 && k[0] >= 'a' && k[0] <= 'z') return (byte)(0x41 + (k[0] - 'a'));
            if (k.StartsWith("num") && k.Length == 4 && k[3] >= '0' && k[3] <= '9') return (byte)(0x60 + (k[3] - '0'));

            // Function keys F1-F12
            if (k.StartsWith("f") && k.Length >= 2 && k.Length <= 3) {
                int fNum;
                if (int.TryParse(k.Substring(1), out fNum) && fNum >= 1 && fNum <= 12) {
                    return (byte)(0x70 + (fNum - 1));
                }
            }

            switch (k) {
                case "enter": case "return": return 0x0D;
                case "back": case "backspace": return 0x08;
                case "esc": case "escape": return 0x1B;
                case "tab": return 0x09;
                case "space": return 0x20;
                case "up": return 0x26;
                case "down": return 0x28;
                case "left": return 0x25;
                case "right": return 0x27;
                case "win": case "windows": case "meta": return 0x5B;
                case "alt": case "menu": return 0x12;
                case "ctrl": case "control": return 0x11;
                case "shift": return 0x10;
                case "prtscn": case "printscreen": return 0x2C;
                case "del": case "delete": return 0x2E;
                case "ins": case "insert": return 0x2D;
                case "home": return 0x24;
                case "end": return 0x23;
                case "pageup": case "pgup": return 0x21;
                case "pagedown": case "pgdn": return 0x22;
                case "caps": case "capslock": return 0x14;
                case "plus": case "add": return 0x6B;
                case "minus": case "subtract": return 0x6D;
                case "multiply": return 0x6A;
                case "divide": return 0x6F;
                case "decimal": case "dot": return 0x6E;
                default: return 0;
            }
        }
    }
}

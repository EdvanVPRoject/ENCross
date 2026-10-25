using System;
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
                    } else if (cmd == "combo" && parts.Length >= 3) {
                        // Key combination, e.g. combo win d or combo alt tab
                        byte mod = ParseKey(parts[1]);
                        byte key = ParseKey(parts[2]);
                        if (mod > 0 && key > 0) {
                            keybd_event(mod, 0, 0, 0);
                            keybd_event(key, 0, 0, 0);
                            keybd_event(key, 0, KEYEVENTF_KEYUP, 0);
                            keybd_event(mod, 0, KEYEVENTF_KEYUP, 0);
                        }
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

            switch (k) {
                case "enter": return 0x0D;
                case "back": case "backspace": return 0x08;
                case "esc": case "escape": return 0x1B;
                case "tab": return 0x09;
                case "space": return 0x20;
                case "up": return 0x26;
                case "down": return 0x28;
                case "left": return 0x25;
                case "right": return 0x27;
                case "win": case "windows": return 0x5B;
                case "alt": return 0x12;
                case "ctrl": case "control": return 0x11;
                case "shift": return 0x10;
                case "prtscn": case "printscreen": return 0x2C;
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

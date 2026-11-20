using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace Quickswap.Security {
    class Program {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct CREDENTIAL {
            public int Flags;
            public int Type;
            public string TargetName;
            public string Comment;
            public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
            public int CredentialBlobSize;
            public IntPtr CredentialBlob;
            public int Persist;
            public int AttributeCount;
            public IntPtr Attributes;
            public string TargetAlias;
            public string UserName;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredWrite([In] ref CREDENTIAL userCredential, [In] uint flags);

        [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

        [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredDelete(string target, int type, int flags);

        [DllImport("advapi32.dll", EntryPoint = "CredEnumerateW", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredEnumerate(string filter, int flags, out int count, out IntPtr pArray);

        [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
        public static extern void CredFree([In] IntPtr cred);

        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

        [DllImport("kernel32.dll")]
        public static extern uint GetCurrentThreadId();

        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        private const int CRED_TYPE_GENERIC = 1;
        private const int CRED_PERSIST_LOCAL_MACHINE = 2;
        private const int SW_RESTORE = 9;

        [STAThread]
        static int Main(string[] args) {
            Console.OutputEncoding = Encoding.UTF8;
            if (args.Length == 0) {
                Console.WriteLine("{\"error\":\"No command specified\"}");
                return 1;
            }

            string command = args[0].ToLowerInvariant();
            if (command == "daemon") {
                return RunDaemonLoop();
            }

            try {
                string result = DispatchCommand(command, args, null);
                Console.WriteLine(result);
                return result.Contains("\"error\"") ? 1 : 0;
            } catch (Exception ex) {
                Console.WriteLine("{\"error\":\"" + EscapeJson(ex.Message) + "\"}");
                return 1;
            }
        }

        private static int RunDaemonLoop() {
            var serializer = new JavaScriptSerializer();
            Console.WriteLine("{\"status\":\"daemon_ready\"}");
            Console.Out.Flush();

            string line;
            while ((line = Console.ReadLine()) != null) {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;
                if (line == "exit" || line == "quit") break;

                string reqId = "";
                try {
                    var dict = serializer.Deserialize<Dictionary<string, object>>(line);
                    if (dict != null) {
                        if (dict.ContainsKey("id")) reqId = Convert.ToString(dict["id"]);
                        string cmd = dict.ContainsKey("command") ? Convert.ToString(dict["command"]) : "";
                        List<string> argsList = new List<string>();
                        if (dict.ContainsKey("args")) {
                            System.Collections.ArrayList arr = dict["args"] as System.Collections.ArrayList;
                            if (arr != null) {
                                foreach (object itm in arr) argsList.Add(Convert.ToString(itm));
                            }
                        }
                        string data = dict.ContainsKey("data") ? Convert.ToString(dict["data"]) : null;

                        string jsonRes = DispatchCommand(cmd, argsList.ToArray(), data);
                        Console.WriteLine(string.Format("{{\"id\":\"{0}\",\"response\":{1}}}", EscapeJson(reqId), jsonRes));
                    }
                } catch (Exception ex) {
                    Console.WriteLine(string.Format("{{\"id\":\"{0}\",\"error\":\"{1}\"}}", EscapeJson(reqId), EscapeJson(ex.Message)));
                }
                Console.Out.Flush();
            }
            return 0;
        }

        private static string DispatchCommand(string command, string[] args, string inputData) {
            string cmd = (command ?? "").ToLowerInvariant();
            switch (cmd) {
                case "status":
                    return HandleStatus();

                case "dpapi-protect":
                    return HandleDpapiProtect(args, inputData);

                case "dpapi-unprotect":
                    return HandleDpapiUnprotect(args, inputData);

                case "cred-write":
                    return HandleCredWrite(args, inputData);

                case "cred-read":
                    return HandleCredRead(args);

                case "cred-delete":
                    return HandleCredDelete(args);

                case "cred-list":
                    return HandleCredList(args);

                case "autologin-window":
                    return HandleAutoLoginWindow(args);

                default:
                    return "{\"error\":\"Unknown command: " + EscapeJson(cmd) + "\"}";
            }
        }

        private static string HandleStatus() {
            bool credOk = true;
            bool dpapiOk = true;

            try {
                byte[] test = Encoding.UTF8.GetBytes("test");
                byte[] enc = ProtectedData.Protect(test, null, DataProtectionScope.CurrentUser);
                byte[] dec = ProtectedData.Unprotect(enc, null, DataProtectionScope.CurrentUser);
                dpapiOk = Encoding.UTF8.GetString(dec) == "test";
            } catch {
                dpapiOk = false;
            }

            return string.Format("{{\"windowsCredManager\":{0},\"dpapi\":{1}}}",
                credOk ? "true" : "false",
                dpapiOk ? "true" : "false");
        }

        private static string HandleDpapiProtect(string[] args, string inputData) {
            string input = ReadInput(args, 1, inputData);
            if (input == null) {
                return "{\"error\":\"No input data provided for DPAPI protect\"}";
            }

            byte[] plain = Encoding.UTF8.GetBytes(input);
            byte[] encrypted = ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser);
            string base64 = Convert.ToBase64String(encrypted);

            return "{\"success\":true,\"data\":\"" + base64 + "\"}";
        }

        private static string HandleDpapiUnprotect(string[] args, string inputData) {
            string base64 = ReadInput(args, 1, inputData);
            if (string.IsNullOrEmpty(base64)) {
                return "{\"error\":\"No input data provided for DPAPI unprotect\"}";
            }

            byte[] encrypted = Convert.FromBase64String(base64.Trim());
            byte[] plain = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            string result = Encoding.UTF8.GetString(plain);

            return "{\"success\":true,\"data\":\"" + EscapeJson(result) + "\"}";
        }

        private static string HandleCredWrite(string[] args, string inputData) {
            int targetIdx = (args.Length > 0 && args[0].ToLowerInvariant() == "cred-write") ? 1 : 0;
            int userIdx = targetIdx + 1;
            int passIdx = userIdx + 1;

            if (args.Length <= userIdx) {
                return "{\"error\":\"cred-write requires <target> <username>\"}";
            }

            string target = args[targetIdx];
            string username = args[userIdx];
            string password = ReadInput(args, passIdx, inputData);
            if (password == null) password = "";

            byte[] credBytes = Encoding.Unicode.GetBytes(password);
            IntPtr credBlob = Marshal.AllocHGlobal(credBytes.Length);
            Marshal.Copy(credBytes, 0, credBlob, credBytes.Length);

            try {
                CREDENTIAL cred = new CREDENTIAL();
                cred.Type = CRED_TYPE_GENERIC;
                cred.TargetName = target;
                cred.UserName = username;
                cred.CredentialBlob = credBlob;
                cred.CredentialBlobSize = credBytes.Length;
                cred.Persist = CRED_PERSIST_LOCAL_MACHINE;

                bool success = CredWrite(ref cred, 0);
                if (success) {
                    return "{\"success\":true,\"target\":\"" + EscapeJson(target) + "\"}";
                } else {
                    int err = Marshal.GetLastWin32Error();
                    return "{\"error\":\"CredWrite failed with Win32 error " + err + "\"}";
                }
            } finally {
                Marshal.FreeHGlobal(credBlob);
            }
        }

        private static string HandleCredRead(string[] args) {
            int targetIdx = (args.Length > 0 && args[0].ToLowerInvariant() == "cred-read") ? 1 : 0;
            if (args.Length <= targetIdx) {
                return "{\"error\":\"cred-read requires <target>\"}";
            }

            string target = args[targetIdx];
            IntPtr credPtr;
            if (CredRead(target, CRED_TYPE_GENERIC, 0, out credPtr)) {
                try {
                    CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
                    string password = "";
                    if (cred.CredentialBlobSize > 0 && cred.CredentialBlob != IntPtr.Zero) {
                        byte[] credBytes = new byte[cred.CredentialBlobSize];
                        Marshal.Copy(cred.CredentialBlob, credBytes, 0, cred.CredentialBlobSize);
                        password = Encoding.Unicode.GetString(credBytes);
                    }

                    return "{\"success\":true,\"found\":true,\"target\":\"" + EscapeJson(cred.TargetName ?? target) +
                        "\",\"username\":\"" + EscapeJson(cred.UserName ?? "") +
                        "\",\"password\":\"" + EscapeJson(password) + "\"}";
                } finally {
                    CredFree(credPtr);
                }
            } else {
                int err = Marshal.GetLastWin32Error();
                if (err == 1168) { // ERROR_NOT_FOUND
                    return "{\"success\":true,\"found\":false,\"target\":\"" + EscapeJson(target) + "\"}";
                }
                return "{\"error\":\"CredRead failed with Win32 error " + err + "\"}";
            }
        }

        private static string HandleCredDelete(string[] args) {
            int targetIdx = (args.Length > 0 && args[0].ToLowerInvariant() == "cred-delete") ? 1 : 0;
            if (args.Length <= targetIdx) {
                return "{\"error\":\"cred-delete requires <target>\"}";
            }

            string target = args[targetIdx];
            bool success = CredDelete(target, CRED_TYPE_GENERIC, 0);
            int err = Marshal.GetLastWin32Error();
            if (success || err == 1168) {
                return "{\"success\":true,\"target\":\"" + EscapeJson(target) + "\"}";
            } else {
                return "{\"error\":\"CredDelete failed with Win32 error " + err + "\"}";
            }
        }

        private static string HandleCredList(string[] args) {
            int prefixIdx = (args.Length > 0 && args[0].ToLowerInvariant() == "cred-list") ? 1 : 0;
            string prefix = args.Length > prefixIdx ? args[prefixIdx] : "Quickswap";
            int count;
            IntPtr pArray;

            string filter = prefix.EndsWith("*") ? prefix : prefix + "*";
            if (CredEnumerate(filter, 0, out count, out pArray)) {
                try {
                    List<string> items = new List<string>();
                    for (int i = 0; i < count; i++) {
                        IntPtr pCred = Marshal.ReadIntPtr(pArray, i * IntPtr.Size);
                        CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(pCred, typeof(CREDENTIAL));
                        string item = "{\"target\":\"" + EscapeJson(cred.TargetName ?? "") +
                                      "\",\"username\":\"" + EscapeJson(cred.UserName ?? "") + "\"}";
                        items.Add(item);
                    }
                    return "{\"success\":true,\"credentials\":[" + string.Join(",", items.ToArray()) + "]}";
                } finally {
                    CredFree(pArray);
                }
            } else {
                int err = Marshal.GetLastWin32Error();
                if (err == 1168) {
                    return "{\"success\":true,\"credentials\":[]}";
                }
                return "{\"error\":\"CredEnumerate failed with error " + err + "\"}";
            }
        }

        private static string ReadInput(string[] args, int index, string explicitData) {
            if (explicitData != null) {
                return explicitData;
            }
            if (args.Length > index) {
                return args[index];
            }
            if (Console.IsInputRedirected) {
                using (var reader = new StreamReader(Console.OpenStandardInput(), Encoding.UTF8)) {
                    return reader.ReadToEnd();
                }
            }
            return null;
        }

        private static string EscapeJson(string s) {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder();
            foreach (char c in s) {
                switch (c) {
                    case '\\': sb.Append("\\\\"); break;
                    case '\"': sb.Append("\\\""); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < ' ') {
                            sb.AppendFormat("\\u{0:x4}", (int)c);
                        } else {
                            sb.Append(c);
                        }
                        break;
                }
            }
            return sb.ToString();
        }

        private static string HandleAutoLoginWindow(string[] args) {
            int offset = (args.Length > 0 && args[0].ToLowerInvariant() == "autologin-window") ? 1 : 0;
            if (args.Length < offset + 3) {
                return "{\"error\":\"autologin-window requires <windowPattern> <username> <credentialTarget> [timeoutSec]\"}";
            }

            string windowPattern = args[offset];
            string username = args[offset + 1];
            string credTarget = args[offset + 2];
            int timeoutSec = 25;
            if (args.Length > offset + 3) {
                int.TryParse(args[offset + 3], out timeoutSec);
            }

            // 1. Retrieve password securely from Windows Credential Manager
            IntPtr credPtr;
            string password = "";
            if (CredRead(credTarget, CRED_TYPE_GENERIC, 0, out credPtr)) {
                try {
                    CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
                    if (cred.CredentialBlobSize > 0 && cred.CredentialBlob != IntPtr.Zero) {
                        byte[] credBytes = new byte[cred.CredentialBlobSize];
                        Marshal.Copy(cred.CredentialBlob, credBytes, 0, cred.CredentialBlobSize);
                        password = Encoding.Unicode.GetString(credBytes);
                    }
                } finally {
                    CredFree(credPtr);
                }
            }

            if (string.IsNullOrEmpty(password)) {
                return "{\"success\":false,\"error\":\"Credential not found in Windows Credential Manager for target: " + EscapeJson(credTarget) + "\"}";
            }

            // 2. Poll for target window to appear and be visible
            IntPtr targetHwnd = IntPtr.Zero;
            DateTime start = DateTime.Now;

            while ((DateTime.Now - start).TotalSeconds < timeoutSec) {
                targetHwnd = FindTargetWindow(windowPattern);
                if (targetHwnd != IntPtr.Zero) {
                    break;
                }
                System.Threading.Thread.Sleep(400);
            }

            if (targetHwnd == IntPtr.Zero) {
                return "{\"success\":false,\"error\":\"Window matching '" + EscapeJson(windowPattern) + "' was not found within " + timeoutSec + "s\"}";
            }

            // 3. Bring window to foreground
            uint targetPid;
            uint targetThread = GetWindowThreadProcessId(targetHwnd, out targetPid);
            uint currentThread = GetCurrentThreadId();

            try {
                AttachThreadInput(currentThread, targetThread, true);
            } catch {}

            try {
                ShowWindow(targetHwnd, SW_RESTORE);
                SetForegroundWindow(targetHwnd);

                // Wait 2200ms for webview to render input fields
                System.Threading.Thread.Sleep(2200);

                // Fill Username
                Clipboard.SetText(username);
                SendKeys.SendWait("^a");
                System.Threading.Thread.Sleep(80);
                SendKeys.SendWait("{BACKSPACE}");
                System.Threading.Thread.Sleep(80);
                SendKeys.SendWait("^v");
                System.Threading.Thread.Sleep(150);

                // Tab to Password Field
                SendKeys.SendWait("{TAB}");
                System.Threading.Thread.Sleep(150);

                // Fill Password
                Clipboard.SetText(password);
                SendKeys.SendWait("^a");
                System.Threading.Thread.Sleep(80);
                SendKeys.SendWait("{BACKSPACE}");
                System.Threading.Thread.Sleep(80);
                SendKeys.SendWait("^v");
                System.Threading.Thread.Sleep(80);

                // Instantly wipe password from clipboard for security
                Clipboard.Clear();
                System.Threading.Thread.Sleep(200);

                // Submit Login
                SendKeys.SendWait("{ENTER}");

                return "{\"success\":true,\"message\":\"Automated credentials filled and login submitted successfully\"}";
            } finally {
                try {
                    AttachThreadInput(currentThread, targetThread, false);
                } catch {}
                try {
                    Clipboard.Clear();
                } catch {}
            }
        }

        private static IntPtr FindTargetWindow(string pattern) {
            IntPtr found = IntPtr.Zero;
            EnumWindows((hWnd, lParam) => {
                if (!IsWindowVisible(hWnd)) return true;

                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();

                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                string procName = "";
                try {
                    procName = Process.GetProcessById((int)pid).ProcessName;
                } catch {}

                string lowerTitle = title.ToLowerInvariant();
                string lowerProc = procName.ToLowerInvariant();
                string lowerPattern = pattern.ToLowerInvariant();

                bool isRiot = lowerPattern.Contains("riot") || lowerPattern.Contains("league") || lowerPattern.Contains("valorant");
                bool titleMatch = !string.IsNullOrEmpty(title) && (lowerTitle.Contains(lowerPattern) || (isRiot && lowerTitle.Contains("riot")));
                bool procMatch = isRiot && (lowerProc.Contains("riot") || lowerProc.Contains("riot client") || lowerProc.Contains("riotclientservices"));

                RECT r;
                GetWindowRect(hWnd, out r);
                int width = r.Right - r.Left;
                int height = r.Bottom - r.Top;

                if ((titleMatch || procMatch) && width >= 400 && height >= 350) {
                    found = hWnd;
                    return false;
                }
                return true;
            }, IntPtr.Zero);

            return found;
        }
    }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace AccountHub.Security {
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

        private const int CRED_TYPE_GENERIC = 1;
        private const int CRED_PERSIST_LOCAL_MACHINE = 2;

        static int Main(string[] args) {
            Console.OutputEncoding = Encoding.UTF8;
            if (args.Length == 0) {
                Console.WriteLine("{\"error\":\"No command specified\"}");
                return 1;
            }

            string command = args[0].ToLowerInvariant();
            try {
                switch (command) {
                    case "status":
                        return HandleStatus();

                    case "dpapi-protect":
                        return HandleDpapiProtect(args);

                    case "dpapi-unprotect":
                        return HandleDpapiUnprotect(args);

                    case "cred-write":
                        return HandleCredWrite(args);

                    case "cred-read":
                        return HandleCredRead(args);

                    case "cred-delete":
                        return HandleCredDelete(args);

                    case "cred-list":
                        return HandleCredList(args);

                    default:
                        Console.WriteLine("{\"error\":\"Unknown command: " + EscapeJson(command) + "\"}");
                        return 1;
                }
            } catch (Exception ex) {
                Console.WriteLine("{\"error\":\"" + EscapeJson(ex.Message) + "\"}");
                return 1;
            }
        }

        private static int HandleStatus() {
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

            Console.WriteLine(string.Format("{{\"windowsCredManager\":{0},\"dpapi\":{1}}}",
                credOk ? "true" : "false",
                dpapiOk ? "true" : "false"));
            return 0;
        }

        private static int HandleDpapiProtect(string[] args) {
            string input = ReadInput(args, 1);
            if (input == null) {
                Console.WriteLine("{\"error\":\"No input data provided for DPAPI protect\"}");
                return 1;
            }

            byte[] plain = Encoding.UTF8.GetBytes(input);
            byte[] encrypted = ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser);
            string base64 = Convert.ToBase64String(encrypted);

            Console.WriteLine("{\"success\":true,\"data\":\"" + base64 + "\"}");
            return 0;
        }

        private static int HandleDpapiUnprotect(string[] args) {
            string base64 = ReadInput(args, 1);
            if (string.IsNullOrEmpty(base64)) {
                Console.WriteLine("{\"error\":\"No input data provided for DPAPI unprotect\"}");
                return 1;
            }

            byte[] encrypted = Convert.FromBase64String(base64.Trim());
            byte[] plain = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            string result = Encoding.UTF8.GetString(plain);

            Console.WriteLine("{\"success\":true,\"data\":\"" + EscapeJson(result) + "\"}");
            return 0;
        }

        private static int HandleCredWrite(string[] args) {
            if (args.Length < 3) {
                Console.WriteLine("{\"error\":\"cred-write requires <target> <username>\"}");
                return 1;
            }

            string target = args[1];
            string username = args[2];
            string password = ReadInput(args, 3);
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
                    Console.WriteLine("{\"success\":true,\"target\":\"" + EscapeJson(target) + "\"}");
                    return 0;
                } else {
                    int err = Marshal.GetLastWin32Error();
                    Console.WriteLine("{\"error\":\"CredWrite failed with Win32 error " + err + "\"}");
                    return 1;
                }
            } finally {
                Marshal.FreeHGlobal(credBlob);
            }
        }

        private static int HandleCredRead(string[] args) {
            if (args.Length < 2) {
                Console.WriteLine("{\"error\":\"cred-read requires <target>\"}");
                return 1;
            }

            string target = args[1];
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

                    Console.WriteLine("{\"success\":true,\"found\":true,\"target\":\"" + EscapeJson(cred.TargetName ?? target) +
                        "\",\"username\":\"" + EscapeJson(cred.UserName ?? "") +
                        "\",\"password\":\"" + EscapeJson(password) + "\"}");
                    return 0;
                } finally {
                    CredFree(credPtr);
                }
            } else {
                int err = Marshal.GetLastWin32Error();
                if (err == 1168) { // ERROR_NOT_FOUND
                    Console.WriteLine("{\"success\":true,\"found\":false,\"target\":\"" + EscapeJson(target) + "\"}");
                    return 0;
                }
                Console.WriteLine("{\"error\":\"CredRead failed with Win32 error " + err + "\"}");
                return 1;
            }
        }

        private static int HandleCredDelete(string[] args) {
            if (args.Length < 2) {
                Console.WriteLine("{\"error\":\"cred-delete requires <target>\"}");
                return 1;
            }

            string target = args[1];
            bool success = CredDelete(target, CRED_TYPE_GENERIC, 0);
            int err = Marshal.GetLastWin32Error();
            if (success || err == 1168) { // Deleted or already non-existent
                Console.WriteLine("{\"success\":true,\"target\":\"" + EscapeJson(target) + "\"}");
                return 0;
            } else {
                Console.WriteLine("{\"error\":\"CredDelete failed with Win32 error " + err + "\"}");
                return 1;
            }
        }

        private static int HandleCredList(string[] args) {
            string prefix = args.Length > 1 ? args[1] : "AccountHub";
            int count;
            IntPtr pArray;

            // Filter can be "AccountHub*"
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
                    Console.WriteLine("{\"success\":true,\"credentials\":[" + string.Join(",", items.ToArray()) + "]}");
                    return 0;
                } finally {
                    CredFree(pArray);
                }
            } else {
                int err = Marshal.GetLastWin32Error();
                if (err == 1168) { // No credentials found matching filter
                    Console.WriteLine("{\"success\":true,\"credentials\":[]}");
                    return 0;
                }
                Console.WriteLine("{\"error\":\"CredEnumerate failed with error " + err + "\"}");
                return 1;
            }
        }

        private static string ReadInput(string[] args, int index) {
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
    }
}

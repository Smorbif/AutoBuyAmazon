using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows.Forms;

internal static class KeepaBuyerLauncher
{
    [STAThread]
    private static int Main()
    {
        var root = AppDomain.CurrentDomain.BaseDirectory;
        var dataDir = Path.Combine(root, "data");
        var script = Path.Combine(root, "src", "launch.mjs");
        var logPath = Path.Combine(dataDir, "launcher.log");
        var output = new StringBuilder();
        var outputLock = new object();

        try
        {
            Directory.CreateDirectory(dataDir);
            if (!File.Exists(script))
            {
                ShowError("Non trovo i file del programma. Estrai l’intera cartella prima di avviare KeepaBuyer.exe.", logPath);
                return 1;
            }

            using (var process = new Process())
            {
                process.StartInfo = new ProcessStartInfo
                {
                    FileName = "node.exe",
                    Arguments = "\"" + script + "\"",
                    WorkingDirectory = root,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                };
                process.StartInfo.EnvironmentVariables["KEEP_BUY_PORT"] = "8788";
                process.OutputDataReceived += (sender, args) => AppendLine(output, outputLock, args.Data);
                process.ErrorDataReceived += (sender, args) => AppendLine(output, outputLock, args.Data);
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                process.WaitForExit();
                process.WaitForExit();
                SaveLog(logPath, output, outputLock, process.ExitCode);

                if (process.ExitCode != 0)
                {
                    ShowError("Keepa Buyer non è riuscito ad avviarsi. Apri il registro per i dettagli.", logPath);
                }
                return process.ExitCode;
            }
        }
        catch (Exception error)
        {
            AppendLine(output, outputLock, error.ToString());
            SaveLog(logPath, output, outputLock, 1);
            ShowError("Non riesco ad avviare il programma. Verifica che Node.js 20 o superiore sia installato. Apri il registro per i dettagli.", logPath);
            return 1;
        }
    }

    private static void AppendLine(StringBuilder output, object outputLock, string line)
    {
        if (String.IsNullOrWhiteSpace(line)) return;
        lock (outputLock) output.AppendLine(line);
    }

    private static void SaveLog(string logPath, StringBuilder output, object outputLock, int exitCode)
    {
        try
        {
            string captured;
            lock (outputLock) captured = output.ToString();
            File.AppendAllText(logPath, DateTime.Now.ToString("s") + " launcher exit=" + exitCode + Environment.NewLine + captured, Encoding.UTF8);
        }
        catch { }
    }

    private static void ShowError(string message, string logPath)
    {
        MessageBox.Show(message + Environment.NewLine + Environment.NewLine + "Registro: " + logPath,
            "Keepa Buyer", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
}

$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;

public class PwaIconGenerator {
    public static void GenerateIcon(string inFile, string outFile, int size) {
        using (Bitmap src = new Bitmap(inFile)) {
            using (Bitmap dest = new Bitmap(size, size)) {
                using (Graphics g = Graphics.FromImage(dest)) {
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    
                    // Fill solid white background (required for maskable PWA icons)
                    g.Clear(Color.White);
                    
                    // Calculate scaling to fit with 20% padding
                    int targetSize = (int)(size * 0.65); // Generous padding so Android maskable circle doesn't cut it off
                    
                    float ratioX = (float)targetSize / src.Width;
                    float ratioY = (float)targetSize / src.Height;
                    float ratio = Math.Min(ratioX, ratioY);
                    
                    int newWidth = (int)(src.Width * ratio);
                    int newHeight = (int)(src.Height * ratio);
                    
                    int posX = (size - newWidth) / 2;
                    int posY = (size - newHeight) / 2;
                    
                    g.DrawImage(src, posX, posY, newWidth, newHeight);
                }
                dest.Save(outFile, ImageFormat.Png);
            }
        }
    }
}
"@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
[PwaIconGenerator]::GenerateIcon("public\logo.png", "public\icon-512.png", 512)
[PwaIconGenerator]::GenerateIcon("public\logo.png", "public\icon-192.png", 192)

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2 } from "lucide-react";

/**
 * Uploads a payment QR image and stores it (resized, as a data URL) in the
 * `support.upi_qr_url` flag so it renders in the support section everywhere.
 */
export function QrUploadCard({
  value,
  onSave,
  saving,
}: {
  value: string;
  onSave: (key: string, jsonValue: string) => void;
  saving: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      return toast({ title: "Please choose an image file", variant: "destructive" });
    }
    setBusy(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 640);
      onSave("support.upi_qr_url", JSON.stringify(dataUrl));
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">support.upi_qr_url</CardTitle>
        <p className="text-xs text-muted-foreground">
          Upload your own payment QR image. When set, it replaces the auto-generated UPI QR code
          everywhere the support section appears.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="h-32 w-32 shrink-0 rounded-xl border border-border/60 bg-background p-2 flex items-center justify-center">
          {value ? (
            <img src={value} alt="Uploaded payment QR code" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground text-center px-2">No QR uploaded</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" disabled={busy || saving} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            {busy || saving ? "Uploading…" : value ? "Replace QR" : "Upload QR"}
          </Button>
          {value && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || saving}
              onClick={() => onSave("support.upi_qr_url", JSON.stringify(""))}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove
            </Button>
          )}
          <p className="text-xs text-muted-foreground max-w-xs">
            PNG or JPG. Images are resized to 640px before saving.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function resizeToDataUrl(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode the image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

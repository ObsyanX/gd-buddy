import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

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
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<{ image: HTMLImageElement; url: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (!source || !previewCanvasRef.current) return;
    drawCrop(previewCanvasRef.current, source.image, zoom, offsetX, offsetY, 360);
  }, [source, zoom, offsetX, offsetY]);

  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source.url);
  }, [source]);

  async function handleFile(file: File) {
    setError("");
    if (!ALLOWED_TYPES.has(file.type)) {
      const message = "Choose a PNG, JPG, or WebP image.";
      setError(message);
      return toast({ title: "Unsupported QR image", description: message, variant: "destructive" });
    }
    if (file.size > MAX_FILE_BYTES) {
      const message = "The QR image must be 5 MB or smaller.";
      setError(message);
      return toast({ title: "QR image is too large", description: message, variant: "destructive" });
    }
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      if (image.width < 128 || image.height < 128) {
        URL.revokeObjectURL(url);
        throw new Error("The QR image must be at least 128 × 128 pixels so it remains scannable.");
      }
      if (source) URL.revokeObjectURL(source.url);
      setSource({ image, url });
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not read the selected image.";
      setError(message);
      toast({ title: "Could not open QR image", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function saveCrop() {
    if (!source) return;
    setBusy(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      drawCrop(canvas, source.image, zoom, offsetX, offsetY, 640);
      const blob = await canvasToBlob(canvas);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Your admin session expired. Sign in again and retry.");
      const version = Date.now();
      const path = `${authData.user.id}/support-qr-v${version}.png`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      if (!data.publicUrl) throw new Error("The uploaded QR URL could not be created.");
      onSave("support.upi_qr_url", JSON.stringify(data.publicUrl));
      URL.revokeObjectURL(source.url);
      setSource(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "The QR image could not be saved.";
      setError(message);
      toast({ title: "QR upload failed", description: message, variant: "destructive" });
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
            <img src={value} alt="Current GD Buddy payment QR code" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground text-center px-2">No QR uploaded</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Choose a QR image to upload"
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
            PNG, JPG, or WebP · maximum 5 MB · minimum 128 × 128 px.
          </p>
          {error && <p className="max-w-xs text-xs text-destructive" role="alert">{error}</p>}
        </div>
      </CardContent>

      <Dialog open={Boolean(source)} onOpenChange={(open) => {
        if (!open && source && !busy) {
          URL.revokeObjectURL(source.url);
          setSource(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fit payment QR</DialogTitle>
            <DialogDescription>Zoom and reposition the image inside the square before saving.</DialogDescription>
          </DialogHeader>
          <canvas
            ref={previewCanvasRef}
            width={360}
            height={360}
            className="aspect-square w-full rounded-md border border-border bg-background"
            role="img"
            aria-label="Preview of the cropped GD Buddy payment QR code"
          />
          <CropSlider label="Zoom" value={zoom} min={1} max={3} step={0.05} onChange={setZoom} />
          <CropSlider label="Horizontal position" value={offsetX} min={-1} max={1} step={0.02} onChange={setOffsetX} />
          <CropSlider label="Vertical position" value={offsetY} min={-1} max={1} step={0.02} onChange={setOffsetY} />
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => {
              if (source) URL.revokeObjectURL(source.url);
              setSource(null);
            }}>Cancel</Button>
            <Button disabled={busy || saving} onClick={saveCrop}>
              <Upload className="mr-1.5 h-4 w-4" aria-hidden />
              {busy || saving ? "Saving…" : "Save QR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected file is not a valid image."));
    image.src = url;
  });
}

function drawCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, zoom: number, offsetX: number, offsetY: number, size: number) {
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image editing is not supported in this browser.");
  const baseScale = Math.max(size / image.width, size / image.height);
  const scale = baseScale * zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const overflowX = Math.max(0, width - size);
  const overflowY = Math.max(0, height - size);
  const x = (size - width) / 2 + offsetX * overflowX / 2;
  const y = (size - height) / 2 + offsetY * overflowY / 2;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, x, y, width, height);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare the cropped QR image.")), "image/png");
  });
}

function CropSlider({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0] ?? value)}
        aria-label={label}
      />
    </div>
  );
}

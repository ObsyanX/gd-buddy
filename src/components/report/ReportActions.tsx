import { Button } from '@/components/ui/button';
import { Download, Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  sessionId: string;
  targetSelector?: string; // CSS selector of element to snapshot
}

const ReportActions = ({ sessionId, targetSelector = '#report-print' }: Props) => {
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/home/session/${sessionId}/report`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied', description: 'Share this URL with anyone signed in to view.' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My GD Buddy Report', url: shareUrl });
      } catch {}
    } else {
      copyLink();
    }
  };

  const downloadPDF = async () => {
    const el = document.querySelector(targetSelector) as HTMLElement | null;
    if (!el) return;
    toast({ title: 'Generating PDF…' });
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`gd-buddy-report-${sessionId.slice(0, 8)}.pdf`);
    } catch (e: any) {
      toast({ title: 'PDF failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Button variant="outline" size="sm" onClick={downloadPDF} className="border-2">
        <Download className="w-4 h-4 mr-2" /> DOWNLOAD PDF
      </Button>
      <Button variant="outline" size="sm" onClick={share} className="border-2">
        <Share2 className="w-4 h-4 mr-2" /> SHARE
      </Button>
      <Button variant="outline" size="sm" onClick={copyLink} className="border-2">
        <Copy className="w-4 h-4 mr-2" /> COPY LINK
      </Button>
    </div>
  );
};

export default ReportActions;

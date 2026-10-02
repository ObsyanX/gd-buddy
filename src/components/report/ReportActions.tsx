import { Button } from '@/components/ui/button';
import { Share2, Copy, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generatePlacementReportPDF } from '@/lib/pdf/generatePlacementReport';

interface Props {
  sessionId: string;
  targetSelector?: string;
  reportData?: {
    overallScore: number | null;
    fluencyScore: number | null;
    contentScore: number | null;
    structureScore: number | null;
    voiceScore: number | null;
    track?: string;
    topic?: string;
  };
}

const ReportActions = ({
  sessionId,
  targetSelector = '#report-print',
  reportData,
}: Props) => {
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/home/session/${sessionId}/report`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: 'Link copied',
        description: 'Share this URL with anyone signed in to view.',
      });
    } catch {
      toast({
        title: 'Could not copy',
        variant: 'destructive',
      });
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My GD Buddy Report',
          url: shareUrl,
        });
      } catch {
        // User cancelled share dialog
      }
    } else {
      copyLink();
    }
  };

  /**
   * Primary PDF:
   * Generates the structured placement dossier.
   */
  const downloadPlacementDossier = async () => {
    toast({
      title: 'Generating Placement Dossier…',
      description: 'Preparing your placement-ready report.',
    });

    try {
      await generatePlacementReportPDF({
        sessionId,
        overallScore: reportData?.overallScore ?? null,
        fluencyScore: reportData?.fluencyScore ?? null,
        contentScore: reportData?.contentScore ?? null,
        structureScore: reportData?.structureScore ?? null,
        voiceScore: reportData?.voiceScore ?? null,
        track: reportData?.track || 'general',
        topic: reportData?.topic || 'Group Discussion',
      });

      toast({
        title: 'Placement Dossier ready',
        description: 'Your PDF has been generated successfully.',
      });
    } catch (error: any) {
      console.error('Placement dossier generation failed:', error);

      toast({
        title: 'Dossier generation failed',
        description: 'Trying the standard report PDF instead…',
      });

      // Fallback to the original HTML → PDF implementation
      await downloadStandardPDF();
    }
  };

  /**
   * Fallback PDF:
   * Captures the existing report UI and converts it to PDF.
   */
  const downloadStandardPDF = async () => {
    const el = document.querySelector(targetSelector) as HTMLElement | null;

    if (!el) {
      toast({
        title: 'PDF failed',
        description: 'Report content could not be found.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = 210;
      const pageHeight = 297;

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(
        imgData,
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;

        pdf.addPage();

        pdf.addImage(
          imgData,
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -= pageHeight;
      }

      pdf.save(
        `gd-buddy-report-${sessionId.slice(0, 8)}.pdf`
      );

      toast({
        title: 'PDF downloaded',
        description: 'Your standard GD Buddy report is ready.',
      });
    } catch (error: any) {
      console.error('Standard PDF generation failed:', error);

      toast({
        title: 'PDF failed',
        description:
          error?.message || 'Could not generate the report PDF.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {/* Primary Placement PDF */}
      <Button
        variant="default"
        size="sm"
        onClick={downloadPlacementDossier}
        className="font-semibold gap-1.5 shadow-sm"
      >
        <FileCheck className="w-4 h-4" />
        PLACEMENT DOSSIER (PDF)
      </Button>

      {/* Share */}
      <Button
        variant="outline"
        size="sm"
        onClick={share}
        className="border-2"
      >
        <Share2 className="w-4 h-4 mr-2" />
        SHARE
      </Button>

      {/* Copy Link */}
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="border-2"
      >
        <Copy className="w-4 h-4 mr-2" />
        COPY LINK
      </Button>
    </div>
  );
};

export default ReportActions;

// import { Button } from '@/components/ui/button';
// import { Download, Share2, Copy } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast';
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';
// import { generatePlacementReportPDF } from '@/lib/pdf/generatePlacementReport';


// interface Props {
//   sessionId: string;
//   targetSelector?: string; // CSS selector of element to snapshot
// }

// const ReportActions = ({ sessionId, targetSelector = '#report-print' }: Props) => {
//   const { toast } = useToast();

//   const shareUrl = `${window.location.origin}/home/session/${sessionId}/report`;

//   const copyLink = async () => {
//     try {
//       await navigator.clipboard.writeText(shareUrl);
//       toast({ title: 'Link copied', description: 'Share this URL with anyone signed in to view.' });
//     } catch {
//       toast({ title: 'Could not copy', variant: 'destructive' });
//     }
//   };

//   const share = async () => {
//     if (navigator.share) {
//       try {
//         await navigator.share({ title: 'My GD Buddy Report', url: shareUrl });
//       } catch {}
//     } else {
//       copyLink();
//     }
//   };

//   const downloadPDF = async () => {
//     const el = document.querySelector(targetSelector) as HTMLElement | null;
//     if (!el) return;
//     toast({ title: 'Generating PDF…' });
//     try {
//       const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
//       const imgData = canvas.toDataURL('image/png');
//       const pdf = new jsPDF('p', 'mm', 'a4');
//       const pageWidth = 210;
//       const pageHeight = 297;
//       const imgWidth = pageWidth;
//       const imgHeight = (canvas.height * imgWidth) / canvas.width;
//       let heightLeft = imgHeight;
//       let position = 0;
//       pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
//       heightLeft -= pageHeight;
//       while (heightLeft > 0) {
//         position = heightLeft - imgHeight;
//         pdf.addPage();
//         pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
//         heightLeft -= pageHeight;
//       }
//       pdf.save(`gd-buddy-report-${sessionId.slice(0, 8)}.pdf`);
//     } catch (e: any) {
//       toast({ title: 'PDF failed', description: e.message, variant: 'destructive' });
//     }
//   };

//   return (
//     <div className="flex flex-wrap gap-2 justify-end">
//       <Button variant="outline" size="sm" onClick={downloadPDF} className="border-2">
//         <Download className="w-4 h-4 mr-2" /> DOWNLOAD PDF
//       </Button>
//       <Button variant="outline" size="sm" onClick={share} className="border-2">
//         <Share2 className="w-4 h-4 mr-2" /> SHARE
//       </Button>
//       <Button variant="outline" size="sm" onClick={copyLink} className="border-2">
//         <Copy className="w-4 h-4 mr-2" /> COPY LINK
//       </Button>
//     </div>
//   );
// };

// export default ReportActions;

import { Badge } from "@/components/ui/badge";
import { Eye, User, Smile } from "lucide-react";
import { VideoMetrics } from "@/components/VideoMonitor";

interface VideoCoachingOverlayProps {
  metrics: VideoMetrics | null;
  isActive: boolean;
}

const getColor = (score: number): string => {
  if (score >= 70) return 'bg-green-500/80 text-green-50';
  if (score >= 40) return 'bg-yellow-500/80 text-yellow-50';
  return 'bg-red-500/80 text-red-50';
};

const getLabel = (score: number): string => {
  if (score >= 70) return '✓';
  if (score >= 40) return '~';
  return '!';
};

const VideoCoachingOverlay = ({ metrics, isActive }: VideoCoachingOverlayProps) => {
  if (!isActive || !metrics || !metrics.faceDetected) return null;

  const badges = [
    { 
      icon: <Eye className="w-3 h-3" />, 
      label: 'Eye', 
      score: metrics.eyeContactScore,
    },
    { 
      icon: <User className="w-3 h-3" />, 
      label: 'Posture', 
      score: metrics.postureScore,
    },
    { 
      icon: <Smile className="w-3 h-3" />, 
      label: 'Expression', 
      score: metrics.expressionScore,
    },
  ];

  return (
    <div className="absolute bottom-2 left-2 right-2 flex gap-1 justify-center pointer-events-none z-10">
      {badges.map(({ icon, label, score }) => (
        <Badge 
          key={label}
          className={`${getColor(score)} text-[10px] px-1.5 py-0.5 gap-1 font-mono border-0 shadow-md`}
        >
          {icon}
          {getLabel(score)} {score}%
        </Badge>
      ))}
    </div>
  );
};

export default VideoCoachingOverlay;

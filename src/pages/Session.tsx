import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import DiscussionRoom from "@/components/DiscussionRoom";
import { useStickyRouteValue } from "@/hooks/useStickyRouteValue";
import { errorMonitor } from "@/lib/error-monitor";

const Session = () => {
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  const sessionId = useStickyRouteValue(params.sessionId);

  useEffect(() => {
    if (!sessionId) {
      navigate('/home/practice', { replace: true });
    }
  }, [sessionId, navigate]);

  // Tag every error raised while the discussion room is mounted with the session id.
  useEffect(() => {
    if (!sessionId) return;
    errorMonitor.setSessionContext(sessionId);
    return () => errorMonitor.setSessionContext(null);
  }, [sessionId]);

  if (!sessionId) {
    return null;
  }


  const handleComplete = () => {
    navigate(`/home/session/${sessionId}/report`);
  };

  return (
    <DiscussionRoom
      sessionId={sessionId}
      onComplete={handleComplete}
    />
  );
};

export default Session;

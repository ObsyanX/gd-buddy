import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import DiscussionRoom from "@/components/DiscussionRoom";

const Session = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  // Guard: redirect if no sessionId
  useEffect(() => {
    if (!sessionId) {
      navigate('/practice', { replace: true });
    }
  }, [sessionId, navigate]);

  if (!sessionId) {
    return null;
  }

  const handleComplete = () => {
    navigate(`/session/${sessionId}/report`);
  };

  return (
    <DiscussionRoom 
      sessionId={sessionId} 
      onComplete={handleComplete} 
    />
  );
};

export default Session;
